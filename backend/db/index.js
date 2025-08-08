const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;
let isPostgres = false;

/**
 * Detect database type from DATABASE_URL
 */
function detectDatabaseType() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    isPostgres = true;
    console.log('🗄️ Using PostgreSQL database');
  } else {
    isPostgres = false;
    console.log('🗄️ Using SQLite database');
  }
  
  return isPostgres;
}

/**
 * Get database instance (SQLite or PostgreSQL)
 */
function getDatabase() {
  if (isPostgres) {
    // Use PostgreSQL
    const postgres = require('./postgres');
    return postgres;
  } else {
    // Use SQLite
    if (!db) {
      let dbPath;
      if (process.env.NODE_ENV === 'test') {
        // Use test database for tests
        dbPath = path.resolve(__dirname, '../test.db');
      } else {
        // Use production database
        dbPath = path.resolve(__dirname, '../../data/translify.db');
      }
      console.log('Database path:', dbPath);
      db = new sqlite3.Database(dbPath);
    }
    return db;
  }
}

/**
 * Initialize database (SQLite or PostgreSQL)
 */
async function initDatabase() {
  detectDatabaseType();
  
  if (isPostgres) {
    // Initialize PostgreSQL
    const postgres = require('./postgres');
    await postgres.initDatabase();
  } else {
    // Initialize SQLite
    const database = getDatabase();
    
    return new Promise((resolve, reject) => {
      database.serialize(() => {
        createTables(database)
          .then(() => {
            console.log('✅ SQLite database initialized successfully');
            resolve();
          })
          .catch(reject);
      });
    });
  }
}

/**
 * Create SQLite tables (legacy function for development)
 */
async function createTables(database) {
  return new Promise((resolve, reject) => {
    console.log('Creating SQLite tables...');
    let tablesCreated = 0;
    const totalTables = 5; // merchants, translations, translation_jobs, glossaries, translation_memory
    
    const checkComplete = () => {
      tablesCreated++;
      if (tablesCreated === totalTables) {
        // Insert default merchant if none exists
        database.get('SELECT COUNT(*) as count FROM merchants', (err, row) => {
          if (err) {
            console.error('Error checking merchants:', err);
            reject(err);
            return;
          }
          
          if (row.count === 0) {
            database.run(`
              INSERT INTO merchants (shop_domain, access_token, settings) 
              VALUES ('example.myshopify.com', 'test-token', '{"languages": ["es", "fr", "de"], "auto_translate": true}')
            `, (err) => {
              if (err) {
                console.error('Error inserting default merchant:', err);
                reject(err);
                return;
              }
              console.log('✅ Default merchant created');
              resolve();
            });
          } else {
            console.log('✅ Merchant already exists');
            resolve();
          }
        });
      }
    };
    
    // Create merchants table
    database.run(`
      CREATE TABLE IF NOT EXISTS merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_domain TEXT UNIQUE NOT NULL,
        access_token TEXT DEFAULT NULL,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating merchants table:', err);
        reject(err);
        return;
      }
      console.log('✅ Merchants table created');
      checkComplete();
    });

    // Create translations table with enhanced fields
    database.run(`
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
      )
    `, (err) => {
      if (err) {
        console.error('Error creating translations table:', err);
        reject(err);
        return;
      }
      console.log('✅ Translations table created');
      checkComplete();
    });

    // Create translation_jobs table
    database.run(`
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
      )
    `, (err) => {
      if (err) {
        console.error('Error creating translation_jobs table:', err);
        reject(err);
        return;
      }
      console.log('✅ Translation jobs table created');
      checkComplete();
    });

    // Create glossaries table
    database.run(`
      CREATE TABLE IF NOT EXISTS glossaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_id INTEGER NOT NULL,
        term TEXT NOT NULL,
        translation TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants (id),
        UNIQUE(merchant_id, term)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating glossaries table:', err);
        reject(err);
        return;
      }
      console.log('✅ Glossaries table created');
      checkComplete();
    });

    // Create translation_memory table for better memory management
    database.run(`
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
      )
    `, (err) => {
      if (err) {
        console.error('Error creating translation_memory table:', err);
        reject(err);
        return;
      }
      console.log('✅ Translation memory table created');
      checkComplete();
    });
  });
}

/**
 * Close database connection
 */
async function closeDatabase() {
  if (isPostgres) {
    const postgres = require('./postgres');
    await postgres.closeDatabase();
  } else if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run migrations
 */
async function runMigrations() {
  detectDatabaseType();
  
  if (isPostgres) {
    const postgres = require('./postgres');
    return await postgres.runMigrations();
  } else {
    const migrations = require('./migrations');
    return await migrations.runMigrations();
  }
}

/**
 * Get migration status
 */
async function getMigrationStatus() {
  detectDatabaseType();
  
  if (isPostgres) {
    const postgres = require('./postgres');
    return await postgres.getMigrationStatus();
  } else {
    const migrations = require('./migrations');
    return await migrations.getMigrationStatus();
  }
}

module.exports = {
  getDatabase,
  initDatabase,
  closeDatabase,
  runMigrations,
  getMigrationStatus,
  createTables,
  isPostgres: () => isPostgres
};
