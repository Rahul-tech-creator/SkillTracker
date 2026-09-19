/**
 * Adaptive AI Skill Assessment Engine
 * - Question-by-question dynamic branching (Intermediate -> Advanced / Beginner)
 * - Anti-leakage question delivery
 * - Deterministic scoring & competency framework mapping
 * - Groq AI diagnostic interpretation & misconception analysis
 */

const QuestionBank = require('../models/QuestionBank');
const Course = require('../models/Course');
const { chatCompletion, isAvailable } = require('./ai/grokClient');

/**
 * Sanitize question for client delivery: removes correct answer and answer keys
 */
/**
 * Sanitize question for client delivery: removes correct answer and answer keys
 */
const sanitizeQuestionForClient = (q) => {
  if (!q) return null;
  const obj = typeof q.toObject === 'function' ? q.toObject() : q;
  return {
    questionId: (obj.questionId || obj._id || '').toString(),
    questionText: obj.questionText || '',
    options: (obj.options || []).map((o) => ({
      label: o.label,
      text: o.text,
    })),
    skillId: obj.skillId || '',
    skillName: obj.skillName || '',
    difficulty: obj.difficulty || 'INTERMEDIATE',
    marks: obj.marks || 1,
  };
};

/**
 * Consolidate case study evidence in sequence order (Q1 -> Q2 -> Q3...).
 * AI analysis during Phase 1 writes independent evidence records only.
 * This function consolidates them strictly in chronological/sequence order.
 */
const consolidateCaseStudyEvidence = (caseStudyResponses = [], caseStudyEvidence = []) => {
  // Sort responses by sequenceNumber
  const sortedResponses = [...caseStudyResponses].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));

  // Map evidence by questionId
  const evidenceMap = {};
  caseStudyEvidence.forEach((ev) => {
    if (ev.questionId) {
      evidenceMap[ev.questionId] = ev;
    }
  });

  const skillsMap = {};
  let totalEarned = 0;
  let totalMax = 0;

  sortedResponses.forEach((resp) => {
    const sId = resp.skillId || 'general';
    const sName = resp.skillName || 'General Skill';
    const marks = Number(resp.marks) || 0;
    const maxMarks = Number(resp.maxMarks) || 1;

    if (!skillsMap[sId]) {
      skillsMap[sId] = {
        skillId: sId,
        skillName: sName,
        earnedMarks: 0,
        maxMarks: 0,
        questionsTotal: 0,
        questionsCorrect: 0,
        strengths: [],
        weaknesses: [],
        misconceptions: [],
      };
    }

    skillsMap[sId].earnedMarks += marks;
    skillsMap[sId].maxMarks += maxMarks;
    skillsMap[sId].questionsTotal += 1;
    if (resp.isCorrect) {
      skillsMap[sId].questionsCorrect += 1;
    }

    totalEarned += marks;
    totalMax += maxMarks;

    // Attach independent evidence in sequence order
    const ev = evidenceMap[resp.questionId];
    if (ev) {
      if (Array.isArray(ev.strengths)) {
        ev.strengths.forEach((st) => {
          if (st && !skillsMap[sId].strengths.includes(st)) skillsMap[sId].strengths.push(st);
        });
      }
      if (Array.isArray(ev.weaknesses)) {
        ev.weaknesses.forEach((w) => {
          if (w && !skillsMap[sId].weaknesses.includes(w)) skillsMap[sId].weaknesses.push(w);
        });
      }
      if (Array.isArray(ev.misconceptions)) {
        ev.misconceptions.forEach((m) => {
          if (m && !skillsMap[sId].misconceptions.includes(m)) skillsMap[sId].misconceptions.push(m);
        });
      }
    }
  });

  // Calculate classifications and initial adaptive recommendation
  const strongSkills = [];
  const developingSkills = [];
  const weakSkills = [];
  const criticalGaps = [];

  Object.values(skillsMap).forEach((s) => {
    const pct = s.maxMarks > 0 ? Math.round((s.earnedMarks / s.maxMarks) * 100) : 0;
    s.percentage = pct;

    if (pct >= 80) {
      s.classification = 'STRONG';
      s.adaptiveRecommendedDifficulty = 'ADVANCED';
      strongSkills.push(s.skillName);
    } else if (pct >= 60) {
      s.classification = 'DEVELOPING';
      s.adaptiveRecommendedDifficulty = 'INTERMEDIATE';
      developingSkills.push(s.skillName);
    } else if (pct >= 40) {
      s.classification = 'WEAK';
      s.adaptiveRecommendedDifficulty = 'BEGINNER';
      weakSkills.push(s.skillName);
    } else {
      s.classification = 'CRITICAL_GAP';
      s.adaptiveRecommendedDifficulty = 'BEGINNER';
      criticalGaps.push(s.skillName);
    }
  });

  const overallPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return {
    skills: skillsMap,
    strongSkills,
    developingSkills,
    weakSkills,
    criticalGaps,
    caseStudyTotalEarned: totalEarned,
    caseStudyTotalMax: totalMax,
    caseStudyPercentage: overallPercentage,
    consolidatedAt: new Date(),
  };
};

