#!/usr/bin/env node

/**
 * Database Migration Rollback Script
 * 
 * Usage:
 *   node scripts/migrate-rollback.js
 *   npm run migrate:rollback
 */

require('dotenv').config();
const { rollbackLastMigration, getMigrationStatus } = require('../db');

async function main() {
  try {
    console.log('🔄 Rolling back last migration...');
    
    // Get current migration status
    const status = await getMigrationStatus();
    
    if (status.appliedCount === 0) {
      console.log('ℹ️ No migrations to rollback');
      return;
    }
    
    console.log(`📊 Current Status: ${status.appliedCount} migrations applied`);
    
    // Show the last applied migration
    const lastMigration = status.applied[status.applied.length - 1];
    console.log(`🔄 Rolling back: ${lastMigration.version} - ${lastMigration.name}`);
    
    // Confirm rollback
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('Are you sure you want to rollback the last migration? (y/N): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Rollback cancelled');
      return;
    }
    
    // Perform rollback
    await rollbackLastMigration();
    
    console.log('✅ Rollback completed successfully');
    
    // Show updated status
    const newStatus = await getMigrationStatus();
    console.log(`📊 Updated Status: ${newStatus.appliedCount} migrations applied`);
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main; 