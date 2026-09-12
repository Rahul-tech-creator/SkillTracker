require('dotenv').config();
const mongoose = require('mongoose');
require('../models/User');
require('../models/Provider');
require('../models/Course');
require('../models/Batch');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');

async function testTrainees() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker');
    console.log('MongoDB connected.');

    const trainees = await Trainee.find()
      .populate('userId', 'name username email role status')
      .populate('providerId', 'organizationName');

    console.log(`Total trainees found: ${trainees.length}`);
    trainees.forEach((t, i) => {
      console.log(`\n[Trainee ${i + 1}]`);
      console.log(`  ID: ${t._id}`);
      console.log(`  User: ${t.userId?.name} (@${t.userId?.username}), Role: ${t.userId?.role}`);
      console.log(`  Provider: ${t.providerId?.organizationName || 'N/A'}`);
      console.log(`  Phone: ${t.phone || 'N/A'}, Location: ${t.location || 'N/A'}`);
      console.log(`  Status: ${t.status}`);
    });

    const enrollments = await Enrollment.find()
      .populate('courseId', 'courseName skills')
      .populate('traineeId');
    console.log(`\nTotal enrollments: ${enrollments.length}`);

    console.log('\n✓ Trainee data inspection completed cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('Error during trainee check:', err);
    process.exit(1);
  }
}

testTrainees();
