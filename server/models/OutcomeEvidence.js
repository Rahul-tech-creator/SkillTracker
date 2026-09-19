const mongoose = require('mongoose');

const outcomeEvidenceSchema = new mongoose.Schema(
  {
    verificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutcomeVerification',
      required: true,
      index: true,
    },
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
      index: true,
    },
    evidenceType: {
      type: String,
      enum: [
        'TRAINEE_SELF_DECLARATION',
        'PROVIDER_CONFIRMATION',
        'EMPLOYER_OFFICIAL_CONFIRMATION',
        'APPOINTMENT_LETTER',
        'SALARY_SLIP',
        'BANK_STATEMENT_CREDIT',
        'EMPLOYMENT_ID_CARD',
        'APPRENTICESHIP_CONTRACT',
        'AUTHORIZED_EXTERNAL_PORTAL',
      ],
      required: true,
    },
    documentTitle: {
      type: String,
      required: true,
      trim: true,
    },
    documentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    issuerName: {
      type: String,
      trim: true,
      default: '',
    },
    issueDate: {
      type: Date,
      default: null,
    },
    signalWeight: {
      type: Number,
      default: 20, // Confidence point contribution
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
    isSimulated: {
      type: Boolean,
      default: false, // Flagged true if seeded/demo evidence
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OutcomeEvidence', outcomeEvidenceSchema);
