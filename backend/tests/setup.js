// Test setup file
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite://./test.db';
process.env.GOOGLE_TRANSLATE_API_KEY = 'test-api-key';
process.env.SHOPIFY_API_KEY = 'test-shopify-key';
process.env.SHOPIFY_API_SECRET = 'test-shopify-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: console.log, // Temporarily unmock for debugging
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  createTestMerchant: async (db, shopDomain = 'test-shop.myshopify.com') => {
    const result = await db.run(`
      INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `, [shopDomain, 'test-token']);
    return result.lastID;
  },

  cleanupTestData: async (db, merchantId) => {
    await db.run('DELETE FROM translations WHERE merchant_id = ?', [merchantId]);
    await db.run('DELETE FROM glossaries WHERE merchant_id = ?', [merchantId]);
    await db.run('DELETE FROM merchants WHERE id = ?', [merchantId]);
  },

  waitForDatabase: async (db) => {
    return new Promise((resolve) => {
      const checkConnection = async () => {
        try {
          await db.get('SELECT 1');
          resolve();
        } catch (error) {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }
}; 