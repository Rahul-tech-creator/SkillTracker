const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema(
  {
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
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
    status: {
      type: String,
      enum: ['PENDING', 'GRANTED', 'DECLINED', 'WITHDRAWN'],
      default: 'PENDING',
    },
    consentVersion: {
      type: String,
      default: 'v1.0',
    },
    consentedAt: {
      type: Date,
      default: null,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
    purpose: {
      type: String,
      default: 'Longitudinal Post-Training Outcome & Employment Tracking',
    },
  },
  { timestamps: true }
);

// One consent record per trainee per enrollment
consentSchema.index({ traineeId: 1, enrollmentId: 1 }, { unique: true });
consentSchema.index({ status: 1 });

module.exports = mongoose.model('Consent', consentSchema);
