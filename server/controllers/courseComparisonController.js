const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const OutcomeRecord = require('../models/OutcomeRecord');
const AIAnalysisCache = require('../models/AIAnalysisCache');
const { analyzeCourses } = require('../services/ai/courseAnalyzer');
const crypto = require('crypto');

/**
 * GET /api/course-comparison/compare
 */
const compareCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: 'ACTIVE' })
      .populate('providerId', 'organizationName');

    // Group by course name to aggregate across providers
    const courseGroups = {};
    courses.forEach((c) => {
      const key = c.courseName;
      if (!courseGroups[key]) {
        courseGroups[key] = { courseName: c.courseName, category: c.category, courseIds: [] };
      }
      courseGroups[key].courseIds.push(c._id);
    });

    const results = [];
    for (const [name, group] of Object.entries(courseGroups)) {
      const courseIds = group.courseIds;
      const enrollments = await Enrollment.find({ courseId: { $in: courseIds } });
      const enrolled = enrollments.length;
      if (enrolled === 0) {
        results.push({ courseName: name, category: group.category, enrolled: 0, metrics: {} });
        continue;
      }

      const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
      const enrollmentIds = enrollments.map((e) => e._id);

      const certs = await Certificate.countDocuments({ enrollmentId: { $in: enrollmentIds }, status: 'ISSUED' });
      const attempts = await AssessmentAttempt.find({ courseId: { $in: courseIds }, status: 'SUBMITTED' });
      const assessmentAvg = attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
        : null;

      const outcomes = await OutcomeRecord.find({ enrollmentId: { $in: enrollmentIds } });
      let employmentRate = null;
      let retentionRate = null;
      let relevanceAvg = null;

      if (outcomes.length > 0) {
        const latestOutcomes = {};
        outcomes.forEach((o) => {
          const k = o.traineeId.toString();
          if (!latestOutcomes[k] || o.observedAt > latestOutcomes[k].observedAt) latestOutcomes[k] = o;
        });
        const latest = Object.values(latestOutcomes);
        const employed = latest.filter((o) => ['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICE'].includes(o.situation)).length;
        employmentRate = Math.round((employed / latest.length) * 100);

        const relevanceScores = latest.map((o) => o.relevanceRating).filter((r) => r != null && r > 0);
        relevanceAvg = relevanceScores.length > 0
          ? Math.round((relevanceScores.reduce((s, r) => s + r, 0) / relevanceScores.length) * 10) / 10
          : null;
      }

      const gaps = await SkillGapAnalysis.find({ courseId: { $in: courseIds } });
      let skillGapRate = null;
      if (gaps.length > 0) {
        const withGaps = gaps.filter((g) =>
          g.skillResults.some((sr) => sr.classification === 'WEAK' || sr.classification === 'CRITICAL_GAP')
        ).length;
        skillGapRate = Math.round((withGaps / gaps.length) * 100);
      }

      results.push({
        courseName: name,
        category: group.category,
        enrolled,
        metrics: {
          completion: enrolled > 0 ? Math.round((completed / enrolled) * 100) : null,
          certification: completed > 0 ? Math.round((certs / completed) * 100) : null,
          assessment: assessmentAvg,
          employment: employmentRate,
          retention: retentionRate,
          relevance: relevanceAvg,
          skillGapRate,
        },
      });
    }

    results.sort((a, b) => b.enrolled - a.enrolled);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/course-comparison/ai-analysis
 */
const getAICourseAnalysis = async (req, res) => {
  try {
    // Reuse comparison logic
    const courses = await Course.find({ status: 'ACTIVE' });
    const courseGroups = {};
    courses.forEach((c) => {
      const key = c.courseName;
      if (!courseGroups[key]) courseGroups[key] = { courseName: c.courseName, category: c.category, courseIds: [] };
      courseGroups[key].courseIds.push(c._id);
    });

    const courseData = [];
    for (const [name, group] of Object.entries(courseGroups)) {
      const enrollments = await Enrollment.find({ courseId: { $in: group.courseIds } });
      const enrolled = enrollments.length;
      const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
      const enrollmentIds = enrollments.map((e) => e._id);
      const certs = await Certificate.countDocuments({ enrollmentId: { $in: enrollmentIds }, status: 'ISSUED' });
      const attempts = await AssessmentAttempt.find({ courseId: { $in: group.courseIds }, status: 'SUBMITTED' });
      const assessmentAvg = attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : null;

      courseData.push({
        courseName: name,
        category: group.category,
        enrolled,
        metrics: {
          completion: enrolled > 0 ? Math.round((completed / enrolled) * 100) : null,
          certification: completed > 0 ? Math.round((certs / completed) * 100) : null,
          assessment: assessmentAvg,
          employment: null,
          retention: null,
          relevance: null,
          skillGapRate: null,
        },
      });
    }

    if (courseData.length === 0) {
      return res.json({ success: true, data: { aiAvailable: false, message: 'No course data available.' } });
    }

    const inputHash = crypto.createHash('md5').update(JSON.stringify(courseData)).digest('hex');
    const cached = await AIAnalysisCache.findOne({ analysisType: 'COURSE_COMPARISON', entityId: 'all', inputHash });
    if (cached) return res.json({ success: true, data: { aiAvailable: true, analysis: cached.result } });

    const aiResult = await analyzeCourses({ courses: courseData });
    if (!aiResult || aiResult._parseError) {
      return res.json({ success: true, data: { aiAvailable: false, message: 'AI analysis temporarily unavailable.' } });
    }

    await AIAnalysisCache.findOneAndUpdate(
      { analysisType: 'COURSE_COMPARISON', entityId: 'all', inputHash },
      { model: process.env.XAI_MODEL || 'grok-3-mini', result: aiResult },
      { upsert: true }
    );

    res.json({ success: true, data: { aiAvailable: true, analysis: aiResult } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { compareCourses, getAICourseAnalysis };
