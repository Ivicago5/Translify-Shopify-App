# 🔌 Translify API Reference

Welcome to the Translify API documentation! This comprehensive guide will help you integrate Translify with your applications and build custom solutions.

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Base URL & Endpoints](#base-url--endpoints)
3. [Translation API](#translation-api)
4. [Glossary API](#glossary-api)
5. [Bulk Operations API](#bulk-operations-api)
6. [Webhooks](#webhooks)
7. [Rate Limits](#rate-limits)
8. [Error Handling](#error-handling)
9. [SDKs & Libraries](#sdks--libraries)
10. [Examples](#examples)

## 🔐 Authentication

### API Key Authentication

All API requests require authentication using your API key:

```bash
# Include API key in headers
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Getting Your API Key

1. **Log into Translify Dashboard**
2. **Navigate to Settings > API**
3. **Generate new API key**
4. **Copy and store securely**

### API Key Permissions

```javascript
{
  "permissions": {
    "translations": ["read", "write"],
    "glossary": ["read", "write"],
    "bulk_operations": ["read", "write"],
    "webhooks": ["read", "write"]
  },
  "rate_limits": {
    "requests_per_minute": 1000,
    "requests_per_hour": 10000
  }
}
```

## 🌐 Base URL & Endpoints

### Base URL
```
Production: https://api.translify.app/v1
Sandbox: https://api-sandbox.translify.app/v1
```

### API Versioning
- **Current Version:** v1
- **Version Header:** `X-API-Version: 1`
- **Deprecation Policy:** 12 months notice

## 🔄 Translation API

### Translate Text

#### POST /translations/translate

Translate a single text string to target languages.

```bash
curl -X POST https://api.translify.app/v1/translations/translate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Premium Wireless Headphones",
    "source_language": "en",
    "target_languages": ["es", "fr", "de"],
    "glossary_id": "glossary_123",
    "context": "product_title"
  }'
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Text to translate |
| `source_language` | string | Yes | Source language code (ISO 639-1) |
| `target_languages` | array | Yes | Array of target language codes |
| `glossary_id` | string | No | Glossary ID for custom terms |
| `context` | string | No | Context for better translation |
| `quality_level` | string | No | "fast", "standard", "high" (default: "standard") |

#### Response

```json
{
  "success": true,
  "data": {
    "translations": {
      "es": {
        "text": "Auriculares Inalámbricos Premium",
        "confidence": 0.95,
        "glossary_used": true
      },
      "fr": {
        "text": "Écouteurs Sans Fil Premium",
        "confidence": 0.92,
        "glossary_used": true
      },
      "de": {
        "text": "Premium Drahtlose Kopfhörer",
        "confidence": 0.89,
        "glossary_used": true
      }
    },
    "processing_time": 0.45,
    "glossary_terms_used": ["Premium", "Wireless"]
  }
}
```

### Batch Translation

#### POST /translations/batch

Translate multiple texts in a single request.

```bash
curl -X POST https://api.translify.app/v1/translations/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      {
        "id": "product_1",
        "text": "Premium Wireless Headphones",
        "context": "product_title"
      },
      {
        "id": "product_2", 
        "text": "High-quality wireless headphones with noise cancellation",
        "context": "product_description"
      }
    ],
    "source_language": "en",
    "target_languages": ["es", "fr"],
    "glossary_id": "glossary_123"
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "translations": {
      "product_1": {
        "es": {
          "text": "Auriculares Inalámbricos Premium",
          "confidence": 0.95
        },
        "fr": {
          "text": "Écouteurs Sans Fil Premium", 
          "confidence": 0.92
        }
      },
      "product_2": {
        "es": {
          "text": "Auriculares inalámbricos de alta calidad con cancelación de ruido",
          "confidence": 0.88
        },
        "fr": {
          "text": "Écouteurs sans fil de haute qualité avec réduction de bruit",
          "confidence": 0.85
        }
      }
    },
    "summary": {
      "total_texts": 2,
      "total_translations": 4,
      "average_confidence": 0.90,
      "processing_time": 1.23
    }
  }
}
```

### Get Translation History

#### GET /translations/history

Retrieve translation history for your account.

```bash
curl -X GET "https://api.translify.app/v1/translations/history?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of records (max: 100) |
| `offset` | integer | Pagination offset |
| `language` | string | Filter by language |
| `date_from` | string | Filter from date (ISO 8601) |
| `date_to` | string | Filter to date (ISO 8601) |

#### Response

```json
{
  "success": true,
  "data": {
    "translations": [
      {
        "id": "trans_123",
        "original_text": "Premium Wireless Headphones",
        "translated_text": "Auriculares Inalámbricos Premium",
        "source_language": "en",
        "target_language": "es",
        "confidence": 0.95,
        "created_at": "2024-01-15T10:30:00Z",
        "glossary_used": true
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

## 📚 Glossary API

### Create Glossary

#### POST /glossary

Create a new glossary for custom translations.

```bash
curl -X POST https://api.translify.app/v1/glossary \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TechGadgets Glossary",
    "description": "Custom terms for TechGadgets brand",
    "terms": [
      {
        "source_term": "TechGadgets",
        "translations": {
          "es": "TechGadgets",
          "fr": "TechGadgets", 
          "de": "TechGadgets"
        },
        "context": "Brand name - always keep original",
        "case_sensitive": true
      },
      {
        "source_term": "Wireless",
        "translations": {
          "es": "Inalámbrico",
          "fr": "Sans fil",
          "de": "Drahtlos"
        },
        "context": "Technical term for wireless technology"
      }
    ]
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "glossary_id": "glossary_456",
    "name": "TechGadgets Glossary",
    "description": "Custom terms for TechGadgets brand",
    "terms_count": 2,
    "languages": ["es", "fr", "de"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Get Glossary

#### GET /glossary/{glossary_id}

Retrieve a specific glossary.

```bash
curl -X GET https://api.translify.app/v1/glossary/glossary_456 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Response

```json
{
  "success": true,
  "data": {
    "glossary_id": "glossary_456",
    "name": "TechGadgets Glossary",
    "description": "Custom terms for TechGadgets brand",
    "terms": [
      {
        "id": "term_1",
        "source_term": "TechGadgets",
        "translations": {
          "es": "TechGadgets",
          "fr": "TechGadgets",
          "de": "TechGadgets"
        },
        "context": "Brand name - always keep original",
        "case_sensitive": true,
        "usage_count": 15
      }
    ],
    "languages": ["es", "fr", "de"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Update Glossary

#### PUT /glossary/{glossary_id}

Update an existing glossary.

```bash
curl -X PUT https://api.translify.app/v1/glossary/glossary_456 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated TechGadgets Glossary",
    "description": "Updated custom terms for TechGadgets brand",
    "terms": [
      {
        "source_term": "TechGadgets",
        "translations": {
          "es": "TechGadgets",
          "fr": "TechGadgets",
          "de": "TechGadgets"
        },
        "context": "Brand name - always keep original"
      },
      {
        "source_term": "Noise Cancellation",
        "translations": {
          "es": "Cancelación de ruido",
          "fr": "Réduction de bruit",
          "de": "Geräuschunterdrückung"
        },
        "context": "Audio technology feature"
      }
    ]
  }'
```

### List Glossaries

#### GET /glossary

List all glossaries for your account.

```bash
curl -X GET "https://api.translify.app/v1/glossary?limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Response

```json
{
  "success": true,
  "data": {
    "glossaries": [
      {
        "glossary_id": "glossary_456",
        "name": "TechGadgets Glossary",
        "description": "Custom terms for TechGadgets brand",
        "terms_count": 5,
        "languages": ["es", "fr", "de"],
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 3,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

## 📦 Bulk Operations API

### Start Bulk Translation Job

#### POST /bulk/translate

Start a bulk translation job for large datasets.

```bash
curl -X POST https://api.translify.app/v1/bulk/translate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job_name": "Product Catalog Translation",
    "source_language": "en",
    "target_languages": ["es", "fr", "de"],
    "glossary_id": "glossary_456",
    "quality_level": "high",
    "notify_url": "https://your-app.com/webhooks/translation-complete",
    "data": [
      {
        "id": "product_1",
        "title": "Premium Wireless Headphones",
        "description": "High-quality wireless headphones with noise cancellation"
      },
      {
        "id": "product_2",
        "title": "Smart Fitness Watch",
        "description": "Advanced fitness tracking with heart rate monitoring"
      }
    ]
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "job_id": "job_789",
    "job_name": "Product Catalog Translation",
    "status": "queued",
    "total_items": 2,
    "estimated_completion": "2024-01-15T11:30:00Z",
    "webhook_url": "https://your-app.com/webhooks/translation-complete"
  }
}
```

### Get Job Status

#### GET /bulk/jobs/{job_id}

Check the status of a bulk translation job.

```bash
curl -X GET https://api.translify.app/v1/bulk/jobs/job_789 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Response

```json
{
  "success": true,
  "data": {
    "job_id": "job_789",
    "job_name": "Product Catalog Translation",
    "status": "processing",
    "progress": {
      "total_items": 2,
      "completed": 1,
      "failed": 0,
      "remaining": 1
    },
    "estimated_completion": "2024-01-15T11:30:00Z",
    "results": {
      "product_1": {
        "es": {
          "title": "Auriculares Inalámbricos Premium",
          "description": "Auriculares inalámbricos de alta calidad con cancelación de ruido"
        },
        "fr": {
          "title": "Écouteurs Sans Fil Premium",
          "description": "Écouteurs sans fil de haute qualité avec réduction de bruit"
        },
        "de": {
          "title": "Premium Drahtlose Kopfhörer",
          "description": "Hochwertige drahtlose Kopfhörer mit Geräuschunterdrückung"
        }
      }
    }
  }
}
```

### Download Job Results

#### GET /bulk/jobs/{job_id}/download

Download the results of a completed bulk translation job.

```bash
curl -X GET https://api.translify.app/v1/bulk/jobs/job_789/download \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Accept: application/json"
```

## 🔔 Webhooks

### Webhook Configuration

Configure webhooks to receive real-time notifications.

```bash
curl -X POST https://api.translify.app/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/translify",
    "events": ["translation.completed", "bulk.job.completed"],
    "secret": "your_webhook_secret"
  }'
```

### Webhook Events

#### translation.completed
```json
{
  "event": "translation.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "translation_id": "trans_123",
    "original_text": "Premium Wireless Headphones",
    "translated_text": "Auriculares Inalámbricos Premium",
    "source_language": "en",
    "target_language": "es",
    "confidence": 0.95
  }
}
```

#### bulk.job.completed
```json
{
  "event": "bulk.job.completed",
  "timestamp": "2024-01-15T11:30:00Z",
  "data": {
    "job_id": "job_789",
    "job_name": "Product Catalog Translation",
    "total_items": 2,
    "completed_items": 2,
    "failed_items": 0,
    "download_url": "https://api.translify.app/v1/bulk/jobs/job_789/download"
  }
}
```

### Webhook Security

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## ⚡ Rate Limits

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642233600
```

### Rate Limit Tiers

| Plan | Requests/Minute | Requests/Hour | Burst |
|------|----------------|---------------|-------|
| Free | 60 | 1,000 | 100 |
| Professional | 300 | 10,000 | 500 |
| Business | 1,000 | 100,000 | 2,000 |
| Enterprise | Custom | Custom | Custom |

### Rate Limit Response

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retry_after": 60
}
```

## ❌ Error Handling

### Error Response Format

```json
{
  "error": "validation_error",
  "message": "Invalid request parameters",
  "details": {
    "field": "target_languages",
    "issue": "Must be an array of language codes"
  },
  "request_id": "req_123456789"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `invalid_api_key` | Invalid or missing API key | 401 |
| `rate_limit_exceeded` | Rate limit exceeded | 429 |
| `validation_error` | Invalid request parameters | 400 |
| `glossary_not_found` | Glossary does not exist | 404 |
| `job_not_found` | Bulk job does not exist | 404 |
| `insufficient_credits` | Translation credits exhausted | 402 |
| `internal_error` | Server error | 500 |

### Retry Logic

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

## 📚 SDKs & Libraries

### JavaScript/Node.js

```bash
npm install @translify/api
```

```javascript
const TranslifyAPI = require('@translify/api');

const api = new TranslifyAPI('YOUR_API_KEY');

// Translate text
const translation = await api.translate({
  text: 'Hello World',
  source_language: 'en',
  target_languages: ['es', 'fr']
});

console.log(translation.data.translations);
```

### Python

```bash
pip install translify-api
```

```python
from translify import TranslifyAPI

api = TranslifyAPI('YOUR_API_KEY')

# Translate text
translation = api.translate(
    text='Hello World',
    source_language='en',
    target_languages=['es', 'fr']
)

print(translation['translations'])
```

### PHP

```bash
composer require translify/api
```

```php
use Translify\TranslifyAPI;

$api = new TranslifyAPI('YOUR_API_KEY');

// Translate text
$translation = $api->translate([
    'text' => 'Hello World',
    'source_language' => 'en',
    'target_languages' => ['es', 'fr']
]);

echo $translation['translations'];
```

## 💡 Examples

### Shopify Integration

```javascript
// Shopify app integration example
const TranslifyAPI = require('@translify/api');

class ShopifyTranslifyIntegration {
  constructor(apiKey) {
    this.api = new TranslifyAPI(apiKey);
  }

  async translateProduct(product, targetLanguages) {
    const translations = await this.api.translate({
      text: product.title,
      source_language: 'en',
      target_languages: targetLanguages,
      context: 'product_title'
    });

    return translations.data.translations;
  }

  async bulkTranslateProducts(products, targetLanguages) {
    const job = await this.api.bulkTranslate({
      job_name: 'Shopify Products Translation',
      source_language: 'en',
      target_languages: targetLanguages,
      data: products.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description
      }))
    });

    return job.data.job_id;
  }
}
```

### Webhook Handler

```javascript
// Express.js webhook handler
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhooks/translify', (req, res) => {
  const signature = req.headers['x-translify-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify webhook signature
  const isValid = verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  switch (event) {
    case 'translation.completed':
      handleTranslationCompleted(data);
      break;
    case 'bulk.job.completed':
      handleBulkJobCompleted(data);
      break;
  }

  res.status(200).json({ received: true });
});

function handleTranslationCompleted(data) {
  console.log('Translation completed:', data);
  // Update your database, notify users, etc.
}

function handleBulkJobCompleted(data) {
  console.log('Bulk job completed:', data);
  // Download results, update inventory, etc.
}
```

---

**Need help with API integration? Contact our developer support team at dev-support@translify.app! 🚀** 