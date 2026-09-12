const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Provider = require('../models/Provider');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * POST /api/batches
 * Provider creates a batch for one of their courses
 */
const createBatch = async (req, res) => {
  try {
    const { courseId, batchName, startDate, endDate, capacity, location, mode } = req.body;

    if (!courseId || !batchName) {
      return res.status(400).json({ success: false, message: 'courseId and batchName are required.' });
    }

    const provider = await getProviderRecord(req.user._id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    // Verify the course belongs to this provider
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    if (course.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only create batches for your own courses.' });
    }

    const batch = await Batch.create({
      providerId: provider._id,
      courseId,
      batchName,
      startDate: startDate || null,
      endDate: endDate || null,
      capacity: capacity || null,
      location: location || '',
      mode: mode || 'OFFLINE',
      status: 'UPCOMING',
    });

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/batches
 * Admin: all. Provider: own only.
 */
const getBatches = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    }

    const batches = await Batch.find(filter)
      .populate('courseId', 'courseName category')
      .populate('providerId', 'organizationName')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: batches.length, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/batches/:id
 */
const getBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('courseId', 'courseName category duration skills')
      .populate('providerId', 'organizationName contactPerson');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || batch.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/batches/:id
 */
const updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || batch.providerId.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const { batchName, startDate, endDate, capacity, location, mode, status } = req.body;
    if (batchName !== undefined) batch.batchName = batchName;
    if (startDate !== undefined) batch.startDate = startDate;
    if (endDate !== undefined) batch.endDate = endDate;
    if (capacity !== undefined) batch.capacity = capacity;
    if (location !== undefined) batch.location = location;
    if (mode !== undefined) batch.mode = mode;
    if (status !== undefined) batch.status = status;

    await batch.save();
    res.json({ success: true, message: 'Batch updated.', data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createBatch, getBatches, getBatch, updateBatch };
