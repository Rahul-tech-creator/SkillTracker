const express = require('express');
const router = express.Router();
const {
  generateAssessment, getAssessments, getAssessment,
  publishAssessment, startAttempt, submitAttempt, getAttempts,
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/generate', authorize('PROVIDER'), generateAssessment);
router.get('/', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getAssessments);
router.get('/:id', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getAssessment);
router.patch('/:id/publish', authorize('PROVIDER'), publishAssessment);
router.post('/:id/start', authorize('TRAINEE'), startAttempt);
router.post('/:id/submit', authorize('TRAINEE'), submitAttempt);
router.get('/:id/attempts', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getAttempts);

module.exports = router;
