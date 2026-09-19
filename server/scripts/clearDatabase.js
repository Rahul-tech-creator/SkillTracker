/**
 * Safe Database Clear Script
 *
 * Removes ALL seeded, demo, and transactional records from the MongoDB database
 * to provide a completely clean testing environment.
 *
 * Safeguards:
 * 1. Requires NODE_ENV !== 'production'
 * 2. Requires --confirm flag or ALLOW_DB_CLEAR=true
 * 3. Validates connection URI against production strings
 *
 * Usage:
 *   npm run db:clear
 *   node scripts/clearDatabase.js --confirm
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 1. Environment Safeguards
if (process.env.NODE_ENV === 'production') {
  console.error('\n🚨 REFUSING TO RUN: NODE_ENV is set to "production".');
  console.error('This script is strictly for development and test environments.\n');
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker';

if (
  mongoUri.toLowerCase().includes('prod') &&
  !process.env.ALLOW_PROD_CLEAR_OVERRIDE
) {
  console.error('\n🚨 REFUSING TO RUN: Target MongoDB URI appears to reference a production database.');
  console.error(`URI: ${mongoUri}\n`);
  process.exit(1);
}

const hasConfirmFlag = process.argv.includes('--confirm') || process.env.ALLOW_DB_CLEAR === 'true';

if (!hasConfirmFlag) {
  console.error('\n⚠️  CONFIRMATION REQUIRED: This script will delete ALL records in the database.');
  console.error('To proceed, pass the --confirm flag or set ALLOW_DB_CLEAR=true:\n');
  console.error('   npm run db:clear');
  console.error('   node scripts/clearDatabase.js --confirm\n');
  process.exit(1);
}

const clearDatabase = async () => {
  try {
    console.log('\n======================================================');
    console.log('   SAFE DATABASE CLEAR SCRIPT (DEVELOPMENT / TEST)    ');
    console.log('======================================================');
    console.log(`Connecting to: ${mongoUri}`);

    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const dbName = mongoose.connection.name;
    console.log(`✓ Connected to database: "${dbName}"\n`);

    // Dynamically load all models from ../models
    const modelsDir = path.join(__dirname, '../models');
    const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.js'));
    
    console.log(`[1/3] Clearing ${modelFiles.length} registered Mongoose model collections...`);
    for (const file of modelFiles) {
      try {
        const model = require(path.join(modelsDir, file));
        if (model && model.deleteMany) {
          const result = await model.deleteMany({});
          console.log(`  - ${model.modelName || file}: deleted ${result.deletedCount} documents`);
        }
      } catch (err) {
        console.warn(`  ! Could not run deleteMany on ${file}: ${err.message}`);
      }
    }

    // Also inspect physical MongoDB collections to catch any legacy or dynamically created collections
    console.log('\n[2/3] Checking physical database collections for any untracked or legacy collections...');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (col.name.startsWith('system.')) continue;
      const nativeCollection = db.collection(col.name);
      const remaining = await nativeCollection.countDocuments();
      if (remaining > 0) {
        console.log(`  - Purging remaining ${remaining} documents in physical collection "${col.name}"...`);
        await nativeCollection.deleteMany({});
      }
    }

    // 3. Post-cleanup verification & document count check
    console.log('\n[3/3] Verifying database is genuinely clean (0 documents across all collections)...');
    const updatedCollections = await db.listCollections().toArray();
    let totalRemaining = 0;
    const reportList = [];

    for (const col of updatedCollections) {
      if (col.name.startsWith('system.')) continue;
      const count = await db.collection(col.name).countDocuments();
      totalRemaining += count;
      reportList.push({ collection: col.name, count });
      console.log(`  ✓ ${col.name}: ${count} documents`);
    }

    // Check specific demo users
    const User = require('../models/User');
    const demoAdmin = await User.findOne({ username: 'admin' });
    const demoProvider = await User.findOne({ username: 'apex_provider' });
    const demoTrainee = await User.findOne({ username: 'rahul' });

    const demoUsersClean = !demoAdmin && !demoProvider && !demoTrainee;

    console.log('\n======================================================');
    console.log('                 CLEANUP AUDIT REPORT                 ');
    console.log('======================================================');
    console.log(`Database Name:            ${dbName}`);
    console.log(`Collections Checked:      ${reportList.length}`);
    console.log(`Total Remaining Documents: ${totalRemaining}`);
    console.log(`Demo Credentials Removed: ${demoUsersClean ? 'YES' : 'NO'}`);
    console.log('======================================================\n');

    if (totalRemaining === 0 && demoUsersClean) {
      console.log('✅ ALL SEEDED AND DEMO DATA HAS BEEN PERMANENTLY REMOVED.');
      console.log('The platform is now in a 100% clean, empty state ready for manual testing.\n');
    } else {
      console.warn(`⚠️ WARNING: ${totalRemaining} documents remain in the database.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during database cleanup:', error);
    process.exit(1);
  }
};

clearDatabase();
