#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Usage:
 *   node scripts/backup.js
 *   npm run backup
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function backupSQLite() {
  const dbPath = path.resolve(__dirname, '../../data/translify.db');
  const backupDir = path.resolve(__dirname, '../../backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `translify-backup-${timestamp}.db`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  try {
    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ SQLite backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ SQLite backup failed:', error);
    throw error;
  }
}

async function backupPostgreSQL() {
  const databaseUrl = process.env.DATABASE_URL;
  const backupDir = path.resolve(__dirname, '../../backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `translify-backup-${timestamp}.sql`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  try {
    // Use pg_dump to create backup
    const command = `pg_dump "${databaseUrl}" > "${backupPath}"`;
    await execAsync(command);
    console.log(`✅ PostgreSQL backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ PostgreSQL backup failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('💾 Starting database backup...');
    
    const databaseUrl = process.env.DATABASE_URL;
    let backupPath;
    
    if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
      backupPath = await backupPostgreSQL();
    } else {
      backupPath = await backupSQLite();
    }
    
    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📊 Backup completed:`);
    console.log(`   - File: ${backupPath}`);
    console.log(`   - Size: ${fileSizeInMB} MB`);
    console.log(`   - Timestamp: ${new Date().toISOString()}`);
    
    // Clean up old backups (keep last 10)
    await cleanupOldBackups();
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

async function cleanupOldBackups() {
  const backupDir = path.resolve(__dirname, '../../backups');
  
  if (!fs.existsSync(backupDir)) {
    return;
  }
  
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('translify-backup-'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    // Keep only the last 10 backups
    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      console.log(`🧹 Cleaning up ${filesToDelete.length} old backups...`);
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`   - Deleted: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('⚠️ Warning: Could not cleanup old backups:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { backupSQLite, backupPostgreSQL, main }; 