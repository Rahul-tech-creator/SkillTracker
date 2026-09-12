const express = require('express');
const router = express.Router();
const { createBatch, getBatches, getBatch, updateBatch } = require('../controllers/batchController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/', authorize('PROVIDER'), createBatch);
router.get('/', authorize('ADMIN', 'PROVIDER'), getBatches);
router.get('/:id', authorize('ADMIN', 'PROVIDER'), getBatch);
router.put('/:id', authorize('ADMIN', 'PROVIDER'), updateBatch);

module.exports = router;
