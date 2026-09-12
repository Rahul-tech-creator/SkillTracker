const mongoose = require('mongoose');

const providerAssignmentSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    allocatedBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiRecommended: {
      type: Boolean,
      default: false,
    },
    adminDecision: {
      type: String,
      trim: true,
      default: '',
    },
    adminReason: {
      type: String,
      trim: true,
      default: '',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const fundingSchemeSchema = new mongoose.Schema(
  {
    schemeName: {
      type: String,
      required: [true, 'Scheme name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: 0,
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    targetTrainees: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'CLOSED'],
      default: 'DRAFT',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerAssignments: [providerAssignmentSchema],
  },
  { timestamps: true }
);

// Validate: total allocated budget must not exceed scheme budget
fundingSchemeSchema.pre('validate', function (next) {
  if (this.providerAssignments && this.providerAssignments.length > 0) {
    const totalAllocated = this.providerAssignments.reduce(
      (sum, a) => sum + (a.allocatedBudget || 0),
      0
    );
    if (totalAllocated > this.budget) {
      return next(
        new Error(
          `Total allocation (₹${totalAllocated.toLocaleString()}) exceeds scheme budget (₹${this.budget.toLocaleString()}).`
        )
      );
    }
  }
  next();
});

fundingSchemeSchema.index({ courseId: 1 });
fundingSchemeSchema.index({ status: 1 });
fundingSchemeSchema.index({ district: 1 });

module.exports = mongoose.model('FundingScheme', fundingSchemeSchema);
