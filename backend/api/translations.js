const express = require('express');
const router = express.Router();
const Translation = require('../models/Translation');
const translationService = require('../services/translationService');
const shopifyService = require('../services/shopifyService');
const { addTranslationJob, addSyncJob } = require('../jobs/translationJob');
const Merchant = require('../models/Merchant');
const { sanitizeInput, validateRequiredFields, validateLanguageCodes, handleDevelopmentMerchant } = require('../middleware/auth');
const { translateText, translateWithGlossary } = require('../services/translation');
const { getDatabase } = require('../db/index.js');
const { processPendingTranslations, getQueueStats } = require('../jobs/translationQueue.js');

// Translation endpoints
/**
 * POST /api/translations/translate
 * Translate text for theme frontend
 */
router.post('/translate', handleDevelopmentMerchant, async (req, res) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  try {
    const { text, sourceLanguage = 'en', targetLanguage } = req.body;
    const merchantId = req.merchantId || 1;

    // Validate required fields
    if (!text || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Missing required fields: text and targetLanguage' 
      });
    }

    // Validate language codes
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'ko', 'zh'];
    if (!validLanguages.includes(sourceLanguage) || !validLanguages.includes(targetLanguage)) {
      return res.status(400).json({ 
        error: 'Invalid language code' 
      });
    }

    // Sanitize input
    const sanitizedText = text.trim();
    if (!sanitizedText) {
      return res.status(400).json({ 
        error: 'Text cannot be empty' 
      });
    }

    console.log(`🔄 Theme translation request: ${sourceLanguage} → ${targetLanguage}`);
    console.log(`📝 Text: "${sanitizedText}"`);

    // Check if translation already exists in database
    const db = getDatabase();
    const existingTranslation = await db.getRow(
      'SELECT translated_text FROM translations WHERE merchant_id = $1 AND original_text = $2 AND language = $3',
      [merchantId, sanitizedText, targetLanguage]
    );

    if (existingTranslation && existingTranslation.translated_text) {
      console.log(`✅ Found cached translation: "${existingTranslation.translated_text}"`);
      return res.json({
        translation: existingTranslation.translated_text,
        sourceLanguage,
        targetLanguage,
        originalText: sanitizedText,
        cached: true
      });
    }

    // Get translation from service
    const result = await translateText({
      text: sanitizedText,
      sourceLanguage,
      targetLanguage
    });

    if (!result || !result.translation) {
      console.error('❌ Translation service returned no result');
      return res.status(500).json({ 
        error: 'Translation failed' 
      });
    }

    // Store translation in database for future use
    try {
      await db.insert(
        'INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, status, auto_translated, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [merchantId, 'theme', 'frontend', 'text', sanitizedText, result.translation, targetLanguage, 'completed', true, new Date().toISOString(), new Date().toISOString()]
      );
      console.log(`💾 Stored theme translation in database`);
    } catch (dbError) {
      console.warn('⚠️ Could not store theme translation:', dbError.message);
      // Continue anyway - translation still works
    }

    console.log(`✅ Theme translation completed: "${result.translation}"`);

    res.json({
      translation: result.translation,
      sourceLanguage,
      targetLanguage,
      originalText: sanitizedText,
      confidence: result.confidence || 0.95,
      cached: false
    });

  } catch (error) {
    console.error('❌ Theme translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      details: error.message 
    });
  }
});

