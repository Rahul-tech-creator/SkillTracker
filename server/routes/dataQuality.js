const express = require('express');
const router = express.Router();
const { getDataQuality } = require('../controllers/dataQualityController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.get('/', authorize('ADMIN'), getDataQuality);

module.exports = router;
