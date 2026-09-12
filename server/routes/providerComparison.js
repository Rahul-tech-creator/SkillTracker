const express = require('express');
const router = express.Router();
const { compareProviders, getAIProviderAnalysis } = require('../controllers/providerComparisonController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.get('/compare', authorize('ADMIN', 'PROVIDER'), compareProviders);
router.post('/ai-analysis', authorize('ADMIN'), getAIProviderAnalysis);

module.exports = router;