/**
 * Determine the next target skill and calibrated difficulty for dynamic adaptive generation.
 */
const determineNextAdaptiveTarget = (competencyProfile = {}, adaptiveResponses = [], allCourseSkills = []) => {
  const profileSkills = competencyProfile.skills || {};

  // Map candidate skills from course skills or profile skills
  const candidateSkills = (allCourseSkills.length > 0 ? allCourseSkills : Object.values(profileSkills)).map((s) => {
    const sId = s.skillId || s.name || 'general';
    const sName = s.skillName || s.name || sId;
    return { skillId: sId, skillName: sName };
  });

  // Count how many times each skill has been tested in adaptive phase
  const adaptiveTestCounts = {};
  adaptiveResponses.forEach((ar) => {
    const sId = ar.skillId || 'general';
    adaptiveTestCounts[sId] = (adaptiveTestCounts[sId] || 0) + 1;
  });

  // If there are no previous adaptive responses, choose the highest priority gap from Case Study
  if (adaptiveResponses.length === 0) {
    candidateSkills.sort((a, b) => {
      const profA = profileSkills[a.skillId];
      const profB = profileSkills[b.skillId];
      const scoreRank = { CRITICAL_GAP: 1, WEAK: 2, DEVELOPING: 3, STRONG: 4, UNTESTED: 0 };
      const rankA = scoreRank[profA?.classification] ?? 0;
      const rankB = scoreRank[profB?.classification] ?? 0;
      return rankA - rankB;
    });

    const targetSkill = candidateSkills[0] || { skillId: 'general', skillName: 'General Competency' };
    const prof = profileSkills[targetSkill.skillId];
    const targetDifficulty = prof?.adaptiveRecommendedDifficulty || 'INTERMEDIATE';
    return { targetSkill, targetDifficulty };
  }

  // Truly dynamic adaptation based on the latest response
  const lastResp = adaptiveResponses[adaptiveResponses.length - 1];
  const lastSkillId = lastResp.skillId;
  const lastSkill = candidateSkills.find((s) => s.skillId === lastSkillId) || {
    skillId: lastSkillId,
    skillName: lastResp.skillName,
  };

  let targetSkill;
  let targetDifficulty = 'INTERMEDIATE';

  if (!lastResp.isCorrect) {
    // INCORRECT RESPONSE:
    // Follow up to diagnose: reduce difficulty if possible on the same skill
    if (lastResp.difficulty === 'ADVANCED') {
      targetSkill = lastSkill;
      targetDifficulty = 'INTERMEDIATE';
    } else if (lastResp.difficulty === 'INTERMEDIATE') {
      targetSkill = lastSkill;
      targetDifficulty = 'BEGINNER';
    } else {
      // Already at BEGINNER and failed: skill has a confirmed critical gap.
      // Pivot to another skill that needs diagnostic evaluation
      const otherSkills = candidateSkills.filter((s) => s.skillId !== lastSkillId);
      otherSkills.sort((a, b) => {
        const countA = adaptiveTestCounts[a.skillId] || 0;
        const countB = adaptiveTestCounts[b.skillId] || 0;
        if (countA !== countB) return countA - countB;
        const profA = profileSkills[a.skillId];
        const profB = profileSkills[b.skillId];
        const scoreRank = { CRITICAL_GAP: 1, WEAK: 2, DEVELOPING: 3, STRONG: 4, UNTESTED: 0 };
        return (scoreRank[profA?.classification] ?? 0) - (scoreRank[profB?.classification] ?? 0);
      });
      targetSkill = otherSkills[0] || lastSkill;
      const prof = profileSkills[targetSkill.skillId];
      targetDifficulty = prof?.adaptiveRecommendedDifficulty || 'BEGINNER';
    }
  } else {
    // CORRECT RESPONSE:
    // Increase difficulty on the same skill to test mastery, or advance to the next skill
    if (lastResp.difficulty === 'BEGINNER') {
      targetSkill = lastSkill;
      targetDifficulty = 'INTERMEDIATE';
    } else if (lastResp.difficulty === 'INTERMEDIATE') {
      targetSkill = lastSkill;
      targetDifficulty = 'ADVANCED';
    } else {
      // Already at ADVANCED and succeeded: demonstrated mastery on this skill!
      // Pivot to test another skill (developing or untested)
      const otherSkills = candidateSkills.filter((s) => s.skillId !== lastSkillId);
      otherSkills.sort((a, b) => {
        const countA = adaptiveTestCounts[a.skillId] || 0;
        const countB = adaptiveTestCounts[b.skillId] || 0;
        if (countA !== countB) return countA - countB;
        const profA = profileSkills[a.skillId];
        const profB = profileSkills[b.skillId];
        const scoreRank = { DEVELOPING: 1, WEAK: 2, CRITICAL_GAP: 3, STRONG: 4, UNTESTED: 0 };
        return (scoreRank[profA?.classification] ?? 0) - (scoreRank[profB?.classification] ?? 0);
      });
      targetSkill = otherSkills[0] || lastSkill;
      const prof = profileSkills[targetSkill.skillId];
      targetDifficulty = prof?.adaptiveRecommendedDifficulty || 'ADVANCED';
    }
  }

  return { targetSkill, targetDifficulty };
};

