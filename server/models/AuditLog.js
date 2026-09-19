const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['ADMIN', 'PROVIDER', 'TRAINEE', 'SYSTEM'],
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      trim: true,
      default: '',
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true, // e.g. 'CONSENT_WITHDRAWN', 'VERIFICATION_LEVEL_UPDATED', 'POLICY_RECOMMENDATION_APPROVED', etc.
    },
    targetType: {
      type: String,
      required: true, // 'Trainee', 'OutcomeVerification', 'Provider', 'RemedialAction', 'PolicyRecommendation'
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
