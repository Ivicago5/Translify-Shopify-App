const { getDatabase } = require('./index');
const path = require('path');
const fs = require('fs');

// Migration tracking table
const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

// Migration files
const MIGRATIONS = [
  {
    version: '001',
    name: 'initial_schema',
    up: `
      -- Create merchants table
      CREATE TABLE IF NOT EXISTS merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_domain TEXT UNIQUE NOT NULL,
        access_token TEXT DEFAULT NULL,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create translations table
      CREATE TABLE IF NOT EXISTS translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        resource_key TEXT NOT NULL,
        original_text TEXT NOT NULL,
        translated_text TEXT,
        language TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        auto_translated BOOLEAN DEFAULT 0,
        synced_to_shopify BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id),
        UNIQUE(merchant_id, resource_type, resource_id, resource_key, language)
      );

      -- Create translation_jobs table
      CREATE TABLE IF NOT EXISTS translation_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        data TEXT,
        result TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id)
      );

      -- Create glossaries table
      CREATE TABLE IF NOT EXISTS glossaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        term TEXT NOT NULL,
        translation TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id),
        UNIQUE(merchant_id, term)
      );

      -- Create translation_memory table
      CREATE TABLE IF NOT EXISTS translation_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        original_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        language TEXT NOT NULL,
        resource_type TEXT,
        usage_count INTEGER DEFAULT 1,
        last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id),
        UNIQUE(merchant_id, original_text, translated_text, language)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_translations_merchant_status ON translations(merchant_id, status);
      CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language);
      CREATE INDEX IF NOT EXISTS idx_translations_resource ON translations(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_glossaries_merchant ON glossaries(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_translation_memory_merchant ON translation_memory(merchant_id);
    `,
    down: `
      DROP TABLE IF EXISTS translation_memory;
      DROP TABLE IF EXISTS glossaries;
      DROP TABLE IF EXISTS translation_jobs;
      DROP TABLE IF EXISTS translations;
      DROP TABLE IF EXISTS merchants;
    `
  },
  {
    version: '002',
    name: 'add_webhooks_table',
    up: `
      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        topic TEXT NOT NULL,
        shopify_webhook_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id)
      );

      CREATE INDEX IF NOT EXISTS idx_webhooks_merchant ON webhooks(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_topic ON webhooks(topic);
    `,
    down: `
      DROP TABLE IF EXISTS webhooks;
    `
  },
  {
    version: '003',
    name: 'add_analytics_table',
    up: `
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id)
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_merchant ON analytics(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);
    `,
    down: `
      DROP TABLE IF EXISTS analytics;
    `
  },
  {
    version: '004',
    name: 'add_settings_table',
    up: `
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id),
        UNIQUE(merchant_id, setting_key)
      );

      CREATE INDEX IF NOT EXISTS idx_settings_merchant ON settings(merchant_id);
    `,
    down: `
      DROP TABLE IF EXISTS settings;
    `
  }
];

/**
 * Run database migrations
 */
async function runMigrations() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create migrations table if it doesn't exist
      db.run(MIGRATIONS_TABLE, (err) => {
        if (err) {
          console.error('Error creating migrations table:', err);
          reject(err);
          return;
        }

        // Get applied migrations
        db.all('SELECT version FROM migrations ORDER BY version', (err, appliedMigrations) => {
          if (err) {
            console.error('Error getting applied migrations:', err);
            reject(err);
            return;
          }

          const appliedVersions = appliedMigrations.map(m => m.version);
          const pendingMigrations = MIGRATIONS.filter(m => !appliedVersions.includes(m.version));

          if (pendingMigrations.length === 0) {
            console.log('✅ All migrations are up to date');
            resolve({ success: true, applied: 0 });
            return;
          }

          console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

          // Run pending migrations
          let completed = 0;
          pendingMigrations.forEach(migration => {
            console.log(`📝 Running migration ${migration.version}: ${migration.name}`);
            
            db.run(migration.up, (err) => {
              if (err) {
                console.error(`❌ Error running migration ${migration.version}:`, err);
                reject(err);
                return;
              }

              // Record migration as applied
              db.run(
                'INSERT INTO migrations (version, name) VALUES (?, ?)',
                [migration.version, migration.name],
                (err) => {
                  if (err) {
                    console.error(`❌ Error recording migration ${migration.version}:`, err);
                    reject(err);
                    return;
                  }

                  completed++;
                  console.log(`✅ Migration ${migration.version} completed`);

                  if (completed === pendingMigrations.length) {
                    console.log('🎉 All migrations completed successfully');
                    resolve({ success: true, applied: pendingMigrations.length });
                  }
                }
              );
            });
          });
        });
      });
    });
  });
}

/**
 * Rollback last migration
 */
async function rollbackLastMigration() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM migrations ORDER BY version DESC LIMIT 1', (err, lastMigration) => {
      if (err) {
        console.error('Error getting last migration:', err);
        reject(err);
        return;
      }

      if (!lastMigration) {
        console.log('No migrations to rollback');
        resolve();
        return;
      }

      const migration = MIGRATIONS.find(m => m.version === lastMigration.version);
      if (!migration) {
        console.error(`Migration ${lastMigration.version} not found in migration files`);
        reject(new Error(`Migration ${lastMigration.version} not found`));
        return;
      }

      console.log(`🔄 Rolling back migration ${migration.version}: ${migration.name}`);
      
      db.run(migration.down, (err) => {
        if (err) {
          console.error(`❌ Error rolling back migration ${migration.version}:`, err);
          reject(err);
          return;
        }

        db.run('DELETE FROM migrations WHERE version = ?', [migration.version], (err) => {
          if (err) {
            console.error(`❌ Error removing migration record ${migration.version}:`, err);
            reject(err);
            return;
          }

          console.log(`✅ Migration ${migration.version} rolled back successfully`);
          resolve();
        });
      });
    });
  });
}

/**
 * Get migration status
 */
async function getMigrationStatus() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // First check if migrations table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'", (err, row) => {
      if (err) {
        console.error('Error checking migrations table:', err);
        reject(err);
        return;
      }
      
      if (!row) {
        // Migrations table doesn't exist, return empty status
        resolve({
          applied: [],
          pending: MIGRATIONS,
          total: MIGRATIONS.length,
          appliedCount: 0,
          pendingCount: MIGRATIONS.length
        });
        return;
      }
      
      // Migrations table exists, get applied migrations
      db.all('SELECT * FROM migrations ORDER BY version', (err, appliedMigrations) => {
        if (err) {
          console.error('Error getting migration status:', err);
          reject(err);
          return;
        }

        const appliedVersions = appliedMigrations.map(m => m.version);
        const pendingMigrations = MIGRATIONS.filter(m => !appliedVersions.includes(m.version));

        resolve({
          applied: appliedMigrations,
          pending: pendingMigrations,
          total: MIGRATIONS.length,
          appliedCount: appliedMigrations.length,
          pendingCount: pendingMigrations.length
        });
      });
    });
  });
}

module.exports = {
  runMigrations,
  rollbackLastMigration,
  getMigrationStatus,
  MIGRATIONS
}; 