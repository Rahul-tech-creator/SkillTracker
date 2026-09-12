const express = require('express');
const router = express.Router();
const { createTrainee, getTrainees, getTrainee, updateTrainee } = require('../controllers/traineeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/', authorize('PROVIDER'), createTrainee);
router.get('/', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getTrainees);
router.get('/:id', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getTrainee);
router.put('/:id', authorize('ADMIN', 'PROVIDER'), updateTrainee);

module.exports = router;
