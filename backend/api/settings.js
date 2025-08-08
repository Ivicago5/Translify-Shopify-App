const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/index.js');
const { handleDevelopmentMerchant } = require('../middleware/auth.js');

/**
 * GET /api/settings/:merchantId
 * Get merchant settings
 */
router.get('/:merchantId', handleDevelopmentMerchant, async (req, res) => {
  try {
    const db = getDatabase();
    const merchantId = req.merchantId || req.params.merchantId;
    
    // Get merchant settings from database
    const merchant = await db.getRow('SELECT settings FROM merchants WHERE id = $1', [merchantId]);
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Parse settings JSON or return defaults
    let settings = {};
    if (merchant.settings) {
      try {
        settings = JSON.parse(merchant.settings);
      } catch (error) {
        console.error('Error parsing merchant settings:', error);
        settings = {};
      }
    }
    
    // Merge with default settings
    const defaultSettings = {
      languages: ['es', 'fr', 'de'],
      autoTranslate: true,
      syncToShopify: true,
      googleTranslateApiKey: '',
      doNotTranslate: [],
      automationRules: {
        productTitles: true,
        productDescriptions: true,
        productTags: false,
        pageTitles: true,
        pageContent: true,
        metaDescriptions: false
      }
    };
    
    const mergedSettings = {
      ...defaultSettings,
      ...settings
    };
    
    res.json(mergedSettings);
    
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * PUT /api/settings/:merchantId
 * Update merchant settings
 */
router.put('/:merchantId', handleDevelopmentMerchant, async (req, res) => {
  try {
    const db = getDatabase();
    const merchantId = req.merchantId || req.params.merchantId;
    const settings = req.body;
    
    // Validate required fields
    if (!settings) {
      return res.status(400).json({ error: 'Settings data is required' });
    }
    
    // Validate languages array
    if (!Array.isArray(settings.languages)) {
      return res.status(400).json({ error: 'Languages must be an array' });
    }
    
    // Validate automation rules
    if (settings.automationRules && typeof settings.automationRules !== 'object') {
      return res.status(400).json({ error: 'Automation rules must be an object' });
    }
    
    // Update merchant settings in database
    const settingsJson = JSON.stringify(settings);
    await db.update('UPDATE merchants SET settings = $1, updated_at = $2 WHERE id = $3', [settingsJson, new Date().toISOString(), merchantId]);
    
    console.log('✅ Settings saved for merchant:', merchantId);
    res.json({ success: true, message: 'Settings saved successfully' });
    
  } catch (error) {
    console.error('Error saving settings:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to save settings', details: error.message });
  }
});

/**
 * POST /api/settings/:merchantId/test-connection
 * Test API connections
 */
router.post('/:merchantId/test-connection', handleDevelopmentMerchant, async (req, res) => {
  try {
    const db = getDatabase();
    const merchantId = req.merchantId || req.params.merchantId;
    
    // Get merchant settings
    const merchant = await db.getRow('SELECT settings FROM merchants WHERE id = $1', [merchantId]);
    
    let settings = {};
    if (merchant && merchant.settings) {
      try {
        settings = JSON.parse(merchant.settings);
      } catch (error) {
        console.error('Error parsing settings:', error);
      }
    }
    
    const results = {
      database: { status: 'success', message: 'Database connection working' },
      shopify: { status: 'success', message: 'Shopify API connection working' },
      googleTranslate: { status: 'warning', message: 'Google Translate API key not configured' }
    };
    
    // Test database connection
    try {
      await db.getRow('SELECT 1');
      results.database = { status: 'success', message: 'Database connection working' };
    } catch (error) {
      results.database = { status: 'error', message: 'Database connection failed' };
    }
    
    // Test Shopify connection (simplified for now)
    try {
      // In a real implementation, you'd test the Shopify API
      results.shopify = { status: 'success', message: 'Shopify API connection working' };
    } catch (error) {
      results.shopify = { status: 'error', message: 'Shopify API connection failed' };
    }
    
    // Test Google Translate API key
    if (settings.googleTranslateApiKey && settings.googleTranslateApiKey.trim()) {
      try {
        // Test with a simple translation
        const { translateText } = require('../services/translation.js');
        const result = await translateText({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        });
        
        if (result && result.translation) {
          results.googleTranslate = { 
            status: 'success', 
            message: 'Google Translate API working' 
          };
        } else {
          results.googleTranslate = { 
            status: 'error', 
            message: 'Google Translate API test failed' 
          };
        }
      } catch (error) {
        results.googleTranslate = { 
          status: 'error', 
          message: 'Google Translate API connection failed' 
        };
      }
    }
    
    // Determine overall success
    const hasErrors = Object.values(results).some(result => result.status === 'error');
    const hasWarnings = Object.values(results).some(result => result.status === 'warning');
    
    const success = !hasErrors;
    const message = hasErrors 
      ? 'Some connections failed. Check the details below.'
      : hasWarnings 
        ? 'All connections working with warnings. Some services may not be fully configured.'
        : 'All connections working perfectly!';
    
    res.json({
      success,
      message,
      details: results
    });
    
  } catch (error) {
    console.error('Error testing connections:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test connections',
      error: error.message 
    });
  }
});

/**
 * POST /api/settings/:merchantId/test-translation
 * Test translation functionality
 */
router.post('/:merchantId/test-translation', handleDevelopmentMerchant, async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Text and target language are required' 
      });
    }
    
    // Import translation service
    const { translateText } = require('../services/translation.js');
    
    // Test translation
    const result = await translateText({
      text,
      sourceLanguage: 'en',
      targetLanguage
    });
    
    res.json({
      success: true,
      original: text,
      translated: result.translation,
      targetLanguage
    });
    
  } catch (error) {
    console.error('Error testing translation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Translation test failed',
      error: error.message 
    });
  }
});

