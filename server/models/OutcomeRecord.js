const mongoose = require('mongoose');

const outcomeRecordSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      default: null,
    },
    followUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      required: true,
      unique: true, // One outcome record per follow-up milestone
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    followUpType: {
      type: String,
      enum: ['3_MONTH', '6_MONTH', '9_MONTH', '12_MONTH'],
      required: true,
      index: true,
    },
    observedAt: {
      type: Date,
      required: true,
      index: true,
    },
    situation: {
      type: String,
      enum: [
        'EMPLOYED',
        'SELF_EMPLOYED',
        'APPRENTICESHIP',
        'FURTHER_EDUCATION',
        'UNEMPLOYED',
        'OTHER',
      ],
      required: true,
      index: true,
    },

    // Decoupled Employment Link
    employmentRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmploymentRecord',
      default: null,
    },
    // Verification Event Link
    verificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutcomeVerification',
      default: null,
    },

    // Inline Snapshot for Fast Reporting & Longitudinal Trends
    employmentData: {
      isEmployed: { type: Boolean, default: false },
      employerName: { type: String, trim: true, default: '' },
      jobRole: { type: String, trim: true, default: '' },
      industry: { type: String, trim: true, default: '' },
      startDate: { type: Date, default: null },
      monthlySalary: { type: Number, default: 0 },
      monthlySalaryRange: { type: String, default: '' },
      isRelatedToTraining: { type: String, enum: ['YES', 'PARTLY', 'NO', ''], default: 'YES' },
      trainingUsefulness: { type: Number, min: 1, max: 5, default: 5 },
      skillsUsed: [{ type: String, trim: true }],
    },

    // Wage & Retention Intelligence
    wageProgression: {
      baselineWage: { type: Number, default: 0 },
      currentWage: { type: Number, default: 0 },
      wageGrowthAbsolute: { type: Number, default: 0 },
      wageGrowthPercentage: { type: Number, default: 0 },
      retentionDays: { type: Number, default: 0 },
      isContinuousEmployment: { type: Boolean, default: true },
      jobChangesCount: { type: Number, default: 0 },
    },

    // Self-Employment Record
    selfEmploymentData: {
      isSelfEmployed: { type: Boolean, default: false },
      businessType: { type: String, trim: true, default: '' },
      sector: { type: String, trim: true, default: '' },
      startDate: { type: Date, default: null },
      monthlyIncome: { type: Number, default: 0 },
      monthlyIncomeRange: { type: String, default: '' },
      isRelatedToTraining: { type: String, enum: ['YES', 'PARTLY', 'NO', ''], default: 'YES' },
      viabilityScore: { type: Number, min: 1, max: 5, default: 4 },
      hasHiredOthers: { type: Boolean, default: false },
    },

    // Apprenticeship Record
    apprenticeshipData: {
      organizationName: { type: String, trim: true, default: '' },
      role: { type: String, trim: true, default: '' },
      startDate: { type: Date, default: null },
      expectedEndDate: { type: Date, default: null },
      monthlyStipend: { type: Number, default: 0 },
      monthlyStipendRange: { type: String, default: '' },
      isRelatedToTraining: { type: String, enum: ['YES', 'PARTLY', 'NO', ''], default: 'YES' },
    },

    // Unemployed Context
    unemploymentData: {
      isLookingForWork: { type: Boolean, default: false },
      primaryReason: { type: String, trim: true, default: '' },
      needsAdditionalSkills: { type: Boolean, default: false },
      requestedSkills: { type: String, trim: true, default: '' },
    },

    relevanceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    source: {
      type: String,
      default: 'TRAINEE_REPORTED',
    },
  },
  { timestamps: true }
);

outcomeRecordSchema.index({ traineeId: 1, observedAt: -1 });
outcomeRecordSchema.index({ providerId: 1, situation: 1 });
outcomeRecordSchema.index({ followUpType: 1, situation: 1 });

module.exports = mongoose.model('OutcomeRecord', outcomeRecordSchema);
