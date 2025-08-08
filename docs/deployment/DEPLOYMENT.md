# 🚀 Translify - Production Deployment Guide

This guide will walk you through deploying Translify to production for Shopify app review.

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] Shopify Partner account
- [ ] Google Cloud account with Translation API enabled
- [ ] Domain name with SSL certificate
- [ ] Server/VPS with Docker support
- [ ] Redis instance (or use Docker)
- [ ] PostgreSQL database (or use Docker)

## 🔧 Step 1: Environment Setup

### 1.1 Create Environment File

```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file with your real credentials
nano .env
```

### 1.2 Required Environment Variables

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
APP_URL=https://your-app-domain.com

# Google Translate API
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here

# Database (PostgreSQL for production)
DATABASE_URL=postgresql://username:password@localhost:5432/translify

# Redis for job queues
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=your_very_long_random_secret_here
NODE_ENV=production

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn_here
```

## 🏗️ Step 2: Shopify App Configuration

### 2.1 Create Shopify App

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Create a new app
3. Configure the following settings:

**App URLs:**
- App URL: `https://your-app-domain.com`
- Allowed redirection URLs: `https://your-app-domain.com/api/auth/callback`

**Admin API access scopes:**
```
read_products,write_products
read_translations,write_translations
read_content,write_content
read_pages,write_pages
read_blogs,write_blogs
read_articles,write_articles
read_collections,write_collections
```

**Webhooks:**
```
products/create
products/update
products/delete
pages/create
pages/update
pages/delete
blogs/create
blogs/update
blogs/delete
articles/create
articles/update
articles/delete
collections/create
collections/update
collections/delete
```

### 2.2 Update App Configuration

Update `shopify.app.toml`:

```toml
client_id = "your_shopify_client_id"
name = "Translify"
handle = "translify"
application_url = "https://your-app-domain.com"
embedded = true

[build]
include_config_on_deploy = true

[webhooks]
api_version = "2025-07"
topics = [
  "products/create",
  "products/update", 
  "products/delete",
  "pages/create",
  "pages/update",
  "pages/delete",
  "blogs/create",
  "blogs/update",
  "blogs/delete",
  "articles/create",
  "articles/update",
  "articles/delete",
  "collections/create",
  "collections/update",
  "collections/delete"
]

[access_scopes]
scopes = "read_products,write_products,read_translations,write_translations,read_content,write_content,read_pages,write_pages,read_blogs,write_blogs,read_articles,write_articles,read_collections,write_collections"

[auth]
redirect_urls = [ "https://your-app-domain.com/api/auth" ]

[pos]
embedded = false
```

## 🐳 Step 3: Docker Deployment

### 3.1 Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 3.2 Manual Docker Deployment

```bash
# Build the image
docker build -t translify .

# Run with environment variables
docker run -d \
  --name translify-app \
  -p 3001:3001 \
  --env-file .env \
  translify
```

## 🔒 Step 4: SSL/HTTPS Setup

### 4.1 Using Let's Encrypt

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-app-domain.com

# Configure Nginx with SSL
sudo nano /etc/nginx/sites-available/translify
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-app-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-app-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-app-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-app-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Step 5: Monitoring & Logging

### 5.1 Health Checks

```bash
# Test health endpoint
curl https://your-app-domain.com/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### 5.2 Log Monitoring

```bash
# View application logs
docker-compose logs -f app

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🧪 Step 6: Testing

### 6.1 Functional Testing

1. **Install the app** on a test Shopify store
2. **Test core features:**
   - Import products
   - Auto-translate content
   - Manual translation editing
   - Sync to Shopify
   - Glossary management
   - Settings configuration

### 6.2 Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://your-app-domain.com/health

# Expected results:
# - Response time < 200ms
# - 100% success rate
# - No errors
```

## 📝 Step 7: App Store Preparation

### 7.1 Required Documentation

1. **Privacy Policy** - Create a comprehensive privacy policy
2. **Terms of Service** - Define app usage terms
3. **Support Documentation** - User guides and FAQs
4. **App Store Listing** - Screenshots, descriptions, pricing

### 7.2 App Store Listing Content

**App Name:** Translify - Translation Management

**Description:**
```
Transform your Shopify store into a global marketplace with Translify's powerful translation management system.

Key Features:
• Multi-language Support (Spanish, French, German, Italian, Portuguese)
• Automated Translation with Google Translate
• Professional Translation Editor
• Glossary Management for Consistent Terminology
• Direct Shopify Integration
• Background Processing for Scalability

Perfect for:
• International e-commerce stores
• Multi-language product catalogs
• Global brand expansion
• SEO-optimized translations
```

**Pricing:**
- Free Plan: 100 translations/month
- Pro Plan: $19/month - 1,000 translations/month
- Enterprise Plan: $49/month - Unlimited translations

## 🚀 Step 8: Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database migrated and tested
- [ ] Redis connection verified
- [ ] Health checks passing
- [ ] Error monitoring configured

### Post-Deployment
- [ ] App installed on test store
- [ ] All features tested
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Support channels configured

## 🔧 Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check database connectivity
docker-compose exec app node -e "
const { initDatabase } = require('./db');
initDatabase().then(() => console.log('DB OK')).catch(console.error);
"
```

**2. Redis Connection Issues**
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping
```

**3. Shopify Webhook Failures**
```bash
# Check webhook logs
docker-compose logs -f app | grep webhook
```

**4. Translation API Errors**
```bash
# Test Google Translate API
curl -X POST https://your-app-domain.com/api/settings/1/test-translation \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","targetLanguage":"es"}'
```

## 📞 Support

For deployment issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose exec app env`
3. Test individual services: `docker-compose exec app npm test`
4. Review health endpoint: `curl https://your-app-domain.com/health`

## 🎯 Next Steps

After successful deployment:

1. **Submit for Shopify App Review**
2. **Set up monitoring and alerting**
3. **Configure backup strategies**
4. **Plan for scaling**
5. **Prepare customer support**

---

**Congratulations!** 🎉 Your Translify app is now ready for production deployment and Shopify app review. 