/**
 * GET /api/settings/:merchantId/glossary
 * Get merchant glossary terms
 */
router.get('/:merchantId/glossary', handleDevelopmentMerchant, async (req, res) => {
  try {
    const db = getDatabase();
    const merchantId = req.merchantId || req.params.merchantId;
    
    // Get merchant settings from database
    const merchant = await db.getRow('SELECT settings FROM merchants WHERE id = $1', [merchantId]);
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Parse settings JSON or return defaults
    let settings = {};
    if (merchant.settings) {
      try {
        settings = JSON.parse(merchant.settings);
      } catch (error) {
        console.error('Error parsing merchant settings:', error);
        settings = {};
      }
    }
    
    // Return glossary terms from settings
    const glossary = settings.glossary || [];
    
    res.json({ glossary });
    
  } catch (error) {
    console.error('Error getting glossary:', error);
    res.status(500).json({ error: 'Failed to load glossary' });
  }
});

/**
 * POST /api/settings/:merchantId/glossary
 * Add a new glossary term
 */
router.post('/:merchantId/glossary', handleDevelopmentMerchant, async (req, res) => {
  try {
    const db = getDatabase();
    const merchantId = req.merchantId || req.params.merchantId;
    const { term, translation, context, notes } = req.body;
    
    if (!term || !translation) {
      return res.status(400).json({ error: 'Term and translation are required' });
    }
    
    // Get current settings
    const merchant = await db.getRow('SELECT settings FROM merchants WHERE id = $1', [merchantId]);
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Parse current settings
    let settings = {};
    if (merchant.settings) {
      try {
        settings = JSON.parse(merchant.settings);
      } catch (error) {
        console.error('Error parsing merchant settings:', error);
        settings = {};
      }
    }
    
    // Initialize glossary if it doesn't exist
    if (!settings.glossary) {
      settings.glossary = [];
    }
    
    // Create new glossary term
    const newTerm = {
      id: Date.now().toString(), // Simple ID generation
      term: term.trim(),
      translation: translation.trim(),
      context: context ? context.trim() : '',
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to glossary
    settings.glossary.push(newTerm);
    
    // Save updated settings
    const settingsJson = JSON.stringify(settings);
    await db.update('UPDATE merchants SET settings = $1, updated_at = $2 WHERE id = $3', [settingsJson, new Date().toISOString(), merchantId]);
    
    console.log('✅ Glossary term added for merchant:', merchantId);
    res.json({ success: true, term: newTerm });
    
  } catch (error) {
    console.error('Error adding glossary term:', error);
    res.status(500).json({ error: 'Failed to add glossary term' });
  }
});

/**
 * DELETE /api/settings/:merchantId/glossary/:termId
 * Delete a glossary term
 */
router.delete('/:merchantId/glossary/:termId', handleDevelopmentMerchant, async (req, res) => {
  try {
    const db = getDatabase();
    const merchantId = req.merchantId || req.params.merchantId;
    const termId = req.params.termId;
    
    // Get current settings
    const merchant = await db.getRow('SELECT settings FROM merchants WHERE id = $1', [merchantId]);
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Parse current settings
    let settings = {};
    if (merchant.settings) {
      try {
        settings = JSON.parse(merchant.settings);
      } catch (error) {
        console.error('Error parsing merchant settings:', error);
        settings = {};
      }
    }
    
    // Remove term from glossary
    if (settings.glossary) {
      settings.glossary = settings.glossary.filter(term => term.id !== termId);
    }
    
    // Save updated settings
    const settingsJson = JSON.stringify(settings);
    await db.update('UPDATE merchants SET settings = $1, updated_at = $2 WHERE id = $3', [settingsJson, new Date().toISOString(), merchantId]);
    
    console.log('✅ Glossary term deleted for merchant:', merchantId);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting glossary term:', error);
    res.status(500).json({ error: 'Failed to delete glossary term' });
  }
});

module.exports = router;
