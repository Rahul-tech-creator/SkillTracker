const mongoose = require('mongoose');

const communicationAttemptSchema = new mongoose.Schema(
  {
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
      index: true,
    },
    followUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      default: null,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    channel: {
      type: String,
      enum: ['WHATSAPP', 'EMAIL', 'SMS', 'CALL', 'SYSTEM'],
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: ['DAY_0_DIGITAL', 'DAY_3_REMINDER', 'DAY_6_ASSISTED_CALL', 'AD_HOC_FOLLOWUP'],
      default: 'DAY_0_DIGITAL',
      index: true,
    },
    destination: {
      type: String,
      trim: true,
      default: '', // Phone number or email address reached
    },
    status: {
      type: String,
      enum: [
        'SENT',
        'DELIVERED',
        'OPENED',
        'RESPONDED',
        'FAILED',
        'NO_ANSWER',
        'BUSY',
        'WRONG_NUMBER',
        'CALL_COMPLETED',
        'CALLBACK_REQUESTED',
      ],
      default: 'SENT',
      index: true,
    },
    messageSnippet: {
      type: String,
      trim: true,
      default: '',
    },
    operatorNotes: {
      type: String,
      trim: true,
      default: '',
    },
    callDurationSeconds: {
      type: Number,
      default: 0,
    },
    callerOperatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CommunicationAttempt', communicationAttemptSchema);
