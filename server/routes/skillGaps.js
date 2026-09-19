const express = require('express');
const router = express.Router();
const {
  analyzeSkillGap,
  getTraineeSkillGaps,
  getMySkillGaps,
  getCourseSkillGaps,
  getCourseMarketAlignment,
  getSystemicCourseGaps,
  getQuestionBank,
  createQuestionBankQuestion,
} = require('../controllers/skillGapController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.get('/market-alignment/:courseId', authorize('ADMIN', 'PROVIDER'), getCourseMarketAlignment);
router.get('/systemic-gaps', authorize('ADMIN', 'PROVIDER'), getSystemicCourseGaps);
router.get('/question-bank', authorize('ADMIN', 'PROVIDER'), getQuestionBank);
router.post('/question-bank', authorize('ADMIN', 'PROVIDER'), createQuestionBankQuestion);

router.post('/analyze/:attemptId', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), analyzeSkillGap);
router.get('/my', authorize('TRAINEE'), getMySkillGaps);
router.get('/trainee/:traineeId', authorize('ADMIN', 'PROVIDER'), getTraineeSkillGaps);
router.get('/course/:courseId', authorize('ADMIN', 'PROVIDER'), getCourseSkillGaps);

module.exports = router;
