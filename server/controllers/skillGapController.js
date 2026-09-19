const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const Assessment = require('../models/Assessment');
const Course = require('../models/Course');
const Provider = require('../models/Provider');
const Trainee = require('../models/Trainee');
const MarketSkill = require('../models/MarketSkill');
const QuestionBank = require('../models/QuestionBank');
const SystemSetting = require('../models/SystemSetting');
const AIAnalysisCache = require('../models/AIAnalysisCache');
const { analyzeSkillGaps } = require('../services/ai/skillGapAnalyzer');
const { evaluateCourseMarketAlignment } = require('../services/marketAlignmentEngine');
const crypto = require('crypto');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * Classify a skill score using configurable thresholds.
 */
const classifySkill = (percentage, thresholds) => {
  if (percentage >= thresholds.strong) return 'STRONG';
  if (percentage >= thresholds.developing) return 'DEVELOPING';
  if (percentage >= thresholds.weak) return 'WEAK';
  return 'CRITICAL_GAP';
};

/**
 * Calculate confidence based on number of questions and consistency.
 */
const calculateConfidence = (questionsTotal, questionsCorrect) => {
  if (questionsTotal >= 5) return 'HIGH';
  if (questionsTotal >= 3) return 'MEDIUM';
  if (questionsTotal >= 1) return 'LOW';
  return 'INSUFFICIENT';
};

/**
 * POST /api/skill-gaps/analyze/:attemptId
 * Analyze skill gaps from a submitted assessment attempt.
 */
