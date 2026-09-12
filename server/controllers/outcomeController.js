const OutcomeRecord = require('../models/OutcomeRecord');
const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * GET /api/outcomes/my
 * Trainee views all their historical outcome records for the longitudinal timeline
 */
const getMyOutcomes = async (req, res) => {
  try {
    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const outcomes = await OutcomeRecord.find({ traineeId: trainee._id })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category' },
          { path: 'batchId', select: 'batchName mode' },
        ],
      })
      .populate('certificateId', 'certificateNumber verificationCode issueDate')
      .populate('providerId', 'organizationName')
      .sort({ observedAt: 1 });

    res.json({ success: true, count: outcomes.length, data: outcomes });
  } catch (error) {
    console.error('getMyOutcomes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes
 * Admin gets all outcomes; Provider gets outcomes for their own graduates
 */
const getOutcomes = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    } else if (req.user.role === 'ADMIN') {
      if (req.query.providerId && req.query.providerId !== 'ALL') {
        filter.providerId = req.query.providerId;
      }
    }

    if (req.query.situation && req.query.situation !== 'ALL') {
      filter.situation = req.query.situation;
    }
    if (req.query.followUpType && req.query.followUpType !== 'ALL') {
      filter.followUpType = req.query.followUpType;
    }

    const outcomes = await OutcomeRecord.find(filter)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category' },
          { path: 'batchId', select: 'batchName mode' },
        ],
      })
      .populate('certificateId', 'certificateNumber verificationCode')
      .populate('providerId', 'organizationName contactPerson')
      .sort({ observedAt: -1 });

    res.json({ success: true, count: outcomes.length, data: outcomes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes/stats
 * Aggregate outcome metrics for dashboards
 */
const getOutcomeStats = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) {
        return res.json({
          success: true,
          data: {
            total: 0,
            employed: 0,
            selfEmployed: 0,
            apprentice: 0,
            unemployed: 0,
            studying: 0,
            other: 0,
            avgRating: 0,
          },
        });
      }
      filter.providerId = provider._id;
    }

    const [
      total,
      employed,
      selfEmployed,
      apprentice,
      unemployed,
      studying,
      other,
      allOutcomes,
    ] = await Promise.all([
      OutcomeRecord.countDocuments(filter),
      OutcomeRecord.countDocuments({ ...filter, situation: 'EMPLOYED' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'SELF_EMPLOYED' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'APPRENTICE' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'UNEMPLOYED' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'STUDYING' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'OTHER' }),
      OutcomeRecord.find(filter).select('relevanceRating unemploymentData'),
    ]);

    const totalRatings = allOutcomes.reduce((acc, curr) => acc + (curr.relevanceRating || 0), 0);
    const avgRating = total > 0 ? (totalRatings / total).toFixed(1) : 0;

    // Collect skill gap reasons
    const skillGapReasons = {};
    allOutcomes.forEach((o) => {
      const reason = o.unemploymentData?.primaryReason;
      if (reason) {
        skillGapReasons[reason] = (skillGapReasons[reason] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        total,
        employed,
        selfEmployed,
        apprentice,
        unemployed,
        studying,
        other,
        avgRating,
        skillGapReasons,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyOutcomes,
  getOutcomes,
  getOutcomeStats,
};
