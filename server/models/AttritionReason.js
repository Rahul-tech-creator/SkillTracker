const mongoose = require('mongoose');

const attritionReasonSchema = new mongoose.Schema(
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
    stage: {
      type: String,
      enum: [
        'DURING_TRAINING',
        'POST_COMPLETION_PRE_PLACEMENT',
        'EARLY_EMPLOYMENT_0_3M',
        'MID_EMPLOYMENT_3_12M',
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'CANDIDATE',
        'COURSE',
        'PROVIDER',
        'MARKET',
        'PERSONAL',
      ],
      required: true,
      index: true,
    },
    specificReason: {
      type: String,
      required: true,
      trim: true,
    },
    // Distinguishes provider accountability
    isProviderControllable: {
      type: Boolean,
      required: true,
      index: true,
    },
    previousSalary: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttritionReason', attritionReasonSchema);