/**
 * Legacy adaptive question getter from QuestionBank / Assessment pool
 */
const getNextAdaptiveQuestion = async ({ attempt, courseId, assessment }) => {
  const answeredIds = new Set((attempt.answeredQuestionIds || []).map((id) => id.toString()));
  const answers = attempt.answers || [];

  let candidatePool = await QuestionBank.find({
    courseId,
    isActive: true,
  }).lean();

  if (candidatePool.length === 0 && assessment?.questions?.length > 0) {
    candidatePool = assessment.questions.map((q) => {
      const obj = typeof q.toObject === 'function' ? q.toObject() : q;
      return { ...obj, _id: obj._id || obj.questionId };
    });
  }

  const availableQuestions = candidatePool.filter((q) => {
    const qId = (q.questionId || q._id?.toString()).toString();
    return !answeredIds.has(qId);
  });

  const MAX_QUESTIONS_PER_ATTEMPT = Math.min(
    assessment?.maxQuestions || 10,
    candidatePool.length || 10
  );

  if (availableQuestions.length === 0 || answers.length >= MAX_QUESTIONS_PER_ATTEMPT) {
    return {
      question: null,
      isComplete: true,
      currentStep: answers.length,
      totalTarget: Math.min(MAX_QUESTIONS_PER_ATTEMPT, candidatePool.length),
    };
  }

  const course = await Course.findById(courseId).lean();
  const competencies = course?.competencies || [];

  const questionsBySkill = {};
  availableQuestions.forEach((q) => {
    const sId = q.skillId || 'GENERAL';
    if (!questionsBySkill[sId]) questionsBySkill[sId] = [];
    questionsBySkill[sId].push(q);
  });

  const skillAnswerCounts = {};
  answers.forEach((ans) => {
    const sId = ans.skillId || 'GENERAL';
    skillAnswerCounts[sId] = (skillAnswerCounts[sId] || 0) + 1;
  });

  const availableSkillIds = Object.keys(questionsBySkill);
  availableSkillIds.sort((a, b) => {
    const countA = skillAnswerCounts[a] || 0;
    const countB = skillAnswerCounts[b] || 0;
    return countA - countB;
  });

  const targetSkillId = availableSkillIds[0];
  const skillQuestions = questionsBySkill[targetSkillId] || availableQuestions;

  const compState = attempt.competencyStates?.[targetSkillId] || {};
  let targetDifficulty = 'INTERMEDIATE';

  if (compState.lastAnswerCorrect === true) {
    targetDifficulty = 'ADVANCED';
  } else if (compState.lastAnswerCorrect === false) {
    targetDifficulty = 'BEGINNER';
  }

  let selectedQ = skillQuestions.find((q) => q.difficulty === targetDifficulty);
  if (!selectedQ) {
    selectedQ = skillQuestions.find((q) => q.difficulty === 'INTERMEDIATE');
  }
  if (!selectedQ) {
    selectedQ = skillQuestions[0];
  }

  return {
    question: sanitizeQuestionForClient(selectedQ),
    rawQuestion: selectedQ,
    isComplete: false,
    currentStep: answers.length + 1,
    totalTarget: Math.min(MAX_QUESTIONS_PER_ATTEMPT, candidatePool.length),
  };
};

