const OutcomeRecord = require('../models/OutcomeRecord');
const OutcomeVerification = require('../models/OutcomeVerification');
const OutcomeEvidence = require('../models/OutcomeEvidence');
const EmploymentRecord = require('../models/EmploymentRecord');
const Employer = require('../models/Employer');
const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const NonPlacementReason = require('../models/NonPlacementReason');
const AttritionReason = require('../models/AttritionReason');
const { computeVerificationConfidence } = require('../services/verificationEngine');
const { checkExternalPortal } = require('../services/externalVerificationAdapter');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * GET /api/outcomes/my
 * Trainee views their longitudinal outcome journey across milestones
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
          { path: 'courseId', select: 'courseName category duration competencies skills' },
          { path: 'batchId', select: 'batchName mode startDate endDate' },
        ],
      })
      .populate('certificateId', 'certificateNumber verificationCode issueDate')
      .populate('providerId', 'organizationName')
      .populate('verificationId')
      .populate('employmentRecordId')
      .sort({ observedAt: 1 });

    res.json({ success: true, count: outcomes.length, data: outcomes });
  } catch (error) {
    console.error('getMyOutcomes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes
 * Admin / Provider view outcomes with pagination and multi-dimensional filters
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

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [outcomes, totalCount] = await Promise.all([
      OutcomeRecord.find(filter)
        .populate({
          path: 'traineeId',
          select: 'internalTraineeId phone email district state socialCategory residenceType',
          populate: { path: 'userId', select: 'name email username' },
        })
        .populate({
          path: 'enrollmentId',
          populate: [
            { path: 'courseId', select: 'courseName category' },
            { path: 'batchId', select: 'batchName mode' },
          ],
        })
        .populate('providerId', 'organizationName contactPerson')
        .populate('verificationId')
        .populate('employmentRecordId')
        .sort({ observedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OutcomeRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: outcomes.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      data: outcomes,
    });
  } catch (error) {
    console.error('getOutcomes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes/verification/:outcomeId
 * Get detailed verification status, confidence score signals, and evidence artifacts
 */
const getOutcomeVerification = async (req, res) => {
  try {
    const { outcomeId } = req.params;
    let verification = await OutcomeVerification.findOne({ outcomeId })
      .populate('employerId')
      .populate('verifiedBy', 'name email role');

    if (!verification) {
      // Auto-create initial level 1 verification if missing
      const outcome = await OutcomeRecord.findById(outcomeId).populate('traineeId');
      if (!outcome) return res.status(404).json({ success: false, message: 'Outcome not found' });

      verification = await OutcomeVerification.create({
        outcomeId,
        traineeId: outcome.traineeId._id,
        providerId: outcome.providerId,
        verificationLevel: 'LEVEL_1_SELF_REPORTED',
        confidenceScore: 20,
        status: 'PENDING_REVIEW',
      });
      outcome.verificationId = verification._id;
      await outcome.save();
    }

    const evidenceList = await OutcomeEvidence.find({ verificationId: verification._id });
    const externalCheck = await checkExternalPortal();

    res.json({
      success: true,
      data: {
        ...verification.toObject(),
        evidence: evidenceList,
        externalIntegration: externalCheck,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/outcomes/verify/:outcomeId
 * Execute verification level update, run algorithmic confidence scoring
 */
const verifyOutcome = async (req, res) => {
  try {
    const { outcomeId } = req.params;
    const {
      hasProviderConfirmation,
      hasEmployerConfirmation,
      employerData, // { isEmployeeRecognized, roleConfirmed, employerReportedRole, joiningDateConfirmed, employerReportedJoiningDate, wageBandConfirmed, employerWageBandReported, employerComments }
      newEvidence, // { evidenceType, documentTitle, documentUrl, issuerName, signalWeight }
    } = req.body;

    const outcome = await OutcomeRecord.findById(outcomeId)
      .populate('traineeId')
      .populate('employmentRecordId');
    if (!outcome) return res.status(404).json({ success: false, message: 'Outcome not found' });

    let verification = await OutcomeVerification.findOne({ outcomeId });
    if (!verification) {
      verification = new OutcomeVerification({
        outcomeId,
        traineeId: outcome.traineeId._id,
        providerId: outcome.providerId,
      });
    }

    // If new evidence artifact provided, save it
    if (newEvidence && newEvidence.documentTitle) {
      await OutcomeEvidence.create({
        verificationId: verification._id,
        traineeId: outcome.traineeId._id,
        evidenceType: newEvidence.evidenceType || 'APPOINTMENT_LETTER',
        documentTitle: newEvidence.documentTitle,
        documentUrl: newEvidence.documentUrl || '',
        issuerName: newEvidence.issuerName || '',
        signalWeight: newEvidence.signalWeight || 20,
        verifiedBy: req.user._id,
      });
    }

    const allEvidence = await OutcomeEvidence.find({ verificationId: verification._id });

    // Compute Confidence Score Algorithmically (NO hardcoded demo numbers!)
    const computed = computeVerificationConfidence({
      hasTraineeDeclaration: true,
      hasProviderConfirmation: hasProviderConfirmation ?? (verification.confidenceSignals?.providerConfirmed > 0),
      hasEmployerConfirmation: hasEmployerConfirmation ?? (verification.confidenceSignals?.employerConfirmed > 0),
      hasDocumentaryEvidence: allEvidence.length > 0,
      evidenceItems: allEvidence,
      traineeData: {
        employerName: outcome.employmentData?.employerName || outcome.employmentRecordId?.companyName,
        jobRole: outcome.employmentData?.jobRole || outcome.employmentRecordId?.designation,
        joiningDate: outcome.employmentData?.startDate || outcome.employmentRecordId?.startDate,
        monthlySalary: outcome.employmentData?.monthlySalary || outcome.employmentRecordId?.monthlySalary,
      },
      employerData: employerData || verification.employerVerificationDetails,
    });

    verification.confidenceScore = computed.confidenceScore;
    verification.confidenceSignals = computed.signals;
    verification.verificationLevel = computed.verificationLevel;
    if (req.body.status && ['VERIFIED', 'PARTIALLY_VERIFIED', 'DISCREPANCY_FLAGGED', 'PENDING_REVIEW'].includes(req.body.status)) {
      verification.status = req.body.status;
    } else {
      verification.status = computed.status;
    }
    verification.discrepancies = computed.discrepancies;
    if (employerData) {
      verification.employerVerificationDetails = {
        ...verification.employerVerificationDetails,
        ...employerData,
        verifiedAt: new Date(),
      };
    }
    verification.verifiedBy = req.user._id;
    verification.verifiedAt = new Date();
    await verification.save();

    outcome.verificationId = verification._id;
    if (computed.discrepancies && computed.discrepancies.length > 0) {
      outcome.discrepancyFlag = true;
      outcome.discrepancyReason = computed.discrepancies[0]?.description;
    } else {
      outcome.discrepancyFlag = false;
      outcome.discrepancyReason = '';
    }
    await outcome.save();

    res.json({
      success: true,
      message: 'Verification processed with computed confidence score',
      data: verification,
    });
  } catch (error) {
    console.error('verifyOutcome error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes/discrepancies
 * List flagged data discrepancies for government audit and provider remediation
 */
const getDiscrepancies = async (req, res) => {
  try {
    let filter = { 'discrepancies.0': { $exists: true } };

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    }

    const verifications = await OutcomeVerification.find(filter)
      .populate({
        path: 'traineeId',
        select: 'internalTraineeId phone email district',
        populate: { path: 'userId', select: 'name' },
      })
      .populate({
        path: 'outcomeId',
        select: 'followUpType employmentData observedAt',
      })
      .populate('providerId', 'organizationName')
      .sort({ updatedAt: -1 })
      .limit(50);

    const discrepanciesList = [];
    verifications.forEach((v) => {
      v.discrepancies.forEach((d) => {
        discrepanciesList.push({
          verificationId: v._id,
          outcomeId: v.outcomeId?._id,
          traineeName: v.traineeId?.userId?.name || 'Trainee',
          internalTraineeId: v.traineeId?.internalTraineeId || '',
          providerName: v.providerId?.organizationName || '',
          followUpType: v.outcomeId?.followUpType,
          field: d.field,
          traineeValue: d.traineeReportedValue,
          employerValue: d.employerReportedValue,
          severity: d.severity,
          description: d.description,
          isResolved: d.isResolved,
        });
      });
    });

    res.json({ success: true, count: discrepanciesList.length, data: discrepanciesList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes/wage-retention-intelligence
 * Aggregates longitudinal wage curves and retention metrics across cohorts
 */
const getWageRetentionIntelligence = async (req, res) => {
  try {
    let matchFilter = { situation: 'EMPLOYED' };

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (provider) matchFilter.providerId = provider._id;
    } else if (req.query.providerId && req.query.providerId !== 'ALL') {
      const mongoose = require('mongoose');
      matchFilter.providerId = new mongoose.Types.ObjectId(req.query.providerId);
    }

    if (req.query.courseId && req.query.courseId !== 'ALL') {
      const mongoose = require('mongoose');
      matchFilter['enrollmentId.courseId'] = new mongoose.Types.ObjectId(req.query.courseId);
    }

    // Compute average wage by follow-up milestone
    const milestoneWageAgg = await OutcomeRecord.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$followUpType',
          averageSalary: { $avg: '$employmentData.monthlySalary' },
          minSalary: { $min: '$employmentData.monthlySalary' },
          maxSalary: { $max: '$employmentData.monthlySalary' },
          traineeCount: { $sum: 1 },
        },
      },
    ]);

    const order = ['3_MONTH', '6_MONTH', '9_MONTH', '12_MONTH'];
    const formattedWages = order.map((m) => {
      const found = milestoneWageAgg.find((item) => item._id === m);
      return {
        milestone: m,
        label: m === '3_MONTH' ? '3 Months' : m === '6_MONTH' ? '6 Months' : m === '9_MONTH' ? '9 Months' : '12 Months',
        averageSalary: found ? Math.round(found.averageSalary) : 0,
        minSalary: found ? Math.round(found.minSalary) : 0,
        maxSalary: found ? Math.round(found.maxSalary) : 0,
        count: found ? found.traineeCount : 0,
      };
    });

    // Compute Retention Rates
    const totalPlaced = await OutcomeRecord.countDocuments({ ...matchFilter, followUpType: '3_MONTH' });
    const retained6M = await OutcomeRecord.countDocuments({ ...matchFilter, followUpType: '6_MONTH' });
    const retained9M = await OutcomeRecord.countDocuments({ ...matchFilter, followUpType: '9_MONTH' });
    const retained12M = await OutcomeRecord.countDocuments({ ...matchFilter, followUpType: '12_MONTH' });

    const retentionCurves = {
      basePlacedCount: totalPlaced,
      retention3M: 100,
      retention6M: totalPlaced > 0 ? Math.round((retained6M / totalPlaced) * 100) : 0,
      retention9M: totalPlaced > 0 ? Math.round((retained9M / totalPlaced) * 100) : 0,
      retention12M: totalPlaced > 0 ? Math.round((retained12M / totalPlaced) * 100) : 0,
    };

    // Calculate percentage wage progression from 3M to 12M
    const wage3M = formattedWages[0]?.averageSalary || 0;
    const wage12M = formattedWages[3]?.averageSalary || 0;
    const wageProgressionPercentage = wage3M > 0 ? Math.round(((wage12M - wage3M) / wage3M) * 100) : 0;

    res.json({
      success: true,
      data: {
        milestoneWages: formattedWages,
        retentionCurves,
        wageProgressionPercentage,
      },
    });
  } catch (error) {
    console.error('wage-retention-intelligence error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes/root-causes
 * Structured non-placement and attrition root causes separating provider-controllable vs market
 */
const getRootCauses = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (provider) filter.providerId = provider._id;
    }

    const [nonPlacementCauses, attritionCauses] = await Promise.all([
      NonPlacementReason.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { category: '$category', isProviderControllable: '$isProviderControllable' },
            count: { $sum: 1 },
            reasons: { $push: '$specificReason' },
          },
        },
      ]),
      AttritionReason.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { stage: '$stage', isProviderControllable: '$isProviderControllable' },
            count: { $sum: 1 },
            reasons: { $push: '$specificReason' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        nonPlacementCauses,
        attritionCauses,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/outcomes/stats
 */
const getOutcomeStats = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (provider) filter.providerId = provider._id;
    }

    const [
      total,
      employed,
      selfEmployed,
      apprentice,
      unemployed,
      verifiedCount,
      discrepancyCount,
    ] = await Promise.all([
      OutcomeRecord.countDocuments(filter),
      OutcomeRecord.countDocuments({ ...filter, situation: 'EMPLOYED' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'SELF_EMPLOYED' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'APPRENTICESHIP' }),
      OutcomeRecord.countDocuments({ ...filter, situation: 'UNEMPLOYED' }),
      OutcomeVerification.countDocuments({ ...filter, status: 'VERIFIED' }),
      OutcomeVerification.countDocuments({ ...filter, status: 'DISCREPANCY_FLAGGED' }),
    ]);

    const verificationRate = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;
    const employmentRate = total > 0 ? Math.round(((employed + selfEmployed + apprentice) / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        total,
        employed,
        selfEmployed,
        apprentice,
        unemployed,
        verifiedCount,
        discrepancyCount,
        verificationRate,
        employmentRate,
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
  getOutcomeVerification,
  verifyOutcome,
  getDiscrepancies,
  getWageRetentionIntelligence,
  getRootCauses,
};
