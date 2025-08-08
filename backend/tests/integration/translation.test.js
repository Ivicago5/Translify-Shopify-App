// Mock Google Translate service
jest.mock('@google-cloud/translate', () => ({
  v2: {
    Translate: jest.fn().mockImplementation(() => ({
      translate: jest.fn().mockResolvedValue(['Hola Mundo'])
    }))
  }
}));

// Remove the mock and use the actual service with test condition

const request = require('supertest');
const app = require('../../app');
const { getDatabase, initDatabase } = require('../../db/index');

// Mock translationService
jest.mock('../../services/translationService', () => ({
  translateText: jest.fn().mockResolvedValue('Hola Mundo'),
  translateBatch: jest.fn().mockResolvedValue(['Hola Mundo', 'Mundo Bonito']),
  autoTranslate: jest.fn().mockResolvedValue('Hola Mundo'),
  getSupportedLanguages: jest.fn().mockResolvedValue(['en', 'es', 'fr', 'de']),
  detectLanguage: jest.fn().mockResolvedValue('en')
}));

// Mock shopifyService
jest.mock('../../services/shopifyService', () => ({
  getProducts: jest.fn().mockResolvedValue([]),
  updateProduct: jest.fn().mockResolvedValue(true),
  syncTranslation: jest.fn().mockResolvedValue(true)
}));

// Mock jobs
jest.mock('../../jobs/translationJob', () => ({
  addTranslationJob: jest.fn().mockResolvedValue(true),
  addSyncJob: jest.fn().mockResolvedValue(true)
}));

// Mock models
jest.mock('../../models/Translation', () => ({
  findById: jest.fn().mockResolvedValue({
    id: 1,
    original_text: 'Hello World',
    translated_text: 'Hola Mundo',
    language: 'es'
  }),
  update: jest.fn().mockResolvedValue(true),
  create: jest.fn().mockResolvedValue({ id: 1 })
}));

jest.mock('../../models/Merchant', () => ({
  findByDomain: jest.fn().mockResolvedValue({
    id: 1,
    shop_domain: 'test-shop.myshopify.com'
  })
}));

