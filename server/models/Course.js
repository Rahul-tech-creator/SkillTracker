const mongoose = require('mongoose');

const courseCompetencyEmbeddedSchema = new mongoose.Schema(
  {
    competencyId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
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
    beginnerRubric: { type: String, default: '' },
    intermediateRubric: { type: String, default: '' },
    advancedRubric: { type: String, default: '' },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
    },
    courseRelevance: { type: Number, default: 5 },
    marketRelevance: { type: Number, default: 4 },
    currentDemandIndicator: {
      type: String,
      enum: ['HIGH', 'MODERATE', 'EMERGING', 'DECLINING'],
      default: 'HIGH',
    },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    courseCode: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    durationHours: {
      type: Number,
      default: 120,
    },
    duration: {
      type: String,
      trim: true,
      default: '3 Months (360 Hours)',
    },
    // Rich Competency Framework Mapping
    competencies: {
      type: [courseCompetencyEmbeddedSchema],
      default: [],
    },
    // Backwards-compatible skills array
    skills: [
      {
        skillId: String,
        skillName: String,
        weight: Number,
      },
    ],
    // Course-Market Alignment Intelligence
    marketAlignmentScore: {
      type: Number,
      default: 85, // 0 - 100% computed from market requirements
      min: 0,
      max: 100,
    },
    missingHighDemandSkills: {
      type: [String],
      default: [],
    },
    outdatedSkills: {
      type: [String],
      default: [],
    },
    marketEvaluatedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

// Synchronize competencies and flat skills array automatically
courseSchema.pre('validate', function (next) {
  if (this.competencies && this.competencies.length > 0) {
    this.skills = this.competencies.map((c) => ({
      skillId: c.competencyId,
      skillName: c.name,
      weight: c.weight,
    }));
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);
