const mongoose = require('mongoose');

const skillResultSchema = new mongoose.Schema(
  {
    skillId: { type: String, required: true },
    skillName: { type: String, required: true },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    classification: {
      type: String,
      enum: ['STRONG', 'DEVELOPING', 'WEAK', 'CRITICAL_GAP'],
      default: 'DEVELOPING',
    },
    gapScore: { type: Number, default: 0 }, // 100 - percentage
    confidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT'],
      default: 'MEDIUM',
    },
    wrongTopics: [{ type: String }], // Sub-topics from wrong answers
    questionsTotal: { type: Number, default: 0 },
    questionsCorrect: { type: Number, default: 0 },
  },
  { _id: false }
);

const skillGapSchema = new mongoose.Schema(
  {
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    overallScore: { type: Number, default: 0 },
    overallMaxScore: { type: Number, default: 0 },
    overallPercentage: { type: Number, default: 0 },
    skillResults: [skillResultSchema],
    // Deterministic analysis (rule-based)
    deterministic: {
      strongSkills: [{ type: String }],
      developingSkills: [{ type: String }],
      weakSkills: [{ type: String }],
      criticalGaps: [{ type: String }],
      thresholdsUsed: {
        strong: Number,
        developing: Number,
        weak: Number,
        criticalGap: Number,
      },
    },
    // AI analysis (Grok interpretation)
    aiAnalysis: {
      summary: { type: String, default: '' },
      strongSkills: [{ type: mongoose.Schema.Types.Mixed }],
      developingSkills: [{ type: mongoose.Schema.Types.Mixed }],
      skillGaps: [
        {
          skill: String,
          severity: String,
          evidence: String,
          weakTopics: [String],
          recommendedAction: String,
        },
      ],
      misconceptionAnalysis: [
        {
          topic: String,
          identifiedMisconception: String,
          correctMentalModel: String,
          severity: String,
        },
      ],
      remedialRoadmap: [
        {
          phase: String,
          duration: String,
          focus: String,
          milestones: [String],
          resources: [String],
        },
      ],
      careerReadiness: {
        rating: { type: String, default: 'DEVELOPING' },
        readinessScore: { type: Number, default: 0 },
        justification: { type: String, default: '' },
        suggestedRoles: [{ type: String }],
        targetCertifications: [{ type: String }],
        salaryGrowthPotential: { type: String, default: '' },
      },
      cognitiveBreakdown: {
        recallScore: { type: Number, default: 0 },
        applicationScore: { type: Number, default: 0 },
        analysisScore: { type: Number, default: 0 },
        synthesisScore: { type: Number, default: 0 },
      },
      recommendedSkills: [{ type: String }],
      providerActions: [{ type: String }],
      limitations: [{ type: String }],
    },
    aiModel: { type: String, default: '' },
    aiAnalyzedAt: { type: Date, default: null },
    aiAvailable: { type: Boolean, default: false },
    inputHash: { type: String, default: '' },
  },
  { timestamps: true }
);

skillGapSchema.index({ traineeId: 1, courseId: 1 });
skillGapSchema.index({ providerId: 1 });
skillGapSchema.index({ assessmentId: 1 });

module.exports = mongoose.model('SkillGapAnalysis', skillGapSchema);
