/**
 * Seed script: creates the initial Admin account.
 * Run with: npm run seed:admin
 *
 * Admin credentials (Phase 1):
 *   username: admin
 *   password: admin123
 *
 * The password is hashed by the User pre-save hook.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      console.log('Admin user already exists. Skipping seed.');
      process.exit(0);
    }

    const admin = await User.create({
      name: 'System Administrator',
      username: 'admin',
      email: 'admin@skilling.local',
      password: 'admin123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    console.log(`Admin created successfully.`);
    console.log(`  Username : admin`);
    console.log(`  Password : admin123`);
    console.log(`  Role     : ADMIN`);
    console.log(`  ID       : ${admin._id}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
