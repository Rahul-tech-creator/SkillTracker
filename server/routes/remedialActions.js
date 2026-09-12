const express = require('express');
const router = express.Router();
const { createRemedialAction, updateRemedialAction, getRemedialActions } = require('../controllers/remedialActionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/', authorize('PROVIDER'), createRemedialAction);
router.put('/:id', authorize('PROVIDER'), updateRemedialAction);
router.get('/', authorize('ADMIN', 'PROVIDER'), getRemedialActions);

module.exports = router;
