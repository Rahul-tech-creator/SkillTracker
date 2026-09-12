const RemedialAction = require('../models/RemedialAction');
const Provider = require('../models/Provider');
const Trainee = require('../models/Trainee');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * POST /api/remedial-actions
 */
const createRemedialAction = async (req, res) => {
  try {
    const { courseId, traineeId, skillGapAnalysisId, skillId, skillName, severity, action, priority, beforeScore, notes } = req.body;

    if (!courseId || !skillId || !skillName || !action) {
      return res.status(400).json({ success: false, message: 'courseId, skillId, skillName, and action are required.' });
    }

    const provider = await getProviderRecord(req.user._id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider profile not found.' });

    const remedial = await RemedialAction.create({
      providerId: provider._id,
      courseId,
      traineeId: traineeId || null,
      skillGapAnalysisId: skillGapAnalysisId || null,
      skillId,
      skillName,
      severity: severity || 'MEDIUM',
      action,
      priority: priority || 'MEDIUM',
      status: 'IDENTIFIED',
      beforeScore: beforeScore || null,
      notes: notes || '',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: remedial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/remedial-actions/:id
 */
const updateRemedialAction = async (req, res) => {
  try {
    const remedial = await RemedialAction.findById(req.params.id);
    if (!remedial) return res.status(404).json({ success: false, message: 'Remedial action not found.' });

    const provider = await getProviderRecord(req.user._id);
    if (!provider || remedial.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { action, priority, status, afterScore, notes } = req.body;
    if (action !== undefined) remedial.action = action;
    if (priority !== undefined) remedial.priority = priority;
    if (status !== undefined) {
      remedial.status = status;
      if (status === 'COMPLETED') remedial.completedAt = new Date();
    }
    if (afterScore !== undefined) {
      remedial.afterScore = afterScore;
      if (remedial.beforeScore != null) {
        remedial.improvement = afterScore - remedial.beforeScore;
      }
    }
    if (notes !== undefined) remedial.notes = notes;

    await remedial.save();
    res.json({ success: true, data: remedial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/remedial-actions
 */
const getRemedialActions = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    }
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.status) filter.status = req.query.status;

    const actions = await RemedialAction.find(filter)
      .populate('courseId', 'courseName')
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username' },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: actions.length, data: actions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createRemedialAction, updateRemedialAction, getRemedialActions };
