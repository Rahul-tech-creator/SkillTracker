const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const FollowUp = require('../models/FollowUp');
const OutcomeRecord = require('../models/OutcomeRecord');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const SystemSetting = require('../models/SystemSetting');
const AIAnalysisCache = require('../models/AIAnalysisCache');
const { analyzeProviders } = require('../services/ai/providerAnalyzer');
const crypto = require('crypto');

/**
 * Calculate real metrics for a single provider on a specific course (or all courses).
 */
const calculateProviderMetrics = async (providerId, courseId = null) => {
  const enrollFilter = { providerId };
  if (courseId) enrollFilter.courseId = courseId;

  const enrollments = await Enrollment.find(enrollFilter);
  const enrollmentIds = enrollments.map((e) => e._id);
  const totalEnrolled = enrollments.length;

  if (totalEnrolled === 0) {
    return { totalEnrolled: 0, metrics: {}, confidence: 'INSUFFICIENT' };
  }

  // Completion rate
  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : null;

  // Certification rate
  const certificates = await Certificate.find({ providerId, enrollmentId: { $in: enrollmentIds }, status: 'ISSUED' });
  const certificationRate = completed > 0 ? Math.round((certificates.length / completed) * 100) : null;

  // Assessment performance (average percentage across all submitted attempts)
  const attemptFilter = { providerId };
  if (courseId) attemptFilter.courseId = courseId;
  attemptFilter.status = 'SUBMITTED';
  const attempts = await AssessmentAttempt.find(attemptFilter);
  const assessmentAvg = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
    : null;

  // Skill gap rate
  const gapFilter = { providerId };
  if (courseId) gapFilter.courseId = courseId;
  const gaps = await SkillGapAnalysis.find(gapFilter);
  let skillGapRate = null;
  if (gaps.length > 0) {
    const withGaps = gaps.filter((g) =>
      g.skillResults.some((sr) => sr.classification === 'WEAK' || sr.classification === 'CRITICAL_GAP')
    ).length;
    skillGapRate = Math.round((withGaps / gaps.length) * 100);
  }

  // Employment rate (from outcome records)
  const outcomes = await OutcomeRecord.find({ providerId, enrollmentId: { $in: enrollmentIds } });
  let employmentRate = null;
  let retentionRate = null;
  let relevanceAvg = null;

  if (outcomes.length > 0) {
    // Latest outcome per trainee
    const latestOutcomes = {};
    outcomes.forEach((o) => {
      const key = o.traineeId.toString();
      if (!latestOutcomes[key] || o.observedAt > latestOutcomes[key].observedAt) {
        latestOutcomes[key] = o;
      }
    });

    const latestArr = Object.values(latestOutcomes);
    const employed = latestArr.filter((o) =>
      ['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICE'].includes(o.situation)
    ).length;
    employmentRate = Math.round((employed / latestArr.length) * 100);

    // Retention: trainees with multiple follow-ups still employed
    const traineeOutcomes = {};
    outcomes.forEach((o) => {
      const key = o.traineeId.toString();
      if (!traineeOutcomes[key]) traineeOutcomes[key] = [];
      traineeOutcomes[key].push(o);
    });
    let retained = 0;
    let multiFollowUp = 0;
    Object.values(traineeOutcomes).forEach((outs) => {
      if (outs.length >= 2) {
        multiFollowUp++;
        const sorted = outs.sort((a, b) => b.observedAt - a.observedAt);
        if (['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICE'].includes(sorted[0].situation)) {
          retained++;
        }
      }
    });
    retentionRate = multiFollowUp > 0 ? Math.round((retained / multiFollowUp) * 100) : null;

    // Training relevance average
    const relevanceScores = latestArr
      .map((o) => o.relevanceRating)
      .filter((r) => r != null && r > 0);
    relevanceAvg = relevanceScores.length > 0
      ? Math.round((relevanceScores.reduce((sum, r) => sum + r, 0) / relevanceScores.length) * 10) / 10
      : null;
  }

  // Follow-up completion rate
  const followUps = await FollowUp.find({ providerId });
  let followUpRate = null;
  if (followUps.length > 0) {
    const completedFU = followUps.filter((f) => f.status === 'COMPLETED').length;
    followUpRate = Math.round((completedFU / followUps.length) * 100);
  }

  // Data confidence
  let confidence = 'INSUFFICIENT';
  if (totalEnrolled >= 100) confidence = 'HIGH';
  else if (totalEnrolled >= 30) confidence = 'MEDIUM';
  else if (totalEnrolled >= 10) confidence = 'LOW';

  return {
    totalEnrolled,
    metrics: {
      completion: completionRate,
      certification: certificationRate,
      assessment: assessmentAvg,
      employment: employmentRate,
      retention: retentionRate,
      relevance: relevanceAvg,
      followUp: followUpRate,
      skillGapRate,
    },
    confidence,
  };
};

