const { getDatabase } = require('../db/index');

/**
 * Authenticate Shopify session and set merchant context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticateShopify(req, res, next) {
  try {
    const shopDomain = req.headers['x-shopify-shop-domain'] || req.headers['x-shop-domain'];
    
    if (!shopDomain) {
      return res.status(401).json({ error: 'Shop domain not provided' });
    }

    const db = getDatabase();
    
    // Find or create merchant
    let merchant = await db.get(`
      SELECT * FROM merchants WHERE shop_domain = ?
    `, [shopDomain]);

    if (!merchant) {
      // Create new merchant record
      const result = await db.run(`
        INSERT INTO merchants (shop_domain, access_token, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `, [shopDomain, req.headers['x-shopify-access-token'] || 'default-token']);
      
      merchant = {
        id: result.lastID,
        shop_domain: shopDomain,
        access_token: req.headers['x-shopify-access-token'] || 'default-token'
      };
    }

    // Set merchant context
    req.merchantId = merchant.id;
    req.shopDomain = merchant.shop_domain;
    req.shopifySession = {
      shop: merchant.shop_domain,
      accessToken: merchant.access_token
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Development middleware to handle merchant ID from headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function handleDevelopmentMerchant(req, res, next) {
  // In development, allow merchant ID from header
  if (process.env.NODE_ENV === 'development') {
    const merchantId = req.headers['x-merchant-id'];
    if (merchantId) {
      req.merchantId = parseInt(merchantId);
      next();
      return;
    }
  }
  
  // Fall back to default merchant for development
  if (process.env.NODE_ENV === 'development') {
    req.merchantId = 1;
    next();
    return;
  }
  
  next();
}

/**
 * Validate API key for external API access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateApiKey(req, res, next) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // In production, validate against stored API keys
  // For now, accept any non-empty key
  if (!apiKey || apiKey === 'invalid-key') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.apiKey = apiKey;
  next();
}

/**
 * Rate limiting middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function rateLimit(req, res, next) {
  // Simple in-memory rate limiting
  // In production, use Redis or similar
  const clientIp = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = new Map();
  }

  const clientData = req.app.locals.rateLimit.get(clientIp) || {
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

  req.app.locals.rateLimit.set(clientIp, clientData);
  next();
}

/**
 * Validate required fields in request body
 * @param {Array} fields - Array of required field names
 * @returns {Function} Express middleware function
 */
function validateRequiredFields(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      if (!req.body[field] || req.body[field] === '') {
        return res.status(400).json({ 
          error: `Missing required field: ${field}` 
        });
      }
    }
    next();
  };
}

/**
 * Validate language codes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateLanguageCodes(req, res, next) {
  const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr'];
  
  if (req.body.sourceLanguage && !validLanguages.includes(req.body.sourceLanguage)) {
    return res.status(400).json({ 
      error: `Invalid language code: ${req.body.sourceLanguage}` 
    });
  }
  
  if (req.body.targetLanguage && !validLanguages.includes(req.body.targetLanguage)) {
    return res.status(400).json({ 
      error: `Invalid language code: ${req.body.targetLanguage}` 
    });
  }
  
  next();
}

/**
 * Sanitize input to prevent XSS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function sanitizeInput(req, res, next) {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove script tags and other potentially dangerous content
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }
  next();
}

module.exports = {
  authenticateShopify,
  handleDevelopmentMerchant,
  validateApiKey,
  rateLimit,
  validateRequiredFields,
  validateLanguageCodes,
  sanitizeInput
}; 