const express = require('express');
const router = express.Router();
const {
  createEnrollment,
  getEnrollments,
  getEnrollment,
  updateEnrollmentStatus,
} = require('../controllers/enrollmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/', authorize('PROVIDER'), createEnrollment);
router.get('/', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getEnrollments);
router.get('/:id', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getEnrollment);
router.patch('/:id/status', authorize('ADMIN', 'PROVIDER'), updateEnrollmentStatus);

module.exports = router;
