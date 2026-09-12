const express = require('express');
const router = express.Router();
const {
  createProvider,
  getProviders,
  getProvider,
  updateProvider,
  updateProviderStatus,
  resetProviderPassword,
} = require('../controllers/providerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// All provider routes require authentication
router.use(protect);

router.post('/', authorize('ADMIN'), createProvider);
router.get('/', authorize('ADMIN', 'PROVIDER'), getProviders);
router.get('/:id', authorize('ADMIN', 'PROVIDER'), getProvider);
router.put('/:id', authorize('ADMIN'), updateProvider);
router.patch('/:id/status', authorize('ADMIN'), updateProviderStatus);
router.patch('/:id/reset-password', authorize('ADMIN'), resetProviderPassword);

module.exports = router;
