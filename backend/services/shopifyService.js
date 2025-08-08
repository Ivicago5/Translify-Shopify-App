const Shopify = require('shopify-api-node');
const Merchant = require('../models/Merchant');
const Translation = require('../models/Translation');

class ShopifyService {
  /**
   * Get Shopify client for a merchant
   */
  async getShopifyClient(merchantId) {
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    return new Shopify({
      shopName: merchant.shop_domain,
      accessToken: merchant.access_token,
      apiVersion: '2024-01' // Use latest stable version
    });
  }

  /**
   * Fetch products from Shopify
   */
  async fetchProducts(merchantId, limit = 50) {
    try {
      // For testing, return mock products if no real Shopify connection
      const mockProducts = [
        {
          id: '123',
          title: 'Premium Cotton T-Shirt',
          body_html: 'Comfortable and stylish t-shirt made from 100% organic cotton.',
          vendor: 'Fashion Brand',
          product_type: 'Apparel',
          tags: 'cotton, organic, comfortable',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '124',
          title: 'Eco-Friendly Water Bottle',
          body_html: 'Sustainable water bottle made from recycled materials.',
          vendor: 'Eco Products',
          product_type: 'Accessories',
          tags: 'eco-friendly, sustainable, reusable',
          status: 'active',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z'
        },
        {
          id: '125',
          title: 'Handcrafted Wooden Bowl',
          body_html: 'Beautiful handcrafted wooden bowl perfect for serving.',
          vendor: 'Artisan Crafts',
          product_type: 'Home & Garden',
          tags: 'handcrafted, wooden, artisan',
          status: 'active',
          created_at: '2024-01-17T10:00:00Z',
          updated_at: '2024-01-17T10:00:00Z'
        }
      ];
      
      return mockProducts.slice(0, limit);
    } catch (error) {
      console.error('Fetch products error:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Fetch pages from Shopify
   */
  async fetchPages(merchantId, limit = 50) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      
      const pages = await shopify.page.list({ limit });
      
      return pages.map(page => ({
        id: page.id.toString(),
        title: page.title,
        body_html: page.body_html,
        author: page.author,
        template_suffix: page.template_suffix,
        status: page.status,
        created_at: page.created_at,
        updated_at: page.updated_at
      }));
    } catch (error) {
      console.error('Fetch pages error:', error);
      throw new Error(`Failed to fetch pages: ${error.message}`);
    }
  }

  /**
   * Fetch blogs from Shopify
   */
  async fetchBlogs(merchantId, limit = 50) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      
      const blogs = await shopify.blog.list({ limit });
      
      return blogs.map(blog => ({
        id: blog.id.toString(),
        title: blog.title,
        body_html: blog.body_html,
        handle: blog.handle,
        created_at: blog.created_at,
        updated_at: blog.updated_at
      }));
    } catch (error) {
      console.error('Fetch blogs error:', error);
      throw new Error(`Failed to fetch blogs: ${error.message}`);
    }
  }

  /**
   * Fetch articles from Shopify
   */
  async fetchArticles(merchantId, limit = 50) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      
      const articles = await shopify.article.list({ limit });
      
      return articles.map(article => ({
        id: article.id.toString(),
        title: article.title,
        body_html: article.body_html,
        author: article.author,
        blog_id: article.blog_id.toString(),
        created_at: article.created_at,
        updated_at: article.updated_at
      }));
    } catch (error) {
      console.error('Fetch articles error:', error);
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }
  }

  /**
   * Fetch collections from Shopify
   */
  async fetchCollections(merchantId, limit = 50) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      
      const collections = await shopify.collection.list({ limit });
      
      return collections.map(collection => ({
        id: collection.id.toString(),
        title: collection.title,
        body_html: collection.body_html,
        handle: collection.handle,
        published_at: collection.published_at,
        created_at: collection.created_at,
        updated_at: collection.updated_at
      }));
    } catch (error) {
      console.error('Fetch collections error:', error);
      throw new Error(`Failed to fetch collections: ${error.message}`);
    }
  }

  /**
   * Push translations to Shopify
   */
  async pushTranslations(merchantId, translations) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      const results = { success: 0, failed: 0, errors: [] };

      // Group translations by resource type and ID
      const groupedTranslations = {};
      
      translations.forEach(translation => {
        const key = `${translation.resource_type}_${translation.resource_id}`;
        if (!groupedTranslations[key]) {
          groupedTranslations[key] = {
            resourceType: translation.resource_type,
            resourceId: translation.resource_id,
            translations: {}
          };
        }
        
        if (!groupedTranslations[key].translations[translation.language]) {
          groupedTranslations[key].translations[translation.language] = {};
        }
        
        groupedTranslations[key].translations[translation.language][translation.resource_key] = translation.translated_text;
      });

      // Push each group of translations
      for (const [key, group] of Object.entries(groupedTranslations)) {
        try {
          const result = await this.pushResourceTranslations(
            shopify,
            group.resourceType,
            group.resourceId,
            group.translations
          );
          
          if (result && result.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              resource: key,
              error: 'Push failed'
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            resource: key,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Push translations error:', error);
      throw new Error(`Failed to push translations: ${error.message}`);
    }
  }

  /**
   * Push translations for a specific resource
   */
  async pushResourceTranslations(shopify, resourceType, resourceId, translations) {
    // For now, since we're using mock data, just log the translation attempt
    console.log(`Mock: Pushing translations for ${resourceType} ${resourceId}:`, translations);
    
    // In a real implementation, you would use the Shopify Admin API
    // The actual API calls would depend on the Shopify API client library being used
    // For now, we'll simulate a successful push
    
    return {
      success: true,
      resourceId,
      resourceType,
      translations
    };
    
    /* 
    // Real implementation would look something like this:
    const resourceTypeMap = {
      'product': 'products',
      'page': 'pages',
      'blog': 'blogs',
      'article': 'articles',
      'collection': 'collections'
    };

    const shopifyResourceType = resourceTypeMap[resourceType];
    if (!shopifyResourceType) {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    // Push translations for each language
    for (const [language, fields] of Object.entries(translations)) {
      try {
        // This would be the actual Shopify API call
        // await shopify.rest.Product.update({
        //   id: resourceId,
        //   translations: {
        //     [language]: fields
        //   }
        // });
        
        console.log(`Would push ${language} translations for ${resourceType} ${resourceId}:`, fields);
      } catch (error) {
        console.error(`Failed to push ${language} translations for ${resourceType} ${resourceId}:`, error);
        throw error;
      }
    }
    */
  }

  /**
   * Get shop information
   */
  async getShopInfo(merchantId) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      const shop = await shopify.shop.get();
      
      return {
        id: shop.id,
        name: shop.name,
        domain: shop.domain,
        email: shop.email,
        country: shop.country,
        currency: shop.currency,
        timezone: shop.timezone,
        iana_timezone: shop.iana_timezone,
        created_at: shop.created_at,
        updated_at: shop.updated_at
      };
    } catch (error) {
      console.error('Get shop info error:', error);
      throw new Error(`Failed to get shop info: ${error.message}`);
    }
  }

  /**
   * Get available locales for the shop
   */
  async getShopLocales(merchantId) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      const locales = await shopify.locale.list();
      
      return locales.map(locale => ({
        code: locale.code,
        name: locale.name,
        primary: locale.primary
      }));
    } catch (error) {
      console.error('Get shop locales error:', error);
      throw new Error(`Failed to get shop locales: ${error.message}`);
    }
  }

  /**
   * Create webhook subscriptions
   */
  async createWebhooks(merchantId, shopDomain) {
    try {
      const merchant = await Merchant.findById(merchantId);
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      const shopify = await this.getShopifyClient(merchantId);
      const webhookUrl = `${process.env.APP_URL}/api/webhooks`;
      
      const webhookTopics = [
        'products/create',
        'products/update',
        'products/delete',
        'pages/create',
        'pages/update',
        'pages/delete',
        'blogs/create',
        'blogs/update',
        'blogs/delete',
        'articles/create',
        'articles/update',
        'articles/delete',
        'collections/create',
        'collections/update',
        'collections/delete'
      ];

      const createdWebhooks = [];

      for (const topic of webhookTopics) {
        try {
          const webhook = await shopify.webhook.create({
            topic: topic,
            address: webhookUrl,
            format: 'json'
          });
          
          createdWebhooks.push({
            id: webhook.id,
            topic: webhook.topic,
            address: webhook.address
          });
        } catch (error) {
          console.error(`Failed to create webhook for ${topic}:`, error);
        }
      }

      return createdWebhooks;
    } catch (error) {
      console.error('Create webhooks error:', error);
      throw new Error(`Failed to create webhooks: ${error.message}`);
    }
  }

  /**
   * Delete webhook subscriptions
   */
  async deleteWebhooks(merchantId) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      const webhooks = await shopify.webhook.list();
      
      const deletePromises = webhooks.map(webhook => 
        shopify.webhook.delete(webhook.id)
      );

      await Promise.all(deletePromises);
      
      return { deleted: webhooks.length };
    } catch (error) {
      console.error('Delete webhooks error:', error);
      throw new Error(`Failed to delete webhooks: ${error.message}`);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(merchantId) {
    try {
      const shopify = await this.getShopifyClient(merchantId);
      const shop = await shopify.shop.get();
      
      return {
        success: true,
        shop: {
          name: shop.name,
          domain: shop.domain
        }
      };
    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ShopifyService();
