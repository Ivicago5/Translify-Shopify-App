import { DeliveryMethod } from "@shopify/shopify-api";
import { Translation } from "../backend/models/Translation.js";
import { getDatabase } from "../backend/db/index.js";

/**
 * Webhook handlers for product changes
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  /**
   * Handle product creation
   */
  PRODUCTS_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        console.log('🔄 Product created:', payload.id);
        
        // Add product to translation queue
        await addProductToTranslationQueue(shop, payload);
        
      } catch (error) {
        console.error('❌ Error handling product creation webhook:', error);
      }
    },
  },

  /**
   * Handle product updates
   */
  PRODUCTS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        console.log('🔄 Product updated:', payload.id);
        
        // Update existing translations or add new ones
        await updateProductTranslations(shop, payload);
        
      } catch (error) {
        console.error('❌ Error handling product update webhook:', error);
      }
    },
  },

  /**
   * Handle product deletion
   */
  PRODUCTS_DELETE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        console.log('🔄 Product deleted:', payload.id);
        
        // Mark translations as deleted
        await markProductTranslationsDeleted(shop, payload.id);
        
      } catch (error) {
        console.error('❌ Error handling product deletion webhook:', error);
      }
    },
  },

  /**
   * Handle page creation
   */
  PAGES_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        console.log('🔄 Page created:', payload.id);
        
        // Add page to translation queue
        await addPageToTranslationQueue(shop, payload);
        
      } catch (error) {
        console.error('❌ Error handling page creation webhook:', error);
      }
    },
  },

  /**
   * Handle page updates
   */
  PAGES_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        console.log('🔄 Page updated:', payload.id);
        
        // Update existing translations or add new ones
        await updatePageTranslations(shop, payload);
        
      } catch (error) {
        console.error('❌ Error handling page update webhook:', error);
      }
    },
  },
};

/**
 * Add product to translation queue
 */
async function addProductToTranslationQueue(shop, product) {
  try {
    const db = getDatabase();
    
    // Get merchant ID from shop domain
    const merchant = await db.getRow(
      'SELECT id FROM merchants WHERE shop_domain = $1',
      [shop]
    );
    
    if (!merchant) {
      console.log('⚠️ Merchant not found for shop:', shop);
      return;
    }
    
    const merchantId = merchant.id;
    const translatableFields = [
      { field: 'title', value: product.title },
      { field: 'body_html', value: product.body_html },
      { field: 'meta_title', value: product.meta_title },
      { field: 'meta_description', value: product.meta_description }
    ];
    
    // Create translation records for each translatable field
    for (const { field, value } of translatableFields) {
      if (value && value.trim()) {
        await Translation.create({
          merchant_id: merchantId,
          resource_type: 'product',
          resource_id: product.id.toString(),
          field: field,
          original_text: value,
          translated_text: null,
          language: 'en', // Source language
          status: 'pending',
          auto_translated: false
        });
      }
    }
    
    console.log('✅ Product added to translation queue:', product.id);
    
  } catch (error) {
    console.error('❌ Error adding product to translation queue:', error);
  }
}

/**
 * Update product translations
 */
async function updateProductTranslations(shop, product) {
  try {
    const db = getDatabase();
    
    // Get merchant ID from shop domain
    const merchant = await db.getRow(
      'SELECT id FROM merchants WHERE shop_domain = $1',
      [shop]
    );
    
    if (!merchant) {
      console.log('⚠️ Merchant not found for shop:', shop);
      return;
    }
    
    const merchantId = merchant.id;
    const translatableFields = [
      { field: 'title', value: product.title },
      { field: 'body_html', value: product.body_html },
      { field: 'meta_title', value: product.meta_title },
      { field: 'meta_description', value: product.meta_description }
    ];
    
    // Update or create translation records
    for (const { field, value } of translatableFields) {
      if (value && value.trim()) {
        // Check if translation exists
        const existingTranslation = await db.getRow(
          'SELECT * FROM translations WHERE merchant_id = $1 AND resource_type = $2 AND resource_id = $3 AND field = $4',
          [merchantId, 'product', product.id.toString(), field]
        );
        
        if (existingTranslation) {
          // Update existing translation if original text changed
          if (existingTranslation.original_text !== value) {
            await db.update(
              'UPDATE translations SET original_text = $1, status = $2, updated_at = $3 WHERE id = $4',
              [value, 'pending', new Date().toISOString(), existingTranslation.id]
            );
          }
        } else {
          // Create new translation record
          await Translation.create({
            merchant_id: merchantId,
            resource_type: 'product',
            resource_id: product.id.toString(),
            field: field,
            original_text: value,
            translated_text: null,
            language: 'en',
            status: 'pending',
            auto_translated: false
          });
        }
      }
    }
    
    console.log('✅ Product translations updated:', product.id);
    
  } catch (error) {
    console.error('❌ Error updating product translations:', error);
  }
}

