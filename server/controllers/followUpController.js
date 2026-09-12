const crypto = require('crypto');
const FollowUp = require('../models/FollowUp');
const OutcomeRecord = require('../models/OutcomeRecord');
const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');
const SystemSetting = require('../models/SystemSetting');
const CommunicationHistory = require('../models/CommunicationHistory');
const CallAttempt = require('../models/CallAttempt');
const ConsentHistory = require('../models/ConsentHistory');
const IdentityReference = require('../models/IdentityReference');
const timeService = require('../utils/timeService');
const {
  evaluateReadiness,
  generateSecureToken,
  getFollowUpConfig,
  createFollowUpSchedule,
} = require('../services/followUpEngine');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * GET /api/followups/my
 * Trainee retrieves all their follow-ups across cohorts
 */
const getMyFollowUps = async (req, res) => {
  try {
    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Run quick readiness evaluation to ensure current logical time is reflected
    await evaluateReadiness();

    const followUps = await FollowUp.find({ traineeId: trainee._id })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category duration skills' },
          { path: 'batchId', select: 'batchName mode startDate endDate' },
        ],
      })
      .populate('certificateId', 'certificateNumber verificationCode issueDate')
      .populate('providerId', 'organizationName contactPerson phone')
      .sort({ scheduledDate: 1 });

    const outcomeRecords = await OutcomeRecord.find({ traineeId: trainee._id });
    const enriched = followUps.map((f) => {
      const outcome = outcomeRecords.find(
        (o) => o.followUpId && o.followUpId.toString() === f._id.toString()
      );
      return {
        ...f.toObject(),
        outcomeRecord: outcome || null,
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
      traineeStatus: trainee.currentFollowUpStatus || 'NOT_DUE',
      trackingConsent: trainee.trackingConsent || 'GRANTED',
    });
  } catch (error) {
    console.error('getMyFollowUps error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/followups
 * Admin / Provider list follow-ups with extensive filters
 */
const getFollowUps = async (req, res) => {
  try {
    await evaluateReadiness();

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

    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    if (req.query.followUpType && req.query.followUpType !== 'ALL') {
      filter.followUpType = req.query.followUpType;
    }

    const followUps = await FollowUp.find(filter)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category duration' },
          { path: 'batchId', select: 'batchName mode startDate endDate' },
        ],
      })
      .populate('certificateId', 'certificateNumber verificationCode issueDate')
      .populate('providerId', 'organizationName contactPerson phone email')
      .sort({ scheduledDate: 1, createdAt: -1 });

    res.json({ success: true, count: followUps.length, data: followUps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/followups/stats
 * Aggregates follow-up pipeline metrics and escalation statistics
 */
const getFollowUpStats = async (req, res) => {
  try {
    await evaluateReadiness();

    let filter = {};
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) {
        return res.json({
          success: true,
          data: {
            total: 0,
            due: 0,
            waitingResponse: 0,
            callRequired: 0,
            callAttempted: 0,
            governmentFlagged: 0,
            responded: 0,
            notResponded: 0,
            optedOut: 0,
            returned: 0,
            byType: {},
          },
        });
      }
      filter.providerId = provider._id;
    }

    const [
      total,
      due,
      waitingResponse,
      callRequired,
      callAttempted,
      governmentFlagged,
      responded,
      notResponded,
      optedOut,
      returned,
      fInit,
      f30,
      f90,
      f180,
      f365,
    ] = await Promise.all([
      FollowUp.countDocuments(filter),
      FollowUp.countDocuments({ ...filter, status: { $in: ['DUE', 'READY'] } }),
      FollowUp.countDocuments({ ...filter, status: { $in: ['WAITING_FOR_RESPONSE', 'DIGITAL_CONTACTED'] } }),
      FollowUp.countDocuments({ ...filter, status: 'CALL_REQUIRED' }),
      FollowUp.countDocuments({ ...filter, status: { $in: ['WAITING_AFTER_CALL', 'CALL_ATTEMPTED'] } }),
      FollowUp.countDocuments({ ...filter, status: 'GOVERNMENT_TRACKING_FLAGGED' }),
      FollowUp.countDocuments({ ...filter, status: { $in: ['RESPONDED', 'COMPLETED'] } }),
      FollowUp.countDocuments({ ...filter, status: { $in: ['NOT_RESPONDED', 'UNREACHABLE'] } }),
      FollowUp.countDocuments({ ...filter, status: 'OPTED_OUT' }),
      FollowUp.countDocuments({ ...filter, status: 'RETURNED' }),
      FollowUp.countDocuments({ ...filter, followUpType: 'INITIAL_3_DAY' }),
      FollowUp.countDocuments({ ...filter, followUpType: '30_DAY' }),
      FollowUp.countDocuments({ ...filter, followUpType: '90_DAY' }),
      FollowUp.countDocuments({ ...filter, followUpType: '180_DAY' }),
      FollowUp.countDocuments({ ...filter, followUpType: '365_DAY' }),
    ]);

    const digitalContactCount = waitingResponse + callRequired + callAttempted + governmentFlagged + responded;
    const responseRate = digitalContactCount > 0 ? ((responded / digitalContactCount) * 100).toFixed(1) : '0.0';
    const callEscalationRate = digitalContactCount > 0 ? (((callRequired + callAttempted + governmentFlagged) / digitalContactCount) * 100).toFixed(1) : '0.0';
    const govEscalationRate = digitalContactCount > 0 ? ((governmentFlagged / digitalContactCount) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        total,
        due,
        waitingResponse,
        callRequired,
        callAttempted,
        governmentFlagged,
        responded,
        notResponded,
        optedOut,
        returned,
        responseRate: parseFloat(responseRate),
        callEscalationRate: parseFloat(callEscalationRate),
        govEscalationRate: parseFloat(govEscalationRate),
        byType: {
          INITIAL_3_DAY: fInit,
          '30_DAY': f30,
          '90_DAY': f90,
          '180_DAY': f180,
          '365_DAY': f365,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/followups/:id
 */
const getFollowUpById = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category duration skills' },
          { path: 'batchId', select: 'batchName mode startDate endDate' },
        ],
      })
      .populate('certificateId')
      .populate('providerId');

    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up record not found.' });
    }

    const outcomeRecord = await OutcomeRecord.findOne({ followUpId: followUp._id });

    res.json({
      success: true,
      data: {
        ...followUp.toObject(),
        outcomeRecord: outcomeRecord || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/followups/token/:token
 * Public endpoint: Look up follow-up by secure cryptographic token
 * Exposes ONLY sanitized privacy-safe details (NO internal MongoDB IDs or Aadhaar)
 */
const getFollowUpByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    const followUp = await FollowUp.findOne({ followUpToken: token })
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username' },
      })
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category duration skills description' },
          { path: 'batchId', select: 'batchName mode startDate endDate' },
        ],
      })
      .populate('certificateId', 'certificateNumber issueDate')
      .populate('providerId', 'organizationName contactPerson phone email');

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or non-existent tracking token. Please verify your follow-up link.',
      });
    }

    const logicalNow = await timeService.getCurrentDate();
    const isExpired = followUp.tokenExpiresAt && new Date(followUp.tokenExpiresAt) < logicalNow;

    const outcomeRecord = await OutcomeRecord.findOne({ followUpId: followUp._id });

    res.json({
      success: true,
      data: {
        token: followUp.followUpToken,
        isExpired,
        status: followUp.status,
        followUpType: followUp.followUpType,
        daysInterval: followUp.daysInterval,
        scheduledDate: followUp.scheduledDate,
        trackingConsent: followUp.trackingConsent,
        traineeName: followUp.traineeId?.userId?.name || 'Graduate Trainee',
        maskedAadhaar: followUp.traineeId?.maskedAadhaar || 'XXXX-XXXX-1234',
        courseName: followUp.enrollmentId?.courseId?.courseName || 'Skilling Program',
        courseCategory: followUp.enrollmentId?.courseId?.category || '',
        skills: followUp.enrollmentId?.courseId?.skills || [],
        batchName: followUp.enrollmentId?.batchId?.batchName || '',
        providerName: followUp.providerId?.organizationName || 'Authorized Training Provider',
        providerPhone: followUp.providerId?.phone || '',
        certificateNumber: followUp.certificateId?.certificateNumber || '',
        issueDate: followUp.certificateId?.issueDate || null,
        isCompleted: followUp.status === 'RESPONDED' || followUp.status === 'COMPLETED',
        isOptedOut: followUp.status === 'OPTED_OUT' || followUp.trackingConsent === 'WITHDRAWN',
        outcomeRecord: outcomeRecord || null,
      },
    });
  } catch (error) {
    console.error('getFollowUpByToken error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/token/:token/submit
 * Public endpoint: Trainee submits outcome questionnaire using secure token
 */
const submitFollowUpByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      situation,
      employmentData,
      selfEmploymentData,
      apprenticeshipData,
      unemploymentData,
      relevanceRating,
      skillsUsed,
      feedback,
    } = req.body;

    if (!situation) {
      return res.status(400).json({
        success: false,
        message: 'Current situation is required (e.g. EMPLOYED, SELF_EMPLOYED, APPRENTICESHIP, LOOKING_FOR_JOB, FURTHER_EDUCATION, NOT_WORKING, OTHER).',
      });
    }

    const followUp = await FollowUp.findOne({ followUpToken: token });
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Invalid or expired tracking token.' });
    }

    if (followUp.trackingConsent === 'WITHDRAWN') {
      return res.status(400).json({
        success: false,
        message: 'Tracking has been stopped by the trainee. Please resume tracking to submit outcome responses.',
      });
    }

    const logicalNow = await timeService.getCurrentDate();

    // Sanitize dates so empty string doesn't fail Mongoose Date casting
    const cleanEmploymentData = { ...(employmentData || {}) };
    if (!cleanEmploymentData.startDate) delete cleanEmploymentData.startDate;

    const cleanSelfEmploymentData = { ...(selfEmploymentData || {}) };
    if (!cleanSelfEmploymentData.startDate) delete cleanSelfEmploymentData.startDate;

    const cleanApprenticeshipData = { ...(apprenticeshipData || {}) };
    if (!cleanApprenticeshipData.startDate) delete cleanApprenticeshipData.startDate;
    if (!cleanApprenticeshipData.expectedEndDate) delete cleanApprenticeshipData.expectedEndDate;

    // Check if outcome already exists
    let outcomeRecord = await OutcomeRecord.findOne({ followUpId: followUp._id });
    if (outcomeRecord) {
      outcomeRecord.situation = situation;
      outcomeRecord.observedAt = logicalNow;
      outcomeRecord.employmentData = cleanEmploymentData;
      outcomeRecord.selfEmploymentData = cleanSelfEmploymentData;
      outcomeRecord.apprenticeshipData = cleanApprenticeshipData;
      outcomeRecord.unemploymentData = unemploymentData || {};
      outcomeRecord.relevanceRating = relevanceRating || 5;
      outcomeRecord.feedback = {
        ...(feedback || {}),
        skillsUsed: skillsUsed || [],
      };
      await outcomeRecord.save();
    } else {
      outcomeRecord = await OutcomeRecord.create({
        traineeId: followUp.traineeId,
        enrollmentId: followUp.enrollmentId,
        certificateId: followUp.certificateId || null,
        followUpId: followUp._id,
        providerId: followUp.providerId,
        followUpType: followUp.followUpType,
        observedAt: logicalNow,
        situation,
        employmentData: cleanEmploymentData,
        selfEmploymentData: cleanSelfEmploymentData,
        apprenticeshipData: cleanApprenticeshipData,
        unemploymentData: unemploymentData || {},
        relevanceRating: relevanceRating || 5,
        feedback: {
          ...(feedback || {}),
          skillsUsed: skillsUsed || [],
        },
        source: 'TRAINEE_REPORTED',
      });
    }

    followUp.status = 'RESPONDED';
    followUp.completedAt = logicalNow;
    followUp.attemptCount += 1;
    await followUp.save();

    await Trainee.findByIdAndUpdate(followUp.traineeId, {
      currentFollowUpStatus: 'RESPONDED',
    });

    // If trainee was in government tracking queue, update status to RETURNED/RESOLVED
    await IdentityReference.findOneAndUpdate(
      { traineeId: followUp.traineeId },
      {
        status: 'RESOLVED',
        resolvedAt: logicalNow,
        $push: {
          governmentTrackingNotes: {
            note: 'Trainee submitted self-reported outcome via secure tracking link. Case marked RESOLVED.',
            actionTaken: 'SELF_REPORTED_RESOLUTION',
            updatedByName: 'Tracking Link Automation',
            updatedAt: logicalNow,
          },
        },
      }
    );

    // Audit communication history
    await CommunicationHistory.create({
      traineeId: followUp.traineeId,
      followUpId: followUp._id,
      providerId: followUp.providerId,
      channel: 'PORTAL',
      action: 'TRAINEE_RESPONDED',
      timestamp: logicalNow,
      outcome: situation,
      notes: `Trainee submitted outcome response (${situation}) via secure tracking link.`,
      performedByName: 'Trainee (Self-Reported)',
    });

    res.status(201).json({
      success: true,
      message: '✓ Outcome submitted successfully. Thank you for contributing to skilling outcome insights.',
      data: {
        followUp,
        outcomeRecord,
      },
    });
  } catch (error) {
    console.error('submitFollowUpByToken error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/token/:token/opt-out
 * Public endpoint: Trainee stops future follow-ups via tracking link
 */
const optOutByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const followUp = await FollowUp.findOne({ followUpToken: token });
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Invalid tracking token.' });
    }

    const logicalNow = await timeService.getCurrentDate();

    // Mark current follow-up as OPTED_OUT
    followUp.status = 'OPTED_OUT';
    followUp.trackingConsent = 'WITHDRAWN';
    followUp.optedOutAt = logicalNow;
    await followUp.save();

    // Update all pending future follow-ups for this trainee to OPTED_OUT
    await FollowUp.updateMany(
      {
        traineeId: followUp.traineeId,
        status: { $nin: ['RESPONDED', 'COMPLETED'] },
      },
      {
        status: 'OPTED_OUT',
        trackingConsent: 'WITHDRAWN',
        optedOutAt: logicalNow,
      }
    );

    // Update Trainee profile
    await Trainee.findByIdAndUpdate(followUp.traineeId, {
      trackingConsent: 'WITHDRAWN',
      consentWithdrawnAt: logicalNow,
      currentFollowUpStatus: 'OPTED_OUT',
    });

    // Update IdentityReference if any
    await IdentityReference.findOneAndUpdate(
      { traineeId: followUp.traineeId },
      { status: 'OPTED_OUT' }
    );

    // Record Consent History
    await ConsentHistory.create({
      traineeId: followUp.traineeId,
      enrollmentId: followUp.enrollmentId,
      consentType: 'OUTCOME_TRACKING',
      status: 'WITHDRAWN',
      timestamp: logicalNow,
      source: 'SECURE_TRACKING_LINK',
      notes: reason || 'Trainee withdrew consent for voluntary outcome tracking.',
    });

    // Record Communication History
    await CommunicationHistory.create({
      traineeId: followUp.traineeId,
      followUpId: followUp._id,
      providerId: followUp.providerId,
      channel: 'PORTAL',
      action: 'OPTED_OUT',
      timestamp: logicalNow,
      outcome: 'CONSENT_WITHDRAWN',
      notes: 'Trainee requested stop tracking. Routine future follow-ups suspended.',
      performedByName: 'Trainee (Consent Withdrawn)',
    });

    res.json({
      success: true,
      message: '✓ Tracking consent withdrawn. You have successfully stopped routine outcome follow-ups.',
      data: followUp,
    });
  } catch (error) {
    console.error('optOutByToken error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/token/:token/resume
 * Public or authenticated endpoint: Trainee resumes outcome tracking
 */
const resumeTrackingByToken = async (req, res) => {
  try {
    const { token } = req.params;
    let followUp = await FollowUp.findOne({ followUpToken: token });

    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Invalid tracking token.' });
    }

    const logicalNow = await timeService.getCurrentDate();

    // Restore consent
    followUp.trackingConsent = 'GRANTED';
    followUp.status = 'RETURNED';
    followUp.returnedAt = logicalNow;
    await followUp.save();

    await FollowUp.updateMany(
      { traineeId: followUp.traineeId },
      { trackingConsent: 'GRANTED' }
    );

    await Trainee.findByIdAndUpdate(followUp.traineeId, {
      trackingConsent: 'GRANTED',
      consentRestoredAt: logicalNow,
      currentFollowUpStatus: 'RETURNED',
    });

    await ConsentHistory.create({
      traineeId: followUp.traineeId,
      enrollmentId: followUp.enrollmentId,
      consentType: 'OUTCOME_TRACKING',
      status: 'RESTORED',
      timestamp: logicalNow,
      source: 'SECURE_TRACKING_LINK',
      notes: 'Trainee explicitly restored consent for longitudinal outcome tracking.',
    });

    await CommunicationHistory.create({
      traineeId: followUp.traineeId,
      followUpId: followUp._id,
      providerId: followUp.providerId,
      channel: 'PORTAL',
      action: 'RESUMED_TRACKING',
      timestamp: logicalNow,
      outcome: 'CONSENT_RESTORED',
      notes: 'Trainee resumed outcome tracking. Longitudinal follow-up journey active.',
      performedByName: 'Trainee',
    });

    await evaluateReadiness();

    res.json({
      success: true,
      message: '✓ Tracking consent restored. Your outcome tracking journey has resumed.',
      data: followUp,
    });
  } catch (error) {
    console.error('resumeTrackingByToken error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/opt-out (Authenticated Trainee)
 */
const optOutTrainee = async (req, res) => {
  try {
    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee profile not found.' });
    }

    const logicalNow = await timeService.getCurrentDate();

    trainee.trackingConsent = 'WITHDRAWN';
    trainee.consentWithdrawnAt = logicalNow;
    trainee.currentFollowUpStatus = 'OPTED_OUT';
    await trainee.save();

    await FollowUp.updateMany(
      {
        traineeId: trainee._id,
        status: { $nin: ['RESPONDED', 'COMPLETED'] },
      },
      {
        status: 'OPTED_OUT',
        trackingConsent: 'WITHDRAWN',
        optedOutAt: logicalNow,
      }
    );

    await ConsentHistory.create({
      traineeId: trainee._id,
      consentType: 'OUTCOME_TRACKING',
      status: 'WITHDRAWN',
      timestamp: logicalNow,
      source: 'TRAINEE_PORTAL',
      notes: 'Trainee stopped future voluntary follow-ups from student portal.',
      performedBy: req.user._id,
    });

    await CommunicationHistory.create({
      traineeId: trainee._id,
      providerId: trainee.providerId,
      channel: 'PORTAL',
      action: 'OPTED_OUT',
      timestamp: logicalNow,
      outcome: 'CONSENT_WITHDRAWN',
      notes: 'Trainee stopped future voluntary follow-ups from student portal.',
      performedBy: req.user._id,
      performedByName: req.user.name || 'Trainee',
    });

    res.json({
      success: true,
      message: '✓ Tracking consent withdrawn. Future automated follow-ups stopped.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/resume (Authenticated Trainee)
 */
const resumeTrackingTrainee = async (req, res) => {
  try {
    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee profile not found.' });
    }

    const logicalNow = await timeService.getCurrentDate();

    trainee.trackingConsent = 'GRANTED';
    trainee.consentRestoredAt = logicalNow;
    trainee.currentFollowUpStatus = 'RETURNED';
    await trainee.save();

    await FollowUp.updateMany(
      {
        traineeId: trainee._id,
        status: 'OPTED_OUT',
      },
      {
        status: 'DUE',
        trackingConsent: 'GRANTED',
        returnedAt: logicalNow,
      }
    );

    await ConsentHistory.create({
      traineeId: trainee._id,
      consentType: 'OUTCOME_TRACKING',
      status: 'RESTORED',
      timestamp: logicalNow,
      source: 'TRAINEE_PORTAL',
      notes: 'Trainee resumed outcome tracking from student portal.',
      performedBy: req.user._id,
    });

    await CommunicationHistory.create({
      traineeId: trainee._id,
      providerId: trainee.providerId,
      channel: 'PORTAL',
      action: 'RESUMED_TRACKING',
      timestamp: logicalNow,
      outcome: 'CONSENT_RESTORED',
      notes: 'Trainee resumed outcome tracking. Longitudinal schedule active.',
      performedBy: req.user._id,
      performedByName: req.user.name || 'Trainee',
    });

    await evaluateReadiness();

    res.json({
      success: true,
      message: '✓ Tracking consent restored. Your outcome tracking journey has resumed.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/:id/digital-contact
 * Provider or Admin launches WhatsApp or Email follow-up
 */
const sendDigitalFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { channel } = req.body; // 'WHATSAPP' or 'EMAIL'

    if (!['WHATSAPP', 'EMAIL'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'Channel must be WHATSAPP or EMAIL.' });
    }

    const followUp = await FollowUp.findById(id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate({
        path: 'enrollmentId',
        populate: [{ path: 'courseId', select: 'courseName category' }],
      })
      .populate('providerId', 'organizationName contactPerson phone');

    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up record not found.' });
    }

    if (followUp.trackingConsent === 'WITHDRAWN') {
      return res.status(400).json({
        success: false,
        message: '✕ Tracking has been stopped by the trainee.',
      });
    }

    // Role check for Provider
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || followUp.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const config = await getFollowUpConfig();
    const logicalNow = await timeService.getCurrentDate();
    const waitDays = config.digitalResponseWaitDays || 3;
    const deadline = new Date(logicalNow.getTime() + waitDays * 24 * 60 * 60 * 1000);

    if (!followUp.followUpToken) {
      followUp.followUpToken = generateSecureToken();
      followUp.tokenExpiresAt = new Date(logicalNow.getTime() + (config.tokenExpiryDays || 30) * 86400000);
    }

    // Update follow-up status to WAITING_FOR_RESPONSE
    followUp.status = 'WAITING_FOR_RESPONSE';
    followUp.digitalContactedAt = logicalNow;
    followUp.digitalChannel = channel;
    followUp.digitalResponseDeadline = deadline;
    followUp.attemptCount += 1;
    await followUp.save();

    await Trainee.findByIdAndUpdate(followUp.traineeId._id, {
      currentFollowUpStatus: 'WAITING_FOR_RESPONSE',
    });

    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const trackingUrl = `${clientBaseUrl}/tracking/${followUp.followUpToken}`;

    const traineeName = followUp.traineeId?.userId?.name || 'Trainee';
    const courseName = followUp.enrollmentId?.courseId?.courseName || 'Training Program';
    const orgName = followUp.providerId?.organizationName || 'Technical Skills Institute';
    const phone = followUp.traineeId?.phone || '';
    const email = followUp.traineeId?.userId?.email || '';

    // Standardized personalized message template
    const personalizedMessage =
`Hello ${traineeName},

You recently completed the ${courseName} training through ${orgName}.

We would like to understand your current career situation and how useful the training has been.

Please update your employment and training outcome information here:

${trackingUrl}

Thank you.
Skilling Outcome Tracking System`;

    // WhatsApp Direct Link
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(personalizedMessage)}`;

    // Mailto Direct Link
    const emailSubject = `Training Outcome Follow-up — ${courseName}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(personalizedMessage)}`;

    // Log Communication History
    await CommunicationHistory.create({
      traineeId: followUp.traineeId._id,
      followUpId: followUp._id,
      providerId: followUp.providerId._id,
      channel,
      action: channel === 'WHATSAPP' ? 'WHATSAPP_OPENED' : 'EMAIL_COMPOSED',
      timestamp: logicalNow,
      outcome: 'MESSAGE_PREPARED',
      notes: `${channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'} follow-up prepared with secure link. Provider manually sent. Response deadline set to ${deadline.toISOString().split('T')[0]}.`,
      performedBy: req.user._id,
      performedByName: req.user.name || 'Provider Staff',
      metadata: {
        recipientPhone: phone ? `+91 ${phone.slice(-4)}` : 'N/A',
        recipientEmail: email,
      },
    });

    res.json({
      success: true,
      message: `✓ ${channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'} message prepared successfully.`,
      data: {
        followUp,
        trackingUrl,
        personalizedMessage,
        whatsappUrl,
        mailtoUrl,
        responseDeadline: deadline,
      },
    });
  } catch (error) {
    console.error('sendDigitalFollowUp error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/:id/record-call
 * Provider records phone call attempt and outcome
 */
const recordCallAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { callOutcome, notes, directOutcome } = req.body;

    if (!callOutcome) {
      return res.status(400).json({
        success: false,
        message: 'callOutcome is required (e.g. CONNECTED, NO_ANSWER, BUSY, WRONG_NUMBER, CALL_BACK_REQUESTED, REFUSED, OTHER).',
      });
    }

    const followUp = await FollowUp.findById(id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate('providerId');

    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up record not found.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || followUp.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const config = await getFollowUpConfig();
    const logicalNow = await timeService.getCurrentDate();
    const waitDays = config.callResponseWaitDays || 3;
    const deadline = new Date(logicalNow.getTime() + waitDays * 24 * 60 * 60 * 1000);

    const callAttempt = await CallAttempt.create({
      traineeId: followUp.traineeId._id,
      followUpId: followUp._id,
      providerId: followUp.providerId._id,
      callDate: logicalNow,
      callOutcome,
      notes: notes || '',
      recordedBy: req.user._id,
      recordedByName: req.user.name || 'Provider Staff',
      directOutcomeRecorded: callOutcome === 'CONNECTED' && !!directOutcome,
    });

    followUp.callAttemptedAt = logicalNow;
    followUp.callAttemptsCount = (followUp.callAttemptsCount || 0) + 1;
    followUp.lastCommunicationNote = `Call attempt: ${callOutcome}. ${notes || ''}`;

    let outcomeRecord = null;

    if (callOutcome === 'CONNECTED' && directOutcome) {
      // Direct phone logging of outcome with trainee
      outcomeRecord = await OutcomeRecord.create({
        traineeId: followUp.traineeId._id,
        enrollmentId: followUp.enrollmentId,
        certificateId: followUp.certificateId,
        followUpId: followUp._id,
        providerId: followUp.providerId._id,
        followUpType: followUp.followUpType,
        observedAt: logicalNow,
        situation: directOutcome.situation || 'EMPLOYED',
        employmentData: directOutcome.employmentData || {},
        selfEmploymentData: directOutcome.selfEmploymentData || {},
        relevanceRating: directOutcome.relevanceRating || 5,
        feedback: directOutcome.feedback || {},
        source: 'PROVIDER_RECORDED',
      });

      followUp.status = 'RESPONDED';
      followUp.completedAt = logicalNow;
      await Trainee.findByIdAndUpdate(followUp.traineeId._id, {
        currentFollowUpStatus: 'RESPONDED',
      });
    } else if (callOutcome === 'REFUSED') {
      // Trainee explicitly refused to answer over phone
      followUp.status = 'OPTED_OUT';
      followUp.trackingConsent = 'WITHDRAWN';
      followUp.optedOutAt = logicalNow;
      await Trainee.findByIdAndUpdate(followUp.traineeId._id, {
        trackingConsent: 'WITHDRAWN',
        currentFollowUpStatus: 'OPTED_OUT',
      });
    } else {
      // NO_ANSWER, BUSY, WRONG_NUMBER, CALL_BACK_REQUESTED
      // Move to WAITING_AFTER_CALL with deadline before government escalation
      followUp.status = 'WAITING_AFTER_CALL';
      followUp.callResponseDeadline = deadline;
      await Trainee.findByIdAndUpdate(followUp.traineeId._id, {
        currentFollowUpStatus: 'WAITING_AFTER_CALL',
      });
    }

    await followUp.save();

    // Log in CommunicationHistory
    await CommunicationHistory.create({
      traineeId: followUp.traineeId._id,
      followUpId: followUp._id,
      providerId: followUp.providerId._id,
      channel: 'PHONE_CALL',
      action: 'CALL_LOGGED',
      timestamp: logicalNow,
      outcome: callOutcome,
      notes: `Call recorded: ${callOutcome}. ${notes || ''}`,
      performedBy: req.user._id,
      performedByName: req.user.name || 'Provider Staff',
    });

    res.status(201).json({
      success: true,
      message: '✓ Call attempt recorded successfully.',
      data: {
        followUp,
        callAttempt,
        outcomeRecord,
      },
    });
  } catch (error) {
    console.error('recordCallAttempt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/:id/mark-returned
 * Admin or Provider marks trainee as Returned from Government Tracking Queue
 */
const markTraineeReturned = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const followUp = await FollowUp.findById(id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate('providerId');

    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up record not found.' });
    }

    const logicalNow = await timeService.getCurrentDate();

    followUp.status = 'RETURNED';
    followUp.returnedAt = logicalNow;
    followUp.trackingConsent = 'GRANTED';
    await followUp.save();

    await Trainee.findByIdAndUpdate(followUp.traineeId._id, {
      currentFollowUpStatus: 'RETURNED',
      trackingConsent: 'GRANTED',
      consentRestoredAt: logicalNow,
    });

    // Update IdentityReference in Government Tracking Queue
    await IdentityReference.findOneAndUpdate(
      { traineeId: followUp.traineeId._id },
      {
        status: 'RETURNED',
        resolvedAt: logicalNow,
        $push: {
          governmentTrackingNotes: {
            note: notes || 'Trainee returned and contact restored. Case reactivated for longitudinal tracking.',
            actionTaken: 'CONTACT_RESTORED',
            updatedBy: req.user._id,
            updatedByName: req.user.name || 'Official Staff',
            updatedAt: logicalNow,
          },
        },
      }
    );

    // Record Communication History
    await CommunicationHistory.create({
      traineeId: followUp.traineeId._id,
      followUpId: followUp._id,
      providerId: followUp.providerId._id,
      channel: 'SYSTEM',
      action: 'RETURNED',
      timestamp: logicalNow,
      outcome: 'CONTACT_RESTORED',
      notes: notes || 'Trainee contact restored. Returned from government tracking queue.',
      performedBy: req.user._id,
      performedByName: req.user.name || 'Official Staff',
    });

    res.json({
      success: true,
      message: '✓ Trainee marked as returned. Normal longitudinal tracking resumed.',
      data: followUp,
    });
  } catch (error) {
    console.error('markTraineeReturned error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/followups/:id/history OR /api/followups/trainee/:traineeId/history
 * Chronological communication timeline
 */
const getCommunicationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    let filter = {};

    // ID can be followUpId or traineeId
    const isFollowUp = await FollowUp.findById(id);
    if (isFollowUp) {
      filter.traineeId = isFollowUp.traineeId;
    } else {
      filter.traineeId = id;
    }

    const history = await CommunicationHistory.find(filter)
      .populate('performedBy', 'name username role')
      .populate('followUpId', 'followUpType scheduledDate status')
      .sort({ timestamp: -1, createdAt: -1 });

    const callAttempts = await CallAttempt.find(filter)
      .populate('recordedBy', 'name username')
      .sort({ callDate: -1 });

    const consentHistory = await ConsentHistory.find(filter)
      .populate('performedBy', 'name username')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: history.length,
      data: {
        timeline: history,
        calls: callAttempts,
        consents: consentHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/followups/government-tracking/queue
 * Admin view of government identity tracking queue
 */
const getGovernmentTrackingQueue = async (req, res) => {
  try {
    await evaluateReadiness();

    let filter = {};
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    if (req.query.providerId && req.query.providerId !== 'ALL') {
      filter.providerId = req.query.providerId;
    }

    const queue = await IdentityReference.find(filter)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name email username' },
      })
      .populate('providerId', 'organizationName contactPerson phone email')
      .populate({
        path: 'enrollmentId',
        populate: [
          { path: 'courseId', select: 'courseName category' },
          { path: 'batchId', select: 'batchName mode startDate endDate' },
        ],
      })
      .sort({ escalatedAt: -1 });

    res.json({ success: true, count: queue.length, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/followups/government-tracking/:id/status
 * Admin updates government tracking progress
 */
const updateGovernmentTrackingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, actionTaken } = req.body;

    const record = await IdentityReference.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Government tracking record not found.' });
    }

    const logicalNow = await timeService.getCurrentDate();

    if (status) record.status = status;
    if (status === 'RESOLVED' || status === 'RETURNED') {
      record.resolvedAt = logicalNow;
    }

    if (note) {
      record.governmentTrackingNotes.push({
        note,
        actionTaken: actionTaken || 'STATUS_UPDATE',
        updatedBy: req.user._id,
        updatedByName: req.user.name || 'Authorized Official',
        updatedAt: logicalNow,
      });
    }

    await record.save();

    await CommunicationHistory.create({
      traineeId: record.traineeId,
      providerId: record.providerId,
      channel: 'GOVERNMENT',
      action: 'GOVERNMENT_STATUS_UPDATED',
      timestamp: logicalNow,
      outcome: status || 'NOTE_ADDED',
      notes: note || `Government tracking status updated to ${status}.`,
      performedBy: req.user._id,
      performedByName: req.user.name || 'Authorized Official',
    });

    res.json({
      success: true,
      message: '✓ Government tracking status updated successfully.',
      data: record,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/followups/settings & PUT /api/followups/settings
 */
const getFollowUpSettings = async (req, res) => {
  try {
    const config = await getFollowUpConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateFollowUpSettings = async (req, res) => {
  try {
    const { firstFollowUpDays, digitalResponseWaitDays, callResponseWaitDays, tokenExpiryDays } = req.body;

    let setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!setting) {
      setting = new SystemSetting({ key: 'GLOBAL_SETTINGS' });
    }

    if (!setting.followUpConfig) {
      setting.followUpConfig = {};
    }

    if (firstFollowUpDays !== undefined) setting.followUpConfig.firstFollowUpDays = Number(firstFollowUpDays);
    if (digitalResponseWaitDays !== undefined) setting.followUpConfig.digitalResponseWaitDays = Number(digitalResponseWaitDays);
    if (callResponseWaitDays !== undefined) setting.followUpConfig.callResponseWaitDays = Number(callResponseWaitDays);
    if (tokenExpiryDays !== undefined) setting.followUpConfig.tokenExpiryDays = Number(tokenExpiryDays);
    setting.updatedBy = req.user._id;

    await setting.save();
    await evaluateReadiness();

    res.json({
      success: true,
      message: '✓ Follow-up interval settings updated successfully.',
      data: setting.followUpConfig,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/followups/:id/unreachable
 */
const markUnreachable = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }

    followUp.status = 'NOT_RESPONDED';
    if (notes) followUp.notes = notes;
    followUp.attemptCount += 1;
    await followUp.save();

    res.json({
      success: true,
      message: 'Follow-up marked as NOT_RESPONDED.',
      data: followUp,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/followups/:id/submit (Authenticated Trainee legacy fallback)
 */
const submitFollowUpResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      situation,
      employmentData,
      selfEmploymentData,
      apprenticeshipData,
      unemploymentData,
      relevanceRating,
      feedback,
    } = req.body;

    if (!situation) {
      return res.status(400).json({
        success: false,
        message: 'Current situation is required.',
      });
    }

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee profile not found.' });
    }

    const followUp = await FollowUp.findById(id);
    if (!followUp || followUp.traineeId.toString() !== trainee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const logicalNow = await timeService.getCurrentDate();

    // Sanitize dates so empty string doesn't fail Mongoose Date casting
    const cleanEmploymentData = { ...(employmentData || {}) };
    if (!cleanEmploymentData.startDate) delete cleanEmploymentData.startDate;

    const cleanSelfEmploymentData = { ...(selfEmploymentData || {}) };
    if (!cleanSelfEmploymentData.startDate) delete cleanSelfEmploymentData.startDate;

    const cleanApprenticeshipData = { ...(apprenticeshipData || {}) };
    if (!cleanApprenticeshipData.startDate) delete cleanApprenticeshipData.startDate;
    if (!cleanApprenticeshipData.expectedEndDate) delete cleanApprenticeshipData.expectedEndDate;

    // Check if an outcome record already exists for this follow-up
    let outcomeRecord = await OutcomeRecord.findOne({ followUpId: followUp._id });
    if (outcomeRecord) {
      outcomeRecord.situation = situation;
      outcomeRecord.observedAt = logicalNow;
      outcomeRecord.employmentData = cleanEmploymentData;
      outcomeRecord.selfEmploymentData = cleanSelfEmploymentData;
      outcomeRecord.apprenticeshipData = cleanApprenticeshipData;
      outcomeRecord.unemploymentData = unemploymentData || {};
      outcomeRecord.relevanceRating = relevanceRating || 5;
      outcomeRecord.feedback = feedback || {};
      await outcomeRecord.save();
    } else {
      outcomeRecord = await OutcomeRecord.create({
        traineeId: trainee._id,
        enrollmentId: followUp.enrollmentId,
        certificateId: followUp.certificateId || null,
        followUpId: followUp._id,
        providerId: followUp.providerId,
        followUpType: followUp.followUpType,
        observedAt: logicalNow,
        situation,
        employmentData: cleanEmploymentData,
        selfEmploymentData: cleanSelfEmploymentData,
        apprenticeshipData: cleanApprenticeshipData,
        unemploymentData: unemploymentData || {},
        relevanceRating: relevanceRating || 5,
        feedback: feedback || {},
        source: 'TRAINEE_REPORTED',
      });
    }

    followUp.status = 'RESPONDED';
    followUp.completedAt = logicalNow;
    followUp.attemptCount += 1;
    await followUp.save();

    await Trainee.findByIdAndUpdate(trainee._id, { currentFollowUpStatus: 'RESPONDED' });

    res.status(201).json({
      success: true,
      message: `${followUp.followUpType.replace('_', '-')} outcome response recorded successfully.`,
      data: { followUp, outcomeRecord },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyFollowUps,
  getFollowUps,
  getFollowUpStats,
  getFollowUpById,
  getFollowUpByToken,
  submitFollowUpByToken,
  optOutByToken,
  resumeTrackingByToken,
  optOutTrainee,
  resumeTrackingTrainee,
  sendDigitalFollowUp,
  recordCallAttempt,
  markTraineeReturned,
  getCommunicationHistory,
  getGovernmentTrackingQueue,
  updateGovernmentTrackingStatus,
  getFollowUpSettings,
  updateFollowUpSettings,
  submitFollowUpResponse,
  markUnreachable,
};
