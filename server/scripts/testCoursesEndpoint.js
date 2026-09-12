require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Provider = require('../models/Provider');

async function checkCourses() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker');
    console.log('MongoDB connected.');

    const count = await Course.countDocuments();
    console.log(`Total courses in DB: ${count}`);

    const courses = await Course.find().populate('providerId', 'organizationName');
    courses.forEach((c, idx) => {
      console.log(`\n[Course ${idx + 1}] ${c.courseName}`);
      console.log(`  Provider: ${c.providerId?.organizationName || 'N/A'}`);
      console.log(`  Skills:`, JSON.stringify(c.skills));
      console.log(`  Status: ${c.status}`);
    });

    console.log('\n✓ Courses query test passed cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('Error fetching courses:', err);
    process.exit(1);
  }
}

checkCourses();