/**
 * Calculate transparent provider score using weighted formula.
 */
const calculateProviderScore = (metrics, weights) => {
  let score = 0;
  let totalWeight = 0;

  const addMetric = (value, weight, maxValue = 100) => {
    if (value != null && weight > 0) {
      // Normalize relevance from 5-point to 100-point scale
      const normalized = maxValue === 5 ? (value / 5) * 100 : value;
      score += (normalized / 100) * weight;
      totalWeight += weight;
    }
  };

  addMetric(metrics.completion, weights.completion);
  addMetric(metrics.certification, weights.certification);
  addMetric(metrics.assessment, weights.assessment);
  addMetric(metrics.employment, weights.employment);
  addMetric(metrics.retention, weights.retention);
  addMetric(metrics.relevance, weights.relevance, 5);
  addMetric(metrics.followUp, weights.followUp);

  // Normalize to available weights
  if (totalWeight > 0) {
    return Math.round((score / totalWeight) * 100 * 10) / 10;
  }
  return null;
};

/**
 * GET /api/provider-comparison/compare
 * Query: courseId (required)
 */
const compareProviders = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId query required.' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    // Find all providers offering this course
    const courses = await Course.find({ courseName: course.courseName, status: 'ACTIVE' });
    const providerIds = [...new Set(courses.map((c) => c.providerId.toString()))];

    const settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    const weights = settings?.providerScoreWeights || {
      completion: 20, certification: 15, assessment: 20, employment: 20,
      retention: 10, relevance: 10, followUp: 5,
    };
    const minSample = settings?.minimumSampleSize || 30;

    const providerResults = [];
    for (const pid of providerIds) {
      const provider = await Provider.findById(pid);
      if (!provider) continue;

      const metricsData = await calculateProviderMetrics(pid, courseId);
      const overallScore = calculateProviderScore(metricsData.metrics, weights);

      providerResults.push({
        providerId: pid,
        name: provider.organizationName,
        district: provider.district || '',
        sampleSize: metricsData.totalEnrolled,
        sufficientSample: metricsData.totalEnrolled >= minSample,
        confidence: metricsData.confidence,
        metrics: { ...metricsData.metrics, overallScore },
        scoreBreakdown: {
          weights,
          note: 'Score is calculated as weighted average of available metrics, normalized to 100.',
        },
      });
    }

    // Sort by overall score (sufficient sample first)
    providerResults.sort((a, b) => {
      if (a.sufficientSample && !b.sufficientSample) return -1;
      if (!a.sufficientSample && b.sufficientSample) return 1;
      return (b.metrics.overallScore || 0) - (a.metrics.overallScore || 0);
    });

    // Add rank
    providerResults.forEach((p, i) => { p.rank = i + 1; });

    res.json({
      success: true,
      data: {
        course: { _id: course._id, courseName: course.courseName, category: course.category },
        minimumSampleSize: minSample,
        providers: providerResults,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/provider-comparison/ai-analysis
 * Admin triggers AI analysis of provider comparison.
 */
const getAIProviderAnalysis = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId required.' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    // Re-use compareProviders logic
    const courses = await Course.find({ courseName: course.courseName, status: 'ACTIVE' });
    const providerIds = [...new Set(courses.map((c) => c.providerId.toString()))];

    const settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    const weights = settings?.providerScoreWeights || {
      completion: 20, certification: 15, assessment: 20, employment: 20,
      retention: 10, relevance: 10, followUp: 5,
    };

    const providerData = [];
    for (const pid of providerIds) {
      const provider = await Provider.findById(pid);
      if (!provider) continue;
      const metricsData = await calculateProviderMetrics(pid, courseId);
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
      return res.json({ success: true, data: { aiAvailable: false, message: 'No providers found for this course.' } });
    }

    // Check cache
    const inputStr = JSON.stringify(providerData);
    const inputHash = crypto.createHash('md5').update(inputStr).digest('hex');
    const cached = await AIAnalysisCache.findOne({
      analysisType: 'PROVIDER_COMPARISON', entityId: courseId, inputHash,
    });

    if (cached) {
      return res.json({ success: true, data: { aiAvailable: true, analysis: cached.result } });
    }

    const aiResult = await analyzeProviders({ courseName: course.courseName, providers: providerData });

    if (!aiResult || aiResult._parseError) {
      return res.json({ success: true, data: { aiAvailable: false, message: 'AI analysis temporarily unavailable.' } });
    }

    await AIAnalysisCache.findOneAndUpdate(
      { analysisType: 'PROVIDER_COMPARISON', entityId: courseId, inputHash },
      { model: process.env.XAI_MODEL || 'grok-3-mini', result: aiResult },
      { upsert: true }
    );

    res.json({ success: true, data: { aiAvailable: true, analysis: aiResult } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { compareProviders, getAIProviderAnalysis, calculateProviderMetrics, calculateProviderScore };
