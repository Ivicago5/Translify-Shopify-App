const Queue = require('bull');
const translationService = require('../services/translationService');
const shopifyService = require('../services/shopifyService');
const Translation = require('../models/Translation');
const Merchant = require('../models/Merchant');

// Create Redis connection URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create queues
let translationQueue, syncQueue, webhookQueue;
let jobQueue;

/**
 * Initialize job queue
 */
async function initJobQueue() {
  try {
    // Check if Redis is available
    const Redis = require('redis');
    const redisClient = Redis.createClient({ url: redisUrl });
    
    try {
      await redisClient.connect();
      await redisClient.ping();
      await redisClient.disconnect();
      
      // Redis is available, create Bull queues
      translationQueue = new Queue('translation', redisUrl);
      syncQueue = new Queue('sync', redisUrl);
      webhookQueue = new Queue('webhook', redisUrl);
      
      // Set up translation queue processors
      translationQueue.process('translation_job', async (job) => {
        const { type, ...data } = job.data;
        
        switch (type) {
          case 'auto_translate':
            return await processAutoTranslate(data);
          case 'batch_translate':
            return await processBatchTranslate(data);
          case 'create_translations':
            return await processCreateTranslations(data);
          default:
            throw new Error(`Unknown job type: ${type}`);
        }
      });

      // Set up sync queue processors
      syncQueue.process('sync_job', async (job) => {
        const { type, ...data } = job.data;
        
        console.log('Processing sync job:', { type, data });
        
        switch (type) {
          case 'sync_to_shopify':
            return await processSyncToShopify(data);
          case 'fetch_from_shopify':
            return await processFetchFromShopify(data);
          default:
            throw new Error(`Unknown sync job type: ${type}`);
        }
      });

      // Set up webhook queue processors
      webhookQueue.process('webhook_job', async (job) => {
        const { type, ...data } = job.data;
        
        switch (type) {
          case 'process_webhook':
            return await processWebhook(data);
          default:
            throw new Error(`Unknown webhook job type: ${type}`);
        }
      });

      // Handle failed jobs
      translationQueue.on('failed', (job, err) => {
        console.error('Translation job failed:', job.id, err);
      });

      syncQueue.on('failed', (job, err) => {
        console.error('Sync job failed:', job.id, err);
      });

      webhookQueue.on('failed', (job, err) => {
        console.error('Webhook job failed:', job.id, err);
      });

      jobQueue = {
        translation: translationQueue,
        sync: syncQueue,
        webhook: webhookQueue
      };

      console.log('✅ Job queues initialized with Redis');
      console.log('   - Translation queue: processing "translation_job"');
      console.log('   - Sync queue: processing "sync_job"');
      console.log('   - Webhook queue: processing "webhook_job"');
    } catch (redisError) {
      console.warn('⚠️  Redis not available, using in-memory job processing');
      console.warn('   For production, please install Redis: sudo apt install redis-server');
      
      // Create mock queues for development
      jobQueue = {
        translation: createMockQueue('translation'),
        sync: createMockQueue('sync'),
        webhook: createMockQueue('webhook')
      };
    }
  } catch (error) {
    console.error('❌ Failed to initialize job queues:', error);
    throw error;
  }
}

/**
 * Create a mock queue for development when Redis is not available
 */
function createMockQueue(name) {
  return {
    add: async (type, data, options = {}) => {
      console.log(`[MOCK QUEUE] ${name}: ${type}`, data);
      
      // Process immediately for development
      try {
        switch (name) {
          case 'translation':
            if (type === 'translation_job') {
              const { type: jobType, ...data } = data;
              if (jobType === 'auto_translate') {
                return await processAutoTranslate(data);
              } else if (jobType === 'batch_translate') {
                return await processBatchTranslate(data);
              } else if (jobType === 'create_translations') {
                return await processCreateTranslations(data);
              }
            }
            break;
          case 'sync':
            if (type === 'sync_job') {
              const { type: jobType, ...data } = data;
              if (jobType === 'sync_to_shopify') {
                return await processSyncToShopify(data);
              } else if (jobType === 'fetch_from_shopify') {
                return await processFetchFromShopify(data);
              }
            }
            break;
          case 'webhook':
            if (type === 'webhook_job') {
              const { type: jobType, ...data } = data;
              if (jobType === 'process_webhook') {
                return await processWebhook(data);
              }
            }
            break;
        }
        
        return { id: Date.now(), success: true };
      } catch (error) {
        console.error(`[MOCK QUEUE] Error processing ${name}:${type}:`, error);
        throw error;
      }
    },
    getWaiting: async () => [],
    getActive: async () => [],
    getCompleted: async () => [],
    getFailed: async () => [],
    clean: async () => {},
    close: async () => {}
  };
}

/**
 * Process auto-translate job
 */
async function processAutoTranslate(data) {
  const { translationId } = data;
  
  try {
    const result = await translationService.autoTranslate(translationId);
    return { success: true, result };
  } catch (error) {
    console.error('Auto-translate job failed:', error);
    throw error;
  }
}

/**
 * Process batch translate job
 */
async function processBatchTranslate(data) {
  const { merchantId, language, limit } = data;
  
  try {
    const result = await translationService.autoTranslateBatch(merchantId, language, limit);
    return { success: true, result };
  } catch (error) {
    console.error('Batch translate job failed:', error);
    throw error;
  }
}

