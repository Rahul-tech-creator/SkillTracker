const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'GLOBAL_SETTINGS',
    },
    timeMode: {
      type: String,
      enum: ['REAL', 'SIMULATION'],
      default: 'REAL',
    },
    simulationDate: {
      type: Date,
      default: null,
    },
    simulationTime: {
      type: String,
      default: '10:00 AM',
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Follow-up intervals & escalation timeout configuration
    followUpConfig: {
      firstFollowUpDays: { type: Number, default: 3 }, // 3 days after certificate issuance
      digitalResponseWaitDays: { type: Number, default: 3 }, // 3 days after digital follow-up before call escalation
      callResponseWaitDays: { type: Number, default: 3 }, // 3 days after call attempt before government escalation
      tokenExpiryDays: { type: Number, default: 30 },
    },
    // Assessment configuration
    assessmentConfig: {
      defaultMaxAttempts: { type: Number, default: 2 },
      defaultScoringPolicy: { type: String, enum: ['BEST', 'LATEST'], default: 'BEST' },
      defaultTimeLimitMinutes: { type: Number, default: null },
      defaultQuestionsPerSkill: { type: Number, default: 5 },
    },
    // Provider score weights (must sum to 100)
    providerScoreWeights: {
      completion: { type: Number, default: 20 },
      certification: { type: Number, default: 15 },
      assessment: { type: Number, default: 20 },
      employment: { type: Number, default: 20 },
      retention: { type: Number, default: 10 },
      relevance: { type: Number, default: 10 },
      followUp: { type: Number, default: 5 },
    },
    // Minimum sample size for provider ranking
    minimumSampleSize: {
      type: Number,
      default: 30,
    },
    // Skill gap classification thresholds
    gapThresholds: {
      strong: { type: Number, default: 80 },
      developing: { type: Number, default: 60 },
      weak: { type: Number, default: 40 },
      criticalGap: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