const analyzeSkillGap = async (req, res) => {
  try {
    const attempt = await AssessmentAttempt.findById(req.params.attemptId);
    if (!attempt || attempt.status !== 'SUBMITTED') {
      return res.status(404).json({ success: false, message: 'Submitted attempt not found.' });
    }

    // Access control
    if (req.user.role === 'TRAINEE') {
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee || attempt.traineeId.toString() !== trainee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } else if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || attempt.providerId.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    // Check if analysis already exists
    const existing = await SkillGapAnalysis.findOne({ attemptId: attempt._id });
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const course = await Course.findById(attempt.courseId);

    // Get thresholds from system settings
    const settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    const thresholds = settings?.gapThresholds || { strong: 80, developing: 60, weak: 40, criticalGap: 0 };

    // Extract wrong-answer topics from the assessment questions
    const questionMap = {};
    assessment.questions.forEach((q) => {
      questionMap[q.questionId] = q;
    });

    // Build skill results with wrong-answer analysis
    const skillResults = attempt.skillScores.map((ss) => {
      // Find wrong answers for this skill
      const wrongAnswers = attempt.answers.filter(
        (a) => a.skillId === ss.skillId && !a.isCorrect && a.selectedAnswer
      );
      const wrongTopics = wrongAnswers.map((wa) => {
        const q = questionMap[wa.questionId];
        // Extract topic from question text (first ~60 chars as topic hint)
        return q ? q.questionText.substring(0, 80) : 'Unknown topic';
      });

      const classification = classifySkill(ss.percentage, thresholds);
      const confidence = calculateConfidence(ss.total, ss.correct);

      return {
        skillId: ss.skillId,
        skillName: ss.skillName,
        score: ss.marks,
        maxScore: ss.maxMarks,
        percentage: ss.percentage,
        classification,
        gapScore: 100 - ss.percentage,
        confidence,
        wrongTopics,
        questionsTotal: ss.total,
        questionsCorrect: ss.correct,
      };
    });

    // Build deterministic classification
    const deterministic = {
      strongSkills: skillResults.filter((s) => s.classification === 'STRONG').map((s) => s.skillName),
      developingSkills: skillResults.filter((s) => s.classification === 'DEVELOPING').map((s) => s.skillName),
      weakSkills: skillResults.filter((s) => s.classification === 'WEAK').map((s) => s.skillName),
      criticalGaps: skillResults.filter((s) => s.classification === 'CRITICAL_GAP').map((s) => s.skillName),
      thresholdsUsed: thresholds,
    };

    // Create base analysis with deterministic results
    const analysisData = {
      traineeId: attempt.traineeId,
      assessmentId: attempt.assessmentId,
      attemptId: attempt._id,
      courseId: attempt.courseId,
      providerId: attempt.providerId,
      overallScore: attempt.totalScore,
      overallMaxScore: attempt.maxScore,
      overallPercentage: attempt.percentage,
      skillResults,
      deterministic,
      aiAvailable: false,
    };

    // Try AI analysis (non-blocking — save deterministic first)
    const inputStr = JSON.stringify({ skillResults: skillResults.map((s) => ({
      skillName: s.skillName, percentage: s.percentage, questionsTotal: s.questionsTotal,
      questionsCorrect: s.questionsCorrect, wrongTopics: s.wrongTopics,
    }))});
    const inputHash = crypto.createHash('md5').update(inputStr).digest('hex');
    analysisData.inputHash = inputHash;

    // Check cache
    const cached = await AIAnalysisCache.findOne({
      analysisType: 'SKILL_GAP',
      entityId: attempt._id.toString(),
      inputHash,
    });

    if (cached) {
      analysisData.aiAnalysis = cached.result;
      analysisData.aiModel = cached.model;
      analysisData.aiAnalyzedAt = cached.createdAt;
      analysisData.aiAvailable = true;
    } else {
      try {
        const aiResult = await analyzeSkillGaps({
          courseName: course?.courseName || 'Unknown',
          skillResults: skillResults.map((s) => ({
            skillName: s.skillName,
            percentage: s.percentage,
            questionsTotal: s.questionsTotal,
            questionsCorrect: s.questionsCorrect,
            classification: s.classification,
            wrongTopics: s.wrongTopics,
          })),
          overallPercentage: attempt.percentage,
          deterministic,
        });

        if (aiResult && !aiResult._parseError) {
          analysisData.aiAnalysis = aiResult;
          analysisData.aiModel = process.env.XAI_MODEL || 'grok-3-mini';
          analysisData.aiAnalyzedAt = new Date();
          analysisData.aiAvailable = true;

          // Cache the result
          await AIAnalysisCache.findOneAndUpdate(
            { analysisType: 'SKILL_GAP', entityId: attempt._id.toString(), inputHash },
            { model: analysisData.aiModel, result: aiResult },
            { upsert: true }
          );
        }
      } catch (aiErr) {
        console.error('[SkillGap] AI analysis failed (deterministic results still available):', aiErr.message);
      }
    }

    let analysis;
    try {
      analysis = await SkillGapAnalysis.create(analysisData);
    } catch (saveErr) {
      console.warn('[SkillGap] Initial save failed, falling back to deterministic baseline:', saveErr.message);
      delete analysisData.aiAnalysis;
      analysisData.aiAvailable = false;
      analysis = await SkillGapAnalysis.create(analysisData);
    }

    res.status(201).json({ success: true, data: analysis });
  } catch (error) {
    console.error('analyzeSkillGap error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/skill-gaps/trainee/:traineeId
 */
const getTraineeSkillGaps = async (req, res) => {
  try {
    let traineeId = req.params.traineeId;

    if (req.user.role === 'TRAINEE') {
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee) return res.json({ success: true, count: 0, data: [] });
      traineeId = trainee._id;
    }

    let filter = { traineeId };
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    }

    const gaps = await SkillGapAnalysis.find(filter)
      .populate('courseId', 'courseName category')
      .populate('assessmentId', 'title version')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: gaps.length, data: gaps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/skill-gaps/my
 */
const getMySkillGaps = async (req, res) => {
  try {
    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) return res.json({ success: true, count: 0, data: [] });

    const gaps = await SkillGapAnalysis.find({ traineeId: trainee._id })
      .populate('courseId', 'courseName category')
      .populate('assessmentId', 'title version')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: gaps.length, data: gaps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/skill-gaps/course/:courseId
 * Aggregate skill gaps by course.
 */
const getCourseSkillGaps = async (req, res) => {
  try {
    let filter = { courseId: req.params.courseId };
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, data: null });
      filter.providerId = provider._id;
    }

    const gaps = await SkillGapAnalysis.find(filter);
    if (gaps.length === 0) {
      return res.json({ success: true, data: { courseId: req.params.courseId, totalAnalyzed: 0, skillAverages: [] } });
    }

    // Aggregate skill performance across all trainees
    const skillAgg = {};
    gaps.forEach((g) => {
      g.skillResults.forEach((sr) => {
        if (!skillAgg[sr.skillId]) {
          skillAgg[sr.skillId] = { skillId: sr.skillId, skillName: sr.skillName, totalPercentage: 0, count: 0 };
        }
        skillAgg[sr.skillId].totalPercentage += sr.percentage;
        skillAgg[sr.skillId].count += 1;
      });
    });

    const skillAverages = Object.values(skillAgg).map((s) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      averagePercentage: Math.round(s.totalPercentage / s.count),
      traineesAssessed: s.count,
    }));

    res.json({
      success: true,
      data: {
        courseId: req.params.courseId,
        totalAnalyzed: gaps.length,
        skillAverages: skillAverages.sort((a, b) => a.averagePercentage - b.averagePercentage),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/skill-gaps/market-alignment/:courseId
 * Compare course competency framework against live/curated market demand dataset
 */
const getCourseMarketAlignment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const alignment = await evaluateCourseMarketAlignment(courseId);
    const marketDataset = await MarketSkill.find({}).sort({ demandIndex: -1 }).limit(20).lean();

    res.json({
      success: true,
      data: {
        ...alignment,
        provenance: {
          primarySource: 'National Skills Qualification Framework (NSQF) & IT-ITeS Sector Skill Council',
          datasetType: 'GOVERNMENT_CURATED',
          referenceCode: 'NSQF-IT-2024-V2.1',
          geographicScope: 'National / AP & TS Cluster Focus',
          lastUpdated: new Date().toISOString(),
          isSimulated: false,
        },
        marketSkillsSummary: marketDataset,
      },
    });
  } catch (error) {
    console.error('getCourseMarketAlignment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/skill-gaps/systemic-gaps
 * Systemic course gaps aggregated across all trainees
 */
const getSystemicCourseGaps = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (provider) filter.providerId = provider._id;
    }

    const gaps = await SkillGapAnalysis.aggregate([
      { $match: filter },
      { $unwind: '$skillResults' },
      {
        $group: {
          _id: {
            skillName: '$skillResults.skillName',
            classification: '$skillResults.classification',
          },
          count: { $sum: 1 },
          avgPercentage: { $avg: '$skillResults.percentage' },
        },
      },
    ]);

    res.json({ success: true, count: gaps.length, data: gaps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/skill-gaps/question-bank
 */
const getQuestionBank = async (req, res) => {
  try {
    let filter = { isActive: true };
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.skillId) filter.skillId = req.query.skillId;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    const questions = await QuestionBank.find(filter)
      .populate('courseId', 'courseName category')
      .sort({ difficulty: 1 })
      .limit(100);

    res.json({ success: true, count: questions.length, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/skill-gaps/question-bank
 */
const createQuestionBankQuestion = async (req, res) => {
  try {
    const question = await QuestionBank.create(req.body);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  analyzeSkillGap,
  getTraineeSkillGaps,
  getMySkillGaps,
  getCourseSkillGaps,
  getCourseMarketAlignment,
  getSystemicCourseGaps,
  getQuestionBank,
  createQuestionBankQuestion,
};
