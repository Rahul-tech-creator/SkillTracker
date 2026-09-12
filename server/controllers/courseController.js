const Course = require('../models/Course');
const Provider = require('../models/Provider');

/** Resolve provider record from the logged-in Provider user */
const getProviderRecord = async (userId) => {
  return Provider.findOne({ userId });
};

const normalizeSkills = (skills) => {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((s) => {
      if (typeof s === 'string') {
        const trimmed = s.trim();
        if (!trimmed) return null;
        const skillId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return { skillId, skillName: trimmed, weight: 0 };
      }
      if (typeof s === 'object' && s !== null) {
        const skillName = (s.skillName || '').trim();
        if (!skillName) return null;
        const skillId = s.skillId || skillName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return { skillId, skillName, weight: Number(s.weight) || 0 };
      }
      return null;
    })
    .filter(Boolean);
};

/**
 * POST /api/courses
 * Provider creates a course for their own provider record
 */
const createCourse = async (req, res) => {
  try {
    const { courseName, description, category, duration, skills } = req.body;

    if (!courseName) {
      return res.status(400).json({ success: false, message: 'courseName is required.' });
    }

    const provider = await getProviderRecord(req.user._id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    const course = await Course.create({
      providerId: provider._id,
      courseName,
      description: description || '',
      category: category || '',
      duration: duration || '',
      skills: normalizeSkills(skills),
      status: 'ACTIVE',
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/courses
 * Admin: all courses. Provider: own courses only.
 */
const getCourses = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    }

    const courses = await Course.find(filter)
      .populate('providerId', 'organizationName contactPerson')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/courses/:id
 */
const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      'providerId',
      'organizationName contactPerson'
    );

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Providers can only view their own courses
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || course.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/courses/:id
 * Provider updates their own course
 */
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || course.providerId.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const { courseName, description, category, duration, skills } = req.body;
    if (courseName !== undefined) course.courseName = courseName;
    if (description !== undefined) course.description = description;
    if (category !== undefined) course.category = category;
    if (duration !== undefined) course.duration = duration;
    if (skills !== undefined) course.skills = normalizeSkills(skills);

    await course.save();
    res.json({ success: true, message: 'Course updated.', data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/courses/:id/status
 * Provider (own) or Admin can change course status
 */
const updateCourseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE.' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || course.providerId.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    course.status = status;
    await course.save();
    res.json({ success: true, message: `Course status set to ${status}.`, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createCourse, getCourses, getCourse, updateCourse, updateCourseStatus };
