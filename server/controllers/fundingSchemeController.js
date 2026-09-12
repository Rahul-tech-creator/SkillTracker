const FundingScheme = require('../models/FundingScheme');
const Course = require('../models/Course');
const Provider = require('../models/Provider');
const Enrollment = require('../models/Enrollment');
const { calculateProviderMetrics, calculateProviderScore } = require('./providerComparisonController');
const SystemSetting = require('../models/SystemSetting');
const AIAnalysisCache = require('../models/AIAnalysisCache');
const { analyzeFunding } = require('../services/ai/fundingAnalyzer');
const crypto = require('crypto');

/**
 * POST /api/funding-schemes
 */
const createScheme = async (req, res) => {
  try {
    const { schemeName, description, courseId, budget, district, startDate, endDate, targetTrainees } = req.body;
    if (!schemeName || !courseId || !budget || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'schemeName, courseId, budget, startDate, endDate required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const scheme = await FundingScheme.create({
      schemeName, description: description || '', courseId, budget,
      district: district || '', startDate, endDate, targetTrainees: targetTrainees || 0,
      status: 'DRAFT', createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: scheme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/funding-schemes/:id
 */
const updateScheme = async (req, res) => {
  try {
    const scheme = await FundingScheme.findById(req.params.id);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });

    const fields = ['schemeName', 'description', 'budget', 'district', 'startDate', 'endDate', 'targetTrainees', 'status'];
    fields.forEach((f) => { if (req.body[f] !== undefined) scheme[f] = req.body[f]; });

    await scheme.save();
    res.json({ success: true, data: scheme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/funding-schemes
 */
const getSchemes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.courseId) filter.courseId = req.query.courseId;

    const schemes = await FundingScheme.find(filter)
      .populate('courseId', 'courseName category')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: schemes.length, data: schemes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/funding-schemes/:id
 */
const getScheme = async (req, res) => {
  try {
    const scheme = await FundingScheme.findById(req.params.id)
      .populate('courseId', 'courseName category')
      .populate('createdBy', 'name')
      .populate('providerAssignments.providerId', 'organizationName district');

    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });

    // Calculate scheme performance metrics
    const obj = scheme.toObject();
    if (scheme.providerAssignments.length > 0) {
      const assignedProviderIds = scheme.providerAssignments.map((a) => a.providerId._id || a.providerId);
      const enrollments = await Enrollment.find({
        providerId: { $in: assignedProviderIds },
        courseId: scheme.courseId,
      });
      obj.performance = {
        totalAllocated: scheme.providerAssignments.reduce((s, a) => s + (a.allocatedBudget || 0), 0),
        remaining: scheme.budget - scheme.providerAssignments.reduce((s, a) => s + (a.allocatedBudget || 0), 0),
        actualEnrolled: enrollments.length,
        actualCompleted: enrollments.filter((e) => e.status === 'COMPLETED').length,
        targetTrainees: scheme.targetTrainees,
      };
    }

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/funding-schemes/:id/eligible-providers
 */
const getEligibleProviders = async (req, res) => {
  try {
    const scheme = await FundingScheme.findById(req.params.id);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });

    const course = await Course.findById(scheme.courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    // Find providers offering this course
    const coursesAll = await Course.find({ courseName: course.courseName, status: 'ACTIVE' });
    const providerIds = [...new Set(coursesAll.map((c) => c.providerId.toString()))];

    const settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    const weights = settings?.providerScoreWeights || {
      completion: 20, certification: 15, assessment: 20, employment: 20,
      retention: 10, relevance: 10, followUp: 5,
    };

    const eligible = [];
    for (const pid of providerIds) {
      const provider = await Provider.findById(pid);
      if (!provider || provider.status !== 'ACTIVE') continue;
      if (scheme.district && provider.district && provider.district !== scheme.district) continue;

      const metricsData = await calculateProviderMetrics(pid, scheme.courseId);
      const overallScore = calculateProviderScore(metricsData.metrics, weights);

      eligible.push({
        providerId: pid,
        name: provider.organizationName,
        district: provider.district || '',
        sampleSize: metricsData.totalEnrolled,
        confidence: metricsData.confidence,
        metrics: { ...metricsData.metrics, overallScore },
        alreadyAssigned: scheme.providerAssignments.some((a) =>
          (a.providerId._id || a.providerId).toString() === pid
        ),
      });
    }

    eligible.sort((a, b) => (b.metrics.overallScore || 0) - (a.metrics.overallScore || 0));
    res.json({ success: true, data: eligible });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/funding-schemes/:id/ai-analysis
 */
const getAIFundingAnalysis = async (req, res) => {
  try {
    const scheme = await FundingScheme.findById(req.params.id);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });

    const course = await Course.findById(scheme.courseId);
    const coursesAll = await Course.find({ courseName: course.courseName, status: 'ACTIVE' });
    const providerIds = [...new Set(coursesAll.map((c) => c.providerId.toString()))];

    const settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    const weights = settings?.providerScoreWeights || {
      completion: 20, certification: 15, assessment: 20, employment: 20,
      retention: 10, relevance: 10, followUp: 5,
    };

    const providerData = [];
    for (const pid of providerIds) {
      const provider = await Provider.findById(pid);
      if (!provider) continue;
      const metricsData = await calculateProviderMetrics(pid, scheme.courseId);
      const overallScore = calculateProviderScore(metricsData.metrics, weights);
      providerData.push({
        name: provider.organizationName,
        district: provider.district || '',
        sampleSize: metricsData.totalEnrolled,
        confidence: metricsData.confidence,
        metrics: { ...metricsData.metrics, overallScore },
      });
    }

    if (providerData.length === 0) {
      return res.json({ success: true, data: { aiAvailable: false, message: 'No provider data.' } });
    }

    const inputHash = crypto.createHash('md5').update(JSON.stringify({ scheme: scheme._id, providerData })).digest('hex');
    const cached = await AIAnalysisCache.findOne({
      analysisType: 'FUNDING_RECOMMENDATION', entityId: scheme._id.toString(), inputHash,
    });
    if (cached) return res.json({ success: true, data: { aiAvailable: true, analysis: cached.result } });

    const aiResult = await analyzeFunding({
      schemeName: scheme.schemeName,
      courseName: course.courseName,
      budget: scheme.budget,
      district: scheme.district,
      providers: providerData,
    });

    if (!aiResult || aiResult._parseError) {
      return res.json({ success: true, data: { aiAvailable: false, message: 'AI analysis temporarily unavailable.' } });
    }

    await AIAnalysisCache.findOneAndUpdate(
      { analysisType: 'FUNDING_RECOMMENDATION', entityId: scheme._id.toString(), inputHash },
      { model: process.env.XAI_MODEL || 'grok-3-mini', result: aiResult },
      { upsert: true }
    );

    res.json({ success: true, data: { aiAvailable: true, analysis: aiResult } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/funding-schemes/:id/assign
 */
const assignProviders = async (req, res) => {
  try {
    const { assignments } = req.body;
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ success: false, message: 'assignments array required.' });
    }

    const scheme = await FundingScheme.findById(req.params.id);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });

    scheme.providerAssignments = assignments.map((a) => ({
      providerId: a.providerId,
      allocatedBudget: a.allocatedBudget || 0,
      aiRecommended: a.aiRecommended || false,
      adminDecision: a.adminDecision || '',
      adminReason: a.adminReason || '',
      assignedAt: new Date(),
    }));

    await scheme.save(); // Validation ensures total ≤ budget
    res.json({ success: true, data: scheme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createScheme, updateScheme, getSchemes, getScheme,
  getEligibleProviders, getAIFundingAnalysis, assignProviders,
};
