const mongoose = require('mongoose');

const callAttemptSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    callDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    callOutcome: {
      type: String,
      enum: [
        'CONNECTED',
        'NO_ANSWER',
        'BUSY',
        'WRONG_NUMBER',
        'CALL_BACK_REQUESTED',
        'REFUSED',
        'OTHER',
      ],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordedByName: {
      type: String,
      trim: true,
      default: 'Provider Staff',
    },
    directOutcomeRecorded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

callAttemptSchema.index({ traineeId: 1, callDate: -1 });
callAttemptSchema.index({ followUpId: 1, callDate: -1 });

module.exports = mongoose.model('CallAttempt', callAttemptSchema);
