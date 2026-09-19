const express = require('express');
const router = express.Router();
const {
  getDistrictAnalytics,
  getDemographicAnalytics,
  getProviderScorecard,
  getPolicyRecommendations,
  updatePolicyRecommendationStatus,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.get('/district', authorize('ADMIN', 'PROVIDER'), getDistrictAnalytics);
router.get('/demographics', authorize('ADMIN'), getDemographicAnalytics);
router.get('/provider-scorecard', authorize('ADMIN', 'PROVIDER'), getProviderScorecard);
router.get('/policy-insights', authorize('ADMIN'), getPolicyRecommendations);
router.patch('/policy-insights/:id/status', authorize('ADMIN'), updatePolicyRecommendationStatus);

module.exports = router;
