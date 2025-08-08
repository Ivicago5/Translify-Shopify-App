# Translify - Shopify Translation App

A powerful translation management app for Shopify stores, similar to Weglot or Transcy. Translify helps merchants translate their store content into multiple languages with automated translation, manual editing, and seamless Shopify integration.

## 🚀 Features

### Core Functionality
- **Multi-language Support**: Translate into Spanish, French, German, Italian, Portuguese, and more
- **Automated Translation**: Google Translate integration for instant translations
- **Manual Editor**: Fine-tune translations with a professional editing interface
- **Glossary Management**: Maintain consistent terminology across translations
- **Shopify Integration**: Direct sync with Shopify's Translation API
- **Background Processing**: Queue-based translation jobs for scalability

### Admin Interface
- **Dashboard**: Overview of translation progress and statistics
- **Translation Editor**: Bulk editing with filters and search
- **Settings**: Configure languages, automation rules, and API keys
- **Glossary**: Manage translation terminology and consistency
- **Testing**: API connection testing and translation validation

### Storefront Features
- **Language Switcher**: Allow customers to switch between languages
- **Hreflang Tags**: SEO-optimized language targeting
- **Translated Meta Content**: Complete translation of titles, descriptions, and content

## 🏗️ Architecture

### Backend (Node.js/Express)
```
backend/
├── index.js              # Main server entry point
├── db/
│   └── index.js          # Database setup and migrations
├── models/
│   ├── Merchant.js       # Merchant data model
│   └── Translation.js    # Translation data model
├── services/
│   ├── translationService.js  # Google Translate integration
│   └── shopifyService.js      # Shopify API integration
├── jobs/
│   └── translationJob.js      # Background job processing
├── api/
│   ├── translations.js        # Translation CRUD endpoints
│   ├── settings.js           # Settings management
│   └── webhooks.js           # Shopify webhook handlers
└── package.json
```

### Frontend (React/Polaris)
```
web/frontend/
├── pages/
│   ├── Dashboard.jsx          # Main dashboard
│   ├── TranslationEditor.jsx  # Translation management
│   ├── Settings.jsx          # App configuration
│   └── Glossary.jsx          # Glossary management
├── components/
│   └── NavigationMenu.jsx    # App navigation
├── utils/
│   └── api.js               # API communication
└── package.json
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Redis server
- SQLite (for development) or PostgreSQL (for production)
- Google Translate API key
- Shopify Partner account

### Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd translify
npm install
cd backend && npm install
cd ../web/frontend && npm install
```

2. **Set up environment variables:**
```bash
# Backend (.env)
BACKEND_PORT=3001
DATABASE_URL=sqlite:./data/translify.db
REDIS_URL=redis://localhost:6379
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret

# Frontend (.env)
BACKEND_PORT=3001
FRONTEND_PORT=5173
HOST=localhost
SHOPIFY_API_KEY=your_shopify_api_key
```

3. **Start the development servers:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd web/frontend
npm run dev
```

4. **Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

## 🧪 Testing with Products

### Import Sample Products
1. Navigate to the Dashboard
2. Click "Import Products" in the Quick Actions section
3. The app will fetch 5 products from your Shopify store
4. Translation records will be created for each translatable field

### Test Translation Workflow
1. **Import Products**: Use the "Test with Products" button on the Dashboard
2. **Review Translations**: Go to Translation Editor to see imported content
3. **Auto-translate**: Click "Auto" buttons to translate pending items
4. **Manual Edit**: Click "Edit" to fine-tune translations
5. **Sync to Shopify**: Click "Sync" to push completed translations back to Shopify

### API Testing
1. Go to Settings → Testing tab
2. Test API connections (Google Translate, Shopify, Database)
3. Use the "Test Translation" feature to validate translation quality

## 🔧 Configuration

### Shopify App Setup
1. Create a Shopify Partner account
2. Create a new app in your Partner dashboard
3. Configure the following scopes:
   - `read_products`, `write_products`
   - `read_pages`, `write_pages`
   - `read_blogs`, `write_blogs`
   - `read_articles`, `write_articles`
   - `read_collections`, `write_collections`

### Google Translate API
1. Create a Google Cloud project
2. Enable the Cloud Translation API
3. Create an API key
4. Add the key to your backend `.env` file

### Database Setup
The app uses SQLite for development and PostgreSQL for production:

```sql
-- Development (SQLite)
-- Tables are created automatically on first run

-- Production (PostgreSQL)
CREATE DATABASE translify;
-- Run migrations: npm run migrate
```

## 📊 Database Schema

### Core Tables
- **merchants**: Store information and API credentials
- **translations**: Translation records and status
- **translation_jobs**: Background job queue
- **glossaries**: Translation terminology
- **do_not_translate**: Terms to exclude from translation
- **translation_memory**: Reusable translation pairs

### Key Relationships
- Each merchant has multiple translations
- Translations are linked to Shopify resources (products, pages, etc.)
- Translation memory improves consistency over time
- Glossary terms are applied during translation

## 🔄 API Endpoints

### Translations
- `GET /translations/:merchantId` - List translations
- `POST /translations/:merchantId/import-products` - Import products
- `PUT /translations/:id` - Update translation
- `POST /translations/:id/auto-translate` - Auto-translate
- `POST /translations/:id/sync` - Sync to Shopify

### Settings
- `GET /settings/:merchantId` - Get settings
- `PUT /settings/:merchantId` - Update settings
- `POST /settings/:merchantId/test-connection` - Test APIs
- `POST /settings/:merchantId/glossary` - Add glossary term

### Webhooks
- `POST /webhooks/products/create` - Handle new products
- `POST /webhooks/products/update` - Handle product updates
- `POST /webhooks/pages/create` - Handle new pages

## 🎨 Frontend Components

### Polaris Integration
The app uses Shopify's Polaris design system for consistent UI:
- **Page**: Main page containers with actions
- **Card**: Content containers with sections
- **Layout**: Responsive grid system
- **DataTable**: Sortable data tables
- **Modal**: Overlay dialogs
- **Tabs**: Tabbed navigation

### Navigation Structure
- **Dashboard**: Overview and quick actions
- **Translation Editor**: Bulk translation management
- **Settings**: App configuration and testing
- **Glossary**: Terminology management

## 🚀 Deployment

### Production Setup
1. **Database**: Use PostgreSQL instead of SQLite
2. **Redis**: Configure production Redis instance
3. **Environment**: Set production environment variables
4. **SSL**: Configure HTTPS for security
5. **Monitoring**: Add logging and monitoring

### Shopify App Store
1. **App Review**: Submit for Shopify app review
2. **Documentation**: Provide user documentation
3. **Support**: Set up customer support channels
4. **Pricing**: Configure subscription plans

## 🔒 Security

### API Security
- OAuth 2.0 for Shopify authentication
- API key validation for Google Translate
- Request rate limiting
- Input validation and sanitization

### Data Protection
- Encrypted API keys
- Secure database connections
- GDPR compliance for user data
- Regular security audits

## 📈 Performance

### Optimization Strategies
- **Background Jobs**: Use Bull queue for heavy operations
- **Caching**: Redis for frequently accessed data
- **Pagination**: Limit API response sizes
- **Lazy Loading**: Load translations on demand

### Monitoring
- **Health Checks**: `/health` endpoint
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time monitoring
- **Queue Monitoring**: Job queue status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team

---

**Translify** - Making Shopify stores global, one translation at a time! 🌍
