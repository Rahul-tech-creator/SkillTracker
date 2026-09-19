const mongoose = require('mongoose');

const phoneHistorySchema = new mongoose.Schema(
  {
    oldPhone: { type: String, trim: true },
    newPhone: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, trim: true, default: 'User requested contact update' },
  },
  { _id: false }
);

const traineeSchema = new mongoose.Schema(
  {
    // Permanent, immutable internal identifier (e.g. TRN-2024-00101)
    internalTraineeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // Links to User auth record
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Primary / Enrolling Provider
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    // Contactability Management (Phone changes never create duplicate trainee records)
    phone: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    alternateEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    preferredChannel: {
      type: String,
      enum: ['WHATSAPP', 'EMAIL', 'SMS', 'CALL'],
      default: 'WHATSAPP',
    },
    contactStatus: {
      type: String,
      enum: ['VERIFIED', 'UNREACHABLE', 'UPDATED', 'DORMANT'],
      default: 'VERIFIED',
    },
    lastSuccessfulContact: {
      type: Date,
      default: null,
    },
    phoneChangeHistory: [phoneHistorySchema],

    // Personal & Demographic Attributes (Authorized Aggregate Analytics)
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY', ''],
      default: '',
    },
    socialCategory: {
      type: String,
      enum: ['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'OTHER', ''],
      default: 'GENERAL',
    },
    residenceType: {
      type: String,
      enum: ['RURAL', 'URBAN', 'SEMI_URBAN', ''],
      default: 'URBAN',
    },
    differentlyAbled: {
      type: Boolean,
      default: false,
    },
    minorityStatus: {
      type: Boolean,
      default: false,
    },
    educationLevel: {
      type: String,
      enum: ['BELOW_10TH', '10TH', '12TH', 'DIPLOMA', 'GRADUATE', 'POST_GRADUATE', 'OTHER', ''],
      default: '',
    },
    district: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: 'Andhra Pradesh',
    },
    currentLocation: {
      type: String,
      trim: true,
      default: '',
    },

    // Tokenized Identity Architecture (Security First — NO raw Aadhaar stored)
    idType: {
      type: String,
      enum: ['AADHAAR_TOKEN', 'VOTER_ID_TOKEN', 'PAN_TOKEN', 'OTHER_TOKEN', 'NONE'],
      default: 'AADHAAR_TOKEN',
    },
    tokenizedIdRef: {
      type: String,
      trim: true,
      default: '',
    },
    idHash: {
      type: String,
      trim: true,
      default: '',
      index: true, // For duplicate registration detection without storing plaintext ID
    },
    idVerificationStatus: {
      type: String,
      enum: ['VERIFIED_TOKEN', 'SELF_DECLARED', 'PENDING', 'EXEMPT'],
      default: 'SELF_DECLARED',
    },

    // Voluntary Longitudinal Follow-Up Consent & Withdrawal
    trackingConsent: {
      type: String,
      enum: ['GRANTED', 'WITHDRAWN', 'PENDING'],
      default: 'GRANTED',
    },
    consentWithdrawnAt: {
      type: Date,
      default: null,
    },
    consentWithdrawalReason: {
      type: String,
      trim: true,
      default: '',
    },
    consentRestoredAt: {
      type: Date,
      default: null,
    },
    currentFollowUpStatus: {
      type: String,
      default: 'NOT_DUE',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

traineeSchema.index({ district: 1, socialCategory: 1 });
traineeSchema.index({ providerId: 1, status: 1 });

module.exports = mongoose.model('Trainee', traineeSchema);