/**
 * Mark product translations as deleted
 */
async function markProductTranslationsDeleted(shop, productId) {
  try {
    const db = getDatabase();
    
    // Get merchant ID from shop domain
    const merchant = await db.getRow(
      'SELECT id FROM merchants WHERE shop_domain = $1',
      [shop]
    );
    
    if (!merchant) {
      console.log('⚠️ Merchant not found for shop:', shop);
      return;
    }
    
    // Mark all translations for this product as deleted
    await db.update(
      'UPDATE translations SET status = $1, updated_at = $2 WHERE merchant_id = $3 AND resource_type = $4 AND resource_id = $5',
      ['deleted', new Date().toISOString(), merchant.id, 'product', productId.toString()]
    );
    
    console.log('✅ Product translations marked as deleted:', productId);
    
  } catch (error) {
    console.error('❌ Error marking product translations as deleted:', error);
  }
}

/**
 * Add page to translation queue
 */
async function addPageToTranslationQueue(shop, page) {
  try {
    const db = getDatabase();
    
    // Get merchant ID from shop domain
    const merchant = await db.getRow(
      'SELECT id FROM merchants WHERE shop_domain = $1',
      [shop]
    );
    
    if (!merchant) {
      console.log('⚠️ Merchant not found for shop:', shop);
      return;
    }
    
    const merchantId = merchant.id;
    const translatableFields = [
      { field: 'title', value: page.title },
      { field: 'body_html', value: page.body_html },
      { field: 'meta_title', value: page.meta_title },
      { field: 'meta_description', value: page.meta_description }
    ];
    
    // Create translation records for each translatable field
    for (const { field, value } of translatableFields) {
      if (value && value.trim()) {
        await Translation.create({
          merchant_id: merchantId,
          resource_type: 'page',
          resource_id: page.id.toString(),
          field: field,
          original_text: value,
          translated_text: null,
          language: 'en',
          status: 'pending',
          auto_translated: false
        });
      }
    }
    
    console.log('✅ Page added to translation queue:', page.id);
    
  } catch (error) {
    console.error('❌ Error adding page to translation queue:', error);
  }
}

/**
 * Update page translations
 */
async function updatePageTranslations(shop, page) {
  try {
    const db = getDatabase();
    
    // Get merchant ID from shop domain
    const merchant = await db.getRow(
      'SELECT id FROM merchants WHERE shop_domain = $1',
      [shop]
    );
    
    if (!merchant) {
      console.log('⚠️ Merchant not found for shop:', shop);
      return;
    }
    
    const merchantId = merchant.id;
    const translatableFields = [
      { field: 'title', value: page.title },
      { field: 'body_html', value: page.body_html },
      { field: 'meta_title', value: page.meta_title },
      { field: 'meta_description', value: page.meta_description }
    ];
    
    // Update or create translation records
    for (const { field, value } of translatableFields) {
      if (value && value.trim()) {
        // Check if translation exists
        const existingTranslation = await db.getRow(
          'SELECT * FROM translations WHERE merchant_id = $1 AND resource_type = $2 AND resource_id = $3 AND field = $4',
          [merchantId, 'page', page.id.toString(), field]
        );
        
        if (existingTranslation) {
          // Update existing translation if original text changed
          if (existingTranslation.original_text !== value) {
            await db.update(
              'UPDATE translations SET original_text = $1, status = $2, updated_at = $3 WHERE id = $4',
              [value, 'pending', new Date().toISOString(), existingTranslation.id]
            );
          }
        } else {
          // Create new translation record
          await Translation.create({
            merchant_id: merchantId,
            resource_type: 'page',
            resource_id: page.id.toString(),
            field: field,
            original_text: value,
            translated_text: null,
            language: 'en',
            status: 'pending',
            auto_translated: false
          });
        }
      }
    }
    
    console.log('✅ Page translations updated:', page.id);
    
  } catch (error) {
    console.error('❌ Error updating page translations:', error);
  }
} 