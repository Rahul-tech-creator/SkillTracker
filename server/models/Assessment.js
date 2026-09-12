const mongoose = require('mongoose');
const crypto = require('crypto');

const questionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        label: { type: String, required: true }, // A, B, C, D
        text: { type: String, required: true, trim: true },
      },
    ],
    correctAnswer: {
      type: String,
      required: true, // The label (A/B/C/D)
    },
    skillId: {
      type: String,
      required: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'INTERMEDIATE',
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    skills: [
      {
        skillId: String,
        skillName: String,
        weight: Number,
      },
    ],
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MIXED'],
      default: 'MIXED',
    },
    questionsPerSkill: {
      type: Number,
      default: 5,
      min: 3,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    timeLimitMinutes: {
      type: Number,
      default: null, // null = untimed
    },
    maxAttempts: {
      type: Number,
      default: 2,
      min: 1,
    },
    scoringPolicy: {
      type: String,
      enum: ['BEST', 'LATEST'],
      default: 'BEST',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
    },
    questions: [questionSchema],
    gapThresholds: {
      strong: { type: Number, default: 80 },
      developing: { type: Number, default: 60 },
      weak: { type: Number, default: 40 },
      criticalGap: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Unique version per course
assessmentSchema.index({ courseId: 1, version: 1 }, { unique: true });
assessmentSchema.index({ providerId: 1 });
assessmentSchema.index({ status: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
