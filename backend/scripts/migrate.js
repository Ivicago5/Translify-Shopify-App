#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * Usage:
 *   node scripts/migrate.js
 *   npm run migrate
 */

require('dotenv').config();
const { runMigrations, getMigrationStatus } = require('../db');

async function main() {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Get current migration status
    const status = await getMigrationStatus();
    console.log(`📊 Migration Status:`);
    console.log(`   - Applied: ${status.appliedCount}`);
    console.log(`   - Pending: ${status.pendingCount}`);
    console.log(`   - Total: ${status.total}`);
    
    if (status.pendingCount === 0) {
      console.log('✅ All migrations are up to date');
      return;
    }
    
    // Run pending migrations
    await runMigrations();
    
    console.log('🎉 Database migrations completed successfully!');
    
    // Show final status
    const finalStatus = await getMigrationStatus();
    console.log(`📊 Final Status: ${finalStatus.appliedCount}/${finalStatus.total} migrations applied`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main; 