const mongoose = require('mongoose');

const employerSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: [true, 'Employer organization name is required'],
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      trim: true,
      default: 'Information Technology',
      index: true,
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
    location: {
      type: String,
      trim: true,
      default: '',
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED_PARTNER', 'SELF_REPORTED_ONLY', 'PENDING_AUDIT', 'FLAGGED_UNRESPONSIVE'],
      default: 'SELF_REPORTED_ONLY',
      index: true,
    },
    activeEmployeesCount: {
      type: Number,
      default: 1,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employer', employerSchema);
