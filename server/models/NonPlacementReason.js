const mongoose = require('mongoose');

const nonPlacementReasonSchema = new mongoose.Schema(
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
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'CANDIDATE_RELATED',
        'COURSE_RELATED',
        'PROVIDER_RELATED',
        'MARKET_RELATED',
        'PERSONAL_CONTEXTUAL',
      ],
      required: true,
      index: true,
    },
    specificReason: {
      type: String,
      required: true,
      trim: true,
    },
    // CRITICAL: Distinguishes provider accountability from external/personal factors
    isProviderControllable: {
      type: Boolean,
      required: true,
      index: true,
    },
    evidenceNotes: {
      type: String,
      trim: true,
      default: '',
    },
    detectedSkillGap: {
      type: String,
      trim: true,
      default: '',
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NonPlacementReason', nonPlacementReasonSchema);
