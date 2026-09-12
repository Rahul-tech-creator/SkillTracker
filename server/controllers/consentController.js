const Consent = require('../models/Consent');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');
const timeService = require('../utils/timeService');
const { createFollowUpSchedule } = require('../services/followUpEngine');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * GET /api/consents/my
 * Returns trainee's consent records and any certified enrollments awaiting consent
 */
const getMyConsents = async (req, res) => {
  try {
    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.json({
        success: true,
        data: { consents: [], pendingEligible: [] },
      });
    }

    // 1. Get all existing consents
    const consents = await Consent.find({ traineeId: trainee._id })
      .populate('enrollmentId')
      .populate('certificateId')
      .sort({ createdAt: -1 });

    // 2. Find eligible enrollments: COMPLETED + Certificate ISSUED
    const completedEnrollments = await Enrollment.find({
      traineeId: trainee._id,
      status: 'COMPLETED',
    })
      .populate('courseId', 'courseName category duration')
      .populate('batchId', 'batchName mode')
      .populate('providerId', 'organizationName');

    const pendingEligible = [];

    for (const enrollment of completedEnrollments) {
      const cert = await Certificate.findOne({
        enrollmentId: enrollment._id,
        status: 'ISSUED',
      });

      if (cert) {
        const existingConsent = consents.find(
          (c) => c.enrollmentId?._id?.toString() === enrollment._id.toString() ||
                 c.enrollmentId?.toString() === enrollment._id.toString()
        );

        if (!existingConsent || existingConsent.status === 'PENDING') {
          pendingEligible.push({
            enrollment,
            certificate: cert,
            existingConsent: existingConsent || null,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        consents,
        pendingEligible,
      },
    });
  } catch (error) {
    console.error('getMyConsents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/consents
 * Trainee grants or declines consent for post-training outcome tracking
 */
const submitConsent = async (req, res) => {
  try {
    const { enrollmentId, status, consentVersion } = req.body;

    if (!enrollmentId) {
      return res.status(400).json({ success: false, message: 'enrollmentId is required.' });
    }

    if (!['GRANTED', 'DECLINED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either GRANTED or DECLINED.',
      });
    }

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee profile not found.' });
    }

    // Verify enrollment ownership
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment || enrollment.traineeId.toString() !== trainee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this enrollment record.',
      });
    }

    // Rule 1 & Rule 8: Must be COMPLETED and have an ISSUED Certificate
    if (enrollment.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Consent can only be requested for COMPLETED training programs.',
      });
    }

    const certificate = await Certificate.findOne({
      enrollmentId: enrollment._id,
      status: 'ISSUED',
    });

    if (!certificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate has not been issued yet. Consent requires an issued certificate.',
      });
    }

    const logicalNow = await timeService.getCurrentDate();

    // Check or update existing consent
    let consent = await Consent.findOne({
      traineeId: trainee._id,
      enrollmentId: enrollment._id,
    });

    if (consent) {
      consent.status = status;
      consent.consentedAt = status === 'GRANTED' ? logicalNow : null;
      consent.withdrawnAt = status === 'DECLINED' ? logicalNow : null;
      consent.consentVersion = consentVersion || consent.consentVersion || 'v1.0';
      await consent.save();
    } else {
      consent = await Consent.create({
        traineeId: trainee._id,
        enrollmentId: enrollment._id,
        certificateId: certificate._id,
        status,
        consentVersion: consentVersion || 'v1.0',
        consentedAt: status === 'GRANTED' ? logicalNow : null,
        withdrawnAt: status === 'DECLINED' ? logicalNow : null,
      });
    }

    let createdFollowUps = [];
    if (status === 'GRANTED') {
      // Create 30, 90, 180, 365-day follow-ups
      createdFollowUps = await createFollowUpSchedule({
        traineeId: trainee._id,
        enrollmentId: enrollment._id,
        certificateId: certificate._id,
        providerId: enrollment.providerId,
        certIssueDate: certificate.issueDate,
      });
    }

    res.status(201).json({
      success: true,
      message:
        status === 'GRANTED'
          ? 'Consent granted. Longitudinal outcome follow-up schedule initialized (30, 90, 180, 365 days).'
          : 'Consent declined. No outcome follow-up schedule will be created.',
      data: {
        consent,
        followUpsScheduled: createdFollowUps.length,
      },
    });
  } catch (error) {
    console.error('submitConsent error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/consents
 * Admin gets all consents; Provider gets their own graduates' consents
 */
const getConsents = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });

      // Find enrollments belonging to provider
      const enrollments = await Enrollment.find({ providerId: provider._id }).select('_id');
      const enrollmentIds = enrollments.map((e) => e._id);
      filter.enrollmentId = { $in: enrollmentIds };
    }

    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }

    const consents = await Consent.find(filter)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category' },
          { path: 'batchId', select: 'batchName mode' },
          { path: 'providerId', select: 'organizationName' },
        ],
      })
      .populate('certificateId', 'certificateNumber verificationCode issueDate')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: consents.length, data: consents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyConsents,
  submitConsent,
  getConsents,
};
