const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const Course = require('../models/Course');
const Provider = require('../models/Provider');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');
const QuestionBank = require('../models/QuestionBank');
const {
  sanitizeQuestionForClient,
  consolidateCaseStudyEvidence,
  determineNextAdaptiveTarget,
  evaluateAnswer,
  evaluateAttemptDeterministically,
} = require('../services/adaptiveAssessmentEngine');
const {
  generateQuestions,
  generateCaseStudyWithQuestions,
  analyzeCaseStudyAnswerEvidence,
  generateAdaptiveQuestion,
} = require('../services/ai/questionGenerator');
const crypto = require('crypto');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * Trigger background asynchronous AI analysis for a case study question response.
 * Strictly writes independent evidence only; never mutates shared competency profile.
 * Implements robust retry handling (up to 2 retries) before marking as FAILED.
 */
const triggerCaseStudyAnalysisBackground = ({
  attemptId,
  questionId,
  sequenceNumber,
  scenario,
  question,
  selectedAnswer,
  isCorrect,
  skillName,
}) => {
  // Fire and forget Promise with robust retries
  setImmediate(async () => {
    const maxRetries = 2;
    let attemptCount = 0;
    let evidence = null;
    let lastError = null;

    while (attemptCount <= maxRetries) {
      try {
        evidence = await analyzeCaseStudyAnswerEvidence({
          scenario,
          question,
          selectedAnswer,
          isCorrect,
          skillName,
        });
        break; // Analysis successful
      } catch (err) {
        lastError = err;
        attemptCount++;
        if (attemptCount <= maxRetries) {
          console.warn(`[CaseStudyBackgroundAnalysis] Retry ${attemptCount}/${maxRetries} for Q${sequenceNumber} (${questionId}) after error: ${err.message}`);
          await new Promise((res) => setTimeout(res, 1200 * attemptCount));
        }
      }
    }

    if (evidence) {
      try {
        await AssessmentAttempt.updateOne(
          {
            _id: attemptId,
            'caseStudyEvidence.questionId': questionId,
          },
          {
            $set: {
              'caseStudyEvidence.$.competencies': evidence.competencies || [skillName],
              'caseStudyEvidence.$.strengths': evidence.strengths || [],
              'caseStudyEvidence.$.weaknesses': evidence.weaknesses || [],
              'caseStudyEvidence.$.misconceptions': evidence.misconceptions || [],
              'caseStudyEvidence.$.evidenceLevel': evidence.evidenceLevel || 'MEDIUM',
              'caseStudyEvidence.$.analysisStatus': 'COMPLETED',
              'caseStudyEvidence.$.analyzedAt': new Date(),
            },
          }
        );
      } catch (dbErr) {
        console.error(`[CaseStudyBackgroundAnalysis] DB update error for Q${sequenceNumber}:`, dbErr.message);
      }
    } else {
      console.error(`[CaseStudyBackgroundAnalysis] Analysis failed for Q${sequenceNumber} (${questionId}) after retries:`, lastError?.message);
      await AssessmentAttempt.updateOne(
        {
          _id: attemptId,
          'caseStudyEvidence.questionId': questionId,
        },
        {
          $set: {
            'caseStudyEvidence.$.analysisStatus': 'FAILED',
            'caseStudyEvidence.$.error': lastError?.message || 'Unknown error',
            'caseStudyEvidence.$.analyzedAt': new Date(),
          },
        }
      ).catch(() => {});
    }
  });
};

