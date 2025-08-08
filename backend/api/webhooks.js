const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Merchant = require('../models/Merchant');
const { addWebhookJob } = require('../jobs/translationJob');

/**
 * Verify Shopify webhook signature
 */
function verifyWebhook(req, res, next) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const topicHeader = req.get('X-Shopify-Topic');
  const shopHeader = req.get('X-Shopify-Shop-Domain');
  
  if (!hmacHeader || !topicHeader || !shopHeader) {
    return res.status(401).json({ error: 'Missing required headers' });
  }
  
  // Get the raw body
  const rawBody = JSON.stringify(req.body);
  
  // Calculate HMAC
  const calculatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64');
  
  // Compare HMACs
  if (calculatedHmac !== hmacHeader) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  
  // Add verified data to request
  req.webhookData = {
    topic: topicHeader,
    shopDomain: shopHeader,
    verified: true
  };
  
  next();
}

/**
 * Main webhook handler
 */
router.post('/', verifyWebhook, async (req, res, next) => {
  try {
    const { topic, shopDomain } = req.webhookData;
    const resource = req.body;
    
    // Find merchant by shop domain
    const merchant = await Merchant.findByDomain(shopDomain);
    if (!merchant) {
      console.error(`Merchant not found for shop: ${shopDomain}`);
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Add webhook processing job to queue
    const job = await addWebhookJob('process_webhook', {
      merchantId: merchant.id,
      topic,
      resource
    });
    
    console.log(`Webhook queued: ${topic} for shop ${shopDomain}, job ID: ${job.id}`);
    
    res.status(200).json({ 
      message: 'Webhook received and queued',
      jobId: job.id
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    next(error);
  }
});

/**
 * Webhook test endpoint (for development)
 */
router.post('/test', async (req, res, next) => {
  try {
    const { merchantId, topic, resource } = req.body;
    
    if (!merchantId || !topic || !resource) {
      return res.status(400).json({ 
        error: 'merchantId, topic, and resource are required' 
      });
    }
    
    // Add webhook processing job to queue
    const job = await addWebhookJob('process_webhook', {
      merchantId: parseInt(merchantId),
      topic,
      resource
    });
    
    res.json({
      message: 'Test webhook queued',
      jobId: job.id
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get webhook status for a merchant
 */
router.get('/status/:merchantId', async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    
    // Check if merchant exists
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Test Shopify connection
    const shopifyService = require('../services/shopifyService');
    const connectionTest = await shopifyService.testConnection(merchantId);
    
    res.json({
      merchant: {
        id: merchant.id,
        shop_domain: merchant.shop_domain,
        created_at: merchant.created_at
      },
      connection: connectionTest,
      webhooks_enabled: true // This would be stored in merchant settings
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Enable webhooks for a merchant
 */
router.post('/enable/:merchantId', async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    
    // Check if merchant exists
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Create webhooks in Shopify
    const shopifyService = require('../services/shopifyService');
    const webhooks = await shopifyService.createWebhooks(merchantId, merchant.shop_domain);
    
    // Update merchant settings to indicate webhooks are enabled
    const currentSettings = merchant.settings || {};
    currentSettings.webhooks_enabled = true;
    currentSettings.webhook_count = webhooks.length;
    
    await Merchant.updateSettings(merchantId, currentSettings);
    
    res.json({
      message: 'Webhooks enabled successfully',
      webhooks_created: webhooks.length,
      webhooks
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Disable webhooks for a merchant
 */
router.post('/disable/:merchantId', async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    
    // Check if merchant exists
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Delete webhooks from Shopify
    const shopifyService = require('../services/shopifyService');
    const result = await shopifyService.deleteWebhooks(merchantId);
    
    // Update merchant settings to indicate webhooks are disabled
    const currentSettings = merchant.settings || {};
    currentSettings.webhooks_enabled = false;
    currentSettings.webhook_count = 0;
    
    await Merchant.updateSettings(merchantId, currentSettings);
    
    res.json({
      message: 'Webhooks disabled successfully',
      webhooks_deleted: result.deleted
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get webhook events for a merchant (recent webhook processing history)
 */
router.get('/events/:merchantId', async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Check if merchant exists
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    // Get webhook job history from queue
    const { getQueueStats } = require('../jobs/translationJob');
    const queueStats = await getQueueStats();
    
    // For now, return queue statistics
    // In a real implementation, you'd store webhook events in the database
    res.json({
      merchant_id: merchantId,
      queue_stats: queueStats.webhook,
      recent_events: [] // This would be populated from a webhook_events table
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Webhook health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    webhook_endpoint: '/api/webhooks'
  });
});

module.exports = router;
