const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/providerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect, authorize('ADMIN'));

// GET /api/admin/stats — dashboard summary counts
router.get('/stats', getAdminStats);

module.exports = router;
