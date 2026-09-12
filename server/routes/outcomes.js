const express = require('express');
const router = express.Router();
const {
  getMyOutcomes,
  getOutcomes,
  getOutcomeStats,
} = require('../controllers/outcomeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Trainee endpoint
router.get('/my', protect, authorize('TRAINEE'), getMyOutcomes);

// Admin & Provider endpoints
router.get('/stats', protect, authorize('ADMIN', 'PROVIDER'), getOutcomeStats);
router.get('/', protect, authorize('ADMIN', 'PROVIDER'), getOutcomes);

module.exports = router;
