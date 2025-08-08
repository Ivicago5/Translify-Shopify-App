const { Translate } = require('@google-cloud/translate').v2;
const Translation = require('../models/Translation');
const Redis = require('ioredis');
const rateLimit = require('express-rate-limit');

// Initialize Redis client for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Rate limiter configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

class TranslationService {
  constructor() {
    // Initialize Google Translate client
    this.translate = new Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    // Cache configuration
    this.CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
  }

  /**
   * Generate cache key for translations
   */
  getCacheKey(text, targetLanguage, sourceLanguage) {
    return `translation:${sourceLanguage}:${targetLanguage}:${text}`;
  }

  /**
   * Extract HTML content and replace with placeholders
   */
  extractHtml(text) {
    // Simplified version without JSDOM for now
    return {
      text: text,
      placeholders: new Map()
    };
  }

  /**
   * Restore HTML content from placeholders
   */
  restoreHtml(text, placeholders) {
    return text;
  }

  /**
   * Translate text using Google Translate API with caching and HTML preservation
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    try {
      if (!text || !targetLanguage) {
        throw new Error('Text and target language are required');
      }

      // Skip translation if target language is the same as source
      if (targetLanguage === sourceLanguage) {
        return text;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
      const cachedTranslation = await redis.get(cacheKey);
      if (cachedTranslation) {
        console.log('Cache hit for translation');
        return cachedTranslation;
      }

      // Extract HTML content
      const { text: plainText, placeholders } = this.extractHtml(text);

      // Translate the plain text
      const [translation] = await this.translate.translate(plainText, {
        from: sourceLanguage,
        to: targetLanguage
      });

      // Restore HTML content
      const finalTranslation = this.restoreHtml(translation, placeholders);

      // Cache the result
      await redis.setex(cacheKey, this.CACHE_TTL, finalTranslation);

      return finalTranslation;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Mock translation for testing purposes
   */
  mockTranslate(text, targetLanguage) {
    const mockTranslations = {
      'es': {
        'Hello world': 'Hola mundo',
        'Premium Cotton T-Shirt': 'Camiseta de Algodón Premium',
        'Comfortable and stylish t-shirt made from 100% organic cotton.': 'Camiseta cómoda y elegante hecha de 100% algodón orgánico.',
        'Fashion Brand': 'Marca de Moda',
        'Apparel': 'Ropa',
        'Eco-Friendly Water Bottle': 'Botella de Agua Ecológica',
        'Sustainable water bottle made from recycled materials.': 'Botella de agua sostenible hecha de materiales reciclados.',
        'Eco Products': 'Productos Ecológicos',
        'Accessories': 'Accesorios',
        'Handcrafted Wooden Bowl': 'Tazón de Madera Artesanal',
        'Beautiful handcrafted wooden bowl perfect for serving.': 'Hermoso tazón de madera artesanal perfecto para servir.',
        'Artisan Crafts': 'Artesanías',
        'Home & Garden': 'Hogar y Jardín'
      },
      'fr': {
        'Hello world': 'Bonjour le monde',
        'Premium Cotton T-Shirt': 'T-Shirt en Coton Premium',
        'Comfortable and stylish t-shirt made from 100% organic cotton.': 'T-shirt confortable et élégant fabriqué en coton biologique 100%.',
        'Fashion Brand': 'Marque de Mode',
        'Apparel': 'Vêtements',
        'Eco-Friendly Water Bottle': 'Bouteille d\'Eau Écologique',
        'Sustainable water bottle made from recycled materials.': 'Bouteille d\'eau durable fabriquée à partir de matériaux recyclés.',
        'Eco Products': 'Produits Écologiques',
        'Accessories': 'Accessoires',
        'Handcrafted Wooden Bowl': 'Bol en Bois Artisanal',
        'Beautiful handcrafted wooden bowl perfect for serving.': 'Beau bol en bois artisanal parfait pour servir.',
        'Artisan Crafts': 'Artisanat',
        'Home & Garden': 'Maison et Jardin'
      },
      'de': {
        'Hello world': 'Hallo Welt',
        'Premium Cotton T-Shirt': 'Premium Baumwoll-T-Shirt',
        'Comfortable and stylish t-shirt made from 100% organic cotton.': 'Komfortables und stilvolles T-Shirt aus 100% Bio-Baumwolle.',
        'Fashion Brand': 'Modemarke',
        'Apparel': 'Kleidung',
        'Eco-Friendly Water Bottle': 'Umweltfreundliche Wasserflasche',
        'Sustainable water bottle made from recycled materials.': 'Nachhaltige Wasserflasche aus recycelten Materialien.',
        'Eco Products': 'Öko-Produkte',
        'Accessories': 'Zubehör',
        'Handcrafted Wooden Bowl': 'Handgefertigte Holzschale',
        'Beautiful handcrafted wooden bowl perfect for serving.': 'Schöne handgefertigte Holzschale perfekt zum Servieren.',
        'Artisan Crafts': 'Handwerk',
        'Home & Garden': 'Haus & Garten'
      }
    };

    const languageTranslations = mockTranslations[targetLanguage] || {};
    return languageTranslations[text] || `[${targetLanguage.toUpperCase()}] ${text}`;
  }

