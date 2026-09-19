const mongoose = require('mongoose');

const marketSkillSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Technical',
      index: true,
    },
    demandIndex: {
      type: Number,
      required: true,
      min: 1,
      max: 100, // 100 = highest market demand
      index: true,
    },
    growthTrend: {
      type: String,
      enum: ['RISING', 'STABLE', 'DECLINING'],
      default: 'RISING',
      index: true,
    },
    topHiringRoles: [
      {
        type: String,
        trim: true,
      },
    ],
    averageStartingSalary: {
      type: Number,
      default: 25000,
    },
    requiredProficiencyLevel: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'INTERMEDIATE',
    },

    // Data Provenance & Source Metadata
    sourceName: {
      type: String,
      required: true,
      trim: true,
      default: 'National Skills Qualification Framework (NSQF) & IT-ITeS Sector Skill Council Report',
    },
    sourceType: {
      type: String,
      enum: [
        'GOVERNMENT_DATASET',
        'SECTOR_SKILL_COUNCIL',
        'CURATED_LABOUR_SURVEY',
        'DEMO_SIMULATED',
      ],
      default: 'GOVERNMENT_DATASET',
      index: true,
    },
    datasetReference: {
      type: String,
      trim: true,
      default: 'NSQF-LABOUR-DATA-2024-Q3',
    },
    geographicScope: {
      type: String,
      trim: true,
      default: 'National / Southern IT Corridor (AP & TS)',
    },
    collectionDate: {
      type: Date,
      default: () => new Date('2024-06-15'),
    },
    lastUpdatedDate: {
      type: Date,
      default: Date.now,
    },
    isSimulated: {
      type: Boolean,
      default: false, // Explicit indicator distinguishing live/curated from synthetic demo
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarketSkill', marketSkillSchema);
