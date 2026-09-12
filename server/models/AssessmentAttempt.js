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
  },
  { timestamps: true }
);

// Prevent duplicate attempt numbers for same trainee + assessment
attemptSchema.index({ assessmentId: 1, traineeId: 1, attemptNumber: 1 }, { unique: true });
attemptSchema.index({ traineeId: 1, courseId: 1 });
attemptSchema.index({ providerId: 1 });

module.exports = mongoose.model('AssessmentAttempt', attemptSchema);
