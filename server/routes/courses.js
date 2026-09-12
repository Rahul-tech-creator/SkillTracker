const express = require('express');
const router = express.Router();
const {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  updateCourseStatus,
} = require('../controllers/courseController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(protect);

router.post('/', authorize('PROVIDER'), createCourse);
router.get('/', authorize('ADMIN', 'PROVIDER'), getCourses);
router.get('/:id', authorize('ADMIN', 'PROVIDER'), getCourse);
router.put('/:id', authorize('ADMIN', 'PROVIDER'), updateCourse);
router.patch('/:id/status', authorize('ADMIN', 'PROVIDER'), updateCourseStatus);

module.exports = router;
