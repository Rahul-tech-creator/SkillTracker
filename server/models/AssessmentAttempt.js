const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedAnswer: { type: String, default: null }, // The label (A/B/C/D) or null if unanswered
    isCorrect: { type: Boolean, default: false },
    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 1 },
  },
  { _id: false }
);

const skillScoreSchema = new mongoose.Schema(
  {
    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 0 },
  },
  { _id: false }
);

const caseStudyResponseSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    selectedAnswer: { type: String, default: null },
    isCorrect: { type: Boolean, default: false },
    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 1 },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const caseStudyEvidenceSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    competencies: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    misconceptions: [{ type: String }],
    evidenceLevel: { type: String, default: 'MEDIUM' },
    analysisStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    analyzedAt: { type: Date, default: null },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const adaptiveQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    options: [
      {
        label: { type: String, required: true },
        text: { type: String, required: true },
      },
    ],
    correctAnswer: { type: String, required: true },
    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'INTERMEDIATE',
    },
    explanation: { type: String, default: '' },
    marks: { type: Number, default: 1 },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const adaptiveResponseSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    selectedAnswer: { type: String, default: null },
    isCorrect: { type: Boolean, default: false },
    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    difficulty: { type: String, default: 'INTERMEDIATE' },
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 1 },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    answers: [answerSchema],
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    skillScores: [skillScoreSchema],
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED'],
      default: 'IN_PROGRESS',
    },
    // Phase tracking
    currentPhase: {
      type: String,
      enum: ['CASE_STUDY', 'ANALYZING_CASE_STUDY', 'PREPARING_ADAPTIVE', 'ADAPTIVE', 'COMPLETED'],
      default: 'CASE_STUDY',
    },
    // Phase 1: Case study answers and asynchronous evidence
    caseStudyResponses: [caseStudyResponseSchema],
    caseStudyEvidence: [caseStudyEvidenceSchema],
    // Phase 2: Runtime generated adaptive questions and trainee responses
    adaptiveQuestions: [adaptiveQuestionSchema],
    adaptiveResponses: [adaptiveResponseSchema],
    // Competency profile built after case study and updated dynamically
    competencyProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    targetAdaptiveQuestions: {
      type: Number,
      default: 5,
    },
    // Adaptive session state tracking
    isAdaptive: {
      type: Boolean,
      default: true,
    },
    currentQuestionId: {
      type: String,
      default: null,
    },
    answeredQuestionIds: [{
      type: String,
    }],
    competencyStates: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Prevent duplicate attempt numbers for same trainee + assessment
attemptSchema.index({ assessmentId: 1, traineeId: 1, attemptNumber: 1 }, { unique: true });
attemptSchema.index({ traineeId: 1, courseId: 1 });
attemptSchema.index({ providerId: 1 });

module.exports = mongoose.model('AssessmentAttempt', attemptSchema);
