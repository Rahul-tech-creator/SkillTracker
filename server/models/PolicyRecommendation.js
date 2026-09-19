const mongoose = require('mongoose');

const evidenceItemSchema = new mongoose.Schema(
  {
    metricName: {
      type: String,
      required: true,
    },
    currentValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    benchmarkValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['ABOVE_BENCHMARK', 'AT_BENCHMARK', 'BELOW_BENCHMARK', 'CRITICAL_CONCERN'],
      default: 'ABOVE_BENCHMARK',
    },
    evidenceSummary: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const policyRecommendationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    recommendationType: {
      type: String,
      enum: [
        'SCALE_PROVIDER',
        'FUND_REMEDIAL',
        'UPDATE_CURRICULUM',
        'REDIRECT_RESOURCES',
        'INVESTIGATE_OUTCOMES',
        'EXTEND_PARTNERSHIP',
      ],
      required: true,
      index: true,
    },
    targetEntity: {
      entityType: {
        type: String,
        enum: ['PROVIDER', 'COURSE', 'DISTRICT', 'NATIONAL_SCHEME'],
        required: true,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      entityName: {
        type: String,
        required: true,
        trim: true,
      },
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
      index: true,
    },
    // The Core Explainable Evidence Chain
    evidenceChain: [evidenceItemSchema],
    aiReasoning: {
      type: String,
      trim: true,
      default: '',
    },
    recommendedAction: {
      type: String,
      required: true,
      trim: true,
    },
    expectedImpact: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['GENERATED', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED', 'DISMISSED'],
      default: 'GENERATED',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PolicyRecommendation', policyRecommendationSchema);
