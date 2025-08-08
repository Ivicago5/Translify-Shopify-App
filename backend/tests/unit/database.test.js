const { getDatabase, initDatabase, createTables, runMigrations, getMigrationStatus } = require('../../db/index');
const path = require('path');
const fs = require('fs');

// Mock environment for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite://./test.db';

describe('Database Operations', () => {
  let db;

  beforeAll(async () => {
    // Initialize test database
    db = getDatabase();
    await initDatabase();
    
    // Wait for database to be ready
    await new Promise((resolve) => {
      db.get('SELECT 1', (err) => {
        if (err) {
          console.error('Database not ready:', err);
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Clean up test database
    if (fs.existsSync('./test.db')) {
      fs.unlinkSync('./test.db');
    }
  });

  beforeEach(async () => {
    // Clear database before each test
    await db.run('DELETE FROM merchants');
    await db.run('DELETE FROM translations');
    await db.run('DELETE FROM glossaries');
    await db.run('DELETE FROM translation_memory');
    await db.run('DELETE FROM translation_jobs');
  });

  describe('Merchant Operations', () => {
    test('should create merchant record', async () => {
      const merchant = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `, ['test-shop.myshopify.com', 'test-token'], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });

      expect(merchant.lastID).toBeDefined();
      expect(merchant.changes).toBe(1);
    });

    test('should retrieve merchant by domain', async () => {
      // Insert test merchant
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `, ['test-shop.myshopify.com', 'test-token'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      const merchant = await new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM merchants WHERE shop_domain = ?
        `, ['test-shop.myshopify.com'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      expect(merchant).toBeDefined();
      expect(merchant.shop_domain).toBe('test-shop.myshopify.com');
      expect(merchant.access_token).toBe('test-token');
    });
  });

  describe('Translation Operations', () => {
    test('should store translation', async () => {
      const result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [1, 'product', 'test-product', 'title', 'Hello World', 'Hola Mundo', 'es'], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });

      expect(result.lastID).toBeDefined();
      expect(result.changes).toBe(1);
    });

    test('should retrieve translations by merchant', async () => {
      // First create a merchant
      const merchantResult = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `, ['test-merchant.myshopify.com', 'test-token'], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      });

      // Insert test translations
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, created_at)
          VALUES 
          (?, 'product', 'test-product-1', 'title', 'Hello', 'Hola', 'es', datetime('now')),
          (?, 'product', 'test-product-2', 'title', 'World', 'Mundo', 'es', datetime('now'))
        `, [merchantResult.lastID, merchantResult.lastID], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      const translations = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM translations WHERE merchant_id = ?
        `, [merchantResult.lastID], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      expect(translations).toHaveLength(2);
      expect(translations[0].original_text).toBe('Hello');
      expect(translations[1].original_text).toBe('World');
    });
  });

  describe('Glossary Operations', () => {
    test('should store glossary term', async () => {
      const result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO glossaries (merchant_id, term, translation, context, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [1, 'Premium', 'Premium', 'Brand term'], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });

      expect(result.lastID).toBeDefined();
      expect(result.changes).toBe(1);
    });

    test('should retrieve glossary by merchant', async () => {
      // First create a merchant
      const merchantResult = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `, ['test-glossary-merchant.myshopify.com', 'test-token'], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      });

      // Insert test glossary terms
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO glossaries (merchant_id, term, translation, context, created_at, updated_at)
          VALUES 
          (?, 'Premium', 'Premium', 'Brand term', datetime('now'), datetime('now')),
          (?, 'Wireless', 'Inalámbrico', 'Technical term', datetime('now'), datetime('now'))
        `, [merchantResult.lastID, merchantResult.lastID], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      const glossary = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM glossaries WHERE merchant_id = ?
        `, [merchantResult.lastID], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      expect(glossary).toHaveLength(2);
      expect(glossary[0].term).toBe('Premium');
      expect(glossary[1].term).toBe('Wireless');
    });
  });

  describe('Migration Operations', () => {
    test('should get migration status', async () => {
      const status = await getMigrationStatus();
      expect(status).toBeDefined();
      expect(status.applied).toBeDefined();
      expect(status.pending).toBeDefined();
    });

    test('should run migrations', async () => {
      const result = await runMigrations();
      expect(result.success).toBe(true);
      expect(result.applied).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Isolation', () => {
    test('should isolate merchant data', async () => {
      // Create two merchants
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `, ['shop1.myshopify.com', 'token1'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `, ['shop2.myshopify.com', 'token2'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Add translations for both merchants
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [1, 'product', 'test-product-1', 'title', 'Hello', 'Hola', 'es'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO translations (merchant_id, resource_type, resource_id, resource_key, original_text, translated_text, language, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [2, 'product', 'test-product-2', 'title', 'Hello', 'Bonjour', 'fr'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Verify isolation
      const translations1 = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM translations WHERE merchant_id = ?
        `, [1], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const translations2 = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM translations WHERE merchant_id = ?
        `, [2], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      expect(translations1).toHaveLength(1);
      expect(translations2).toHaveLength(1);
      expect(translations1[0].translated_text).toBe('Hola');
      expect(translations2[0].translated_text).toBe('Bonjour');
    });
  });
}); 