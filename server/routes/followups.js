const express = require('express');
const router = express.Router();
const {
  getMyFollowUps,
  getFollowUps,
  getFollowUpStats,
  getFollowUpById,
  getFollowUpByToken,
  submitFollowUpByToken,
  optOutByToken,
  resumeTrackingByToken,
  optOutTrainee,
  resumeTrackingTrainee,
  sendDigitalFollowUp,
  recordCallAttempt,
  markTraineeReturned,
  getCommunicationHistory,
  getGovernmentTrackingQueue,
  updateGovernmentTrackingStatus,
  getFollowUpSettings,
  updateFollowUpSettings,
  submitFollowUpResponse,
  markUnreachable,
} = require('../controllers/followUpController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// --- Public Endpoints (Privacy-Safe Token Access) ---
router.get('/token/:token', getFollowUpByToken);
router.post('/token/:token/submit', submitFollowUpByToken);
router.post('/token/:token/opt-out', optOutByToken);
router.post('/token/:token/resume', resumeTrackingByToken);

// --- Trainee Authenticated Endpoints ---
router.get('/my', protect, authorize('TRAINEE'), getMyFollowUps);
router.post('/opt-out', protect, authorize('TRAINEE'), optOutTrainee);
router.post('/resume', protect, authorize('TRAINEE'), resumeTrackingTrainee);
router.post('/:id/submit', protect, authorize('TRAINEE'), submitFollowUpResponse);

// --- Admin Only Configuration & Government Queue Endpoints ---
router.get('/settings', protect, authorize('ADMIN'), getFollowUpSettings);
router.put('/settings', protect, authorize('ADMIN'), updateFollowUpSettings);
router.get('/government-tracking/queue', protect, authorize('ADMIN'), getGovernmentTrackingQueue);
router.patch('/government-tracking/:id/status', protect, authorize('ADMIN'), updateGovernmentTrackingStatus);

// --- Admin & Provider Shared Operational Endpoints ---
router.get('/stats', protect, authorize('ADMIN', 'PROVIDER'), getFollowUpStats);
router.get('/', protect, authorize('ADMIN', 'PROVIDER'), getFollowUps);
router.post('/:id/digital-contact', protect, authorize('ADMIN', 'PROVIDER'), sendDigitalFollowUp);
router.post('/:id/record-call', protect, authorize('ADMIN', 'PROVIDER'), recordCallAttempt);
router.post('/:id/mark-returned', protect, authorize('ADMIN', 'PROVIDER'), markTraineeReturned);
router.get('/:id/history', protect, authorize('ADMIN', 'PROVIDER'), getCommunicationHistory);
router.get('/trainee/:traineeId/history', protect, authorize('ADMIN', 'PROVIDER'), getCommunicationHistory);
router.patch('/:id/unreachable', protect, authorize('ADMIN', 'PROVIDER'), markUnreachable);
router.get('/:id', protect, getFollowUpById);

module.exports = router;