/**
 * Process create translations job
 */
async function processCreateTranslations(data) {
  const { merchantId, resource, resourceType, resourceId, languages } = data;
  
  try {
    const result = await translationService.createTranslationRecords(
      merchantId, resource, resourceType, resourceId, languages
    );
    return { success: true, result };
  } catch (error) {
    console.error('Create translations job failed:', error);
    throw error;
  }
}

/**
 * Process sync to Shopify job
 */
async function processSyncToShopify(data) {
  const { merchantId, translationIds } = data;
  
  console.log('Processing sync to Shopify job:', { merchantId, translationIds });
  
  try {
    // Fetch translations that need to be synced
    const translations = await Promise.all(
      translationIds.map(id => Translation.findById(id))
    );
    
    const validTranslations = translations.filter(t => t && t.status === 'completed');
    
    console.log('Valid translations to sync:', validTranslations.length);
    
    if (validTranslations.length === 0) {
      return { success: true, synced: 0, message: 'No translations to sync' };
    }
    
    const result = await shopifyService.pushTranslations(merchantId, validTranslations);
    
    // Mark translations as synced
    await Promise.all(
      validTranslations.map(translation =>
        Translation.update(translation.id, { status: 'synced' })
      )
    );
    
    console.log('Sync to Shopify completed:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Sync to Shopify job failed:', error);
    throw error;
  }
}

/**
 * Process fetch from Shopify job
 */
async function processFetchFromShopify(data) {
  const { merchantId, resourceType, languages } = data;
  
  try {
    let resources = [];
    
    // Fetch resources based on type
    switch (resourceType) {
      case 'products':
        resources = await shopifyService.fetchProducts(merchantId);
        break;
      case 'pages':
        resources = await shopifyService.fetchPages(merchantId);
        break;
      case 'blogs':
        resources = await shopifyService.fetchBlogs(merchantId);
        break;
      case 'articles':
        resources = await shopifyService.fetchArticles(merchantId);
        break;
      case 'collections':
        resources = await shopifyService.fetchCollections(merchantId);
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
    
    // Create translation records for each resource
    const results = [];
    for (const resource of resources) {
      try {
        const result = await translationService.createTranslationRecords(
          merchantId, resource, resourceType, resource.id, languages
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to create translations for ${resourceType} ${resource.id}:`, error);
      }
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Fetch from Shopify job failed:', error);
    throw error;
  }
}

/**
 * Process webhook job
 */
async function processWebhook(data) {
  const { merchantId, topic, resource } = data;
  
  try {
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      throw new Error('Merchant not found');
    }
    
    // Extract resource type from webhook topic
    const resourceType = topic.split('/')[0]; // e.g., 'products/create' -> 'products'
    const action = topic.split('/')[1]; // e.g., 'products/create' -> 'create'
    
    if (action === 'delete') {
      // Handle deletion - remove translation records
      // This would require additional logic to handle deletions
      return { success: true, action: 'delete', resourceType };
    } else {
      // Handle create/update - create or update translation records
      const languages = merchant.settings.languages || ['es', 'fr', 'de']; // Default languages
      
      const result = await translationService.createTranslationRecords(
        merchantId, resource, resourceType, resource.id.toString(), languages
      );
      
      return { success: true, action, resourceType, result };
    }
  } catch (error) {
    console.error('Webhook job failed:', error);
    throw error;
  }
}

/**
 * Add job to translation queue
 */
async function addTranslationJob(type, data, options = {}) {
  if (!jobQueue) {
    throw new Error('Job queue not initialized');
  }
  
  return await jobQueue.translation.add('translation_job', { type, ...data }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    ...options
  });
}

/**
 * Add job to sync queue
 */
async function addSyncJob(type, data, options = {}) {
  if (!jobQueue) {
    throw new Error('Job queue not initialized');
  }
  
  console.log('Adding sync job:', { type, data });
  
  return await jobQueue.sync.add('sync_job', { type, ...data }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    ...options
  });
}

/**
 * Add job to webhook queue
 */
async function addWebhookJob(type, data, options = {}) {
  if (!jobQueue) {
    throw new Error('Job queue not initialized');
  }
  
  return await jobQueue.webhook.add('webhook_job', { type, ...data }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    ...options
  });
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  if (!jobQueue) {
    throw new Error('Job queue not initialized');
  }
  
  const stats = {};
  
  for (const [name, queue] of Object.entries(jobQueue)) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ]);
    
    stats[name] = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }
  
  return stats;
}

/**
 * Clean up completed jobs
 */
async function cleanCompletedJobs() {
  if (!jobQueue) {
    throw new Error('Job queue not initialized');
  }
  
  for (const queue of Object.values(jobQueue)) {
    await queue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean jobs older than 24 hours
    await queue.clean(24 * 60 * 60 * 1000, 'failed');
  }
}

/**
 * Close all queues
 */
async function closeQueues() {
  if (!jobQueue) {
    return;
  }
  
  for (const queue of Object.values(jobQueue)) {
    await queue.close();
  }
  
  console.log('Job queues closed');
}

module.exports = {
  initJobQueue,
  addTranslationJob,
  addSyncJob,
  addWebhookJob,
  getQueueStats,
  cleanCompletedJobs,
  closeQueues
};