/**
 * POST /api/assessments/generate
 * Provider triggers AI generation for an assessment.
 * Generates Predefined Case Study + Fixed Case Study MCQs.
 * Does NOT generate future adaptive questions.
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

    // Try Case Study + Fixed MCQs generation first
    let caseStudy = null;
    let questions = null;

    const csResult = await generateCaseStudyWithQuestions({
      courseName: course.courseName,
      skills: normalizedSkills,
      difficulty: difficulty || 'MIXED',
      questionsCount: Math.max(normalizedSkills.length, 5),
    });

    if (csResult && csResult.caseStudy && csResult.questions?.length > 0) {
      caseStudy = csResult.caseStudy;
      questions = csResult.questions;
    } else {
      // Fallback: generate standard questions and structured scenario
      const fallbackQuestions = await generateQuestions({
        courseName: course.courseName,
        skills: normalizedSkills,
        difficulty: difficulty || 'MIXED',
        questionsPerSkill: Math.max(1, Math.floor(qps / normalizedSkills.length) || 2),
      });

      if (!fallbackQuestions || fallbackQuestions.length === 0) {
        return res.status(503).json({
          success: false,
          message: 'AI question generation failed or is unavailable. Please check your Groq API configuration.',
        });
      }

      caseStudy = {
        title: `${course.courseName} Technical Operational Scenario`,
        scenario: `The technical architecture team at Global Cloud Logistics is upgrading their core operational systems for ${course.courseName}. Trainees are required to evaluate real-world design, debugging, and operational considerations across critical competencies to ensure system resilience, maintainability, and scalability under peak production loads.`,
      };
      questions = fallbackQuestions;
    }

    // Assign questionId to each question
    questions.forEach((q) => {
      if (!q.questionId) q.questionId = crypto.randomUUID();
    });

    // Determine next version number
    const lastAssessment = await Assessment.findOne({ courseId })
      .sort({ version: -1 })
      .select('version');
    const nextVersion = (lastAssessment?.version || 0) + 1;

    const assessment = await Assessment.create({
      courseId,
      providerId: provider._id,
      title: `${course.courseName} — Case Study & Adaptive Assessment v${nextVersion}`,
      version: nextVersion,
      skills: normalizedSkills,
      difficulty: difficulty || 'MIXED',
      questionsPerSkill: qps,
      totalQuestions: questions.length,
      timeLimitMinutes: timeLimitMinutes || null,
      maxAttempts: maxAttempts || 2,
      caseStudy,
      caseStudyQuestions: questions,
      questions,
      status: 'DRAFT',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: assessment });
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
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee) return res.json({ success: true, count: 0, data: [] });
      const enrollments = await Enrollment.find({ traineeId: trainee._id, status: { $in: ['ENROLLED', 'COMPLETED'] } });
      const courseIds = [...new Set(enrollments.map((e) => e.courseId.toString()))];
      filter.courseId = { $in: courseIds };
      filter.status = 'PUBLISHED';
    }

    const assessments = await Assessment.find(filter)
      .select('-questions.correctAnswer -questions.explanation -caseStudyQuestions.correctAnswer -caseStudyQuestions.explanation')
      .populate('courseId', 'courseName category')
      .populate('providerId', 'organizationName')
      .sort({ createdAt: -1 });

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

    // Trainee: anti-leakage - strip correct answers & explanations
    if (req.user.role === 'TRAINEE') {
      if (assessment.status !== 'PUBLISHED') {
        return res.status(403).json({ success: false, message: 'Assessment not available.' });
      }
      if (Array.isArray(obj.caseStudyQuestions)) {
        obj.caseStudyQuestions = obj.caseStudyQuestions.map((q) => {
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        });
      }
      if (Array.isArray(obj.questions)) {
        obj.questions = obj.questions.map((q) => {
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        });
      }
    }

    // Provider: only own assessments
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
 * Helper to get the predefined case study questions from an assessment
 */
const getCaseStudyQuestions = (assessment) => {
  if (Array.isArray(assessment.caseStudyQuestions) && assessment.caseStudyQuestions.length > 0) {
    return assessment.caseStudyQuestions;
  }
  if (Array.isArray(assessment.questions) && assessment.questions.length > 0) {
    return assessment.questions;
  }
  return [];
};

