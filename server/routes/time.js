const express = require('express');
const router = express.Router();
const {
  getTimeInfo,
  setTimeMode,
  setSimulationDateTime,
  advanceSimulationDays,
  resetToRealTime,
} = require('../controllers/timeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Public / Authenticated read endpoint
router.get('/', getTimeInfo);

// Admin-only simulation controls
router.put('/mode', protect, authorize('ADMIN'), setTimeMode);
router.put('/simulation', protect, authorize('ADMIN'), setSimulationDateTime);
router.post('/advance', protect, authorize('ADMIN'), advanceSimulationDays);
router.post('/reset', protect, authorize('ADMIN'), resetToRealTime);

module.exports = router;
