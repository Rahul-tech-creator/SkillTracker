const mongoose = require('mongoose');

const remedialAssessmentSchema = new mongoose.Schema(
  {
    remedialActionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RemedialAction',
      required: true,
      index: true,
    },
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    skillId: {
      type: String,
      required: true,
    },
    beforeScore: {
      type: Number,
      required: true,
    },
    afterScore: {
      type: Number,
      required: true,
    },
    improvement: {
      type: Number,
      required: true, // afterScore - beforeScore
    },
    questionsAttempted: {
      type: Number,
      default: 5,
    },
    questionsCorrect: {
      type: Number,
      default: 4,
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RemedialAssessment', remedialAssessmentSchema);