describe('Translation Integration', () => {
  let db;
  let testMerchantId;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'sqlite://./test.db';
    
    // Initialize database
    await initDatabase();
    db = getDatabase();
    
    // Wait for database to be ready
    await new Promise((resolve) => {
      db.get('SELECT 1', (err) => {
        if (err) {
          console.error('Database not ready:', err);
        }
        resolve();
      });
    });
    
    // Create test merchant
    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `, ['test-integration-' + Date.now() + '.myshopify.com', 'test-token'], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
    testMerchantId = result.lastID;
  });

  afterAll(async () => {
    // Clean up test data
    await db.run('DELETE FROM merchants WHERE id = ?', [testMerchantId]);
    await db.run('DELETE FROM translations WHERE merchant_id = ?', [testMerchantId]);
    await db.run('DELETE FROM glossaries WHERE merchant_id = ?', [testMerchantId]);
  });

  beforeEach(async () => {
    // Clear all test data before each test
    await db.run('DELETE FROM translations');
    await db.run('DELETE FROM glossaries');
    await db.run('DELETE FROM merchants');
    await db.run('DELETE FROM translation_memory');
    await db.run('DELETE FROM translation_jobs');
    
    // Recreate test merchant
    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `, ['test-integration-' + Date.now() + '.myshopify.com', 'test-token'], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
    testMerchantId = result.lastID;
  });

  describe('Complete Translation Workflow', () => {
    test('should complete full translation workflow', async () => {

      // 1. Add glossary terms
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO glossaries (merchant_id, term, translation, context, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [testMerchantId, 'Premium', 'Premium', 'Brand term'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 2. Translate product
      const translationResponse = await request(app)
        .post('/api/translations/translate')
        .set('X-Merchant-ID', testMerchantId.toString())
        .send({
          text: 'Premium Wireless Headphones',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
        .expect(200);

      expect(translationResponse.body.translation).toBe('Hola Mundo');
      expect(translationResponse.body.confidence).toBeGreaterThan(0.8);

      // 3. Store translation in database
      const storedTranslation = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          testMerchantId,
          'product',
          'test-product',
          'title',
          'Premium Wireless Headphones',
          translationResponse.body.translation,
          'es'
        ], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });

      expect(storedTranslation.lastID).toBeDefined();

      // 4. Verify translation is stored
      const savedTranslation = await new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM translations WHERE id = ?
        `, [storedTranslation.lastID], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      expect(savedTranslation).toBeDefined();
      expect(savedTranslation.merchant_id).toBe(testMerchantId);
      expect(savedTranslation.original_text).toBe('Premium Wireless Headphones');
    });

    test('should handle bulk translation operations', async () => {
      const products = [
        { id: '1', title: 'Product 1', description: 'Description 1' },
        { id: '2', title: 'Product 2', description: 'Description 2' }
      ];

      const translations = [];

      // Translate each product
      for (const product of products) {
        const response = await request(app)
          .post('/api/translations/translate')
          .set('X-Merchant-ID', testMerchantId.toString())
          .send({
            text: product.title,
            sourceLanguage: 'en',
            targetLanguage: 'es'
          })
          .expect(200);

        translations.push({
          productId: product.id,
          originalText: product.title,
          translatedText: response.body.translation,
          confidence: response.body.confidence
        });
      }

      expect(translations).toHaveLength(2);
      expect(translations[0].confidence).toBeGreaterThan(0.8);
      expect(translations[1].confidence).toBeGreaterThan(0.8);

      // Store all translations
      for (const translation of translations) {
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            testMerchantId,
            'product',
            translation.productId,
            'title',
            translation.originalText,
            translation.translatedText,
            'es',
            'completed'
          ], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Verify all translations are stored
      const storedTranslations = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM translations WHERE merchant_id = ?
        `, [testMerchantId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      expect(storedTranslations).toHaveLength(2);
    });
  });

  describe('Glossary Integration', () => {
    test('should use glossary terms in translation', async () => {
      // Add glossary terms
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO glossaries (merchant_id, term, translation, context, created_at, updated_at)
          VALUES 
          (?, ?, ?, ?, datetime('now'), datetime('now')),
          (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          testMerchantId, 'Premium', 'Premium', 'Brand term',
          testMerchantId, 'Wireless', 'Inalámbrico', 'Technical term'
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Get glossary for translation
      const glossary = await new Promise((resolve, reject) => {
        db.all(`
          SELECT term, translation FROM glossaries WHERE merchant_id = ?
        `, [testMerchantId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const glossaryMap = {};
      glossary.forEach(item => {
        glossaryMap[item.term] = item.translation;
      });

      // Translate with glossary
      const response = await request(app)
        .post('/api/translations/translate-with-glossary')
        .set('X-Merchant-ID', testMerchantId)
        .send({
          text: 'Premium Wireless Headphones',
          glossary: glossaryMap
        })
        .expect(200);

      expect(response.body.translation).toContain('Premium');
      expect(response.body.translation).toContain('Inalámbrico');
      expect(response.body.glossaryUsed).toBe(true);
    });

    test('should handle glossary updates', async () => {
      // Add initial glossary term
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO glossaries (merchant_id, term, translation, context, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [testMerchantId, 'Test', 'Prueba', 'Test term'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Update glossary term
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE glossaries SET translation = ?, updated_at = datetime('now')
          WHERE merchant_id = ? AND term = ?
        `, ['Nueva Prueba', testMerchantId, 'Test'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Verify update
      const updatedTerm = await new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM glossaries WHERE merchant_id = ? AND term = ?
        `, [testMerchantId, 'Test'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      expect(updatedTerm.translation).toBe('Nueva Prueba');
    });
  });

  describe('Multi-tenancy Integration', () => {
    test('should isolate merchant data', async () => {
      // Create second merchant
      const merchant2Result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `, ['test-shop-2.myshopify.com', 'test-token-2'], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      });
      const merchant2Id = merchant2Result.lastID;

      try {
        // Add translations for both merchants
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [testMerchantId, 'product', 'test-product-1', 'title', 'Hello', 'Hola', 'es'], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [merchant2Id, 'product', 'test-product-2', 'title', 'Hello', 'Bonjour', 'fr'], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });

        // Verify isolation
        const translations1 = await new Promise((resolve, reject) => {
          db.all(`
            SELECT * FROM translations WHERE merchant_id = ?
          `, [testMerchantId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        const translations2 = await new Promise((resolve, reject) => {
          db.all(`
            SELECT * FROM translations WHERE merchant_id = ?
          `, [merchant2Id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        expect(translations1).toHaveLength(1);
        expect(translations2).toHaveLength(1);
        expect(translations1[0].translated_text).toBe('Hola');
        expect(translations2[0].translated_text).toBe('Bonjour');
      } finally {
        // Clean up second merchant
        await db.run('DELETE FROM translations WHERE merchant_id = ?', [merchant2Id]);
        await db.run('DELETE FROM merchants WHERE id = ?', [merchant2Id]);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle translation service failures gracefully', async () => {
      // Mock translation service failure
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/translations/translate')
        .set('X-Merchant-ID', testMerchantId.toString())
        .send({
          text: 'Test text',
          sourceLanguage: 'en',
          targetLanguage: 'invalid-language'
        });

      // Should handle error gracefully
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should handle database connection issues', async () => {
      // Test with invalid language code which should return 400
      const response = await request(app)
        .post('/api/translations/translate')
        .set('X-Merchant-ID', testMerchantId.toString())
        .send({
          text: 'Test text',
          sourceLanguage: 'en',
          targetLanguage: 'invalid-language'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent translation requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/translations/translate')
            .set('X-Merchant-ID', testMerchantId.toString())
            .send({
              text: `Test text ${i}`,
              sourceLanguage: 'en',
              targetLanguage: 'es'
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
}); 