/**
 * POST /api/assessments/:id/start
 * Trainee starts or resumes an assessment attempt.
 * Initializes Phase 1 (CASE_STUDY) with predefined scenario + fixed Q1.
 * Supports seamless resumption across page refreshes.
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

    const caseStudyQuestions = getCaseStudyQuestions(assessment);
    if (caseStudyQuestions.length === 0) {
      return res.status(500).json({ success: false, message: 'Assessment contains no predefined case study questions.' });
    }

    // Check existing attempts
    const allAttempts = await AssessmentAttempt.find({
      assessmentId: assessment._id,
      traineeId: trainee._id,
    }).sort({ attemptNumber: 1 });

    const inProgress = allAttempts.find((a) => a.status === 'IN_PROGRESS');
    if (inProgress) {
      // RESUME EXISTING IN-PROGRESS ATTEMPT
      const currentPhase = inProgress.currentPhase || 'CASE_STUDY';

      if (currentPhase === 'CASE_STUDY') {
        const answeredCount = inProgress.caseStudyResponses?.length || 0;
        const totalCS = caseStudyQuestions.length;

        if (answeredCount < totalCS) {
          const currentQ = caseStudyQuestions[answeredCount];
          inProgress.currentQuestionId = currentQ.questionId;
          await inProgress.save();

          return res.json({
            success: true,
            data: {
              attempt: inProgress,
              phase: 'CASE_STUDY',
              caseStudy: assessment.caseStudy || { title: assessment.title, scenario: '' },
              currentQuestion: sanitizeQuestionForClient(currentQ),
              isComplete: false,
              currentStep: answeredCount + 1,
              totalCaseStudyQuestions: totalCS,
              totalTarget: totalCS + (inProgress.targetAdaptiveQuestions || 5),
            },
          });
        } else {
          // All case study questions answered, but not transitioned to adaptive
          return res.json({
            success: true,
            data: {
              attempt: inProgress,
              phase: 'ANALYZING_CASE_STUDY',
              caseStudy: assessment.caseStudy,
              currentQuestion: null,
              isComplete: false,
              currentStep: totalCS,
              totalCaseStudyQuestions: totalCS,
              totalTarget: totalCS + (inProgress.targetAdaptiveQuestions || 5),
            },
          });
        }
      } else if (currentPhase === 'ADAPTIVE') {
        // Find current unsubmitted adaptive question
        const answeredAdaptiveIds = (inProgress.adaptiveResponses || []).map((r) => r.questionId);
        let activeAdaptiveQ = (inProgress.adaptiveQuestions || []).find((q) => !answeredAdaptiveIds.includes(q.questionId));

        if (!activeAdaptiveQ && inProgress.adaptiveResponses.length >= (inProgress.targetAdaptiveQuestions || 5)) {
          return res.json({
            success: true,
            data: {
              attempt: inProgress,
              phase: 'COMPLETED',
              isComplete: true,
              currentQuestion: null,
              currentStep: inProgress.adaptiveResponses.length,
              totalTarget: inProgress.targetAdaptiveQuestions || 5,
            },
          });
        }

        return res.json({
          success: true,
          data: {
            attempt: inProgress,
            phase: 'ADAPTIVE',
            caseStudy: null,
            currentQuestion: activeAdaptiveQ ? sanitizeQuestionForClient(activeAdaptiveQ) : null,
            isComplete: false,
            currentStep: (inProgress.adaptiveResponses?.length || 0) + 1,
            totalTarget: inProgress.targetAdaptiveQuestions || 5,
          },
        });
      } else {
        return res.json({
          success: true,
          data: {
            attempt: inProgress,
            phase: currentPhase,
            isComplete: currentPhase === 'COMPLETED',
            currentQuestion: null,
          },
        });
      }
    }

    // Check max attempts
    const maxAllowed = Math.max(assessment.maxAttempts || 2, 5);
    const submittedCount = allAttempts.filter((a) => a.status === 'SUBMITTED').length;
    if (submittedCount >= maxAllowed) {
      return res.status(400).json({ success: false, message: `Maximum ${maxAllowed} attempts reached.` });
    }

    const maxAttemptNumber = allAttempts.reduce((max, a) => Math.max(max, a.attemptNumber || 0), 0);
    const attemptNumber = maxAttemptNumber + 1;

    const firstQ = caseStudyQuestions[0];

    // Create fresh attempt
    let attempt;
    try {
      attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        traineeId: trainee._id,
        enrollmentId: enrollment._id,
        courseId: assessment.courseId,
        providerId: assessment.providerId,
        attemptNumber,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
        currentPhase: 'CASE_STUDY',
        currentQuestionId: firstQ.questionId,
        caseStudyResponses: [],
        caseStudyEvidence: [],
        adaptiveQuestions: [],
        adaptiveResponses: [],
        competencyProfile: {},
        targetAdaptiveQuestions: 5,
        answers: [],
        answeredQuestionIds: [],
        competencyStates: {},
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        attempt = await AssessmentAttempt.findOne({
          assessmentId: assessment._id,
          traineeId: trainee._id,
          status: 'IN_PROGRESS',
        });
      } else {
        throw dupErr;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        attempt,
        phase: 'CASE_STUDY',
        caseStudy: assessment.caseStudy || { title: assessment.title, scenario: '' },
        currentQuestion: sanitizeQuestionForClient(firstQ),
        isComplete: false,
        currentStep: 1,
        totalCaseStudyQuestions: caseStudyQuestions.length,
        totalTarget: caseStudyQuestions.length + (attempt?.targetAdaptiveQuestions || 5),
      },
    });
  } catch (error) {
    console.error('startAttempt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/assessments/:id/case-study/answer
 * Trainee answers a predefined Case Study MCQ.
 * Latency optimization: saves response immediately, deterministic evaluation,
 * returns next predefined MCQ immediately, starts background AI analysis asynchronously.
 */
