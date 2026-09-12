const mongoose = require('mongoose');

const traineeSchema = new mongoose.Schema(
  {
    // Links to the User auth record
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // The Provider who enrolled this trainee (primary provider)
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', ''],
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    educationLevel: {
      type: String,
      enum: ['BELOW_10TH', '10TH', '12TH', 'DIPLOMA', 'GRADUATE', 'POST_GRADUATE', 'OTHER', ''],
      default: '',
    },
    // Sensitive identity fields (Aadhaar is strictly masked and hashed)
    governmentIdType: {
      type: String,
      enum: ['AADHAAR', 'VOTER_ID', 'PAN', 'OTHER', 'NONE'],
      default: 'AADHAAR',
    },
    maskedAadhaar: {
      type: String,
      trim: true,
      default: '',
    },
    aadhaarHash: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    // Voluntary tracking consent state
    trackingConsent: {
      type: String,
      enum: ['GRANTED', 'WITHDRAWN', 'PENDING'],
      default: 'GRANTED',
    },
    consentWithdrawnAt: {
      type: Date,
      default: null,
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

module.exports = mongoose.model('Trainee', traineeSchema);
