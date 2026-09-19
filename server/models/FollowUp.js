const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      default: null,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    // Standard Longitudinal Post-Training Milestones
    followUpType: {
      type: String,
      enum: [
        '3_MONTH',
        '6_MONTH',
        '9_MONTH',
        '12_MONTH',
        // Legacy compatibility
        'INITIAL_3_DAY',
        '30_DAY',
        '90_DAY',
        '180_DAY',
        '365_DAY',
      ],
      required: true,
      index: true,
    },
    daysInterval: {
      type: Number,
      required: true, // 90, 180, 270, 365
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'NOT_DUE',
        'DUE',
        'READY',
        'DIGITAL_CONTACTED',
        'WAITING_FOR_RESPONSE',
        'RESPONDED',
        'CALL_REQUIRED',
        'CALL_ATTEMPTED',
        'NOT_RESPONDED',
        'OPTED_OUT',
        'UNREACHABLE',
        'COMPLETED',
      ],
      default: 'NOT_DUE',
      index: true,
    },

    // Escalation Pipeline (Day 0 -> Day 3 -> Day 6 Assisted Queue)
    escalationStage: {
      type: String,
      enum: ['NOT_STARTED', 'DAY_0_DIGITAL', 'DAY_3_REMINDER', 'DAY_6_ASSISTED_CALL', 'RESOLVED'],
      default: 'NOT_STARTED',
      index: true,
    },
    digitalSentAt: {
      type: Date,
      default: null,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    escalatedToCallQueueAt: {
      type: Date,
      default: null,
      index: true,
    },
    assignedOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    operatorNotes: {
      type: String,
      trim: true,
      default: '',
    },
    lastCallAttemptAt: {
      type: Date,
      default: null,
    },
    callAttemptsCount: {
      type: Number,
      default: 0,
    },

    // Secure token for privacy-safe tracking links
    followUpToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    trackingConsent: {
      type: String,
      enum: ['GRANTED', 'WITHDRAWN', 'PENDING'],
      default: 'GRANTED',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

followUpSchema.index({ traineeId: 1, enrollmentId: 1, followUpType: 1 });
followUpSchema.index({ providerId: 1, status: 1 });
followUpSchema.index({ scheduledDate: 1, status: 1 });
followUpSchema.index({ escalationStage: 1, status: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
