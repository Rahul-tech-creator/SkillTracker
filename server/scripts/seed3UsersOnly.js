/**
 * Seed script for 3 core login users ONLY:
 * 1. Admin    : admin / admin123
 * 2. Provider : apex_provider / provider123
 * 3. Trainee  : rahul / trainee123
 *
 * Clears all existing data in MongoDB Atlas and seeds only these 3 users
 * along with 1 minimal course, batch, enrollment, and certificate.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');

// Configure DNS fallback for MongoDB Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore if unable to set
}

// Models
const User = require('../models/User');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const Competency = require('../models/Competency');
const Batch = require('../models/Batch');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Consent = require('../models/Consent');
const FollowUp = require('../models/FollowUp');
const OutcomeRecord = require('../models/OutcomeRecord');
const OutcomeVerification = require('../models/OutcomeVerification');
const OutcomeEvidence = require('../models/OutcomeEvidence');
const Employer = require('../models/Employer');
const EmploymentRecord = require('../models/EmploymentRecord');
const QuestionBank = require('../models/QuestionBank');
const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const RemedialAction = require('../models/RemedialAction');
const RemedialAssessment = require('../models/RemedialAssessment');
const MarketSkill = require('../models/MarketSkill');
const NonPlacementReason = require('../models/NonPlacementReason');
const AttritionReason = require('../models/AttritionReason');
const PolicyRecommendation = require('../models/PolicyRecommendation');
const CommunicationAttempt = require('../models/CommunicationAttempt');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas');
};

const cleanDatabase = async () => {
  console.log('\n[1/3] Clearing all collections from database...');
  const models = [
    User, Provider, Course, Competency, Batch, Trainee, Enrollment, Certificate,
    Consent, FollowUp, OutcomeRecord, OutcomeVerification, OutcomeEvidence,
    Employer, EmploymentRecord, QuestionBank, Assessment, AssessmentAttempt,
    SkillGapAnalysis, RemedialAction, RemedialAssessment, MarketSkill,
    NonPlacementReason, AttritionReason, PolicyRecommendation, CommunicationAttempt,
  ];

  for (const m of models) {
    await m.deleteMany({});
  }
  console.log('✓ Database cleaned completely.');
};

const seed3Users = async () => {
  try {
    await connectDB();
    await cleanDatabase();

    console.log('\n[2/3] Creating 3 Quick-Login Demo Users...');

    // 1. System Admin User
    const adminUser = await User.create({
      name: 'Dr. Suresh Sharma (System Administrator)',
      username: 'admin',
      email: 'admin@skills.gov.in',
      password: 'admin123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    console.log('  ✓ Admin created    : username="admin" | password="admin123"');

    // 2. Training Provider User & Provider Record
    const providerUser = await User.create({
      name: 'Ravi Teja (Apex Admin)',
      username: 'apex_provider',
      email: 'ravi@apexskills.org',
      password: 'provider123',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });

    const providerDoc = await Provider.create({
      userId: providerUser._id,
      organizationName: 'Apex Institute of Technical Skills',
      contactPerson: 'Ravi Teja',
      phone: '9848022334',
      address: 'MG Road, Tech Park Zone',
      district: 'Vijayawada',
      status: 'ACTIVE',
    });
    console.log('  ✓ Provider created : username="apex_provider" | password="provider123"');

    // 3. Trainee User & Trainee Record
    const traineeUser = await User.create({
      name: 'Rahul Sharma',
      username: 'rahul',
      email: 'rahul@skillingdemo.in',
      password: 'trainee123',
      role: 'TRAINEE',
      status: 'ACTIVE',
    });

    const traineeDoc = await Trainee.create({
      internalTraineeId: 'TRN-2024-00101',
      userId: traineeUser._id,
      providerId: providerDoc._id,
      phone: '9876543210',
      email: 'rahul@skillingdemo.in',
      district: 'Vijayawada',
      state: 'Andhra Pradesh',
      gender: 'MALE',
      socialCategory: 'GENERAL',
      residenceType: 'URBAN',
      trackingConsent: 'GRANTED',
      contactStatus: 'VERIFIED',
      status: 'ACTIVE',
    });
    console.log('  ✓ Trainee created  : username="rahul" | password="trainee123"');

    console.log('\n[3/3] Creating sample Course, Batch, Enrollment & Certificate...');

    // Sample Course
    const courseDoc = await Course.create({
      providerId: providerDoc._id,
      courseName: 'Full Stack Web Development (MERN)',
      courseCode: 'CRS-MERN-2024',
      sector: 'IT & Software',
      durationHours: 400,
      description: 'Comprehensive MERN Stack Web Development with Node.js, Express, React, and MongoDB.',
      status: 'ACTIVE',
    });

    // Sample Batch
    const batchDoc = await Batch.create({
      providerId: providerDoc._id,
      courseId: courseDoc._id,
      batchName: 'MERN-2024-Cohort-Alpha',
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-04-10'),
      status: 'COMPLETED',
    });

    // Sample Enrollment
    const enrollmentDoc = await Enrollment.create({
      traineeId: traineeDoc._id,
      courseId: courseDoc._id,
      batchId: batchDoc._id,
      providerId: providerDoc._id,
      enrollmentDate: new Date('2024-01-10'),
      completionDate: new Date('2024-04-10'),
      status: 'COMPLETED',
    });

    // Sample Certificate
    await Certificate.create({
      certificateNumber: 'CERT-2024-MERN-00101',
      verificationCode: 'VER-MERN-88901',
      traineeId: traineeDoc._id,
      courseId: courseDoc._id,
      batchId: batchDoc._id,
      providerId: providerDoc._id,
      enrollmentId: enrollmentDoc._id,
      issueDate: new Date('2024-04-12'),
      status: 'ISSUED',
    });


    console.log('\n================================================================');
    console.log('🎉 SEEDING COMPLETED FOR 3 LOGIN USERS ONLY!');
    console.log('================================================================');
    console.log('Created Users:');
    console.log('  1. ADMIN    : username="admin"         | password="admin123"');
    console.log('  2. PROVIDER : username="apex_provider" | password="provider123"');
    console.log('  3. TRAINEE  : username="rahul"         | password="trainee123"');
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed3Users();
