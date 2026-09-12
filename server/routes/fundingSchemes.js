const express = require('express');
const router = express.Router();
const {
  createScheme,
  updateScheme,
  getSchemes,
  getScheme,
  getEligibleProviders,
  getAIFundingAnalysis,
  assignProviders,
} = require('../controllers/fundingSchemeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/', authorize('ADMIN'), createScheme);
router.put('/:id', authorize('ADMIN'), updateScheme);
router.get('/', authorize('ADMIN', 'PROVIDER'), getSchemes);
router.get('/:id', authorize('ADMIN', 'PROVIDER'), getScheme);
router.get('/:id/eligible-providers', authorize('ADMIN'), getEligibleProviders);
router.post('/:id/ai-analysis', authorize('ADMIN'), getAIFundingAnalysis);
router.post('/:id/assign', authorize('ADMIN'), assignProviders);

module.exports = router;
