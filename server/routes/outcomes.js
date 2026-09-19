const express = require('express');
const router = express.Router();
const {
  getMyOutcomes,
  getOutcomes,
  getOutcomeStats,
  getOutcomeVerification,
  verifyOutcome,
  getDiscrepancies,
  getWageRetentionIntelligence,
  getRootCauses,
} = require('../controllers/outcomeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.get('/my', protect, authorize('TRAINEE'), getMyOutcomes);
router.get('/stats', protect, authorize('ADMIN', 'PROVIDER'), getOutcomeStats);
router.get('/wage-retention-intelligence', protect, authorize('ADMIN', 'PROVIDER'), getWageRetentionIntelligence);
router.get('/root-causes', protect, authorize('ADMIN', 'PROVIDER'), getRootCauses);
router.get('/discrepancies', protect, authorize('ADMIN', 'PROVIDER'), getDiscrepancies);
router.get('/verification/:outcomeId', protect, authorize('ADMIN', 'PROVIDER'), getOutcomeVerification);
router.post('/verify/:outcomeId', protect, authorize('ADMIN', 'PROVIDER'), verifyOutcome);
router.get('/', protect, authorize('ADMIN', 'PROVIDER'), getOutcomes);

module.exports = router;