/**
 * Deterministically evaluate a single question answer
 */
const evaluateAnswer = (question, selectedAnswer) => {
  if (!question || !selectedAnswer) {
    return { isCorrect: false, marks: 0, maxMarks: question?.marks || 1 };
  }

  const correct = (question.correctAnswer || '').toString().trim().toUpperCase();
  const selected = selectedAnswer.toString().trim().toUpperCase();
  const isCorrect = correct === selected;
  const maxMarks = question.marks || 1;
  const marks = isCorrect ? maxMarks : 0;

  return {
    isCorrect,
    marks,
    maxMarks,
  };
};

/**
 * Deterministically evaluate entire attempt results across competencies
 */
const evaluateAttemptDeterministically = (questions, answers) => {
  const skillBuckets = {};
  let totalEarned = 0;
  let totalMax = 0;

  questions.forEach((q) => {
    const skillId = q.skillId || 'GENERAL';
    const skillName = q.skillName || 'General Skill';
    const marks = q.marks || 1;

    if (!skillBuckets[skillId]) {
      skillBuckets[skillId] = {
        skillId,
        skillName,
        earnedScore: 0,
        maxScore: 0,
        questionsTotal: 0,
        questionsCorrect: 0,
        wrongTopics: [],
      };
    }

    skillBuckets[skillId].maxScore += marks;
    skillBuckets[skillId].questionsTotal += 1;
    totalMax += marks;

    const qIdent1 = (q.questionId || '').toString();
    const qIdent2 = (q._id || '').toString();
    const traineeAns = Array.isArray(answers)
      ? answers.find((a) => a.questionId === qIdent1 || a.questionId === qIdent2)
      : (answers[qIdent1] || answers[qIdent2]);

    const isCorrect = traineeAns?.isCorrect ?? (
      traineeAns?.selectedAnswer &&
      traineeAns.selectedAnswer.toString().trim().toUpperCase() ===
        (q.correctAnswer || '').toString().trim().toUpperCase()
    );

    if (isCorrect) {
      skillBuckets[skillId].earnedScore += marks;
      skillBuckets[skillId].questionsCorrect += 1;
      totalEarned += marks;
    } else {
      if (q.questionText) {
        skillBuckets[skillId].wrongTopics.push(q.questionText.slice(0, 70));
      }
    }
  });

  const skillResults = Object.values(skillBuckets).map((b) => {
    const pct = b.maxScore > 0 ? Math.round((b.earnedScore / b.maxScore) * 100) : 0;
    let classification = 'DEVELOPING';
    if (pct >= 80) classification = 'STRONG';
    else if (pct >= 60) classification = 'DEVELOPING';
    else if (pct >= 40) classification = 'WEAK';
    else classification = 'CRITICAL_GAP';

    return {
      skillId: b.skillId,
      skillName: b.skillName,
      score: b.earnedScore,
      maxScore: b.maxScore,
      percentage: pct,
      classification,
      gapScore: 100 - pct,
      questionsTotal: b.questionsTotal,
      questionsCorrect: b.questionsCorrect,
      wrongTopics: b.wrongTopics,
      confidence: b.questionsTotal >= 3 ? 'HIGH' : 'MEDIUM',
    };
  });

  const overallPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return {
    overallScore: totalEarned,
    overallMaxScore: totalMax,
    overallPercentage,
    skillResults,
    strongSkills: skillResults.filter((s) => s.percentage >= 80).map((s) => s.skillName),
    developingSkills: skillResults.filter((s) => s.percentage >= 60 && s.percentage < 80).map((s) => s.skillName),
    weakSkills: skillResults.filter((s) => s.percentage >= 40 && s.percentage < 60).map((s) => s.skillName),
    atRiskSkills: skillResults.filter((s) => s.percentage >= 40 && s.percentage < 60).map((s) => s.skillName),
    criticalGaps: skillResults.filter((s) => s.percentage < 40).map((s) => s.skillName),
  };
};

