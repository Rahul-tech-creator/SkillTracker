const mongoose = require('mongoose');

const courseSkillSchema = new mongoose.Schema(
  {
    skillId: {
      type: String,
      required: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
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
    },
    duration: {
      type: String,
      trim: true,
      default: '',
    },
    // Structured skills with weights
    skills: {
      type: [courseSkillSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

// Validate: no duplicate skill names within a course, auto-repair skillId/skillName
courseSchema.pre('validate', function (next) {
  if (this.skills && this.skills.length > 0) {
    this.skills.forEach((s, idx) => {
      if (typeof s === 'string') {
        const name = s.trim();
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `skill_${idx + 1}`;
        this.skills[idx] = { skillId: id, skillName: name, weight: 0 };
      } else if (s && typeof s === 'object') {
        const name = (s.skillName || s.name || s.title || s.skillId || '').toString().trim();
        s.skillName = name;
        if (!s.skillId) {
          s.skillId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `skill_${idx + 1}`;
        }
      }
    });

    const names = this.skills.map((s) => (s?.skillName || '').toString().toLowerCase()).filter(Boolean);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      return next(new Error('Duplicate skill names are not allowed within a course.'));
    }
    // Validate weights: must all be 0 (equal weighting) or sum to 100
    const totalWeight = this.skills.reduce((sum, s) => sum + (s?.weight || 0), 0);
    if (totalWeight > 0 && Math.abs(totalWeight - 100) > 0.01) {
      return next(new Error('Skill weights must sum to 100 or all be 0 for equal weighting.'));
    }
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);