const answerCaseStudyQuestion = async (req, res) => {
  try {
    const { attemptId, questionId, selectedAnswer } = req.body;

    if (!attemptId || !questionId || !selectedAnswer) {
      return res.status(400).json({ success: false, message: 'attemptId, questionId, and selectedAnswer are required.' });
    }

    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(404).json({ success: false, message: 'Active in-progress attempt not found.' });
    }

    if (attempt.currentPhase !== 'CASE_STUDY') {
      return res.status(400).json({ success: false, message: `Attempt is in phase ${attempt.currentPhase}, not CASE_STUDY.` });
    }

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee || attempt.traineeId.toString() !== trainee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const caseStudyQuestions = getCaseStudyQuestions(assessment);
    const question = caseStudyQuestions.find((q) => q.questionId === questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Case study question not found.' });
    }

    // Idempotency: prevent recording duplicate answers
    const existingIndex = attempt.caseStudyResponses.findIndex((r) => r.questionId === questionId);
    if (existingIndex >= 0) {
      const nextIdx = attempt.caseStudyResponses.length;
      const nextQ = nextIdx < caseStudyQuestions.length ? caseStudyQuestions[nextIdx] : null;
      return res.json({
        success: true,
        message: 'Answer already recorded.',
        data: {
          phase: 'CASE_STUDY',
          isCaseStudyComplete: nextIdx >= caseStudyQuestions.length,
          nextQuestion: nextQ ? sanitizeQuestionForClient(nextQ) : null,
          currentStep: nextIdx + (nextQ ? 1 : 0),
          totalCaseStudyQuestions: caseStudyQuestions.length,
        },
      });
    }

    // Deterministic evaluation against stored correct answer
    const evalResult = evaluateAnswer(question, selectedAnswer);
    const sequenceNumber = attempt.caseStudyResponses.length + 1;

    // Record response
    attempt.caseStudyResponses.push({
      questionId,
      sequenceNumber,
      selectedAnswer: selectedAnswer.toString().toUpperCase(),
      isCorrect: evalResult.isCorrect,
      skillId: question.skillId,
      skillName: question.skillName,
      marks: evalResult.marks,
      maxMarks: evalResult.maxMarks,
      answeredAt: new Date(),
    });

    // Register independent evidence placeholder
    attempt.caseStudyEvidence.push({
      questionId,
      sequenceNumber,
      competencies: [question.skillName],
      strengths: [],
      weaknesses: [],
      misconceptions: [],
      evidenceLevel: 'MEDIUM',
      analysisStatus: 'PENDING',
      analyzedAt: null,
    });

    // Determine next question in predefined sequence
    const nextIdx = attempt.caseStudyResponses.length;
    const isCaseStudyComplete = nextIdx >= caseStudyQuestions.length;
    const nextQ = isCaseStudyComplete ? null : caseStudyQuestions[nextIdx];

    attempt.currentQuestionId = nextQ ? nextQ.questionId : null;
    await attempt.save();

    // Trigger asynchronous parallel background AI analysis
    triggerCaseStudyAnalysisBackground({
      attemptId: attempt._id,
      questionId,
      sequenceNumber,
      scenario: assessment.caseStudy?.scenario || '',
      question,
      selectedAnswer,
      isCorrect: evalResult.isCorrect,
      skillName: question.skillName,
    });

    // Return immediately to frontend without waiting for AI analysis
    res.json({
      success: true,
      data: {
        phase: 'CASE_STUDY',
        isCaseStudyComplete,
        nextQuestion: nextQ ? sanitizeQuestionForClient(nextQ) : null,
        currentStep: sequenceNumber + (isCaseStudyComplete ? 0 : 1),
        totalCaseStudyQuestions: caseStudyQuestions.length,
        result: {
          isCorrect: evalResult.isCorrect,
        },
      },
    });
  } catch (error) {
    console.error('answerCaseStudyQuestion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/assessments/:id/case-study/complete
 * Trainee has completed all predefined case study MCQs.
 * Consolidates all evidence in sequence order (Q1 -> Q2 -> Q3...).
 * Robustly waits for any still-pending background analyses.
 * Builds initial competencyProfile.
 * Generates dynamic Adaptive MCQ #1 via Groq AI (never predefined!).
 */
const completeCaseStudy = async (req, res) => {
  try {
    const { attemptId } = req.body;
    if (!attemptId) {
      return res.status(400).json({ success: false, message: 'attemptId is required.' });
    }

    let attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(404).json({ success: false, message: 'Active attempt not found.' });
    }

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee || attempt.traineeId.toString() !== trainee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const course = await Course.findById(assessment.courseId);

    const caseStudyQuestions = getCaseStudyQuestions(assessment);
    if (attempt.caseStudyResponses.length < caseStudyQuestions.length) {
      return res.status(400).json({
        success: false,
        message: `Case study is not complete. ${attempt.caseStudyResponses.length} of ${caseStudyQuestions.length} answered.`,
      });
    }

    // Robust wait for pending background AI evidence analyses
    // Wait up to 30 seconds with 500ms polling, avoiding short timeouts
    const MAX_WAIT_MS = 30000;
    const POLL_INTERVAL_MS = 500;
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
      attempt = await AssessmentAttempt.findById(attemptId);
      const pending = (attempt.caseStudyEvidence || []).filter((e) => e.analysisStatus === 'PENDING');
      if (pending.length === 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    // If any analyses remain pending after generous timeout or failed, apply deterministic fallback evidence
    let needsSave = false;
    (attempt.caseStudyEvidence || []).forEach((ev) => {
      if (ev.analysisStatus === 'PENDING' || ev.analysisStatus === 'FAILED') {
        const resp = attempt.caseStudyResponses.find((r) => r.questionId === ev.questionId);
        ev.analysisStatus = 'COMPLETED';
        ev.strengths = resp?.isCorrect ? [`Demonstrated understanding of ${resp.skillName}`] : [];
        ev.weaknesses = !resp?.isCorrect ? [`Encountered difficulty with ${resp?.skillName || 'topic'}`] : [];
        ev.misconceptions = !resp?.isCorrect ? [`Incorrect option selected on Q${ev.sequenceNumber}`] : [];
        ev.evidenceLevel = 'LOW';
        ev.analyzedAt = new Date();
        needsSave = true;
      }
    });

    // Consolidate evidence strictly in sequence order
    const competencyProfile = consolidateCaseStudyEvidence(attempt.caseStudyResponses, attempt.caseStudyEvidence);
    attempt.competencyProfile = competencyProfile;
    needsSave = true;

    // Check if Adaptive Q1 already generated
    if (!Array.isArray(attempt.adaptiveQuestions)) attempt.adaptiveQuestions = [];

    let adaptiveQ1 = attempt.adaptiveQuestions[0];
    if (!adaptiveQ1) {
      // Determine initial adaptive target skill & difficulty based on consolidated profile
      const { targetSkill, targetDifficulty } = determineNextAdaptiveTarget(
        competencyProfile,
        [],
        course?.skills || assessment.skills || []
      );

      // Dynamically generate Adaptive MCQ #1 via Groq AI
      const previousQuestions = caseStudyQuestions.map((q) => q.questionText);
      const generated = await generateAdaptiveQuestion({
        courseName: course?.courseName || assessment.title,
        skills: assessment.skills,
        competencyProfile,
        targetSkill,
        targetDifficulty,
        previousQuestions,
      });

      if (!generated) {
        // AI service error: transition phase so UI can present a Retry button
        attempt.currentPhase = 'ADAPTIVE';
        await attempt.save();
        return res.status(503).json({
          success: false,
          message: 'Unable to prepare initial adaptive question from AI engine. Please retry.',
          canRetry: true,
        });
      }

      adaptiveQ1 = {
        questionId: crypto.randomUUID(),
        sequenceNumber: 1,
        questionText: generated.questionText,
        options: generated.options,
        correctAnswer: generated.correctAnswer,
        skillId: targetSkill.skillId,
        skillName: targetSkill.skillName,
        difficulty: targetDifficulty,
        explanation: generated.explanation,
        marks: 1,
        generatedAt: new Date(),
      };

      attempt.adaptiveQuestions.push(adaptiveQ1);
      attempt.currentQuestionId = adaptiveQ1.questionId;
      attempt.currentPhase = 'ADAPTIVE';
      needsSave = true;
    } else {
      attempt.currentPhase = 'ADAPTIVE';
      attempt.currentQuestionId = adaptiveQ1.questionId;
      needsSave = true;
    }

    if (needsSave) {
      attempt.markModified('competencyProfile');
      await attempt.save();
    }

    res.json({
      success: true,
      data: {
        phase: 'ADAPTIVE',
        currentQuestion: sanitizeQuestionForClient(adaptiveQ1),
        currentStep: 1,
        totalTarget: attempt.targetAdaptiveQuestions || 5,
      },
    });
  } catch (error) {
    console.error('completeCaseStudy error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/assessments/:id/adaptive/answer
 * Trainee answers an adaptive question.
 * Evaluates answer deterministically, updates evolving competencyProfile,
 * dynamically generates the next adaptive question (branching difficulty),
 * and returns only the next question.
 */
const answerAdaptiveQuestion = async (req, res) => {
  try {
    const { attemptId, questionId, selectedAnswer } = req.body;

    if (!attemptId || !questionId || !selectedAnswer) {
      return res.status(400).json({ success: false, message: 'attemptId, questionId, and selectedAnswer are required.' });
    }

    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(404).json({ success: false, message: 'Active attempt not found.' });
    }

    if (attempt.currentPhase !== 'ADAPTIVE') {
      return res.status(400).json({ success: false, message: `Attempt is in phase ${attempt.currentPhase}, not ADAPTIVE.` });
    }

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee || attempt.traineeId.toString() !== trainee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    const course = await Course.findById(assessment.courseId);

    // Find the question in runtime-generated adaptive questions
    const question = (attempt.adaptiveQuestions || []).find((q) => q.questionId === questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Adaptive question not found.' });
    }

    // Idempotency: check if already answered
    const existingIndex = attempt.adaptiveResponses.findIndex((r) => r.questionId === questionId);
    if (existingIndex >= 0) {
      const nextSeq = attempt.adaptiveResponses.length + 1;
      const nextQ = (attempt.adaptiveQuestions || []).find((q) => q.sequenceNumber === nextSeq);
      return res.json({
        success: true,
        message: 'Answer already recorded.',
        data: {
          isComplete: attempt.adaptiveResponses.length >= (attempt.targetAdaptiveQuestions || 5),
          nextQuestion: nextQ ? sanitizeQuestionForClient(nextQ) : null,
          currentQuestion: nextQ ? sanitizeQuestionForClient(nextQ) : null,
          currentStep: attempt.adaptiveResponses.length,
          totalTarget: attempt.targetAdaptiveQuestions || 5,
        },
      });
    }

    // Deterministically evaluate answer
    const evalResult = evaluateAnswer(question, selectedAnswer);
    const sequenceNumber = attempt.adaptiveResponses.length + 1;

    // Record response
    attempt.adaptiveResponses.push({
      questionId,
      sequenceNumber,
      selectedAnswer: selectedAnswer.toString().toUpperCase(),
      isCorrect: evalResult.isCorrect,
      skillId: question.skillId,
      skillName: question.skillName,
      difficulty: question.difficulty,
      marks: evalResult.marks,
      maxMarks: evalResult.maxMarks,
      answeredAt: new Date(),
    });

    // Update evolving competency state for this skill
    if (!attempt.competencyProfile) attempt.competencyProfile = { skills: {} };
    if (!attempt.competencyProfile.skills) attempt.competencyProfile.skills = {};

    const sId = question.skillId;
    if (!attempt.competencyProfile.skills[sId]) {
      attempt.competencyProfile.skills[sId] = {
        skillId: sId,
        skillName: question.skillName,
        earnedMarks: 0,
        maxMarks: 0,
        questionsTotal: 0,
        questionsCorrect: 0,
        strengths: [],
        weaknesses: [],
        misconceptions: [],
      };
    }

    const skillProf = attempt.competencyProfile.skills[sId];
    skillProf.earnedMarks += evalResult.marks;
    skillProf.maxMarks += evalResult.maxMarks;
    skillProf.questionsTotal += 1;
    if (evalResult.isCorrect) {
      skillProf.questionsCorrect += 1;
      skillProf.adaptiveRecommendedDifficulty =
        question.difficulty === 'BEGINNER' ? 'INTERMEDIATE' : 'ADVANCED';
      if (!skillProf.strengths.includes(`Mastered ${question.difficulty} challenge in ${question.skillName}`)) {
        skillProf.strengths.push(`Mastered ${question.difficulty} challenge in ${question.skillName}`);
      }
    } else {
      skillProf.adaptiveRecommendedDifficulty =
        question.difficulty === 'ADVANCED' ? 'INTERMEDIATE' : 'BEGINNER';
      if (!skillProf.weaknesses.includes(`Struggled with ${question.difficulty} scenario in ${question.skillName}`)) {
        skillProf.weaknesses.push(`Struggled with ${question.difficulty} scenario in ${question.skillName}`);
      }
    }
    skillProf.percentage = Math.round((skillProf.earnedMarks / skillProf.maxMarks) * 100);
    if (skillProf.percentage >= 80) skillProf.classification = 'STRONG';
    else if (skillProf.percentage >= 60) skillProf.classification = 'DEVELOPING';
    else if (skillProf.percentage >= 40) skillProf.classification = 'WEAK';
    else skillProf.classification = 'CRITICAL_GAP';

    attempt.markModified('competencyProfile');

    const targetCount = attempt.targetAdaptiveQuestions || 5;
    const isComplete = attempt.adaptiveResponses.length >= targetCount;

    if (isComplete) {
      attempt.currentPhase = 'COMPLETED';
      attempt.currentQuestionId = null;
      await attempt.save();

      return res.json({
        success: true,
        data: {
          isComplete: true,
          nextQuestion: null,
          currentStep: attempt.adaptiveResponses.length,
          totalTarget: targetCount,
          result: { isCorrect: evalResult.isCorrect },
        },
      });
    }

    // Determine next adaptive target skill and branched difficulty
    const { targetSkill, targetDifficulty } = determineNextAdaptiveTarget(
      attempt.competencyProfile,
      attempt.adaptiveResponses,
      course?.skills || assessment.skills || []
    );

    // Build list of previous questions to avoid repetition
    const previousQuestions = [
      ...getCaseStudyQuestions(assessment).map((q) => q.questionText),
      ...attempt.adaptiveQuestions.map((q) => q.questionText),
    ];

    // Dynamically generate the next MCQ on the fly
    const nextSeq = sequenceNumber + 1;
    let nextAdaptiveQ = attempt.adaptiveQuestions.find((q) => q.sequenceNumber === nextSeq);

    if (!nextAdaptiveQ) {
      const generated = await generateAdaptiveQuestion({
        courseName: course?.courseName || assessment.title,
        skills: assessment.skills,
        competencyProfile: attempt.competencyProfile,
        targetSkill,
        targetDifficulty,
        previousQuestions,
      });

      if (!generated) {
        await attempt.save();
        return res.status(503).json({
          success: false,
          message: 'Unable to calibrate next question from AI engine. Please retry.',
          canRetry: true,
        });
      }

      nextAdaptiveQ = {
        questionId: crypto.randomUUID(),
        sequenceNumber: nextSeq,
        questionText: generated.questionText,
        options: generated.options,
        correctAnswer: generated.correctAnswer,
        skillId: targetSkill.skillId,
        skillName: targetSkill.skillName,
        difficulty: targetDifficulty,
        explanation: generated.explanation,
        marks: 1,
        generatedAt: new Date(),
      };

      attempt.adaptiveQuestions.push(nextAdaptiveQ);
    }

    attempt.currentQuestionId = nextAdaptiveQ.questionId;
    await attempt.save();

    res.json({
      success: true,
      data: {
        isComplete: false,
        nextQuestion: sanitizeQuestionForClient(nextAdaptiveQ),
        currentQuestion: sanitizeQuestionForClient(nextAdaptiveQ),
        currentStep: nextSeq,
        totalTarget: targetCount,
        result: { isCorrect: evalResult.isCorrect },
      },
    });
  } catch (error) {
    console.error('answerAdaptiveQuestion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/assessments/:id/adaptive/retry
 * Retries dynamic generation of the current adaptive question if previous attempt timed out or failed.
 */
const retryAdaptiveQuestion = async (req, res) => {
  try {
    const { attemptId } = req.body;
    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(404).json({ success: false, message: 'Active attempt not found.' });
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    const course = await Course.findById(assessment.courseId);

    const answeredCount = attempt.adaptiveResponses?.length || 0;
    const nextSeq = answeredCount + 1;

    let existingQ = (attempt.adaptiveQuestions || []).find((q) => q.sequenceNumber === nextSeq);
    if (existingQ) {
      attempt.currentQuestionId = existingQ.questionId;
      await attempt.save();
      return res.json({
        success: true,
        data: {
          phase: 'ADAPTIVE',
          currentQuestion: sanitizeQuestionForClient(existingQ),
          currentStep: nextSeq,
          totalTarget: attempt.targetAdaptiveQuestions || 5,
        },
      });
    }

    const { targetSkill, targetDifficulty } = determineNextAdaptiveTarget(
      attempt.competencyProfile || {},
      attempt.adaptiveResponses || [],
      course?.skills || assessment.skills || []
    );

    const previousQuestions = [
      ...getCaseStudyQuestions(assessment).map((q) => q.questionText),
      ...attempt.adaptiveQuestions.map((q) => q.questionText),
    ];

    const generated = await generateAdaptiveQuestion({
      courseName: course?.courseName || assessment.title,
      skills: assessment.skills,
      competencyProfile: attempt.competencyProfile,
      targetSkill,
      targetDifficulty,
      previousQuestions,
    });

    if (!generated) {
      return res.status(503).json({ success: false, message: 'AI generation retry failed. Please try again.' });
    }

    const nextAdaptiveQ = {
      questionId: crypto.randomUUID(),
      sequenceNumber: nextSeq,
      questionText: generated.questionText,
      options: generated.options,
      correctAnswer: generated.correctAnswer,
      skillId: targetSkill.skillId,
      skillName: targetSkill.skillName,
      difficulty: targetDifficulty,
      explanation: generated.explanation,
      marks: 1,
      generatedAt: new Date(),
    };

    attempt.adaptiveQuestions.push(nextAdaptiveQ);
    attempt.currentQuestionId = nextAdaptiveQ.questionId;
    attempt.currentPhase = 'ADAPTIVE';
    await attempt.save();

    res.json({
      success: true,
      data: {
        phase: 'ADAPTIVE',
        currentQuestion: sanitizeQuestionForClient(nextAdaptiveQ),
        currentStep: nextSeq,
        totalTarget: attempt.targetAdaptiveQuestions || 5,
      },
    });
  } catch (error) {
    console.error('retryAdaptiveQuestion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/assessments/:id/submit
 * Deterministically calculates overall scores across Case Study and Adaptive questions,
 * finalizes attempt, and triggers Skill Gap Analysis.
 */
const submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.body;
    if (!attemptId) {
      return res.status(400).json({ success: false, message: 'attemptId is required.' });
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

    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee || attempt.traineeId.toString() !== trainee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    // Pool all questions and responses from both phases
    const caseStudyQuestions = getCaseStudyQuestions(assessment);
    const adaptiveQuestions = attempt.adaptiveQuestions || [];

    const allQuestions = [...caseStudyQuestions, ...adaptiveQuestions];
    const allResponses = [
      ...(attempt.caseStudyResponses || []).map((r) => ({
        questionId: r.questionId,
        selectedAnswer: r.selectedAnswer,
        isCorrect: r.isCorrect,
        skillId: r.skillId,
        skillName: r.skillName,
        marks: r.marks,
        maxMarks: r.maxMarks,
      })),
      ...(attempt.adaptiveResponses || []).map((r) => ({
        questionId: r.questionId,
        selectedAnswer: r.selectedAnswer,
        isCorrect: r.isCorrect,
        skillId: r.skillId,
        skillName: r.skillName,
        marks: r.marks,
        maxMarks: r.maxMarks,
      })),
    ];

    // Compute deterministic numerical score
    const evaluated = evaluateAttemptDeterministically(allQuestions, allResponses);

    attempt.totalScore = evaluated.overallScore;
    attempt.maxScore = evaluated.overallMaxScore;
    attempt.percentage = evaluated.overallPercentage;
    attempt.skillScores = evaluated.skillResults.map((s) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      correct: s.questionsCorrect,
      total: s.questionsTotal,
      percentage: s.percentage,
      marks: s.score,
      maxMarks: s.maxScore,
    }));

    // Backwards-compatible answers array
    attempt.answers = allResponses.map((r) => ({
      questionId: r.questionId,
      selectedAnswer: r.selectedAnswer,
      isCorrect: r.isCorrect,
      skillId: r.skillId,
      skillName: r.skillName,
      marks: r.marks,
      maxMarks: r.maxMarks,
    }));

    attempt.submittedAt = new Date();
    attempt.status = 'SUBMITTED';
    attempt.currentPhase = 'COMPLETED';
    await attempt.save();

    res.json({
      success: true,
      message: 'Assessment submitted and deterministically evaluated.',
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
  answerCaseStudyQuestion,
  completeCaseStudy,
  answerAdaptiveQuestion,
  retryAdaptiveQuestion,
  submitAttempt,
  getAttempts,
};
