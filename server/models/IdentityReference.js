const mongoose = require('mongoose');

const identityReferenceSchema = new mongoose.Schema(
  {
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
      unique: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      default: null,
    },
    governmentIdType: {
      type: String,
      enum: ['AADHAAR', 'VOTER_ID', 'PAN', 'OTHER'],
      default: 'AADHAAR',
    },
    maskedIdNumber: {
      type: String,
      required: true,
      trim: true,
    },
    encryptedIdHash: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'PENDING_GOVERNMENT_ACTION',
        'UNDER_GOVERNMENT_TRACKING',
        'RETURNED',
        'RESOLVED',
        'OPTED_OUT',
      ],
      default: 'PENDING_GOVERNMENT_ACTION',
      index: true,
    },
    escalatedAt: {
      type: Date,
      default: Date.now,
    },
    escalatedBy: {
      type: String,
      default: 'AUTOMATED_FOLLOWUP_ENGINE',
    },
    lastContactDate: {
      type: Date,
      default: null,
    },
    digitalAttemptsCount: {
      type: Number,
      default: 0,
    },
    callAttemptsCount: {
      type: Number,
      default: 0,
    },
    lastKnownLocation: {
      type: String,
      trim: true,
      default: '',
    },
    governmentTrackingNotes: [
      {
        note: { type: String, trim: true },
        actionTaken: { type: String, trim: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedByName: { type: String, default: 'Authorized Official' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

identityReferenceSchema.index({ providerId: 1, status: 1 });
identityReferenceSchema.index({ status: 1, escalatedAt: -1 });

module.exports = mongoose.model('IdentityReference', identityReferenceSchema);
