const mongoose = require('mongoose');

const remedialActionSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
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
    // Context: Recurring systemic gap
    recurringGapPercentage: {
      type: Number,
      default: 50, // e.g. 61% of trainees showed a gap in this skill
    },
    affectedTraineesCount: {
      type: Number,
      default: 0,
    },
    assignedTrainees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainee',
      },
    ],
    // Optional link if individual-level action
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      default: null,
    },
    skillGapAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillGapAnalysis',
      default: null,
    },
    actionTitle: {
      type: String,
      required: true,
      trim: true,
    },
    actionDescription: {
      type: String,
      required: true,
      trim: true,
    },
    durationHours: {
      type: Number,
      default: 10,
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
    },
    status: {
      type: String,
      enum: ['IDENTIFIED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'REASSESSED'],
      default: 'IDENTIFIED',
      index: true,
    },
    scheduledStartDate: {
      type: Date,
      default: null,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    // Before vs After Reassessment Metrics (Measurable Evidence)
    beforeScore: {
      type: Number,
      default: null, // e.g. 48%
    },
    afterScore: {
      type: Number,
      default: null, // e.g. 79%
    },
    improvement: {
      type: Number,
      default: null, // e.g. +31%
    },
    trainerAssigned: {
      type: String,
      trim: true,
      default: '',
    },
    attendanceRate: {
      type: Number,
      default: 0,
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
  },
  { timestamps: true }
);

remedialActionSchema.index({ providerId: 1, courseId: 1, status: 1 });

module.exports = mongoose.model('RemedialAction', remedialActionSchema);
