const express = require('express');
const router = express.Router();
const {
  getMyConsents,
  submitConsent,
  getConsents,
} = require('../controllers/consentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Trainee endpoints
router.get('/my', protect, authorize('TRAINEE'), getMyConsents);
router.post('/', protect, authorize('TRAINEE'), submitConsent);

// Admin / Provider read endpoint
router.get('/', protect, authorize('ADMIN', 'PROVIDER'), getConsents);

module.exports = router;
