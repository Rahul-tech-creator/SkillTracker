const mongoose = require('mongoose');

const competencySchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    competencyId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Competency name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['TECHNICAL', 'PRACTICAL', 'DOMAIN', 'SOFT_SKILL', 'SAFETY'],
      default: 'TECHNICAL',
    },
    beginnerRubric: {
      type: String,
      trim: true,
      default: 'Understands basic concepts and syntax with supervision.',
    },
    intermediateRubric: {
      type: String,
      trim: true,
      default: 'Applies principles independently to standard scenarios.',
    },
    advancedRubric: {
      type: String,
      trim: true,
      default: 'Diagnoses complex edge cases, architectures, and optimizations.',
    },
    weight: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    courseRelevance: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    marketRelevance: {
      type: Number,
      min: 1,
      max: 5,
      default: 4,
    },
    currentDemandIndicator: {
      type: String,
      enum: ['HIGH', 'MODERATE', 'EMERGING', 'DECLINING'],
      default: 'HIGH',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

competencySchema.index({ courseId: 1, competencyId: 1 }, { unique: true });

module.exports = mongoose.model('Competency', competencySchema);
