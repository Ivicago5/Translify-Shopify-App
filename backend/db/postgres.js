const { Pool } = require('pg');

let pool = null;

/**
 * Get PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  
  return pool;
}

/**
 * Initialize PostgreSQL database
 */
async function initDatabase() {
  const pool = getPool();
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection established');
    client.release();

    // Run migrations
    await runMigrations();
    
    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL database:', error);
    throw error;
  }
}

/**
 * Run migrations for PostgreSQL
 */
async function runMigrations() {
  const pool = getPool();
  
  try {
    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const { rows: appliedMigrations } = await pool.query(
      'SELECT version FROM migrations ORDER BY version'
    );

    const appliedVersions = appliedMigrations.map(m => m.version);
    const pendingMigrations = MIGRATIONS.filter(m => !appliedVersions.includes(m.version));

    if (pendingMigrations.length === 0) {
      console.log('✅ All PostgreSQL migrations are up to date');
      return;
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending PostgreSQL migrations...`);

    // Run pending migrations
    for (const migration of pendingMigrations) {
      console.log(`📝 Running PostgreSQL migration ${migration.version}: ${migration.name}`);
      
      try {
        // Convert SQLite syntax to PostgreSQL
        const postgresUp = convertToPostgres(migration.up);
        
        await pool.query(postgresUp);
        
        // Record migration as applied
        await pool.query(
          'INSERT INTO migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
        
        console.log(`✅ PostgreSQL migration ${migration.version} completed`);
      } catch (error) {
        console.error(`❌ Error running PostgreSQL migration ${migration.version}:`, error);
        throw error;
      }
    }

    console.log('🎉 All PostgreSQL migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running PostgreSQL migrations:', error);
    throw error;
  }
}

/**
 * Get migration status for PostgreSQL
 */
async function getMigrationStatus() {
  const pool = getPool();
  
  try {
    // Get applied migrations
    const { rows: appliedMigrations } = await pool.query(
      'SELECT version, name FROM migrations ORDER BY version'
    );

    const appliedVersions = appliedMigrations.map(m => m.version);
    const pendingMigrations = MIGRATIONS.filter(m => !appliedVersions.includes(m.version));

    return {
      applied: appliedMigrations,
      pending: pendingMigrations,
      total: MIGRATIONS.length,
      appliedCount: appliedMigrations.length,
      pendingCount: pendingMigrations.length
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return {
      applied: [],
      pending: MIGRATIONS,
      total: MIGRATIONS.length,
      appliedCount: 0,
      pendingCount: MIGRATIONS.length
    };
  }
}

/**
 * Convert SQLite syntax to PostgreSQL
 */
function convertToPostgres(sqliteSql) {
  return sqliteSql
    // Replace SQLite data types with PostgreSQL equivalents
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/INTEGER/g, 'INTEGER')
    .replace(/TEXT/g, 'VARCHAR(255)')
    .replace(/BOOLEAN DEFAULT 0/g, 'BOOLEAN DEFAULT FALSE')
    .replace(/BOOLEAN DEFAULT 1/g, 'BOOLEAN DEFAULT TRUE')
    .replace(/BOOLEAN/g, 'BOOLEAN')
    .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    .replace(/DATETIME/g, 'TIMESTAMP')
    
    // Replace SQLite functions with PostgreSQL equivalents
    .replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP')
    
    // Replace parameter placeholders
    .replace(/\?/g, '$1')
    
    // Handle unique constraints
    .replace(/UNIQUE\(/g, 'UNIQUE(')
    
    // Handle foreign key constraints
    .replace(/FOREIGN KEY \(([^)]+)\) REFERENCES ([^(]+)\(([^)]+)\)/g, 
             'FOREIGN KEY ($1) REFERENCES $2($3)');
}

/**
 * Close PostgreSQL connection pool
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Execute a query with parameters
 */
async function query(text, params = []) {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Query error:', { text, params, error: error.message });
    throw error;
  }
}

/**
 * Get a single row
 */
async function getRow(text, params = []) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

/**
 * Get multiple rows
 */
async function getRows(text, params = []) {
  const res = await query(text, params);
  return res.rows;
}

/**
 * Insert a row and return the inserted data
 */
async function insert(text, params = []) {
  const res = await query(text, params);
  return res.rows[0];
}

/**
 * Update rows and return the number of affected rows
 */
async function update(text, params = []) {
  const res = await query(text, params);
  return res.rowCount;
}

/**
 * Delete rows and return the number of affected rows
 */
async function remove(text, params = []) {
  const res = await query(text, params);
  return res.rowCount;
}

// Import migrations
const { MIGRATIONS } = require('./migrations');

module.exports = {
  getPool,
  initDatabase,
  runMigrations,
  getMigrationStatus,
  closeDatabase,
  query,
  getRow,
  getRows,
  insert,
  update,
  remove
}; 