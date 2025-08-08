const Queue = require('bull');
const { getDatabase } = require('../db/index.js');
const { translateText } = require('../services/translation.js');

// Create translation queue
const translationQueue = new Queue('translation_job', process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Process translation jobs
 */
translationQueue.process(async (job) => {
  try {
    const { translationId, merchantId, targetLanguage } = job.data;
    console.log(`🔄 Processing translation job: ${translationId} for language: ${targetLanguage}`);
    
    const db = getDatabase();
    
    // Get the translation record
    const translation = await db.getRow(
      'SELECT * FROM translations WHERE id = $1 AND merchant_id = $2',
      [translationId, merchantId]
    );
    
    if (!translation) {
      throw new Error(`Translation not found: ${translationId}`);
    }
    
    // Get merchant settings
    const merchant = await db.getRow(
      'SELECT settings FROM merchants WHERE id = $1',
      [merchantId]
    );
    
    let settings = {};
    if (merchant && merchant.settings) {
      try {
        settings = JSON.parse(merchant.settings);
      } catch (error) {
        console.error('Error parsing merchant settings:', error);
      }
    }
    
    // Check if auto-translate is enabled
    if (!settings.autoTranslate) {
      console.log(`⏸️ Auto-translate disabled for merchant: ${merchantId}`);
      return { status: 'skipped', reason: 'auto_translate_disabled' };
    }
    
    // Translate the text
    const result = await translateText({
      text: translation.original_text,
      sourceLanguage: 'en',
      targetLanguage: targetLanguage
    });
    
    // Update translation record
    await db.update(
      'UPDATE translations SET translated_text = $1, status = $2, auto_translated = $3, updated_at = $4 WHERE id = $5',
      [result.translation, 'completed', true, new Date().toISOString(), translationId]
    );
    
    console.log(`✅ Translation completed: ${translationId} -> ${result.translation}`);
    
    return {
      status: 'completed',
      translation: result.translation,
      confidence: result.confidence
    };
    
  } catch (error) {
    console.error(`❌ Translation job failed:`, error);
    
    // Update translation status to failed
    const db = getDatabase();
    await db.update(
      'UPDATE translations SET status = $1, updated_at = $2 WHERE id = $3',
      ['failed', new Date().toISOString(), job.data.translationId]
    );
    
    throw error;
  }
});

/**
 * Add translation to queue
 */
async function addTranslationToQueue(translationId, merchantId, targetLanguage) {
  try {
    const job = await translationQueue.add({
      translationId,
      merchantId,
      targetLanguage
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    console.log(`📝 Added translation job to queue: ${job.id}`);
    return job;
  } catch (error) {
    console.error('Error adding translation to queue:', error);
    throw error;
  }
}

/**
 * Process all pending translations for a merchant
 */
async function processPendingTranslations(merchantId) {
  try {
    const db = getDatabase();
    
    // Get merchant settings
    const merchant = await db.getRow(
      'SELECT settings FROM merchants WHERE id = $1',
      [merchantId]
    );
    
    if (!merchant) {
      throw new Error(`Merchant not found: ${merchantId}`);
    }
    
    let settings = {};
    if (merchant.settings) {
      try {
        settings = JSON.parse(merchant.settings);
      } catch (error) {
        console.error('Error parsing merchant settings:', error);
      }
    }
    
    // Get pending translations
    const pendingTranslations = await db.getRows(
      'SELECT * FROM translations WHERE merchant_id = $1 AND status = $2',
      [merchantId, 'pending']
    );
    
    console.log(`📋 Found ${pendingTranslations.length} pending translations for merchant: ${merchantId}`);
    
    // Process each translation for each target language
    for (const translation of pendingTranslations) {
      for (const targetLanguage of settings.languages || ['es', 'fr', 'de']) {
        if (targetLanguage === 'en') continue; // Skip translating to English
        
        // Check if translation already exists for this language
        const existingTranslation = await db.getRow(
          'SELECT * FROM translations WHERE merchant_id = $1 AND resource_type = $2 AND resource_id = $3 AND resource_key = $4 AND language = $5',
          [merchantId, translation.resource_type, translation.resource_id, translation.resource_key, targetLanguage]
        );
        
        if (!existingTranslation) {
          // Create new translation record for this language
          const newTranslation = await db.insert(
            'INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, status, auto_translated, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id',
            [merchantId, translation.resource_type, translation.resource_id, translation.resource_key, translation.original_text, null, targetLanguage, 'pending', false, new Date().toISOString(), new Date().toISOString()]
          );
          
          // Add to translation queue
          await addTranslationToQueue(newTranslation.id, merchantId, targetLanguage);
        }
      }
    }
    
    console.log(`✅ Queued all pending translations for merchant: ${merchantId}`);
    
  } catch (error) {
    console.error('Error processing pending translations:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  try {
    const waiting = await translationQueue.getWaiting();
    const active = await translationQueue.getActive();
    const completed = await translationQueue.getCompleted();
    const failed = await translationQueue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    throw error;
  }
}

module.exports = {
  translationQueue,
  addTranslationToQueue,
  processPendingTranslations,
  getQueueStats
}; 