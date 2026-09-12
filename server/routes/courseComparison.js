const express = require('express');
const router = express.Router();
const { compareCourses, getAICourseAnalysis } = require('../controllers/courseComparisonController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.get('/compare', authorize('ADMIN', 'PROVIDER'), compareCourses);
router.post('/ai-analysis', authorize('ADMIN'), getAICourseAnalysis);

module.exports = router;
