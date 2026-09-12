/**
 * Quick sanity check to load all models, controllers, and routes
 */
try {
  require('../models/User');
  require('../models/Provider');
  require('../models/Course');
  require('../models/Batch');
  require('../models/Trainee');
  require('../models/Enrollment');
  require('../models/Certificate');
  require('../models/SystemSetting');
  require('../models/Consent');
  require('../models/FollowUp');
  require('../models/OutcomeRecord');
  require('../models/Notification');

  require('../utils/timeService');
  require('../services/followUpEngine');

  require('../controllers/authController');
  require('../controllers/providerController');
  require('../controllers/courseController');
  require('../controllers/batchController');
  require('../controllers/traineeController');
  require('../controllers/enrollmentController');
  require('../controllers/certificateController');
  require('../controllers/timeController');
  require('../controllers/consentController');
  require('../controllers/followUpController');
  require('../controllers/outcomeController');
  require('../controllers/notificationController');

  require('../routes/auth');
  require('../routes/admin');
  require('../routes/providers');
  require('../routes/courses');
  require('../routes/batches');
  require('../routes/trainees');
  require('../routes/enrollments');
  require('../routes/certificates');
  require('../routes/time');
  require('../routes/consents');
  require('../routes/followups');
  require('../routes/outcomes');
  require('../routes/notifications');

  console.log('✅ Server architecture check PASSED: All Phase 1, 2, and 3 models, controllers, services, and routes loaded successfully without errors.');
  process.exit(0);
} catch (error) {
  console.error('❌ Server check FAILED:', error);
  process.exit(1);
}