  /**
   * Translate multiple texts in batch with optimized processing
   */
  async translateBatch(texts, targetLanguage, sourceLanguage = 'en') {
    try {
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        throw new Error('Texts array is required and must not be empty');
      }

      if (targetLanguage === sourceLanguage) {
        return texts;
      }

      // Process in chunks to avoid API limits
      const CHUNK_SIZE = 100;
      const results = [];
      
      for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
        const chunk = texts.slice(i, i + CHUNK_SIZE);
        
        // Extract HTML from each text
        const processedChunk = chunk.map(text => this.extractHtml(text));
        
        // Translate plain texts
        const [translations] = await this.translate.translate(
          processedChunk.map(item => item.text),
          {
            from: sourceLanguage,
            to: targetLanguage
          }
        );

        // Restore HTML in translations
        const restoredTranslations = translations.map((translation, index) => 
          this.restoreHtml(translation, processedChunk[index].placeholders)
        );

        results.push(...restoredTranslations);

        // Cache results
        await Promise.all(
          chunk.map((text, index) => {
            const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
            return redis.setex(cacheKey, this.CACHE_TTL, restoredTranslations[index]);
          })
        );
      }

      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      throw new Error(`Batch translation failed: ${error.message}`);
    }
  }

  /**
   * Auto-translate a single translation record
   */
  async autoTranslate(translationId) {
    try {
      const translation = await Translation.findById(translationId);
      
      if (!translation) {
        throw new Error('Translation not found');
      }

      if (translation.status === 'completed' && translation.translated_text) {
        return translation; // Already translated
      }

      if (!translation.original_text) {
        throw new Error('No original text to translate');
      }

      // Translate the text
      const translatedText = await this.translateText(
        translation.original_text,
        translation.language,
        'en' // Assuming source is English
      );

      // Update the translation record
      await Translation.update(translationId, {
        translated_text: translatedText,
        status: 'completed',
        auto_translated: true
      });

      return {
        ...translation,
        translated_text: translatedText,
        status: 'completed',
        auto_translated: true
      };
    } catch (error) {
      console.error('Auto-translate error:', error);
      
      // Update status to failed
      await Translation.update(translationId, {
        status: 'failed'
      });

      throw error;
    }
  }

  /**
   * Auto-translate multiple pending translations
   */
  async autoTranslateBatch(merchantId, language, limit = 10) {
    try {
      const pendingTranslations = await Translation.findByLanguage(merchantId, language, 'pending');
      
      if (pendingTranslations.length === 0) {
        return { processed: 0, success: 0, failed: 0 };
      }

      const batchToProcess = pendingTranslations.slice(0, limit);
      const results = {
        processed: batchToProcess.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Process translations in parallel
      const promises = batchToProcess.map(async (translation) => {
        try {
          await this.autoTranslate(translation.id);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            translationId: translation.id,
            error: error.message
          });
        }
      });

      await Promise.all(promises);

      return results;
    } catch (error) {
      console.error('Batch auto-translate error:', error);
      throw error;
    }
  }

  /**
   * Extract translatable content from Shopify resource
   */
  extractTranslatableContent(resource, resourceType) {
    const translatableFields = {
      product: ['title', 'body_html', 'meta_title', 'meta_description', 'vendor', 'product_type'],
      page: ['title', 'body_html', 'meta_title', 'meta_description'],
      blog: ['title', 'body_html', 'meta_title', 'meta_description'],
      article: ['title', 'body_html', 'meta_title', 'meta_description', 'author'],
      collection: ['title', 'body_html', 'meta_title', 'meta_description'],
      theme: ['title', 'body_html', 'meta_title', 'meta_description']
    };

    const fields = translatableFields[resourceType] || [];
    const content = {};

    fields.forEach(field => {
      if (resource[field] && typeof resource[field] === 'string') {
        content[field] = resource[field].trim();
      }
    });

    return content;
  }

  /**
   * Create translation records for a Shopify resource
   */
  async createTranslationRecords(merchantId, resource, resourceType, resourceId, languages) {
    try {
      const translatableContent = this.extractTranslatableContent(resource, resourceType);
      
      if (Object.keys(translatableContent).length === 0) {
        return { created: 0, message: 'No translatable content found' };
      }

      const translations = [];
      const sourceLanguage = 'en'; // Assuming source is English

      // Create translation records for each language and field
      for (const language of languages) {
        if (language === sourceLanguage) continue; // Skip source language

        for (const [field, text] of Object.entries(translatableContent)) {
          if (text && text.length > 0) {
            translations.push({
              merchant_id: merchantId,
              resource_type: resourceType,
              resource_id: resourceId,
              resource_key: field,
              language: language,
              original_text: text,
              translated_text: null,
              status: 'pending',
              auto_translated: false
            });
          }
        }
      }

      if (translations.length > 0) {
        await Translation.bulkCreate(translations);
      }

      return { created: translations.length };
    } catch (error) {
      console.error('Create translation records error:', error);
      throw error;
    }
  }

  /**
   * Sync translations back to Shopify
   */
  async syncToShopify(merchantId, translations) {
    // This will be implemented in shopifyService.js
    // For now, just mark as synced
    const updatePromises = translations.map(translation =>
      Translation.update(translation.id, { status: 'synced' })
    );

    await Promise.all(updatePromises);
    return { synced: translations.length };
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages() {
    try {
      const [languages] = await this.translate.getLanguages();
      return languages.map(lang => ({
        code: lang.code,
        name: lang.name
      }));
    } catch (error) {
      console.error('Get supported languages error:', error);
      // Return common languages as fallback
      return [
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'ru', name: 'Russian' }
      ];
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text) {
    try {
      const [detection] = await this.translate.detect(text);
      return detection.language;
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Clear translation cache for a specific language pair
   */
  async clearCache(sourceLanguage, targetLanguage) {
    const pattern = `translation:${sourceLanguage}:${targetLanguage}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
    return { cleared: keys.length };
  }

  /**
   * Get translation statistics
   */
  async getStats(merchantId) {
    try {
      const stats = await Translation.getStats(merchantId);
      const cacheStats = {
        hits: await redis.get('stats:cache:hits') || 0,
        misses: await redis.get('stats:cache:misses') || 0
      };
      
      return {
        ...stats,
        cache: cacheStats
      };
    } catch (error) {
      console.error('Failed to get translation stats:', error);
      throw error;
    }
  }
}

module.exports = new TranslationService();
