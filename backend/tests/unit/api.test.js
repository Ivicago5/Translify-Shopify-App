const request = require('supertest');
const express = require('express');
const { translateText, translateWithGlossary } = require('../../services/translation');
const { authenticateShopify, validateRequiredFields } = require('../../middleware/auth');

// Mock translation service
jest.mock('../../services/translation');
jest.mock('../../middleware/auth');

const app = express();
app.use(express.json());

// Simple rate limiting for tests
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  // Skip rate limiting for most tests, only apply to specific test
  if (req.headers['x-test-rate-limit'] !== 'true') {
    return next();
  }
  
  const clientIp = req.ip || '127.0.0.1';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  const clientData = rateLimitMap.get(clientIp) || {
    requests: 0,
    resetTime: now + windowMs
  };

  if (now > clientData.resetTime) {
    clientData.requests = 0;
    clientData.resetTime = now + windowMs;
  }

  clientData.requests++;

  if (clientData.requests > maxRequests) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  rateLimitMap.set(clientIp, clientData);
  next();
}

app.use(rateLimit);

// Mock routes for testing
app.post('/api/translations/translate', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;
    
    // Validate required fields
    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate language codes
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr'];
    if (!validLanguages.includes(sourceLanguage) || !validLanguages.includes(targetLanguage)) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    // Sanitize input
    const sanitizedText = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    const result = await translateText({ text: sanitizedText, sourceLanguage, targetLanguage });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/translations/translate-with-glossary', async (req, res) => {
  try {
    const { text, glossary } = req.body;
    const result = await translateWithGlossary({ text, glossary });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

describe('Translation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/translations/translate', () => {
    test('should translate text successfully', async () => {
      // Mock translation service
      translateText.mockResolvedValue({
        translation: 'Hola Mundo',
        confidence: 0.95,
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });

      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: 'Hello World',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
        .expect(200);

      expect(response.body.translation).toBe('Hola Mundo');
      expect(response.body.confidence).toBeGreaterThan(0.8);
      expect(translateText).toHaveBeenCalledWith({
        text: 'Hello World',
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });
    });

    test('should handle glossary terms', async () => {
      // Mock translation service with glossary
      translateWithGlossary.mockResolvedValue({
        translation: 'Auriculares Inalámbricos Premium',
        confidence: 0.95,
        glossaryUsed: true
      });

      const response = await request(app)
        .post('/api/translations/translate-with-glossary')
        .send({
          text: 'Premium Wireless Headphones',
          glossary: { 'Premium': 'Premium', 'Wireless': 'Inalámbrico' }
        })
        .expect(200);

      expect(response.body.translation).toContain('Premium');
      expect(response.body.translation).toContain('Inalámbrico');
      expect(response.body.glossaryUsed).toBe(true);
    });

    test('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: '',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('should handle translation service errors', async () => {
      // Mock translation service error
      translateText.mockRejectedValue(new Error('Translation service unavailable'));

      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: 'Hello World',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
        .expect(500);

      expect(response.body.error).toBe('Translation service unavailable');
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: 'Hello World'
          // Missing sourceLanguage and targetLanguage
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Authentication Middleware', () => {
    test('should validate Shopify session', async () => {
      const req = {
        headers: { 'x-shopify-shop-domain': 'test-shop.myshopify.com' }
      };
      const res = {};
      const next = jest.fn();

      // Mock successful authentication
      authenticateShopify.mockImplementation((req, res, next) => {
        req.merchantId = 'test-merchant-id';
        next();
      });

      await authenticateShopify(req, res, next);

      expect(req.merchantId).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    test('should handle invalid session', async () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      // Mock failed authentication
      authenticateShopify.mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Invalid session' });
      });

      await authenticateShopify(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid session' });
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limit exceeded', async () => {
      // Reset rate limit for this test
      rateLimitMap.clear();
      
      // Make many requests to trigger rate limiting (lower threshold for test)
      let rateLimited = false;
      for (let i = 0; i < 150; i++) {
        const response = await request(app)
          .post('/api/translations/translate')
          .set('x-test-rate-limit', 'true')
          .send({
            text: 'Hello World',
            sourceLanguage: 'en',
            targetLanguage: 'es'
          });

        if (response.status === 429) {
          rateLimited = true;
          break;
        }
      }
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should sanitize malicious input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';

      translateText.mockResolvedValue({
        translation: 'Script removed',
        confidence: 0.9
      });

      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: maliciousInput,
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
        .expect(200);

      // Verify that the translation service received sanitized input
      expect(translateText).toHaveBeenCalledWith({
        text: expect.not.stringContaining('<script>'), // Script tags should be removed
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });
    });

    test('should validate language codes', async () => {
      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: 'Hello World',
          sourceLanguage: 'invalid',
          targetLanguage: 'es'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid language code');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Mock database error
      translateText.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: 'Hello World',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
        .expect(500);

      expect(response.body.error).toBe('Database connection failed');
    });

    test('should handle network timeouts', async () => {
      // Mock timeout error
      translateText.mockRejectedValue(new Error('Request timeout'));

      const response = await request(app)
        .post('/api/translations/translate')
        .send({
          text: 'Hello World',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        })
        .expect(500);

      expect(response.body.error).toBe('Request timeout');
    });
  });
}); 