/**
 * Generate AI Diagnostic Insights using Groq LLM
 */
const generateAIDiagnosticInsight = async ({ courseName, deterministicResult, traineeName }) => {
  if (!isAvailable()) {
    return generateFallbackDiagnostic(courseName, deterministicResult);
  }

  const systemPrompt = `You are a Senior Vocational Skilling Diagnostic Assessor for the Directorate General of Training.
Analyze the deterministic competency assessment result for a trainee in "${courseName}".
Provide an actionable, evidence-based diagnostic assessment.
Return strict JSON with fields:
{
  "summary": "2-3 sentence executive diagnosis",
  "rootCauseAnalysis": "Why did the trainee struggle with specific skills?",
  "identifiedMisconceptions": [{"skill": "name", "misconception": "description", "correctModel": "description"}],
  "recommendedIntervention": "Specific 10-15 hour remedial module focus",
  "careerReadinessAssessment": "Rating (READY, NEAR_READY, NEEDS_INTERVENTION) and justification",
  "learningRoadmap": ["Step 1", "Step 2", "Step 3"]
}`;

  const userPrompt = `Trainee Name: ${traineeName || 'Trainee'}
Overall Score: ${deterministicResult.overallPercentage}%
Skill Breakdown:
${deterministicResult.skillResults.map((s) => `- ${s.skillName}: ${s.percentage}% (${s.classification})`).join('\n')}
Critical Gaps: ${deterministicResult.criticalGaps.join(', ') || 'None'}
Weak Subtopics: ${deterministicResult.skillResults.map((s) => s.wrongTopics.join('; ')).filter(Boolean).join(' | ')}`;

  try {
    const aiResponse = await chatCompletion(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.2 });
    if (aiResponse && !aiResponse._parseError) {
      return {
        aiAvailable: true,
        summary: aiResponse.summary || '',
        rootCauseAnalysis: aiResponse.rootCauseAnalysis || '',
        identifiedMisconceptions: aiResponse.identifiedMisconceptions || [],
        recommendedIntervention: aiResponse.recommendedIntervention || '',
        careerReadinessAssessment: aiResponse.careerReadinessAssessment || 'NEAR_READY',
        learningRoadmap: aiResponse.learningRoadmap || [],
      };
    }
  } catch (err) {
    console.error('Groq AI Diagnostic call failed, using rule-based diagnostic:', err.message);
  }

  return generateFallbackDiagnostic(courseName, deterministicResult);
};

const generateFallbackDiagnostic = (courseName, result) => {
  const critical = result.criticalGaps.length > 0 ? result.criticalGaps.join(', ') : 'None';
  return {
    aiAvailable: false,
    summary: `Candidate demonstrated ${result.overallPercentage}% overall competency in ${courseName}. Core fundamentals are stable, but diagnostic gaps emerged in: ${critical}.`,
    rootCauseAnalysis: `Performance indicates conceptual understanding of basic syntax, with difficulties in practical edge cases and architectural application.`,
    identifiedMisconceptions: result.criticalGaps.map((skill) => ({
      skill,
      misconception: `Struggled with complex application scenarios and diagnostics in ${skill}.`,
      correctModel: `Hands-on guided laboratory practice and structured debugging exercises.`,
    })),
    recommendedIntervention: result.criticalGaps.length > 0
      ? `Conduct a targeted 10-hour practical laboratory module focused on ${critical}.`
      : `Continue advanced practical case studies and industry mentorship.`,
    careerReadinessAssessment: result.overallPercentage >= 70 ? 'NEAR_READY' : 'NEEDS_INTERVENTION',
    learningRoadmap: [
      `Review fundamentals of ${critical}`,
      `Complete 5 hands-on diagnostic exercises`,
      `Attempt post-remediation reassessment`,
    ],
  };
};

module.exports = {
  sanitizeQuestionForClient,
  getNextAdaptiveQuestion,
  consolidateCaseStudyEvidence,
  determineNextAdaptiveTarget,
  evaluateAnswer,
  evaluateAttemptDeterministically,
  generateAIDiagnosticInsight,
};
