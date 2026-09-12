const mongoose = require('mongoose');

const communicationHistorySchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['WHATSAPP', 'EMAIL', 'PHONE_CALL', 'SYSTEM', 'PORTAL', 'GOVERNMENT'],
      required: true,
    },
    action: {
      type: String,
      enum: [
        'FOLLOWUP_SCHEDULED',
        'FOLLOWUP_DUE',
        'MESSAGE_GENERATED',
        'WHATSAPP_OPENED',
        'EMAIL_COMPOSED',
        'MANUALLY_SENT',
        'NO_RESPONSE_DIGITAL',
        'ESCALATED_TO_CALL',
        'CALL_INITIATED',
        'CALL_LOGGED',
        'NO_RESPONSE_CALL',
        'ESCALATED_TO_GOVERNMENT',
        'GOVERNMENT_STATUS_UPDATED',
        'TRAINEE_RESPONDED',
        'OPTED_OUT',
        'RETURNED',
        'RESUMED_TRACKING',
        'RESCHEDULED',
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    outcome: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    performedByName: {
      type: String,
      trim: true,
      default: 'System Automation',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

communicationHistorySchema.index({ traineeId: 1, timestamp: -1 });
communicationHistorySchema.index({ followUpId: 1, timestamp: -1 });
communicationHistorySchema.index({ providerId: 1, action: 1 });

module.exports = mongoose.model('CommunicationHistory', communicationHistorySchema);
