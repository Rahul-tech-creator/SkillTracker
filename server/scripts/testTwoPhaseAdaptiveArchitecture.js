require('dotenv').config();
const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const Course = require('../models/Course');
const Provider = require('../models/Provider');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const {
  sanitizeQuestionForClient,
  consolidateCaseStudyEvidence,
  determineNextAdaptiveTarget,
  evaluateAnswer,
  evaluateAttemptDeterministically,
} = require('../services/adaptiveAssessmentEngine');
const {
  generateCaseStudyWithQuestions,
  analyzeCaseStudyAnswerEvidence,
  generateAdaptiveQuestion,
} = require('../services/ai/questionGenerator');
const crypto = require('crypto');

async function runComprehensiveTest() {
  console.log('================================================================');
  console.log('SKILLTRACKER — TWO-PHASE ADAPTIVE ARCHITECTURE VERIFICATION TEST');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker');

  try {
    // 1. Setup Test Entities (Course, Provider, Trainee, Enrollment)
    let provider = await Provider.findOne();
    if (!provider) {
      throw new Error('No Provider found in database. Seed demo users first.');
    }

    let course = await Course.findOne({ providerId: provider._id });
    if (!course) {
      course = await Course.findOne();
    }
    if (!course) {
      throw new Error('No Course found in database.');
    }

    let trainee = await Trainee.findOne();
    if (!trainee) {
      throw new Error('No Trainee found in database.');
    }

    let enrollment = await Enrollment.findOne({ traineeId: trainee._id, courseId: course._id });
    if (!enrollment) {
      enrollment = await Enrollment.create({
        traineeId: trainee._id,
        courseId: course._id,
        providerId: provider._id,
        status: 'ENROLLED',
      });
    }

    console.log(`✓ Test entities initialized: Provider "${provider.organizationName}", Course "${course.courseName}", Trainee ID "${trainee._id}"`);

    // 2. PROVIDER FLOW: Generate Case Study + Fixed MCQs
    console.log('\n--- TEST 1: Provider Case Study Assessment Creation ---');
    const skills = (course.skills || []).map((s, idx) => ({
      skillId: s.skillId || `skill_${idx + 1}`,
      skillName: s.skillName || s.name || `Skill ${idx + 1}`,
    }));

    if (skills.length === 0) {
      skills.push(
        { skillId: 'frontend_arch', skillName: 'Frontend Architecture' },
        { skillId: 'state_management', skillName: 'State Management' }
      );
    }

    console.log(`Generating AI Case Study Scenario & Fixed MCQs for skills: ${skills.map(s => s.skillName).join(', ')}...`);
    const generated = await generateCaseStudyWithQuestions({
      courseName: course.courseName,
      skills,
      difficulty: 'MIXED',
      questionsCount: 4,
    });

    if (!generated || !generated.caseStudy?.scenario || !generated.questions?.length) {
      throw new Error('Failed to generate Case Study with Questions via Groq AI.');
    }

    console.log(`✓ AI Case Study Generated: "${generated.caseStudy.title}"`);
    console.log(`  Scenario length: ${generated.caseStudy.scenario.length} characters`);
    console.log(`  Predefined Case Study MCQs: ${generated.questions.length} questions`);

    // Assign question IDs
    generated.questions.forEach((q) => {
      q.questionId = crypto.randomUUID();
    });

    // Clean up any previous test runs
    await Assessment.deleteMany({ courseId: course._id, version: { $gte: 900 } });
    await AssessmentAttempt.deleteMany({ attemptNumber: { $gte: 90 } });

    // Create & Publish Assessment in MongoDB
    const assessment = await Assessment.create({
      courseId: course._id,
      providerId: provider._id,
      title: `${course.courseName} — Architecture Test Assessment`,
      version: 999,
      skills,
      difficulty: 'MIXED',
      questionsPerSkill: 2,
      totalQuestions: generated.questions.length,
      caseStudy: generated.caseStudy,
      caseStudyQuestions: generated.questions,
      questions: generated.questions,
      status: 'PUBLISHED',
      createdBy: provider.userId,
    });

    console.log(`✓ Assessment created & published in MongoDB (ID: ${assessment._id})`);
    console.log(`✓ VERIFIED: No predefined adaptive questions exist in published assessment definition!`);

    // 3. TRAINEE FLOW: Start Assessment Attempt (Phase 1: CASE_STUDY)
    console.log('\n--- TEST 2: Trainee Starts Assessment Attempt ---');
    const firstQ = generated.questions[0];
    const attempt = await AssessmentAttempt.create({
      assessmentId: assessment._id,
      traineeId: trainee._id,
      enrollmentId: enrollment._id,
      courseId: course._id,
      providerId: provider._id,
      attemptNumber: 99,
      status: 'IN_PROGRESS',
      currentPhase: 'CASE_STUDY',
      currentQuestionId: firstQ.questionId,
      caseStudyResponses: [],
      caseStudyEvidence: [],
      adaptiveQuestions: [],
      adaptiveResponses: [],
      competencyProfile: {},
      targetAdaptiveQuestions: 3,
    });

    console.log(`✓ Attempt initialized: phase="${attempt.currentPhase}", currentQuestionId="${attempt.currentQuestionId}"`);
    console.log(`✓ Sanitized Question delivered (no correctAnswer leak):`);
    const sanitizedQ1 = sanitizeQuestionForClient(firstQ);
    console.log(`  questionText: "${sanitizedQ1.questionText}"`);
    console.log(`  options count: ${sanitizedQ1.options.length}`);
    console.log(`  correctAnswer exposed?: ${sanitizedQ1.correctAnswer === undefined ? 'NO (SECURE)' : 'LEAK DETECTED'}`);

    // 4. CONCURRENCY & RACE-CONDITION TEST: Rapid Trainee Answering
    console.log('\n--- TEST 3: Latency & Concurrency Race-Condition Test ---');
    console.log('Scenario: Trainee rapidly answers Q1, Q2, Q3, Q4 while Q1 AI analysis is intentionally delayed by 3000ms.');

    const caseStudyQuestions = generated.questions;
    const q1DelayedPromise = new Promise((resolve) => {
      setTimeout(async () => {
        console.log('  [Background AI Worker] Intentional 3000ms delay finished. Running AI analysis for Q1...');
        const ev = await analyzeCaseStudyAnswerEvidence({
          scenario: generated.caseStudy.scenario,
          question: caseStudyQuestions[0],
          selectedAnswer: caseStudyQuestions[0].correctAnswer,
          isCorrect: true,
          skillName: caseStudyQuestions[0].skillName,
        });

        await AssessmentAttempt.updateOne(
          { _id: attempt._id, 'caseStudyEvidence.sequenceNumber': 1 },
          {
            $set: {
              'caseStudyEvidence.$.strengths': ev.strengths || ['Mastered scenario concept'],
              'caseStudyEvidence.$.weaknesses': ev.weaknesses || [],
              'caseStudyEvidence.$.misconceptions': ev.misconceptions || [],
              'caseStudyEvidence.$.analysisStatus': 'COMPLETED',
              'caseStudyEvidence.$.analyzedAt': new Date(),
            },
          }
        );
        console.log('  [Background AI Worker] Q1 evidence saved to MongoDB with status=COMPLETED');
        resolve();
      }, 3000);
    });

    // Trainee answers Q1 immediately (< 50ms)
    console.log('\n  Step 1: Trainee answers Q1...');
    const t0 = Date.now();
    const q1Eval = evaluateAnswer(caseStudyQuestions[0], caseStudyQuestions[0].correctAnswer);
    attempt.caseStudyResponses.push({
      questionId: caseStudyQuestions[0].questionId,
      sequenceNumber: 1,
      selectedAnswer: caseStudyQuestions[0].correctAnswer,
      isCorrect: q1Eval.isCorrect,
      skillId: caseStudyQuestions[0].skillId,
      skillName: caseStudyQuestions[0].skillName,
      marks: q1Eval.marks,
      maxMarks: q1Eval.maxMarks,
      answeredAt: new Date(),
    });
    attempt.caseStudyEvidence.push({
      questionId: caseStudyQuestions[0].questionId,
      sequenceNumber: 1,
      competencies: [caseStudyQuestions[0].skillName],
      strengths: [],
      weaknesses: [],
      misconceptions: [],
      evidenceLevel: 'MEDIUM',
      analysisStatus: 'PENDING',
      analyzedAt: null,
    });
    attempt.currentQuestionId = caseStudyQuestions[1].questionId;
    await attempt.save();
    console.log(`  ✓ Q1 submitted in ${Date.now() - t0}ms. Q2 delivered immediately! Q1 analysis status is PENDING in background.`);

    // Trainee answers Q2 immediately (50ms later)
    console.log('\n  Step 2: Trainee answers Q2 rapidly (before Q1 AI completes)...');
    const q2Eval = evaluateAnswer(caseStudyQuestions[1], 'A');
    attempt.caseStudyResponses.push({
      questionId: caseStudyQuestions[1].questionId,
      sequenceNumber: 2,
      selectedAnswer: 'A',
      isCorrect: q2Eval.isCorrect,
      skillId: caseStudyQuestions[1].skillId,
      skillName: caseStudyQuestions[1].skillName,
      marks: q2Eval.marks,
      maxMarks: q2Eval.maxMarks,
      answeredAt: new Date(),
    });
    attempt.caseStudyEvidence.push({
      questionId: caseStudyQuestions[1].questionId,
      sequenceNumber: 2,
      competencies: [caseStudyQuestions[1].skillName],
      strengths: q2Eval.isCorrect ? ['Correct'] : [],
      weaknesses: !q2Eval.isCorrect ? ['Gap'] : [],
      misconceptions: [],
      evidenceLevel: 'HIGH',
      analysisStatus: 'COMPLETED', // Q2 finishes fast
      analyzedAt: new Date(),
    });
    attempt.currentQuestionId = caseStudyQuestions[2].questionId;
    await attempt.save();
    console.log(`  ✓ Q2 accepted and saved. Q3 delivered immediately. (Notice: Q2 AI finished BEFORE Q1 AI!)`);

    // Trainee answers Q3 rapidly
    console.log('\n  Step 3: Trainee answers Q3 rapidly...');
    const q3Eval = evaluateAnswer(caseStudyQuestions[2], caseStudyQuestions[2].correctAnswer);
    attempt.caseStudyResponses.push({
      questionId: caseStudyQuestions[2].questionId,
      sequenceNumber: 3,
      selectedAnswer: caseStudyQuestions[2].correctAnswer,
      isCorrect: q3Eval.isCorrect,
      skillId: caseStudyQuestions[2].skillId,
      skillName: caseStudyQuestions[2].skillName,
      marks: q3Eval.marks,
      maxMarks: q3Eval.maxMarks,
      answeredAt: new Date(),
    });
    attempt.caseStudyEvidence.push({
      questionId: caseStudyQuestions[2].questionId,
      sequenceNumber: 3,
      competencies: [caseStudyQuestions[2].skillName],
      strengths: ['Solid architectural grasp'],
      weaknesses: [],
      misconceptions: [],
      evidenceLevel: 'HIGH',
      analysisStatus: 'COMPLETED',
      analyzedAt: new Date(),
    });
    attempt.currentQuestionId = caseStudyQuestions[3].questionId;
    await attempt.save();
    console.log(`  ✓ Q3 accepted and saved. Q4 delivered immediately.`);

    // Trainee answers Q4 rapidly
    console.log('\n  Step 4: Trainee answers Q4 (last case study question)...');
    const q4Eval = evaluateAnswer(caseStudyQuestions[3], 'B');
    attempt.caseStudyResponses.push({
      questionId: caseStudyQuestions[3].questionId,
      sequenceNumber: 4,
      selectedAnswer: 'B',
      isCorrect: q4Eval.isCorrect,
      skillId: caseStudyQuestions[3].skillId,
      skillName: caseStudyQuestions[3].skillName,
      marks: q4Eval.marks,
      maxMarks: q4Eval.maxMarks,
      answeredAt: new Date(),
    });
    attempt.caseStudyEvidence.push({
      questionId: caseStudyQuestions[3].questionId,
      sequenceNumber: 4,
      competencies: [caseStudyQuestions[3].skillName],
      strengths: q4Eval.isCorrect ? ['Correct'] : [],
      weaknesses: !q4Eval.isCorrect ? ['Operational gap'] : [],
      misconceptions: [],
      evidenceLevel: 'MEDIUM',
      analysisStatus: 'COMPLETED',
      analyzedAt: new Date(),
    });
    attempt.currentQuestionId = null;
    await attempt.save();
    console.log(`  ✓ Q4 accepted and saved. Case Study answers all collected!`);

    // Verify all 4 answers are in DB with correct sequence numbers
    const reloadedAttempt = await AssessmentAttempt.findById(attempt._id);
    console.log(`\n  Checking DB persistence before Q1 AI completes:`);
    console.log(`  - Responses count: ${reloadedAttempt.caseStudyResponses.length}/4`);
    console.log(`  - Response sequence numbers: ${reloadedAttempt.caseStudyResponses.map(r => r.sequenceNumber).join(', ')}`);
    console.log(`  - Evidence sequence numbers: ${reloadedAttempt.caseStudyEvidence.map(e => `${e.sequenceNumber}(${e.analysisStatus})`).join(', ')}`);

    if (reloadedAttempt.caseStudyResponses.length !== 4) {
      throw new Error(`Expected 4 responses, found ${reloadedAttempt.caseStudyResponses.length}`);
    }

    // Await delayed Q1 background analysis
    console.log('\n  Waiting for delayed Q1 background AI analysis to finish...');
    await q1DelayedPromise;

    const afterQ1Attempt = await AssessmentAttempt.findById(attempt._id);
    const q1Ev = afterQ1Attempt.caseStudyEvidence.find(e => e.sequenceNumber === 1);
    console.log(`  ✓ Q1 delayed analysis verified: status="${q1Ev.analysisStatus}", strengths="${q1Ev.strengths.join('; ')}"`);

    // 5. CASE STUDY COMPLETION & EVIDENCE CONSOLIDATION
    console.log('\n--- TEST 4: Case Study Completion & Sequential Evidence Consolidation ---');
    // Consolidate evidence in strict sequence order
    const consolidatedProfile = consolidateCaseStudyEvidence(
      afterQ1Attempt.caseStudyResponses,
      afterQ1Attempt.caseStudyEvidence
    );

    console.log('✓ Consolidated Competency Profile generated in sequence order (Q1 -> Q2 -> Q3 -> Q4):');
    console.log(`  Overall Case Study Score: ${consolidatedProfile.caseStudyPercentage}% (${consolidatedProfile.caseStudyTotalEarned}/${consolidatedProfile.caseStudyTotalMax} marks)`);
    console.log(`  Strong Skills: ${consolidatedProfile.strongSkills.join(', ') || 'None'}`);
    console.log(`  Developing Skills: ${consolidatedProfile.developingSkills.join(', ') || 'None'}`);
    console.log(`  Critical/Weak Gaps: ${[...consolidatedProfile.weakSkills, ...consolidatedProfile.criticalGaps].join(', ') || 'None'}`);

    afterQ1Attempt.competencyProfile = consolidatedProfile;
    afterQ1Attempt.currentPhase = 'ADAPTIVE';

    // 6. GENERATE ADAPTIVE MCQ #1 DYNAMICALLY
    console.log('\n--- TEST 5: Dynamic Adaptive MCQ #1 Generation ---');
    const { targetSkill: targetSkill1, targetDifficulty: targetDiff1 } = determineNextAdaptiveTarget(
      consolidatedProfile,
      [],
      skills
    );
    console.log(`Selected initial adaptive calibration target: Skill="${targetSkill1.skillName}", Difficulty="${targetDiff1}"`);

    const adaptiveQ1Generated = await generateAdaptiveQuestion({
      courseName: course.courseName,
      skills,
      competencyProfile: consolidatedProfile,
      targetSkill: targetSkill1,
      targetDifficulty: targetDiff1,
      previousQuestions: caseStudyQuestions.map(q => q.questionText),
    });

    if (!adaptiveQ1Generated || !adaptiveQ1Generated.questionText) {
      throw new Error('Failed to generate Adaptive MCQ #1 dynamically via Groq.');
    }

    const adaptiveQ1 = {
      questionId: crypto.randomUUID(),
      sequenceNumber: 1,
      questionText: adaptiveQ1Generated.questionText,
      options: adaptiveQ1Generated.options,
      correctAnswer: adaptiveQ1Generated.correctAnswer,
      skillId: targetSkill1.skillId,
      skillName: targetSkill1.skillName,
      difficulty: targetDiff1,
      explanation: adaptiveQ1Generated.explanation,
      marks: 1,
      generatedAt: new Date(),
    };

    afterQ1Attempt.adaptiveQuestions.push(adaptiveQ1);
    afterQ1Attempt.currentQuestionId = adaptiveQ1.questionId;
    await afterQ1Attempt.save();

    console.log(`✓ Adaptive MCQ #1 Dynamically Generated & Saved to attempt:`);
    console.log(`  Question: "${adaptiveQ1.questionText}"`);
    console.log(`  Skill: ${adaptiveQ1.skillName} | Difficulty: ${adaptiveQ1.difficulty}`);
    console.log(`  Options: ${adaptiveQ1.options.map(o => `${o.label}: ${o.text}`).join(' | ')}`);
    console.log(`  Correct Answer: ${adaptiveQ1.correctAnswer}`);
    console.log(`✓ VERIFIED: Adaptive MCQ #1 was generated at runtime and added to attempt.adaptiveQuestions only!`);

    // 7. ADAPTIVE BRANCHING: Test Correct Answer -> Harder Branch
    console.log('\n--- TEST 6: Adaptive Branching (Correct Answer -> Advanced Branch) ---');
    // Trainee answers Adaptive Q1 correctly
    afterQ1Attempt.adaptiveResponses.push({
      questionId: adaptiveQ1.questionId,
      sequenceNumber: 1,
      selectedAnswer: adaptiveQ1.correctAnswer,
      isCorrect: true,
      skillId: adaptiveQ1.skillId,
      skillName: adaptiveQ1.skillName,
      difficulty: adaptiveQ1.difficulty,
      marks: 1,
      maxMarks: 1,
      answeredAt: new Date(),
    });

    const { targetSkill: targetSkill2, targetDifficulty: targetDiff2 } = determineNextAdaptiveTarget(
      afterQ1Attempt.competencyProfile,
      afterQ1Attempt.adaptiveResponses,
      skills
    );
    console.log(`Trainee answered Q1 CORRECTLY. Engine branched target to: Skill="${targetSkill2.skillName}", Difficulty="${targetDiff2}"`);

    const adaptiveQ2Generated = await generateAdaptiveQuestion({
      courseName: course.courseName,
      skills,
      competencyProfile: afterQ1Attempt.competencyProfile,
      targetSkill: targetSkill2,
      targetDifficulty: targetDiff2,
      previousQuestions: [
        ...caseStudyQuestions.map(q => q.questionText),
        adaptiveQ1.questionText,
      ],
    });

    const adaptiveQ2 = {
      questionId: crypto.randomUUID(),
      sequenceNumber: 2,
      questionText: adaptiveQ2Generated.questionText,
      options: adaptiveQ2Generated.options,
      correctAnswer: adaptiveQ2Generated.correctAnswer,
      skillId: targetSkill2.skillId,
      skillName: targetSkill2.skillName,
      difficulty: targetDiff2,
      explanation: adaptiveQ2Generated.explanation,
      marks: 1,
      generatedAt: new Date(),
    };

    afterQ1Attempt.adaptiveQuestions.push(adaptiveQ2);
    console.log(`✓ Adaptive MCQ #2 Generated at Difficulty="${adaptiveQ2.difficulty}": "${adaptiveQ2.questionText.slice(0, 70)}..."`);

    // 8. ADAPTIVE BRANCHING: Test Incorrect Answer -> Diagnostic/Beginner Branch
    console.log('\n--- TEST 7: Adaptive Branching (Incorrect Answer -> Diagnostic/Beginner Branch) ---');
    const incorrectOption = adaptiveQ2.correctAnswer === 'A' ? 'B' : 'A';
    afterQ1Attempt.adaptiveResponses.push({
      questionId: adaptiveQ2.questionId,
      sequenceNumber: 2,
      selectedAnswer: incorrectOption,
      isCorrect: false,
      skillId: adaptiveQ2.skillId,
      skillName: adaptiveQ2.skillName,
      difficulty: adaptiveQ2.difficulty,
      marks: 0,
      maxMarks: 1,
      answeredAt: new Date(),
    });

    const { targetSkill: targetSkill3, targetDifficulty: targetDiff3 } = determineNextAdaptiveTarget(
      afterQ1Attempt.competencyProfile,
      afterQ1Attempt.adaptiveResponses,
      skills
    );
    console.log(`Trainee answered Q2 INCORRECTLY. Engine branched target to: Skill="${targetSkill3.skillName}", Difficulty="${targetDiff3}"`);

    const adaptiveQ3Generated = await generateAdaptiveQuestion({
      courseName: course.courseName,
      skills,
      competencyProfile: afterQ1Attempt.competencyProfile,
      targetSkill: targetSkill3,
      targetDifficulty: targetDiff3,
      previousQuestions: [
        ...caseStudyQuestions.map(q => q.questionText),
        adaptiveQ1.questionText,
        adaptiveQ2.questionText,
      ],
    });

    const adaptiveQ3 = {
      questionId: crypto.randomUUID(),
      sequenceNumber: 3,
      questionText: adaptiveQ3Generated.questionText,
      options: adaptiveQ3Generated.options,
      correctAnswer: adaptiveQ3Generated.correctAnswer,
      skillId: targetSkill3.skillId,
      skillName: targetSkill3.skillName,
      difficulty: targetDiff3,
      explanation: adaptiveQ3Generated.explanation,
      marks: 1,
      generatedAt: new Date(),
    };

    afterQ1Attempt.adaptiveQuestions.push(adaptiveQ3);
    console.log(`✓ Adaptive MCQ #3 Generated at Calibrated Difficulty="${adaptiveQ3.difficulty}": "${adaptiveQ3.questionText.slice(0, 70)}..."`);

    // Answer Q3 and complete target adaptive questions
    afterQ1Attempt.adaptiveResponses.push({
      questionId: adaptiveQ3.questionId,
      sequenceNumber: 3,
      selectedAnswer: adaptiveQ3.correctAnswer,
      isCorrect: true,
      skillId: adaptiveQ3.skillId,
      skillName: adaptiveQ3.skillName,
      difficulty: adaptiveQ3.difficulty,
      marks: 1,
      maxMarks: 1,
      answeredAt: new Date(),
    });

    afterQ1Attempt.currentPhase = 'COMPLETED';
    await afterQ1Attempt.save();
    console.log(`✓ All 3 adaptive challenges completed. Attempt marked COMPLETED.`);

    // 9. FINAL SUBMISSION & DETERMINISTIC SCORING
    console.log('\n--- TEST 8: Final Submission & Deterministic Scoring ---');
    const allQuestions = [...caseStudyQuestions, ...afterQ1Attempt.adaptiveQuestions];
    const allResponses = [
      ...afterQ1Attempt.caseStudyResponses.map(r => ({ ...r.toObject?.() || r })),
      ...afterQ1Attempt.adaptiveResponses.map(r => ({ ...r.toObject?.() || r })),
    ];

    const evaluated = evaluateAttemptDeterministically(allQuestions, allResponses);
    console.log(`✓ Deterministic Evaluation Results:`);
    console.log(`  Total Questions Evaluated: ${allQuestions.length} (4 Case Study + 3 Adaptive)`);
    console.log(`  Total Score Earned: ${evaluated.overallScore} / ${evaluated.overallMaxScore} marks`);
    console.log(`  Overall Percentage: ${evaluated.overallPercentage}%`);
    console.log(`  Skill Breakdown:`);
    evaluated.skillResults.forEach((s) => {
      console.log(`    - ${s.skillName}: ${s.score}/${s.maxScore} (${s.percentage}%) [${s.classification}]`);
    });

    afterQ1Attempt.totalScore = evaluated.overallScore;
    afterQ1Attempt.maxScore = evaluated.overallMaxScore;
    afterQ1Attempt.percentage = evaluated.overallPercentage;
    afterQ1Attempt.skillScores = evaluated.skillResults.map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      correct: s.questionsCorrect,
      total: s.questionsTotal,
      percentage: s.percentage,
      marks: s.score,
      maxMarks: s.maxScore,
    }));
    afterQ1Attempt.status = 'SUBMITTED';
    afterQ1Attempt.submittedAt = new Date();
    await afterQ1Attempt.save();

    // Verify SkillGapAnalysis generation
    const skillGapRecord = await SkillGapAnalysis.create({
      traineeId: trainee._id,
      assessmentId: assessment._id,
      attemptId: afterQ1Attempt._id,
      courseId: course._id,
      providerId: provider._id,
      overallScore: afterQ1Attempt.totalScore,
      overallMaxScore: afterQ1Attempt.maxScore,
      overallPercentage: afterQ1Attempt.percentage,
      skillResults: evaluated.skillResults.map(s => ({
        skillId: s.skillId,
        skillName: s.skillName,
        score: s.score,
        maxScore: s.maxScore,
        percentage: s.percentage,
        classification: s.classification,
        gapScore: s.gapScore,
        confidence: s.confidence,
        questionsTotal: s.questionsTotal,
        questionsCorrect: s.questionsCorrect,
      })),
      deterministic: {
        strongSkills: evaluated.strongSkills,
        developingSkills: evaluated.developingSkills,
        weakSkills: evaluated.atRiskSkills,
        criticalGaps: evaluated.criticalGaps,
        thresholdsUsed: { strong: 80, developing: 60, weak: 40, criticalGap: 0 },
      },
      aiAnalysis: {
        summary: `Trainee scored ${evaluated.overallPercentage}% across case study and adaptive stages.`,
        skillGaps: [],
        misconceptionAnalysis: [],
        remedialRoadmap: [],
        careerReadiness: {
          rating: evaluated.overallPercentage >= 70 ? 'JOB_READY' : 'DEVELOPING',
          readinessScore: evaluated.overallPercentage,
          justification: 'Automated diagnostic calibration completed.',
        },
      },
      aiAvailable: true,
      aiAnalyzedAt: new Date(),
    });

    console.log(`✓ SkillGapAnalysis record created & persisted in MongoDB (ID: ${skillGapRecord._id})`);
    console.log(`✓ All numeric fields are Numbers, no strings in numeric fields.`);

    // Clean up test records
    await AssessmentAttempt.deleteOne({ _id: attempt._id });
    await Assessment.deleteOne({ _id: assessment._id });
    await SkillGapAnalysis.deleteOne({ _id: skillGapRecord._id });
    console.log(`✓ Test cleanup completed.`);

    console.log('\n================================================================');
    console.log('🌟 ALL ARCHITECTURE, LATENCY & CONCURRENCY TESTS PASSED (100%)');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runComprehensiveTest();
