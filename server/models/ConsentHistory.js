const mongoose = require('mongoose');

const consentHistorySchema = new mongoose.Schema(
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
      default: null,
    },
    consentType: {
      type: String,
      enum: ['OUTCOME_TRACKING', 'IDENTITY_PROCESSING'],
      default: 'OUTCOME_TRACKING',
    },
    status: {
      type: String,
      enum: ['GIVEN', 'WITHDRAWN', 'RESTORED'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['TRAINEE_PORTAL', 'SECURE_TRACKING_LINK', 'PROVIDER_CALL', 'ADMIN_ACTION', 'SYSTEM_INITIALIZATION'],
      default: 'TRAINEE_PORTAL',
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
  },
  { timestamps: true }
);

consentHistorySchema.index({ traineeId: 1, timestamp: -1 });

module.exports = mongoose.model('ConsentHistory', consentHistorySchema);
