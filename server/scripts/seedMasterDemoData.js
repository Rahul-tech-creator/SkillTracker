/**
 * Master Demo Data Seeder for Longitudinal Skilling Outcomes & Impact Measurement System
 * Generates rich, authentic, production-grade test data across all models:
 * - Admin, Providers, Trainees
 * - Courses with Structured Skills
 * - Batches, Enrollments, Certificates
 * - Longitudinal Consents, Follow-Ups & Career Outcomes
 * - Published AI Skill Assessments & Scored Attempts
 * - Skill Gap Diagnostics & Remedial Action Plans
 * - Government Funding Schemes & Provider Budget Allocations
 *
 * Run with: npm run seed:demo
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');

// Models
const User = require('../models/User');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Consent = require('../models/Consent');
const FollowUp = require('../models/FollowUp');
const OutcomeRecord = require('../models/OutcomeRecord');
const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const RemedialAction = require('../models/RemedialAction');
const FundingScheme = require('../models/FundingScheme');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);
};

const cleanDatabase = async () => {
  console.log('Cleaning existing collections...');
  const models = [
    User, Provider, Course, Batch, Trainee, Enrollment, Certificate,
    Consent, FollowUp, OutcomeRecord, Assessment, AssessmentAttempt,
    SkillGapAnalysis, RemedialAction, FundingScheme
  ];
  for (const model of models) {
    await model.deleteMany({});
  }
  console.log('✓ Collections cleaned.');
};

const runSeeder = async () => {
  try {
    await connectDB();
    await cleanDatabase();

    // ==========================================
    // 1. ADMIN USER
    // ==========================================
    console.log('\n[1/10] Creating Admin Account...');
    const adminUser = await User.create({
      name: 'Dr. Suresh Sharma (Director of Skilling)',
      username: 'admin',
      email: 'director@skills.gov.in',
      password: 'admin123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    console.log('✓ Admin created: admin / admin123');

    // ==========================================
    // 2. TRAINING PROVIDERS
    // ==========================================
    console.log('\n[2/10] Creating Training Providers...');
    
    // Provider 1: Apex Skill Institute
    const providerUser1 = await User.create({
      name: 'Ravi Teja (Apex Admin)',
      username: 'apex_provider',
      email: 'ravi@apexskills.org',
      password: 'provider123',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    const provider1 = await Provider.create({
      userId: providerUser1._id,
      organizationName: 'Apex Institute of Technical Skills',
      registrationNumber: 'REG-APEX-2022-889',
      contactPerson: 'Ravi Teja',
      phone: '9848022334',
      address: 'Tech Park Zone, MG Road, Vijayawada, AP',
      status: 'ACTIVE',
    });

    // Provider 2: TechForward Academy
    const providerUser2 = await User.create({
      name: 'Sunita Mehra (TechForward)',
      username: 'techforward_provider',
      email: 'contact@techforward.edu',
      password: 'provider123',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    const provider2 = await Provider.create({
      userId: providerUser2._id,
      organizationName: 'TechForward Digital Academy',
      registrationNumber: 'REG-TFD-2023-412',
      contactPerson: 'Sunita Mehra',
      phone: '9876543210',
      address: 'Hitech City Phase 2, Madhapur, Hyderabad, TS',
      status: 'ACTIVE',
    });

    // Provider 3: National Healthcare & Tech Institute
    const providerUser3 = await User.create({
      name: 'Dr. Anand Kulkarni (NHVI)',
      username: 'nhvi_provider',
      email: 'dean@nhvi.ac.in',
      password: 'provider123',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    const provider3 = await Provider.create({
      userId: providerUser3._id,
      organizationName: 'National Healthcare & Paramedical Institute',
      registrationNumber: 'REG-NHVI-2021-105',
      contactPerson: 'Dr. Anand Kulkarni',
      phone: '9123456789',
      address: 'Beach Road Health Complex, Visakhapatnam, AP',
      status: 'ACTIVE',
    });
    console.log('✓ 3 Providers created (Login: apex_provider / provider123, techforward_provider / provider123, nhvi_provider / provider123)');

    // ==========================================
    // 3. COURSE CURRICULA WITH STRUCTURED SKILLS
    // ==========================================
    console.log('\n[3/10] Creating Courses & Structured Skills...');

    // Course 1: Full-Stack MERN (Apex)
    const course1 = await Course.create({
      providerId: provider1._id,
      courseName: 'Full-Stack MERN Web Development',
      description: 'Comprehensive modern JavaScript stack covering React 18, Node.js REST APIs, MongoDB NoSQL architecture, and cloud deployment.',
      category: 'Information Technology',
      duration: '16 Weeks (400 Hours)',
      skills: [
        { skillId: 'react_js', skillName: 'React.js & Frontend Architecture', weight: 35 },
        { skillId: 'node_express', skillName: 'Node.js & Backend REST APIs', weight: 35 },
        { skillId: 'mongodb_nosql', skillName: 'MongoDB Database Design', weight: 30 },
      ],
      status: 'ACTIVE',
    });

    // Course 2: Cloud & DevOps (TechForward)
    const course2 = await Course.create({
      providerId: provider2._id,
      courseName: 'Cloud Engineering & DevOps Infrastructure',
      description: 'Enterprise containerization, Kubernetes cluster management, CI/CD pipelines, and AWS cloud native architecture.',
      category: 'Cloud & Infrastructure',
      duration: '14 Weeks (350 Hours)',
      skills: [
        { skillId: 'docker_containers', skillName: 'Docker & Containerization', weight: 30 },
        { skillId: 'kubernetes_k8s', skillName: 'Kubernetes Orchestration', weight: 40 },
        { skillId: 'aws_cloud', skillName: 'AWS Cloud Native Services', weight: 30 },
      ],
      status: 'ACTIVE',
    });

    // Course 3: Python Data Analytics & AI (TechForward)
    const course3 = await Course.create({
      providerId: provider2._id,
      courseName: 'Applied Python & AI Data Science',
      description: 'Data analytics pipelines, statistical modeling, machine learning fundamentals, and LLM application engineering.',
      category: 'Artificial Intelligence',
      duration: '12 Weeks (300 Hours)',
      skills: [
        { skillId: 'python_core', skillName: 'Python Programming & Data Structures', weight: 35 },
        { skillId: 'pandas_analytics', skillName: 'Data Wrangling & Analytics (Pandas)', weight: 35 },
        { skillId: 'ml_foundations', skillName: 'Machine Learning Models & Scikit', weight: 30 },
      ],
      status: 'ACTIVE',
    });

    // Course 4: Emergency Medical Technician (NHVI)
    const course4 = await Course.create({
      providerId: provider3._id,
      courseName: 'Emergency Medical Technician & Patient Care',
      description: 'Paramedical first-responder protocols, trauma life support, vital signs diagnostic monitoring, and triage management.',
      category: 'Healthcare & Paramedical',
      duration: '20 Weeks (500 Hours)',
      skills: [
        { skillId: 'patient_triage', skillName: 'Patient Triage & Trauma Assessment', weight: 40 },
        { skillId: 'cardiac_cpr', skillName: 'Emergency Life Support & CPR', weight: 35 },
        { skillId: 'medical_compliance', skillName: 'Clinical Protocol & Documentation', weight: 25 },
      ],
      status: 'ACTIVE',
    });
    console.log('✓ 4 Courses created with structured skill weights.');

    // ==========================================
    // 4. BATCHES / COHORTS
    // ==========================================
    console.log('\n[4/10] Creating Batches...');

    const batch1 = await Batch.create({
      providerId: provider1._id,
      courseId: course1._id,
      batchName: 'MERN-2024-Cohort-Alpha',
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-05-02'),
      capacity: 30,
      mode: 'OFFLINE',
      location: 'Apex Labs Room 402, Vijayawada',
      status: 'COMPLETED',
    });

    const batch2 = await Batch.create({
      providerId: provider1._id,
      courseId: course1._id,
      batchName: 'MERN-2024-Cohort-Beta',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-09-25'),
      capacity: 35,
      mode: 'HYBRID',
      location: 'Online + Apex Lab 1',
      status: 'ONGOING',
    });

    const batch3 = await Batch.create({
      providerId: provider2._id,
      courseId: course2._id,
      batchName: 'DEVOPS-2024-Pro',
      startDate: new Date('2024-02-15'),
      endDate: new Date('2024-05-30'),
      capacity: 25,
      mode: 'ONLINE',
      location: 'Virtual Classroom TechForward',
      status: 'COMPLETED',
    });

    const batch4 = await Batch.create({
      providerId: provider2._id,
      courseId: course3._id,
      batchName: 'AI-DATA-2024-Q1',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-04-20'),
      capacity: 25,
      mode: 'HYBRID',
      location: 'TechForward Hub, Hyderabad',
      status: 'COMPLETED',
    });

    const batch5 = await Batch.create({
      providerId: provider3._id,
      courseId: course4._id,
      batchName: 'EMT-2024-Batch-1',
      startDate: new Date('2024-01-05'),
      endDate: new Date('2024-05-25'),
      capacity: 20,
      mode: 'OFFLINE',
      location: 'NHVI Hospital Simulation Ward 2',
      status: 'COMPLETED',
    });
    console.log('✓ 5 Batches created across providers.');

    // ==========================================
    // 5. TRAINEES (10 REALISTIC PROFILES)
    // ==========================================
    console.log('\n[5/10] Registering Trainees & Enrolling in Batches...');

    const traineesData = [
      { name: 'Rahul Sharma', username: 'rahul', email: 'rahul.sharma@example.com', phone: '9848011221', location: 'Vijayawada', gender: 'MALE', provider: provider1, batch: batch1, course: course1, completed: true, issuedBy: providerUser1._id },
      { name: 'Priya Patel', username: 'priya', email: 'priya.patel@example.com', phone: '9848011222', location: 'Guntur', gender: 'FEMALE', provider: provider1, batch: batch1, course: course1, completed: true, issuedBy: providerUser1._id },
      { name: 'Ananya Reddy', username: 'ananya', email: 'ananya.reddy@example.com', phone: '9848011223', location: 'Hyderabad', gender: 'FEMALE', provider: provider2, batch: batch3, course: course2, completed: true, issuedBy: providerUser2._id },
      { name: 'Karthik Verma', username: 'karthik', email: 'karthik.verma@example.com', phone: '9848011224', location: 'Secunderabad', gender: 'MALE', provider: provider2, batch: batch3, course: course2, completed: true, issuedBy: providerUser2._id },
      { name: 'Sneha Rao', username: 'sneha', email: 'sneha.rao@example.com', phone: '9848011225', location: 'Hyderabad', gender: 'FEMALE', provider: provider2, batch: batch4, course: course3, completed: true, issuedBy: providerUser2._id },
      { name: 'Vikram Nair', username: 'vikram', email: 'vikram.nair@example.com', phone: '9848011226', location: 'Visakhapatnam', gender: 'MALE', provider: provider3, batch: batch5, course: course4, completed: true, issuedBy: providerUser3._id },
      { name: 'Pooja Deshmukh', username: 'pooja', email: 'pooja.d@example.com', phone: '9848011227', location: 'Visakhapatnam', gender: 'FEMALE', provider: provider3, batch: batch5, course: course4, completed: true, issuedBy: providerUser3._id },
      { name: 'Arjun Singh', username: 'arjun', email: 'arjun.singh@example.com', phone: '9848011228', location: 'Vijayawada', gender: 'MALE', provider: provider1, batch: batch2, course: course1, completed: false, issuedBy: providerUser1._id },
      { name: 'Meera Iyer', username: 'meera', email: 'meera.iyer@example.com', phone: '9848011229', location: 'Amaravati', gender: 'FEMALE', provider: provider1, batch: batch2, course: course1, completed: false, issuedBy: providerUser1._id },
      { name: 'Vishnu Teja', username: 'vishnu', email: 'vishnu.teja@example.com', phone: '9848011230', location: 'Vijayawada', gender: 'MALE', provider: provider1, batch: batch1, course: course1, completed: true, issuedBy: providerUser1._id },
    ];

    const createdTrainees = [];
    const createdEnrollments = [];

    for (const t of traineesData) {
      const u = await User.create({
        name: t.name,
        username: t.username,
        email: t.email,
        password: 'trainee123',
        role: 'TRAINEE',
        status: 'ACTIVE',
      });

      const tr = await Trainee.create({
        userId: u._id,
        providerId: t.provider._id,
        phone: t.phone,
        dateOfBirth: new Date('2001-05-14'),
        gender: t.gender,
        location: t.location,
        educationLevel: 'GRADUATE',
        status: 'ACTIVE',
      });
      createdTrainees.push({ trainee: tr, user: u, meta: t });

      // Create Enrollment
      const enroll = await Enrollment.create({
        traineeId: tr._id,
        courseId: t.course._id,
        batchId: t.batch._id,
        providerId: t.provider._id,
        enrollmentDate: t.batch.startDate || new Date(),
        status: t.completed ? 'COMPLETED' : 'ENROLLED',
      });
      createdEnrollments.push({ enrollment: enroll, trainee: tr, user: u, meta: t });
    }
    console.log('✓ 10 Trainees registered & enrolled (Password: trainee123 for all)');

    // ==========================================
    // 6. CERTIFICATES, CONSENTS, FOLLOW-UPS & OUTCOMES
    // ==========================================
    console.log('\n[6/10] Issuing Verified Certificates, Consents & Longitudinal Outcomes...');

    const completedEnrollments = createdEnrollments.filter((e) => e.meta.completed);

    for (let i = 0; i < completedEnrollments.length; i++) {
      const item = completedEnrollments[i];
      const certNum = `CERT-2024-${item.meta.course.category.substring(0, 3).toUpperCase()}-${1000 + i}`;
      const vCode = `VER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const issueDate = item.meta.batch.endDate || new Date();

      const cert = await Certificate.create({
        certificateNumber: certNum,
        traineeId: item.trainee._id,
        enrollmentId: item.enrollment._id,
        courseId: item.meta.course._id,
        batchId: item.meta.batch._id,
        providerId: item.meta.provider._id,
        issuedBy: item.meta.issuedBy,
        issueDate,
        status: 'ISSUED',
        verificationCode: vCode,
      });

      // Create Longitudinal Consent
      await Consent.create({
        traineeId: item.trainee._id,
        enrollmentId: item.enrollment._id,
        certificateId: cert._id,
        status: 'GRANTED',
        consentedAt: new Date(issueDate.getTime() + 2 * 86400000),
        consentVersion: 'v1.0',
        purpose: 'Longitudinal Post-Training Career & Employment Impact Assessment',
      });

      // Create 90-Day and 180-Day Follow-Up Milestones
      const f90Date = new Date(issueDate.getTime() + 90 * 86400000);
      const f180Date = new Date(issueDate.getTime() + 180 * 86400000);

      const f90 = await FollowUp.create({
        traineeId: item.trainee._id,
        enrollmentId: item.enrollment._id,
        certificateId: cert._id,
        providerId: item.meta.provider._id,
        followUpType: '90_DAY',
        daysInterval: 90,
        scheduledDate: f90Date,
        status: 'COMPLETED',
        completedAt: f90Date,
      });

      const f180 = await FollowUp.create({
        traineeId: item.trainee._id,
        enrollmentId: item.enrollment._id,
        certificateId: cert._id,
        providerId: item.meta.provider._id,
        followUpType: '180_DAY',
        daysInterval: 180,
        scheduledDate: f180Date,
        status: 'COMPLETED',
        completedAt: f180Date,
      });

      // Create Verified Employment Outcome Record
      const salaryRanges = ['₹30,000–₹50,000', '₹30,000–₹50,000', 'Above ₹50,000', '₹20,000–₹30,000'];
      const employers = ['Infosys Digital Solutions', 'Tata Consultancy Services (TCS)', 'Cognizant Technology', 'Apollo Multi-Specialty Hospital', 'TechMahindra Cloud Labs'];
      const roles = ['Associate Full-Stack Developer', 'Junior DevOps Engineer', 'Data Analyst & Python Dev', 'Emergency Medical Responder', 'Software Engineer'];

      await OutcomeRecord.create({
        traineeId: item.trainee._id,
        enrollmentId: item.enrollment._id,
        certificateId: cert._id,
        followUpId: f180._id,
        providerId: item.meta.provider._id,
        followUpType: '180_DAY',
        observedAt: f180Date,
        situation: 'EMPLOYED',
        employmentData: {
          isEmployed: true,
          employerName: employers[i % employers.length],
          jobRole: roles[i % roles.length],
          startDate: new Date(issueDate.getTime() + 45 * 86400000),
          monthlySalaryRange: salaryRanges[i % salaryRanges.length],
          isCourseRelated: true,
        },
        feedback: {
          courseRelevanceRating: 5,
          trainingQualityRating: 5,
          testimonial: 'The hands-on curriculum and project assessments directly helped me clear my technical interviews.',
        },
      });
    }
    console.log(`✓ ${completedEnrollments.length} Certificates, Consents, Follow-Ups & Career Outcomes seeded.`);

    // ==========================================
    // 7. REAL AI SKILL ASSESSMENTS & MCQs (3 per skill = 9 per course)
    // ==========================================
    console.log('\n[7/10] Creating Published Assessments & MCQ Question Banks...');

    // Assessment 1: MERN Assessment (Apex)
    const mernQuestions = [
      // React (3 questions)
      {
        questionId: crypto.randomUUID(),
        questionText: 'In React 18, what is the primary benefit of Concurrent Mode and startTransition?',
        options: [
          { label: 'A', text: 'It reduces the bundle size of third-party libraries.' },
          { label: 'B', text: 'It lets React mark non-urgent state updates as interruptible to keep the UI responsive.' },
          { label: 'C', text: 'It converts client-side state into server-side SQLite tables.' },
          { label: 'D', text: 'It replaces the need for useState and useEffect entirely.' },
        ],
        correctAnswer: 'B',
        skillId: 'react_js',
        skillName: 'React.js & Frontend Architecture',
        difficulty: 'INTERMEDIATE',
        explanation: 'startTransition enables non-urgent UI transitions to yield to urgent user interactions like typing and clicking.',
        marks: 1,
      },
      {
        questionId: crypto.randomUUID(),
        questionText: 'Why must custom hooks in React always follow the Rules of Hooks (e.g. called at the top level)?',
        options: [
          { label: 'A', text: 'To ensure React maintains consistent hook call order across renders.' },
          { label: 'B', text: 'To prevent CSS styles from reloading.' },
          { label: 'C', text: 'To force synchronous HTTP requests.' },
          { label: 'D', text: 'To compile JSX into plain HTML.' },
        ],
        correctAnswer: 'A',
        skillId: 'react_js',
        skillName: 'React.js & Frontend Architecture',
        difficulty: 'BEGINNER',
        explanation: 'React relies on the call order of hooks to link state with the corresponding component instance.',
        marks: 1,
      },
      {
        questionId: crypto.randomUUID(),
        questionText: 'What is the purpose of React.memo() when optimizing component trees?',
        options: [
          { label: 'A', text: 'It prevents re-rendering if component props have not shallowly changed.' },
          { label: 'B', text: 'It automatically saves form data to browser localStorage.' },
          { label: 'C', text: 'It converts class components into functional components at runtime.' },
          { label: 'D', text: 'It caches HTTP API responses indefinitely.' },
        ],
        correctAnswer: 'A',
        skillId: 'react_js',
        skillName: 'React.js & Frontend Architecture',
        difficulty: 'ADVANCED',
        explanation: 'React.memo wraps a component and skips rendering if incoming props are shallowly equal.',
        marks: 1,
      },
      // Node.js (3 questions)
      {
        questionId: crypto.randomUUID(),
        questionText: 'In Node.js Express architecture, what is the key purpose of error-handling middleware with 4 arguments (err, req, res, next)?',
        options: [
          { label: 'A', text: 'It accelerates file system read speeds.' },
          { label: 'B', text: 'It catches unhandled synchronous and next(err) exceptions centrally across routes.' },
          { label: 'C', text: 'It compiles TypeScript files into ES Modules.' },
          { label: 'D', text: 'It hashes user passwords before sending them to database.' },
        ],
        correctAnswer: 'B',
        skillId: 'node_express',
        skillName: 'Node.js & Backend REST APIs',
        difficulty: 'INTERMEDIATE',
        explanation: 'Express recognizes 4-argument middleware functions specifically as centralized error handlers.',
        marks: 1,
      },
      {
        questionId: crypto.randomUUID(),
        questionText: 'How does Node.js achieve non-blocking asynchronous I/O despite being single-threaded?',
        options: [
          { label: 'A', text: 'By utilizing the libuv event loop and thread pool for heavy I/O operations.' },
          { label: 'B', text: 'By spawning a new V8 engine per incoming HTTP socket.' },
          { label: 'C', text: 'By executing all code synchronously on GPU shaders.' },
          { label: 'D', text: 'By buffering all incoming network packets directly into MongoDB.' },
        ],
        correctAnswer: 'A',
        skillId: 'node_express',
        skillName: 'Node.js & Backend REST APIs',
        difficulty: 'ADVANCED',
        explanation: 'libuv handles the event loop and delegates heavy file/network I/O to background OS threads.',
        marks: 1,
      },
      {
        questionId: crypto.randomUUID(),
        questionText: 'Why should JSON Web Tokens (JWT) for authentication be verified using an asymmetric key pair or secure secret on each protected request?',
        options: [
          { label: 'A', text: 'To ensure token payload authenticity and verify the token has not been tampered with or expired.' },
          { label: 'B', text: 'To compress the request payload size.' },
          { label: 'C', text: 'To avoid needing database tables.' },
          { label: 'D', text: 'To translate HTTP requests into WebSocket packets.' },
        ],
        correctAnswer: 'A',
        skillId: 'node_express',
        skillName: 'Node.js & Backend REST APIs',
        difficulty: 'BEGINNER',
        explanation: 'JWT signature verification ensures the integrity and claims of the client authentication token.',
        marks: 1,
      },
      // MongoDB (3 questions)
      {
        questionId: crypto.randomUUID(),
        questionText: 'In MongoDB schema design, when is embedding documents preferred over referencing ($lookup)?',
        options: [
          { label: 'A', text: 'When the related data grows unboundedly without limits.' },
          { label: 'B', text: 'When related entities are frequently read together and have 1-to-few containment.' },
          { label: 'C', text: 'When transactions across 50 collections are required.' },
          { label: 'D', text: 'When document sizes exceed the 16MB BSON limit.' },
        ],
        correctAnswer: 'B',
        skillId: 'mongodb_nosql',
        skillName: 'MongoDB Database Design',
        difficulty: 'INTERMEDIATE',
        explanation: 'Embedding avoids costly JOIN operations and guarantees atomic single-document reads/writes.',
        marks: 1,
      },
      {
        questionId: crypto.randomUUID(),
        questionText: 'What is the purpose of a compound index in MongoDB containing fields { status: 1, createdAt: -1 }?',
        options: [
          { label: 'A', text: 'To encrypt sensitive passwords in the database.' },
          { label: 'B', text: 'To efficiently filter by status and sort by creation timestamp in a single B-tree index scan.' },
          { label: 'C', text: 'To replicate collections automatically to secondary nodes.' },
          { label: 'D', text: 'To convert JSON documents into XML format.' },
        ],
        correctAnswer: 'B',
        skillId: 'mongodb_nosql',
        skillName: 'MongoDB Database Design',
        difficulty: 'ADVANCED',
        explanation: 'Compound indexes optimize queries that filter on equality/range and sort on following fields.',
        marks: 1,
      },
      {
        questionId: crypto.randomUUID(),
        questionText: 'In MongoDB, what does the $match pipeline stage do inside an aggregation pipeline?',
        options: [
          { label: 'A', text: 'It filters documents in the stream to pass only matching documents to the next stage.' },
          { label: 'B', text: 'It creates a new database collection on disk.' },
          { label: 'C', text: 'It merges two separate MongoDB replica clusters.' },
          { label: 'D', text: 'It replaces the BSON serializer with JSON format.' },
        ],
        correctAnswer: 'A',
        skillId: 'mongodb_nosql',
        skillName: 'MongoDB Database Design',
        difficulty: 'BEGINNER',
        explanation: '$match acts as an early filter in the aggregation pipeline, leveraging indexes whenever positioned first.',
        marks: 1,
      },
    ];

    const assessment1 = await Assessment.create({
      courseId: course1._id,
      providerId: provider1._id,
      title: 'Full-Stack MERN Technical Competency Assessment v1',
      version: 1,
      skills: course1.skills,
      difficulty: 'MIXED',
      questionsPerSkill: 3,
      totalQuestions: mernQuestions.length,
      timeLimitMinutes: 30,
      maxAttempts: 3,
      questions: mernQuestions,
      status: 'PUBLISHED',
      publishedAt: new Date('2024-04-15'),
      createdBy: providerUser1._id,
    });
    console.log('✓ MERN Assessment (9 Questions, 3 per skill) published.');

    // ==========================================
    // 8. ASSESSMENT ATTEMPTS & SKILL GAP DIAGNOSTICS
    // ==========================================
    console.log('\n[8/10] Seeding Trainee Assessment Attempts & Skill Gap Reports...');

    // Attempt 1: Rahul Sharma on MERN (Strong React & Node, Moderate MongoDB)
    const rahulEnrollment = createdEnrollments[0].enrollment;
    const rahulTrainee = createdTrainees[0].trainee;

    const rahulAnswers = [
      { questionId: mernQuestions[0].questionId, selectedAnswer: 'B', isCorrect: true, skillId: 'react_js', skillName: 'React.js & Frontend Architecture', marks: 1, maxMarks: 1 },
      { questionId: mernQuestions[1].questionId, selectedAnswer: 'A', isCorrect: true, skillId: 'react_js', skillName: 'React.js & Frontend Architecture', marks: 1, maxMarks: 1 },
      { questionId: mernQuestions[2].questionId, selectedAnswer: 'A', isCorrect: true, skillId: 'react_js', skillName: 'React.js & Frontend Architecture', marks: 1, maxMarks: 1 },
      { questionId: mernQuestions[3].questionId, selectedAnswer: 'B', isCorrect: true, skillId: 'node_express', skillName: 'Node.js & Backend REST APIs', marks: 1, maxMarks: 1 },
      { questionId: mernQuestions[4].questionId, selectedAnswer: 'A', isCorrect: true, skillId: 'node_express', skillName: 'Node.js & Backend REST APIs', marks: 1, maxMarks: 1 },
      { questionId: mernQuestions[5].questionId, selectedAnswer: 'A', isCorrect: true, skillId: 'node_express', skillName: 'Node.js & Backend REST APIs', marks: 1, maxMarks: 1 },
      { questionId: mernQuestions[6].questionId, selectedAnswer: 'A', isCorrect: false, skillId: 'mongodb_nosql', skillName: 'MongoDB Database Design', marks: 0, maxMarks: 1 }, // Wrong embedding
      { questionId: mernQuestions[7].questionId, selectedAnswer: 'B', isCorrect: true, skillId: 'mongodb_nosql', skillName: 'MongoDB Database Design', marks: 1, maxMarks: 1 },
      { questionId: mernQuestions[8].questionId, selectedAnswer: 'A', isCorrect: true, skillId: 'mongodb_nosql', skillName: 'MongoDB Database Design', marks: 1, maxMarks: 1 },
    ];

    const attempt1 = await AssessmentAttempt.create({
      assessmentId: assessment1._id,
      traineeId: rahulTrainee._id,
      enrollmentId: rahulEnrollment._id,
      courseId: course1._id,
      providerId: provider1._id,
      attemptNumber: 1,
      startedAt: new Date('2024-04-20T10:00:00Z'),
      submittedAt: new Date('2024-04-20T10:24:00Z'),
      status: 'SUBMITTED',
      answers: rahulAnswers,
      totalScore: 8,
      maxScore: 9,
      percentage: 88.89,
      skillScores: [
        { skillId: 'react_js', skillName: 'React.js & Frontend Architecture', correct: 3, total: 3, percentage: 100, marks: 3, maxMarks: 3 },
        { skillId: 'node_express', skillName: 'Node.js & Backend REST APIs', correct: 3, total: 3, percentage: 100, marks: 3, maxMarks: 3 },
        { skillId: 'mongodb_nosql', skillName: 'MongoDB Database Design', correct: 2, total: 3, percentage: 66.67, marks: 2, maxMarks: 3 },
      ],
    });

    // Skill Gap Analysis for Rahul
    await SkillGapAnalysis.create({
      attemptId: attempt1._id,
      traineeId: rahulTrainee._id,
      courseId: course1._id,
      providerId: provider1._id,
      assessmentId: assessment1._id,
      overallScore: 8,
      overallMaxScore: 9,
      overallPercentage: 88.89,
      skillResults: [
        {
          skillId: 'react_js',
          skillName: 'React.js & Frontend Architecture',
          score: 3,
          maxScore: 3,
          percentage: 100,
          classification: 'STRONG',
          gapScore: 0,
          confidence: 'HIGH',
          wrongTopics: [],
          questionsTotal: 3,
          questionsCorrect: 3,
        },
        {
          skillId: 'node_express',
          skillName: 'Node.js & Backend REST APIs',
          score: 3,
          maxScore: 3,
          percentage: 100,
          classification: 'STRONG',
          gapScore: 0,
          confidence: 'HIGH',
          wrongTopics: [],
          questionsTotal: 3,
          questionsCorrect: 3,
        },
        {
          skillId: 'mongodb_nosql',
          skillName: 'MongoDB Database Design',
          score: 2,
          maxScore: 3,
          percentage: 66.67,
          classification: 'DEVELOPING',
          gapScore: 33.33,
          confidence: 'HIGH',
          wrongTopics: ['Embedding vs Referencing Subdocument Patterns in NoSQL'],
          questionsTotal: 3,
          questionsCorrect: 2,
        },
      ],
      deterministic: {
        strongSkills: ['react_js', 'node_express'],
        developingSkills: ['mongodb_nosql'],
        weakSkills: [],
        criticalGaps: [],
        thresholdsUsed: { strong: 80, developing: 60, weak: 40, criticalGap: 25 },
      },
      aiAnalysis: {
        summary: 'Rahul demonstrates outstanding mastery in React 18 concurrent architecture and Node.js REST API design (100% proficiency). A minor gap was identified in MongoDB schema embedding vs referencing patterns (66.7% score).',
        strongSkills: [
          { skill: 'React.js & Frontend Architecture', evidence: '100% score; flawless grasp of React 18 startTransition and custom hooks.' },
          { skill: 'Node.js & Backend REST APIs', evidence: '100% score; clear understanding of Express centralized error handling and event loop.' }
        ],
        developingSkills: [
          { skill: 'MongoDB Database Design', evidence: '66.7% score; missed question regarding document growth limits.' }
        ],
        skillGaps: [
          {
            skill: 'MongoDB Database Design',
            severity: 'LOW',
            evidence: 'Missed question regarding unbounded growth in 1-to-many document relationships.',
            weakTopics: ['Embedding vs Referencing Subdocument Patterns in NoSQL'],
            recommendedAction: 'Review MongoDB 1-to-N schema design patterns and indexing strategies.',
          }
        ],
        recommendedSkills: ['MongoDB Aggregation Pipeline', 'Redis In-Memory Caching'],
        providerActions: ['Provide 1-on-1 mentoring session on NoSQL data modeling.'],
        limitations: [],
      },
      aiModel: 'openai/gpt-oss-120b',
      aiAnalyzedAt: new Date('2024-04-20T10:30:00Z'),
      aiAvailable: true,
    });

    // Attempt 2: Priya Patel on MERN (100% across all skills)
    const priyaEnrollment = createdEnrollments[1].enrollment;
    const priyaTrainee = createdTrainees[1].trainee;

    const priyaAnswers = mernQuestions.map((q) => ({
      questionId: q.questionId,
      selectedAnswer: q.correctAnswer,
      isCorrect: true,
      skillId: q.skillId,
      skillName: q.skillName,
      marks: 1,
      maxMarks: 1,
    }));

    const attempt2 = await AssessmentAttempt.create({
      assessmentId: assessment1._id,
      traineeId: priyaTrainee._id,
      enrollmentId: priyaEnrollment._id,
      courseId: course1._id,
      providerId: provider1._id,
      attemptNumber: 1,
      startedAt: new Date('2024-04-20T11:00:00Z'),
      submittedAt: new Date('2024-04-20T11:20:00Z'),
      status: 'SUBMITTED',
      answers: priyaAnswers,
      totalScore: 9,
      maxScore: 9,
      percentage: 100,
      skillScores: [
        { skillId: 'react_js', skillName: 'React.js & Frontend Architecture', correct: 3, total: 3, percentage: 100, marks: 3, maxMarks: 3 },
        { skillId: 'node_express', skillName: 'Node.js & Backend REST APIs', correct: 3, total: 3, percentage: 100, marks: 3, maxMarks: 3 },
        { skillId: 'mongodb_nosql', skillName: 'MongoDB Database Design', correct: 3, total: 3, percentage: 100, marks: 3, maxMarks: 3 },
      ],
    });

    await SkillGapAnalysis.create({
      attemptId: attempt2._id,
      traineeId: priyaTrainee._id,
      courseId: course1._id,
      providerId: provider1._id,
      assessmentId: assessment1._id,
      overallScore: 9,
      overallMaxScore: 9,
      overallPercentage: 100,
      skillResults: [
        { skillId: 'react_js', skillName: 'React.js & Frontend Architecture', score: 3, maxScore: 3, percentage: 100, classification: 'STRONG', gapScore: 0, confidence: 'HIGH', wrongTopics: [], questionsTotal: 3, questionsCorrect: 3 },
        { skillId: 'node_express', skillName: 'Node.js & Backend REST APIs', score: 3, maxScore: 3, percentage: 100, classification: 'STRONG', gapScore: 0, confidence: 'HIGH', wrongTopics: [], questionsTotal: 3, questionsCorrect: 3 },
        { skillId: 'mongodb_nosql', skillName: 'MongoDB Database Design', score: 3, maxScore: 3, percentage: 100, classification: 'STRONG', gapScore: 0, confidence: 'HIGH', wrongTopics: [], questionsTotal: 3, questionsCorrect: 3 },
      ],
      deterministic: {
        strongSkills: ['react_js', 'node_express', 'mongodb_nosql'],
        developingSkills: [],
        weakSkills: [],
        criticalGaps: [],
        thresholdsUsed: { strong: 80, developing: 60, weak: 40, criticalGap: 25 },
      },
      aiAnalysis: {
        summary: 'Priya demonstrated complete mastery (100% overall score) across all three core competencies: React frontend, Node backend, and MongoDB database architecture.',
        strongSkills: [
          { skill: 'React.js & Frontend Architecture', evidence: '100% score with zero misconceptions.' },
          { skill: 'Node.js & Backend REST APIs', evidence: '100% score with advanced event loop clarity.' },
          { skill: 'MongoDB Database Design', evidence: '100% score with perfect compound indexing comprehension.' }
        ],
        developingSkills: [],
        skillGaps: [],
        recommendedSkills: ['Microservices Architecture', 'Kubernetes Deployment'],
        providerActions: ['Recommend for fast-track enterprise placement.'],
        limitations: [],
      },
      aiModel: 'openai/gpt-oss-120b',
      aiAnalyzedAt: new Date('2024-04-20T11:25:00Z'),
      aiAvailable: true,
    });
    console.log('✓ Assessment attempts & AI Skill Gap Analyses created.');

    // ==========================================
    // 9. REMEDIAL ACTION PLAN
    // ==========================================
    console.log('\n[9/10] Seeding Provider Remedial Action Plans...');

    await RemedialAction.create({
      providerId: provider1._id,
      courseId: course1._id,
      traineeId: rahulTrainee._id,
      skillId: 'mongodb_nosql',
      skillName: 'MongoDB Database Design',
      severity: 'LOW',
      action: 'Assigned hands-on laboratory exercises focusing on 1-to-many relationship modeling and compound indexing in MongoDB Atlas.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      beforeScore: 66.67,
      notes: 'Rahul scheduled for a 30-minute mentoring session on Friday.',
      createdBy: providerUser1._id,
    });
    console.log('✓ Remedial action plan seeded.');

    // ==========================================
    // 10. GOVERNMENT FUNDING SCHEMES & ALLOCATIONS
    // ==========================================
    console.log('\n[10/10] Seeding Government Grant & Funding Schemes...');

    const scheme1 = await FundingScheme.create({
      schemeName: 'PMKVY 4.0 National IT & Digital Skilling Grant',
      description: 'Central ministry grant supporting high-impact vocational training in Full-Stack software engineering, cloud architecture, and data engineering.',
      courseId: course1._id,
      budget: 1500000,
      district: 'Vijayawada / Krishna',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      targetTrainees: 100,
      status: 'ACTIVE',
      createdBy: adminUser._id,
      providerAssignments: [
        {
          providerId: provider1._id,
          allocatedBudget: 900000,
          aiRecommended: true,
          adminDecision: 'APPROVED',
          adminReason: 'Apex Institute demonstrated high placement rates (85%) and 100% compliance in verified longitudinal tracking.',
          assignedAt: new Date('2024-01-15'),
        },
        {
          providerId: provider2._id,
          allocatedBudget: 600000,
          aiRecommended: true,
          adminDecision: 'APPROVED',
          adminReason: 'TechForward Academy approved for regional cohort delivery.',
          assignedAt: new Date('2024-01-15'),
        },
      ],
    });

    const scheme2 = await FundingScheme.create({
      schemeName: 'State Paramedical & Emergency Healthcare Mission',
      description: 'Dedicated government scheme subsidizing Emergency Medical Technician certification to staff tier-2 and rural health centers.',
      courseId: course4._id,
      budget: 2000000,
      district: 'Visakhapatnam',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-11-30'),
      targetTrainees: 80,
      status: 'ACTIVE',
      createdBy: adminUser._id,
      providerAssignments: [
        {
          providerId: provider3._id,
          allocatedBudget: 1800000,
          aiRecommended: true,
          adminDecision: 'APPROVED',
          adminReason: 'National Healthcare Institute operates accredited hospital simulation labs with 90%+ outcome verification.',
          assignedAt: new Date('2024-02-10'),
        },
      ],
    });

    const scheme3 = await FundingScheme.create({
      schemeName: 'Green Tech & Cloud Infrastructure Mission 2025',
      description: 'Upcoming grant for cloud infrastructure automation, Kubernetes DevOps, and sustainable data center operations.',
      courseId: course2._id,
      budget: 2500000,
      district: 'Hyderabad / Rangareddy',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-05-31'),
      targetTrainees: 120,
      status: 'DRAFT',
      createdBy: adminUser._id,
      providerAssignments: [],
    });
    console.log('✓ 3 Government Funding Schemes created.');

    console.log('\n=============================================================');
    console.log('🌟 MASTER DEMO REAL DATA SEEDING COMPLETE WITH 100% SUCCESS!');
    console.log('=============================================================');
    console.log('DEMO CREDENTIALS:');
    console.log('  1. ADMIN    : username: admin                 | password: admin123');
    console.log('  2. PROVIDER : username: apex_provider         | password: provider123');
    console.log('  3. PROVIDER : username: techforward_provider  | password: provider123');
    console.log('  4. PROVIDER : username: nhvi_provider         | password: provider123');
    console.log('  5. TRAINEE  : username: rahul                 | password: trainee123');
    console.log('  6. TRAINEE  : username: priya                 | password: trainee123');
    console.log('  7. TRAINEE  : username: ananya                | password: trainee123');
    console.log('  8. TRAINEE  : username: vishnu                | password: trainee123');
    console.log('=============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Master Seeder failed:', error);
    process.exit(1);
  }
};

runSeeder();
