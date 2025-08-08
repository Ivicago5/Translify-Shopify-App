# 🗄️ Translify Database Documentation

This document provides comprehensive information about the database architecture, migrations, and management for the Translify Shopify app.

## 📋 Table of Contents

1. [Database Architecture](#database-architecture)
2. [Database Types](#database-types)
3. [Schema Overview](#schema-overview)
4. [Migrations](#migrations)
5. [Backup & Recovery](#backup--recovery)
6. [Performance Optimization](#performance-optimization)
7. [Production Setup](#production-setup)

## 🏗️ Database Architecture

### Multi-Database Support

Translify supports both SQLite (development) and PostgreSQL (production) databases:

- **SQLite**: Used for local development and testing
- **PostgreSQL**: Used for production deployment

The system automatically detects the database type based on the `DATABASE_URL` environment variable.

### Database Detection Logic

```javascript
function detectDatabaseType() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    return 'postgresql';
  } else {
    return 'sqlite';
  }
}
```

## 🗄️ Database Types

### SQLite (Development)

**Configuration:**
```bash
# No DATABASE_URL or SQLite URL
DATABASE_URL=sqlite:./data/translify.db
```

**Features:**
- File-based database
- No server required
- Perfect for development
- Automatic file creation

### PostgreSQL (Production)

**Configuration:**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/translify
```

**Features:**
- Client-server architecture
- ACID compliance
- Advanced indexing
- Concurrent access
- Scalability

## 📊 Schema Overview

### Core Tables

#### 1. `merchants`
Stores Shopify store information and authentication data.

```sql
CREATE TABLE merchants (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT DEFAULT NULL,
  settings TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Unique merchant identifier
- `shop_domain`: Shopify store domain (e.g., "mystore.myshopify.com")
- `access_token`: Shopify API access token
- `settings`: JSON string of merchant settings
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### 2. `translations`
Core translation records for all translatable content.

```sql
CREATE TABLE translations (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  resource_key VARCHAR(100) NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT,
  language VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  auto_translated BOOLEAN DEFAULT FALSE,
  synced_to_shopify BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants (id),
  UNIQUE(merchant_id, resource_type, resource_id, resource_key, language)
);
```

**Fields:**
- `id`: Unique translation identifier
- `merchant_id`: Reference to merchant
- `resource_type`: Type of resource (product, page, collection, etc.)
- `resource_id`: Shopify resource ID
- `resource_key`: Field name (title, body_html, etc.)
- `original_text`: Original text content
- `translated_text`: Translated text content
- `language`: Target language code (es, fr, de, etc.)
- `status`: Translation status (pending, completed, failed)
- `auto_translated`: Whether translation was automated
- `synced_to_shopify`: Whether synced back to Shopify
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### 3. `translation_jobs`
Background job tracking for translation processing.

```sql
CREATE TABLE translation_jobs (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  data TEXT,
  result TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants (id)
);
```

**Fields:**
- `id`: Unique job identifier
- `merchant_id`: Reference to merchant
- `job_type`: Type of job (auto_translate, sync_to_shopify, etc.)
- `status`: Job status (pending, processing, completed, failed)
- `data`: JSON string of job data
- `result`: Job result data
- `error`: Error message if failed
- `created_at`: Job creation timestamp
- `updated_at`: Last update timestamp

#### 4. `glossaries`
Custom translation terms and their translations.

```sql
CREATE TABLE glossaries (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  term VARCHAR(255) NOT NULL,
  translation VARCHAR(255) NOT NULL,
  context TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants (id),
  UNIQUE(merchant_id, term)
);
```

**Fields:**
- `id`: Unique glossary entry identifier
- `merchant_id`: Reference to merchant
- `term`: Original term
- `translation`: Translated term
- `context`: Additional context information
- `created_at`: Record creation timestamp

#### 5. `translation_memory`
Translation memory for improving consistency and performance.

```sql
CREATE TABLE translation_memory (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  language VARCHAR(10) NOT NULL,
  resource_type VARCHAR(50),
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants (id),
  UNIQUE(merchant_id, original_text, translated_text, language)
);
```

**Fields:**
- `id`: Unique memory entry identifier
- `merchant_id`: Reference to merchant
- `original_text`: Original text
- `translated_text`: Translated text
- `language`: Language code
- `resource_type`: Type of resource
- `usage_count`: Number of times used
- `last_used`: Last usage timestamp
- `created_at`: Record creation timestamp

### Additional Tables

#### 6. `webhooks`
Shopify webhook registration tracking.

#### 7. `analytics`
Usage analytics and metrics.

#### 8. `settings`
Merchant-specific settings storage.

## 🔄 Migrations

### Migration System

Translify uses a custom migration system that supports both SQLite and PostgreSQL:

```javascript
// Run migrations
npm run migrate

// Check migration status
npm run migrate:status

// Rollback last migration
npm run migrate:rollback
```

### Migration Files

Migrations are defined in `backend/db/migrations.js`:

```javascript
const MIGRATIONS = [
  {
    version: '001',
    name: 'initial_schema',
    up: `CREATE TABLE merchants...`,
    down: `DROP TABLE merchants...`
  }
];
```

### Migration Status

```bash
$ npm run migrate:status

📊 Migration Status Report:
============================
Total Migrations: 4
Applied: 3
Pending: 1

✅ Applied Migrations:
   - 001: initial_schema (2024-01-15T10:00:00.000Z)
   - 002: add_webhooks_table (2024-01-15T10:01:00.000Z)
   - 003: add_analytics_table (2024-01-15T10:02:00.000Z)

⏳ Pending Migrations:
   - 004: add_settings_table

🔄 Run 'npm run migrate' to apply 1 pending migrations
```

## 💾 Backup & Recovery

### Automated Backups

```bash
# Create backup
npm run backup

# Backup includes:
# - All table data
# - Indexes
# - Constraints
# - Timestamp and size information
```

### Backup Features

- **Automatic cleanup**: Keeps last 10 backups
- **Compression**: Optimized file sizes
- **Verification**: Backup integrity checks
- **Cross-platform**: Works on Linux, macOS, Windows

### Recovery Process

#### SQLite Recovery
```bash
# Stop the application
npm run stop

# Restore from backup
cp backups/translify-backup-2024-01-15T10-00-00-000Z.db data/translify.db

# Restart the application
npm start
```

#### PostgreSQL Recovery
```bash
# Stop the application
npm run stop

# Restore from backup
psql $DATABASE_URL < backups/translify-backup-2024-01-15T10-00-00-000Z.sql

# Restart the application
npm start
```

## ⚡ Performance Optimization

### Indexes

The database includes optimized indexes for common queries:

```sql
-- Translation queries
CREATE INDEX idx_translations_merchant_status ON translations(merchant_id, status);
CREATE INDEX idx_translations_language ON translations(language);
CREATE INDEX idx_translations_resource ON translations(resource_type, resource_id);

-- Job queries
CREATE INDEX idx_translation_jobs_status ON translation_jobs(status);

-- Glossary queries
CREATE INDEX idx_glossaries_merchant ON glossaries(merchant_id);

-- Memory queries
CREATE INDEX idx_translation_memory_merchant ON translation_memory(merchant_id);
```

### Query Optimization

#### Common Query Patterns

1. **Get pending translations for a merchant:**
```sql
SELECT * FROM translations 
WHERE merchant_id = ? AND status = 'pending' 
ORDER BY created_at DESC;
```

2. **Get translations by language:**
```sql
SELECT * FROM translations 
WHERE merchant_id = ? AND language = ? 
ORDER BY updated_at DESC;
```

3. **Get glossary terms:**
```sql
SELECT * FROM glossaries 
WHERE merchant_id = ? 
ORDER BY term ASC;
```

### Performance Tips

1. **Use indexes**: All common queries are indexed
2. **Limit results**: Use LIMIT for large datasets
3. **Batch operations**: Use transactions for multiple updates
4. **Connection pooling**: PostgreSQL uses connection pooling
5. **Regular maintenance**: Run VACUUM on SQLite periodically

## 🚀 Production Setup

### PostgreSQL Setup

1. **Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
```

2. **Create database:**
```bash
sudo -u postgres createdb translify
sudo -u postgres createuser translify_user
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE translify TO translify_user;"
```

3. **Configure environment:**
```bash
DATABASE_URL=postgresql://translify_user:password@localhost:5432/translify
```

### Backup Strategy

#### Automated Backups

```bash
# Add to crontab for daily backups
0 2 * * * cd /path/to/translify/backend && npm run backup
```

#### Backup Retention

- **Daily backups**: Last 7 days
- **Weekly backups**: Last 4 weeks
- **Monthly backups**: Last 12 months

### Monitoring

#### Database Health Checks

```bash
# Check database connection
curl http://localhost:3001/health

# Check migration status
npm run migrate:status

# Monitor query performance
# (PostgreSQL only)
```

#### Performance Monitoring

- **Query execution time**: Logged in development
- **Connection pool status**: PostgreSQL only
- **Index usage**: PostgreSQL only
- **Table sizes**: Regular monitoring

## 🔧 Troubleshooting

### Common Issues

#### 1. Migration Failures

**Problem:** Migration fails with constraint errors
**Solution:** Check for existing data conflicts

```bash
# Check migration status
npm run migrate:status

# Rollback if needed
npm run migrate:rollback
```

#### 2. Connection Issues

**Problem:** Database connection timeouts
**Solution:** Check connection settings

```bash
# Test connection
node -e "require('./db').initDatabase().then(() => console.log('OK')).catch(console.error)"
```

#### 3. Performance Issues

**Problem:** Slow queries
**Solution:** Check indexes and query patterns

```sql
-- PostgreSQL: Check slow queries
SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Maintenance Commands

```bash
# SQLite maintenance
sqlite3 data/translify.db "VACUUM;"

# PostgreSQL maintenance
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check database size
du -h data/translify.db  # SQLite
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"  # PostgreSQL
```

## 📚 Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Database Best Practices](https://nodejs.org/en/docs/guides/)
- [Shopify API Documentation](https://shopify.dev/docs/api)

---

**Note:** This database system is designed to scale from development to production seamlessly, with automatic detection and appropriate optimizations for each environment. 