#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Translify...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from .env.example...');
  const envExamplePath = path.join(__dirname, '../.env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created. Please edit it with your credentials.');
  } else {
    console.log('⚠️  .env.example not found. Please create a .env file manually.');
  }
} else {
  console.log('✅ .env file already exists.');
}

// Create data directory
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  console.log('📁 Creating data directory...');
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Data directory created.');
} else {
  console.log('✅ Data directory already exists.');
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
  execSync('cd backend && npm install', { stdio: 'inherit' });
  console.log('✅ Backend dependencies installed.');
} catch (error) {
  console.error('❌ Failed to install backend dependencies:', error.message);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  execSync('cd web/frontend && npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed.');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies:', error.message);
}

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Edit .env file with your credentials');
console.log('2. Start Redis: redis-server');
console.log('3. Start backend: npm run backend:dev');
console.log('4. Start frontend: npm run dev');
console.log('\nFor more information, see README.md'); 