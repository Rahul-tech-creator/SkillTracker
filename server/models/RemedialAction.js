const mongoose = require('mongoose');

const remedialActionSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      default: null, // null = course-level action
    },
    skillGapAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillGapAnalysis',
      default: null,
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
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['IDENTIFIED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'IDENTIFIED',
    },
    beforeScore: {
      type: Number,
      default: null,
    },
    afterScore: {
      type: Number,
      default: null,
    },
    improvement: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

remedialActionSchema.index({ providerId: 1, courseId: 1 });
remedialActionSchema.index({ traineeId: 1 });
remedialActionSchema.index({ status: 1 });

module.exports = mongoose.model('RemedialAction', remedialActionSchema);
