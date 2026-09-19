const mongoose = require('mongoose');

const discrepancySchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true, // e.g. 'salary', 'jobRole', 'joiningDate', 'employmentStatus', 'unrecognizedEmployee'
    },
    traineeReportedValue: {
      type: String,
      default: '',
    },
    employerReportedValue: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    penaltyDeduction: {
      type: Number,
      default: 15,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const outcomeVerificationSchema = new mongoose.Schema(
  {
    outcomeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutcomeRecord',
      required: true,
      unique: true,
      index: true,
    },
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      default: null,
    },
    verificationLevel: {
      type: String,
      enum: [
        'LEVEL_1_SELF_REPORTED',
        'LEVEL_2_PROVIDER_CONFIRMED',
        'LEVEL_3_EMPLOYER_CONFIRMED',
        'LEVEL_4_DOCUMENTARY_EVIDENCE',
      ],
      default: 'LEVEL_1_SELF_REPORTED',
      index: true,
    },
    status: {
      type: String,
      enum: ['VERIFIED', 'PARTIALLY_VERIFIED', 'DISCREPANCY_FLAGGED', 'PENDING_REVIEW'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    // Computed dynamically by verification algorithm (0 - 100)
    confidenceScore: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },
    confidenceSignals: {
      traineeSelfReport: { type: Number, default: 20 },
      providerConfirmed: { type: Number, default: 0 },
      employerConfirmed: { type: Number, default: 0 },
      documentaryEvidence: { type: Number, default: 0 },
      fieldConsistency: { type: Number, default: 0 },
      discrepancyDeductions: { type: Number, default: 0 },
    },
    employerVerificationDetails: {
      isEmployeeRecognized: { type: Boolean, default: null },
      roleConfirmed: { type: Boolean, default: null },
      employerReportedRole: { type: String, default: '' },
      joiningDateConfirmed: { type: Boolean, default: null },
      employerReportedJoiningDate: { type: Date, default: null },
      employmentStatusConfirmed: { type: Boolean, default: null },
      wageBandConfirmed: { type: Boolean, default: null },
      employerWageBandReported: { type: String, default: '' },
      employerComments: { type: String, default: '' },
      verifiedAt: { type: Date, default: null },
    },
    externalIntegrationStatus: {
      type: String,
      enum: ['PENDING_EXTERNAL_INTEGRATION', 'CONNECTED', 'UNAVAILABLE'],
      default: 'PENDING_EXTERNAL_INTEGRATION',
    },
    externalIntegrationMessage: {
      type: String,
      default:
        'Direct external government / employer database integration is pending authorized production API gateway credentials. Local multi-source verification is active and authoritative.',
    },
    discrepancies: [discrepancySchema],
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OutcomeVerification', outcomeVerificationSchema);
