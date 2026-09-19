const express = require('express');
const router = express.Router();
const {
  generateAssessment,
  getAssessments,
  getAssessment,
  publishAssessment,
  startAttempt,
  answerCaseStudyQuestion,
  completeCaseStudy,
  answerAdaptiveQuestion,
  retryAdaptiveQuestion,
  submitAttempt,
  getAttempts,
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/generate', authorize('PROVIDER'), generateAssessment);
router.get('/', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getAssessments);
router.get('/:id', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getAssessment);
router.patch('/:id/publish', authorize('PROVIDER'), publishAssessment);

// Trainee assessment endpoints
router.post('/:id/start', authorize('TRAINEE'), startAttempt);
router.post('/:id/case-study/answer', authorize('TRAINEE'), answerCaseStudyQuestion);
router.post('/:id/case-study/complete', authorize('TRAINEE'), completeCaseStudy);
router.post('/:id/adaptive/answer', authorize('TRAINEE'), answerAdaptiveQuestion);
router.post('/:id/adaptive/retry', authorize('TRAINEE'), retryAdaptiveQuestion);
router.post('/:id/submit', authorize('TRAINEE'), submitAttempt);

router.get('/:id/attempts', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getAttempts);

module.exports = router;
