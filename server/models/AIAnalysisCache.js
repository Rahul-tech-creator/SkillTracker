const mongoose = require('mongoose');

const aiAnalysisCacheSchema = new mongoose.Schema(
  {
    analysisType: {
      type: String,
      enum: [
        'SKILL_GAP',
        'PROVIDER_COMPARISON',
        'COURSE_COMPARISON',
        'FUNDING_RECOMMENDATION',
        'COURSE_SKILL_GAP',
      ],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    inputHash: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      default: '',
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

// Unique cache per analysis type + entity + input hash
aiAnalysisCacheSchema.index({ analysisType: 1, entityId: 1, inputHash: 1 }, { unique: true });
// TTL — auto-delete after 24 hours
aiAnalysisCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('AIAnalysisCache', aiAnalysisCacheSchema);
