const Enrollment = require('../models/Enrollment');
const Trainee = require('../models/Trainee');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Provider = require('../models/Provider');
const Certificate = require('../models/Certificate');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * POST /api/enrollments
 * Provider enrols a trainee into a batch
 */
const createEnrollment = async (req, res) => {
  try {
    const { traineeId, batchId } = req.body;

    if (!traineeId || !batchId) {
      return res.status(400).json({ success: false, message: 'traineeId and batchId are required.' });
    }

    const provider = await getProviderRecord(req.user._id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    // Verify trainee belongs to this provider
    const trainee = await Trainee.findById(traineeId);
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee not found.' });
    }
    if (trainee.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only enrol your own trainees.' });
    }

    // Verify batch belongs to this provider
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }
    if (batch.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only enrol into your own batches.' });
    }

    // Check for duplicate enrollment
    const existing = await Enrollment.findOne({ traineeId, batchId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Trainee is already enrolled in this batch.' });
    }

    const enrollment = await Enrollment.create({
      traineeId,
      batchId,
      courseId: batch.courseId,
      providerId: provider._id,
      enrollmentDate: new Date(),
      status: 'ENROLLED',
    });

    const populated = await Enrollment.findById(enrollment._id)
      .populate('traineeId', 'userId phone')
      .populate('batchId', 'batchName startDate endDate mode status')
      .populate('courseId', 'courseName category')
      .populate('providerId', 'organizationName');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('createEnrollment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/enrollments
 * Admin: all. Provider: own. Trainee: own only.
 */
const getEnrollments = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    } else if (req.user.role === 'TRAINEE') {
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee) return res.json({ success: true, count: 0, data: [] });
      filter.traineeId = trainee._id;
    }

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username email' },
      })
      .populate('batchId', 'batchName startDate endDate mode status location')
      .populate('courseId', 'courseName category duration skills')
      .populate('providerId', 'organizationName contactPerson phone address')
      .sort({ createdAt: -1 });

    // Look up certificate for each enrollment
    const enrollmentIds = enrollments.map((e) => e._id);
    const certificates = await Certificate.find({ enrollmentId: { $in: enrollmentIds } });
    const certMap = {};
    certificates.forEach((c) => {
      certMap[c.enrollmentId.toString()] = c;
    });

    const enriched = enrollments.map((e) => {
      const obj = e.toObject();
      obj.certificate = certMap[e._id.toString()] || null;
      return obj;
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/enrollments/:id
 */
const getEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username email status' },
      })
      .populate('batchId', 'batchName startDate endDate mode status location')
      .populate('courseId', 'courseName category duration skills description')
      .populate('providerId', 'organizationName contactPerson phone address');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    // Trainee can only see their own enrollment
    if (req.user.role === 'TRAINEE') {
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee || enrollment.traineeId._id.toString() !== trainee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    // Provider can only see their own enrollments
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || enrollment.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const certificate = await Certificate.findOne({ enrollmentId: enrollment._id });
    const obj = enrollment.toObject();
    obj.certificate = certificate || null;

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/enrollments/:id/status
 * Provider updates enrollment status
 */
const updateEnrollmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ENROLLED', 'COMPLETED', 'DROPPED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be ENROLLED, COMPLETED, or DROPPED.' });
    }

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || enrollment.providerId.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    enrollment.status = status;
    await enrollment.save();

    res.json({ success: true, message: `Enrollment status updated to ${status}.`, data: enrollment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createEnrollment, getEnrollments, getEnrollment, updateEnrollmentStatus };
