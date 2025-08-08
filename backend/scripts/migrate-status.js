#!/usr/bin/env node

/**
 * Database Migration Status Script
 * 
 * Usage:
 *   node scripts/migrate-status.js
 *   npm run migrate:status
 */

require('dotenv').config();
const { getMigrationStatus } = require('../db');

async function main() {
  try {
    console.log('📊 Checking database migration status...');
    
    const status = await getMigrationStatus();
    
    console.log('\n📋 Migration Status Report:');
    console.log('============================');
    console.log(`Total Migrations: ${status.total}`);
    console.log(`Applied: ${status.appliedCount}`);
    console.log(`Pending: ${status.pendingCount}`);
    
    if (status.applied.length > 0) {
      console.log('\n✅ Applied Migrations:');
      status.applied.forEach(migration => {
        console.log(`   - ${migration.version}: ${migration.name} (${migration.applied_at})`);
      });
    }
    
    if (status.pending.length > 0) {
      console.log('\n⏳ Pending Migrations:');
      status.pending.forEach(migration => {
        console.log(`   - ${migration.version}: ${migration.name}`);
      });
    }
    
    if (status.pendingCount === 0) {
      console.log('\n🎉 All migrations are up to date!');
    } else {
      console.log(`\n🔄 Run 'npm run migrate' to apply ${status.pendingCount} pending migrations`);
    }
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main; 