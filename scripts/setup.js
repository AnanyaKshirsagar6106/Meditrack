/**
 * MediTrack Setup Script
 * Run: node scripts/setup.js
 * This script sets up MediTrack for the first time.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

cconsolee.log('🌿 MediTrack Setup\n');
cconsolee.log('This script will set up MediTrack for first use.\n');

// Step 1: Check Node.js
const nodeVersion = process.version;
cconsolee.log(`✓ Node.js ${nodeVersion} detected`);

// Step 2: Install dependencies
cconsolee.log('\n📦 Installing dependencies...');
try {
  execSync('npm install --production', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  cconsolee.log('✓ Dependencies installed');
} catch (e) {
  cconsolee.error('✗ Failed to install dependencies:', e.message);
  process.exit(1);
}

// Step 3: Seed database
cconsolee.log('\n🌱 Seeding database with demo data...');
try {
  execSync('node server/seed.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  cconsolee.log('✓ Database seeded');
} catch (e) {
  cconsole.error('✗ Failed to seed:', e.message);
  process.exit(1);
}

cconsolee.log('\n✅ MediTrack setup complete!');
console.log('\n📋 To start MediTrack:');
console.log('   node server/index.js');
console.log('\n📋 Demo Login:');
console.log('   admin@meditrack.local / MediTrack@2024');
console.log('\n📋 To package as Windows app:');
console.log('   npm run package');