router.post('/translate-with-glossary',
  sanitizeInput,
  validateRequiredFields(['text', 'glossary']),
  async (req, res) => {
    try {
      const { text, glossary } = req.body;
      const result = await translateWithGlossary({ text, glossary });
      res.json(result);
    } catch (error) {
      console.error('Glossary translation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Individual translation endpoints (must come before merchant-specific routes)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await Translation.update(id, updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

router.post('/:id/auto-translate', async (req, res) => {
  try {
    const { id } = req.params;
    const translation = await Translation.findById(id);
    
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    const translatedText = await translationService.translateText(
      translation.original_text,
      translation.language
    );
    
    await Translation.update(id, {
      translated_text: translatedText,
      status: 'completed',
      auto_translated: true,
      updated_at: new Date()
    });
    
    res.json({ translated_text: translatedText });
  } catch (error) {
    console.error('Error auto-translating:', error);
    res.status(500).json({ error: 'Failed to auto-translate' });
  }
});

router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const translation = await Translation.findById(id);
    
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    // Add sync job to queue
    console.log('Adding sync job for translation:', id);
    await addSyncJob('sync_to_shopify', { translationIds: [id], merchantId: req.merchantId });
    console.log('Sync job added successfully');
    
    res.json({ success: true, message: 'Sync job queued' });
  } catch (error) {
    console.error('Error queuing sync:', error);
    res.status(500).json({ error: 'Failed to queue sync' });
  }
});

// Get all translations with filtering and pagination
router.get('/', handleDevelopmentMerchant, async (req, res) => {
  try {
    const { 
      status, 
      language, 
      resourceType, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    let translations = await Translation.findByMerchant(req.merchantId || 1);
    
    // Apply filters
    if (status) {
      translations = translations.filter(t => t.status === status);
    }
    if (language) {
      translations = translations.filter(t => t.language === language);
    }
    if (resourceType) {
      translations = translations.filter(t => t.resource_type === resourceType);
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedTranslations = translations.slice(offset, offset + parseInt(limit));
    
    res.json({ 
      translations: paginatedTranslations,
      total: translations.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(translations.length / limit)
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

// Get translation statistics
router.get('/:merchantId/stats', async (req, res) => {
  try {
    const stats = await Translation.getStats(req.merchantId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get translation statistics (without merchant ID for development)
router.get('/stats', handleDevelopmentMerchant, async (req, res) => {
  try {
    const stats = await Translation.getStats(req.merchantId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get translation memory
router.get('/:merchantId/memory', async (req, res) => {
  try {
    const memory = await Translation.getMemory(req.merchantId);
    res.json({ memory });
  } catch (error) {
    console.error('Error fetching translation memory:', error);
    res.status(500).json({ error: 'Failed to fetch translation memory' });
  }
});

// Import products from Shopify
router.post('/:merchantId/import-products', async (req, res) => {
  try {
    const { limit = 5 } = req.body;
    
    // Fetch products from Shopify
    const products = await shopifyService.fetchProducts(req.merchantId, limit);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const product of products) {
      try {
        // Check if translation already exists for this product
        const existingTranslations = await Translation.findByResource(
          req.merchantId,
          'product',
          product.id
        );
        
        if (existingTranslations.length > 0) {
          skippedCount++;
          continue;
        }
        
        // Create translation records for translatable fields
        const translatableFields = [
          { field: 'title', text: product.title },
          { field: 'body_html', text: product.body_html },
          { field: 'vendor', text: product.vendor },
          { field: 'product_type', text: product.product_type },
          { field: 'tags', text: product.tags }
        ];
        
        for (const { field, text } of translatableFields) {
          if (text && text.trim()) {
            await Translation.create({
              merchant_id: req.merchantId,
              resource_type: 'product',
              resource_id: product.id,
              resource_key: field,
              original_text: text,
              translated_text: '',
              language: 'es', // Default to Spanish
              status: 'pending',
              auto_translated: false,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
        
        importedCount++;
      } catch (error) {
        console.error(`Error importing product ${product.id}:`, error);
        skippedCount++;
      }
    }
    
    res.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: products.length
    });
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

// Bulk auto-translate
router.post('/:merchantId/bulk/auto-translate', async (req, res) => {
  try {
    const { status = 'pending', limit = 10 } = req.body;
    
    // Get pending translations
    let translations = await Translation.findByMerchant(req.merchantId);
    translations = translations.filter(t => t.status === status).slice(0, limit);
    
    let translatedCount = 0;
    
    for (const translation of translations) {
      try {
        const translatedText = await translationService.translateText(
          translation.original_text,
          translation.language
        );
        
        await Translation.update(translation.id, {
          translated_text: translatedText,
          status: 'completed',
          auto_translated: true,
          updated_at: new Date()
        });
        
        translatedCount++;
      } catch (error) {
        console.error(`Error auto-translating translation ${translation.id}:`, error);
      }
    }
    
    res.json({
      success: true,
      translated: translatedCount,
      total: translations.length
    });
  } catch (error) {
    console.error('Error bulk auto-translating:', error);
    res.status(500).json({ error: 'Failed to bulk auto-translate' });
  }
});

// Bulk sync to Shopify
router.post('/:merchantId/bulk/sync', async (req, res) => {
  try {
    const { status = 'completed' } = req.body;
    
    // Get completed translations
    let translations = await Translation.findByMerchant(req.merchantId);
    translations = translations.filter(t => t.status === status);
    
    if (translations.length === 0) {
      return res.json({
        success: true,
        synced: 0,
        message: 'No translations to sync'
      });
    }
    
    // Add sync job to queue
    const translationIds = translations.map(t => t.id);
    await addSyncJob('sync_to_shopify', { 
      translationIds, 
      merchantId: req.merchantId 
    });
    
    res.json({
      success: true,
      synced: translations.length,
      message: 'Sync job queued'
    });
  } catch (error) {
    console.error('Error bulk syncing:', error);
    res.status(500).json({ error: 'Failed to bulk sync' });
  }
});

router.post('/:merchantId/export', async (req, res) => {
  try {
    const { translationIds } = req.body;
    
    let translations;
    if (translationIds && translationIds.length > 0) {
      translations = await Promise.all(
        translationIds.map(id => Translation.findById(id))
      );
    } else {
      translations = await Translation.findByMerchant(req.merchantId);
    }
    
    const exportData = {
      merchant_id: req.merchantId,
      export_date: new Date().toISOString(),
      total_translations: translations.length,
      translations: translations.map(t => ({
        id: t.id,
        resource_type: t.resource_type,
        resource_id: t.resource_id,
        field: t.field,
        language: t.language,
        original_text: t.original_text,
        translated_text: t.translated_text,
        status: t.status
      }))
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting translations:', error);
    res.status(500).json({ error: 'Failed to export translations' });
  }
});

router.post('/:merchantId/test-translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'es' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Test translation using Google Translate
    const translatedText = await translationService.translateText(text, targetLanguage);
    
    res.json({
      success: true,
      original: text,
      translated: translatedText,
      language: targetLanguage
    });
  } catch (error) {
    console.error('Test translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Debug/test routes
router.get('/:merchantId/debug/pending', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const pendingTranslations = await Translation.getPending(req.merchantId, limit);
    
    res.json({
      success: true,
      count: pendingTranslations.length,
      translations: pendingTranslations
    });
  } catch (error) {
    console.error('Debug pending error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

router.get('/:merchantId/debug/find/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const translation = await Translation.findById(parseInt(id));
    
    res.json({
      success: true,
      found: !!translation,
      translation: translation
    });
  } catch (error) {
    console.error('Debug findById error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

router.post('/:merchantId/bulk/test', async (req, res) => {
  try {
    res.json({ success: true, message: 'Test route works' });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Now place all parameterized routes (with :translationId) after the literal/bulk routes
router.put('/:merchantId/:translationId', async (req, res) => {
  try {
    const { merchantId, translationId } = req.params;
    const updates = req.body;
    await Translation.update(translationId, updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

router.post('/:merchantId/:translationId/auto-translate', async (req, res) => {
  try {
    const { merchantId, translationId } = req.params;
    const translation = await Translation.findById(translationId);
    
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    const translatedText = await translationService.translateText(
      translation.original_text,
      translation.language
    );
    
    await Translation.update(translationId, {
      translated_text: translatedText,
      status: 'completed',
      auto_translated: true,
      updated_at: new Date()
    });
    
    res.json({ translated_text: translatedText });
  } catch (error) {
    console.error('Error auto-translating:', error);
    res.status(500).json({ error: 'Failed to auto-translate' });
  }
});

// Sync translation to Shopify
router.post('/:merchantId/:translationId/sync', async (req, res) => {
  try {
    const { merchantId, translationId } = req.params;
    const translation = await Translation.findById(translationId);
    
    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }
    
    // Add sync job to queue
    await addSyncJob('sync_to_shopify', { translationIds: [translationId], merchantId });
    
    res.json({ success: true, message: 'Sync job queued' });
  } catch (error) {
    console.error('Error queuing sync:', error);
    res.status(500).json({ error: 'Failed to queue sync' });
  }
});

/**
 * POST /api/translations/:merchantId/process-pending
 * Process all pending translations for a merchant
 */
router.post('/:merchantId/process-pending', handleDevelopmentMerchant, async (req, res) => {
  try {
    const merchantId = req.merchantId || req.params.merchantId;
    
    console.log(`🔄 Processing pending translations for merchant: ${merchantId}`);
    
    // Process pending translations
    await processPendingTranslations(merchantId);
    
    // Get queue stats
    const stats = await getQueueStats();
    
    res.json({
      success: true,
      message: 'Pending translations queued for processing',
      stats
    });
    
  } catch (error) {
    console.error('Error processing pending translations:', error);
    res.status(500).json({ 
      error: 'Failed to process pending translations',
      details: error.message 
    });
  }
});

/**
 * GET /api/translations/:merchantId/queue-stats
 * Get translation queue statistics
 */
router.get('/:merchantId/queue-stats', handleDevelopmentMerchant, async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({ 
      error: 'Failed to get queue statistics',
      details: error.message 
    });
  }
});

// Fetch resources from Shopify
router.post('/:merchantId/fetch', async (req, res) => {
  try {
    const { resourceType } = req.body;
    
    // Add fetch job to queue
    await addSyncJob('fetch_from_shopify', { merchantId: req.merchantId, resourceType });
    
    res.json({ success: true, message: 'Fetch job queued' });
  } catch (error) {
    console.error('Error queuing fetch:', error);
    res.status(500).json({ error: 'Failed to queue fetch' });
  }
});

module.exports = router;
