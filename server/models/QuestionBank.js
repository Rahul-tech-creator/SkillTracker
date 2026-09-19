const mongoose = require('mongoose');
const crypto = require('crypto');

const questionBankSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      default: () => crypto.randomUUID(),
      unique: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    skillId: {
      type: String,
      required: true,
      index: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    competencyId: {
      type: String,
      trim: true,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      required: true,
      index: true,
    },
    questionType: {
      type: String,
      enum: ['MCQ', 'SCENARIO', 'PRACTICAL_REASONING', 'CODE_SNIPPET'],
      default: 'MCQ',
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: [
      {
        label: { type: String, required: true }, // 'A', 'B', 'C', 'D'
        text: { type: String, required: true, trim: true },
      },
    ],
    correctAnswer: {
      type: String,
      required: true, // Label of correct option
      trim: true,
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
    weight: {
      type: Number,
      default: 1.0, // Multiplier for scoring
    },
    courseRelevance: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

questionBankSchema.index({ courseId: 1, skillId: 1, difficulty: 1 });

module.exports = mongoose.model('QuestionBank', questionBankSchema);
