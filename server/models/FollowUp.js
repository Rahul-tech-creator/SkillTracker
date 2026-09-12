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
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    followUpType: {
      type: String,
      enum: ['INITIAL_3_DAY', '30_DAY', '90_DAY', '180_DAY', '365_DAY'],
      required: true,
    },
    daysInterval: {
      type: Number,
      required: true, // 3, 30, 90, 180, 365
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
        'WHATSAPP_PENDING',
        'EMAIL_PENDING',
        'DIGITAL_CONTACTED',
        'WAITING_FOR_RESPONSE',
        'RESPONDED',
        'CALL_REQUIRED',
        'CALL_ATTEMPTED',
        'WAITING_AFTER_CALL',
        'NOT_RESPONDED',
        'GOVERNMENT_TRACKING_FLAGGED',
        'TRACKING_SUSPENDED',
        'RETURNED',
        'OPTED_OUT',
        'INVALID_CONTACT',
        'RESCHEDULED',
        // Legacy statuses for backwards compatibility
        'SCHEDULED',
        'READY',
        'COMPLETED',
        'UNREACHABLE',
      ],
      default: 'NOT_DUE',
      index: true,
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
    // Digital contact tracking
    digitalContactedAt: {
      type: Date,
      default: null,
    },
    digitalChannel: {
      type: String,
      enum: ['WHATSAPP', 'EMAIL', 'BOTH', 'NONE'],
      default: 'NONE',
    },
    digitalResponseDeadline: {
      type: Date,
      default: null,
    },
    // Call escalation tracking
    callRequiredAt: {
      type: Date,
      default: null,
    },
    callAttemptedAt: {
      type: Date,
      default: null,
    },
    callResponseDeadline: {
      type: Date,
      default: null,
    },
    callAttemptsCount: {
      type: Number,
      default: 0,
    },
    // Government tracking escalation
    escalatedToGovernmentAt: {
      type: Date,
      default: null,
    },
    // Return & Opt-out tracking
    returnedAt: {
      type: Date,
      default: null,
    },
    optedOutAt: {
      type: Date,
      default: null,
    },
    trackingConsent: {
      type: String,
      enum: ['GRANTED', 'WITHDRAWN', 'PENDING'],
      default: 'GRANTED',
    },
    sentAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    lastCommunicationNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Prevent duplicate follow-up of same interval type for the same enrollment
followUpSchema.index({ traineeId: 1, enrollmentId: 1, followUpType: 1 }, { unique: true });
followUpSchema.index({ providerId: 1, status: 1 });
followUpSchema.index({ scheduledDate: 1, status: 1 });
followUpSchema.index({ digitalResponseDeadline: 1, status: 1 });
followUpSchema.index({ callResponseDeadline: 1, status: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
