const mongoose = require('mongoose');

const outcomeRecordSchema = new mongoose.Schema(
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
      required: false,
      default: null,
    },
    followUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      required: true,
      unique: true, // One outcome record per follow-up milestone
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    followUpType: {
      type: String,
      enum: ['INITIAL_3_DAY', '30_DAY', '90_DAY', '180_DAY', '365_DAY'],
      required: true,
    },
    observedAt: {
      type: Date,
      required: true,
    },
    situation: {
      type: String,
      enum: [
        'EMPLOYED',
        'SELF_EMPLOYED',
        'APPRENTICE',
        'APPRENTICESHIP',
        'UNEMPLOYED',
        'LOOKING_FOR_JOB',
        'STUDYING',
        'FURTHER_EDUCATION',
        'NOT_WORKING',
        'OTHER',
      ],
      required: true,
    },
    employmentData: {
      isEmployed: { type: Boolean, default: false },
      employerName: { type: String, trim: true, default: '' },
      jobRole: { type: String, trim: true, default: '' },
      startDate: { type: Date, default: null },
      monthlySalaryRange: {
        type: String,
        enum: [
          'Below ₹10,000',
          '₹10,000–₹20,000',
          '₹20,000–₹30,000',
          '₹30,000–₹50,000',
          'Above ₹50,000',
          'Prefer not to say',
          '',
        ],
        default: '',
      },
      isRelatedToTraining: {
        type: String,
        enum: ['YES', 'PARTLY', 'NO', ''],
        default: '',
      },
      trainingUsefulness: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
    },
    selfEmploymentData: {
      isSelfEmployed: { type: Boolean, default: false },
      businessType: { type: String, trim: true, default: '' },
      startDate: { type: Date, default: null },
      monthlyIncomeRange: {
        type: String,
        enum: [
          'Below ₹10,000',
          '₹10,000–₹20,000',
          '₹20,000–₹30,000',
          '₹30,000–₹50,000',
          'Above ₹50,000',
          'Prefer not to say',
          '',
        ],
        default: '',
      },
      isRelatedToTraining: {
        type: String,
        enum: ['YES', 'PARTLY', 'NO', ''],
        default: '',
      },
      trainingUsefulness: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
    },
    apprenticeshipData: {
      organizationName: { type: String, trim: true, default: '' },
      role: { type: String, trim: true, default: '' },
      startDate: { type: Date, default: null },
      expectedEndDate: { type: Date, default: null },
      monthlyStipendRange: {
        type: String,
        enum: [
          'Below ₹10,000',
          '₹10,000–₹20,000',
          '₹20,000–₹30,000',
          'Above ₹30,000',
          'Unpaid',
          '',
        ],
        default: '',
      },
      isRelatedToTraining: {
        type: String,
        enum: ['YES', 'PARTLY', 'NO', ''],
        default: '',
      },
    },
    unemploymentData: {
      isLookingForWork: { type: Boolean, default: false },
      primaryReason: {
        type: String,
        enum: [
          'Could not find suitable job',
          'Lack of required skills',
          'Salary too low',
          'Location issue',
          'No suitable opportunities',
          'Further studies',
          'Personal reasons',
          'Other',
          '',
        ],
        default: '',
      },
      needsAdditionalSkills: { type: Boolean, default: false },
      requestedSkills: { type: String, trim: true, default: '' },
    },
    relevanceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    feedback: {
      whatCouldBeBetter: { type: String, trim: true, default: '' },
      additionalSupportNeeded: { type: String, trim: true, default: '' },
    },
    source: {
      type: String,
      default: 'TRAINEE_REPORTED',
    },
  },
  { timestamps: true }
);

// Indexes
outcomeRecordSchema.index({ traineeId: 1, observedAt: -1 });
outcomeRecordSchema.index({ providerId: 1, situation: 1 });
outcomeRecordSchema.index({ enrollmentId: 1 });

module.exports = mongoose.model('OutcomeRecord', outcomeRecordSchema);
