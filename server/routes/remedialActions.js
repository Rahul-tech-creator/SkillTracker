const express = require('express');
const router = express.Router();
const {
  getRecurringCourseGaps,
  getRemedialActions,
  createRemedialAction,
  conductReassessment,
  getBeforeAfterComparison,
} = require('../controllers/remedialActionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.get('/recurring-gaps', protect, authorize('ADMIN', 'PROVIDER'), getRecurringCourseGaps);
router.get('/:id/comparison', protect, authorize('ADMIN', 'PROVIDER'), getBeforeAfterComparison);
router.post('/:id/reassess', protect, authorize('ADMIN', 'PROVIDER'), conductReassessment);
router.post('/', protect, authorize('ADMIN', 'PROVIDER'), createRemedialAction);
router.get('/', protect, authorize('ADMIN', 'PROVIDER'), getRemedialActions);

module.exports = router;
