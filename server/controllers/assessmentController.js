const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const Course = require('../models/Course');
const Provider = require('../models/Provider');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');
const { generateQuestions } = require('../services/ai/questionGenerator');
const crypto = require('crypto');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * POST /api/assessments/generate
 * Provider triggers AI question generation for a course.
 */
const generateAssessment = async (req, res) => {
  try {
    const { courseId, difficulty, questionsPerSkill, timeLimitMinutes, maxAttempts } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    const provider = await getProviderRecord(req.user._id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    if (course.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (!course.skills || course.skills.length === 0) {
      return res.status(400).json({ success: false, message: 'Course must have at least one skill defined.' });
    }

    const qps = questionsPerSkill || 5;
    if (qps < 3) {
      return res.status(400).json({ success: false, message: 'Minimum 3 questions per skill required.' });
    }

    // Normalize course skills (handles both string[] and object[])
    const normalizedSkills = (course.skills || []).map((s, idx) => {
      if (typeof s === 'string') {
        const name = s.trim();
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `skill_${idx + 1}`;
        return { skillId: id, skillName: name, weight: 0 };
      }
      if (typeof s === 'object' && s !== null) {
        const name = (s.skillName || s.name || s.title || s.skillId || '').toString().trim();
        const id = (s.skillId || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `skill_${idx + 1}`).toString().trim();
        return { skillId: id, skillName: name, weight: Number(s.weight) || 0 };
      }
      return null;
    }).filter(Boolean);

    if (normalizedSkills.length === 0) {
      return res.status(400).json({ success: false, message: 'Course has no valid skills defined.' });
    }

    // Generate questions via Groq / Grok
    const questions = await generateQuestions({
      courseName: course.courseName,
      skills: normalizedSkills,
      difficulty: difficulty || 'MIXED',
      questionsPerSkill: qps,
    });

    if (!questions || questions.length === 0) {
      return res.status(503).json({
        success: false,
        message: 'AI question generation failed or is unavailable. Please try again or check API key configuration.',
      });
    }

    // Add questionId to each question
    questions.forEach((q) => {
      q.questionId = crypto.randomUUID();
    });

    // Determine next version number
    const lastAssessment = await Assessment.findOne({ courseId })
      .sort({ version: -1 })
      .select('version');
    const nextVersion = (lastAssessment?.version || 0) + 1;

    const assessment = await Assessment.create({
      courseId,
      providerId: provider._id,
      title: `${course.courseName} — Skill Assessment v${nextVersion}`,
      version: nextVersion,
      skills: normalizedSkills,
      difficulty: difficulty || 'MIXED',
      questionsPerSkill: qps,
      totalQuestions: questions.length,
      timeLimitMinutes: timeLimitMinutes || null,
      maxAttempts: maxAttempts || 2,
      questions,
      status: 'DRAFT',
      createdBy: req.user._id,
    });

    // Return without correct answers
    const safe = assessment.toObject();
    safe.questions = safe.questions.map((q) => {
      const { correctAnswer, explanation, ...rest } = q;
      return rest;
    });

    res.status(201).json({ success: true, data: safe });
  } catch (error) {
    console.error('generateAssessment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/assessments
 */
const getAssessments = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    } else if (req.user.role === 'TRAINEE') {
      // Trainee sees published assessments for their enrolled courses
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee) return res.json({ success: true, count: 0, data: [] });
      const enrollments = await Enrollment.find({ traineeId: trainee._id, status: { $in: ['ENROLLED', 'COMPLETED'] } });
      const courseIds = [...new Set(enrollments.map((e) => e.courseId.toString()))];
      filter.courseId = { $in: courseIds };
      filter.status = 'PUBLISHED';
    }

    const assessments = await Assessment.find(filter)
      .select('-questions.correctAnswer -questions.explanation')
      .populate('courseId', 'courseName category')
      .populate('providerId', 'organizationName')
      .sort({ createdAt: -1 });

    // For trainees, add attempt info
    if (req.user.role === 'TRAINEE') {
      const trainee = await Trainee.findOne({ userId: req.user._id });
      const attempts = await AssessmentAttempt.find({ traineeId: trainee._id });
      const attemptMap = {};
      attempts.forEach((a) => {
        const key = a.assessmentId.toString();
        if (!attemptMap[key]) attemptMap[key] = [];
        attemptMap[key].push(a);
      });

      const enriched = assessments.map((a) => {
        const obj = a.toObject();
        obj.myAttempts = attemptMap[a._id.toString()] || [];
        obj.attemptsUsed = obj.myAttempts.filter((at) => at.status === 'SUBMITTED').length;
        obj.canAttempt = obj.attemptsUsed < a.maxAttempts;
        return obj;
      });
      return res.json({ success: true, count: enriched.length, data: enriched });
    }

    res.json({ success: true, count: assessments.length, data: assessments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/assessments/:id
 */
const getAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate('courseId', 'courseName category skills')
      .populate('providerId', 'organizationName');

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const obj = assessment.toObject();

    // Trainee: strip correct answers
    if (req.user.role === 'TRAINEE') {
      if (assessment.status !== 'PUBLISHED') {
        return res.status(403).json({ success: false, message: 'Assessment not available.' });
      }
      obj.questions = obj.questions.map((q) => {
        const { correctAnswer, explanation, ...rest } = q;
        return rest;
      });
    }

    // Provider: only own assessments (but can see correct answers)
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || assessment.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/assessments/:id/publish
 */
const publishAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const provider = await getProviderRecord(req.user._id);
    if (!provider || assessment.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (assessment.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT assessments can be published.' });
    }

    assessment.status = 'PUBLISHED';
    await assessment.save();
    res.json({ success: true, message: 'Assessment published.', data: assessment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/assessments/:id/start
 * Trainee starts an assessment attempt.
 */
const startAttempt = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment || assessment.status !== 'PUBLISHED') {
      return res.status(404).json({ success: false, message: 'Assessment not available.' });
    }

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee profile not found.' });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      traineeId: trainee._id,
      courseId: assessment.courseId,
      status: { $in: ['ENROLLED', 'COMPLETED'] },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // Check existing attempts
    const existingAttempts = await AssessmentAttempt.find({
      assessmentId: assessment._id,
      traineeId: trainee._id,
      status: 'SUBMITTED',
    });
    const maxAllowed = Math.max(assessment.maxAttempts || 3, 10);
    if (existingAttempts.length >= maxAllowed) {
      return res.status(400).json({ success: false, message: `Maximum ${maxAllowed} attempts reached.` });
    }

    // Check for in-progress attempt
    const inProgress = await AssessmentAttempt.findOne({
      assessmentId: assessment._id,
      traineeId: trainee._id,
      status: 'IN_PROGRESS',
    });
    if (inProgress) {
      // Return existing in-progress attempt
      const questions = assessment.questions.map((q) => ({
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        skillId: q.skillId,
        skillName: q.skillName,
        difficulty: q.difficulty,
        marks: q.marks,
      }));
      return res.json({ success: true, data: { attempt: inProgress, questions } });
    }

    const attemptNumber = existingAttempts.length + 1;
    const attempt = await AssessmentAttempt.create({
      assessmentId: assessment._id,
      traineeId: trainee._id,
      enrollmentId: enrollment._id,
      courseId: assessment.courseId,
      providerId: assessment.providerId,
      attemptNumber,
      startedAt: new Date(),
      status: 'IN_PROGRESS',
    });

    // Return questions without correct answers
    const questions = assessment.questions.map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      skillId: q.skillId,
      skillName: q.skillName,
      difficulty: q.difficulty,
      marks: q.marks,
    }));

    res.status(201).json({ success: true, data: { attempt, questions } });
  } catch (error) {
    console.error('startAttempt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/assessments/:id/submit
 * Trainee submits their answers. Backend calculates all scores.
 */
const submitAttempt = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;
    if (!attemptId || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'attemptId and answers array required.' });
    }

    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found.' });
    }

    if (attempt.status === 'SUBMITTED') {
      return res.json({
        success: true,
        message: 'Assessment already submitted and recorded.',
        data: attempt,
      });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Invalid attempt status.' });
    }

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee || attempt.traineeId.toString() !== trainee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    // Build question map for grading
    const questionMap = {};
    assessment.questions.forEach((q) => {
      questionMap[q.questionId] = q;
    });

    // Grade answers
    const gradedAnswers = [];
    const skillTotals = {};

    for (const q of assessment.questions) {
      const userAnswer = answers.find((a) => a.questionId === q.questionId);
      const selected = userAnswer?.selectedAnswer || null;
      const isCorrect = selected === q.correctAnswer;
      const earnedMarks = isCorrect ? q.marks : 0;

      gradedAnswers.push({
        questionId: q.questionId,
        selectedAnswer: selected,
        isCorrect,
        skillId: q.skillId,
        skillName: q.skillName,
        marks: earnedMarks,
        maxMarks: q.marks,
      });

      // Aggregate by skill
      if (!skillTotals[q.skillId]) {
        skillTotals[q.skillId] = {
          skillId: q.skillId,
          skillName: q.skillName,
          correct: 0,
          total: 0,
          marks: 0,
          maxMarks: 0,
        };
      }
      skillTotals[q.skillId].total += 1;
      skillTotals[q.skillId].maxMarks += q.marks;
      if (isCorrect) {
        skillTotals[q.skillId].correct += 1;
        skillTotals[q.skillId].marks += q.marks;
      }
    }

    // Calculate skill scores
    const skillScores = Object.values(skillTotals).map((s) => ({
      ...s,
      percentage: s.maxMarks > 0 ? Math.round((s.marks / s.maxMarks) * 100) : 0,
    }));

    const totalScore = gradedAnswers.reduce((sum, a) => sum + a.marks, 0);
    const maxScore = gradedAnswers.reduce((sum, a) => sum + a.maxMarks, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Update attempt
    attempt.answers = gradedAnswers;
    attempt.totalScore = totalScore;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.skillScores = skillScores;
    attempt.submittedAt = new Date();
    attempt.status = 'SUBMITTED';
    await attempt.save();

    res.json({
      success: true,
      message: 'Assessment submitted and graded.',
      data: attempt,
    });
  } catch (error) {
    console.error('submitAttempt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/assessments/:id/attempts
 */
const getAttempts = async (req, res) => {
  try {
    let filter = { assessmentId: req.params.id };

    if (req.user.role === 'TRAINEE') {
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee) return res.json({ success: true, count: 0, data: [] });
      filter.traineeId = trainee._id;
    } else if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    }

    const attempts = await AssessmentAttempt.find(filter)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username' },
      })
      .sort({ attemptNumber: 1 });

    res.json({ success: true, count: attempts.length, data: attempts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateAssessment,
  getAssessments,
  getAssessment,
  publishAssessment,
  startAttempt,
  submitAttempt,
  getAttempts,
};
