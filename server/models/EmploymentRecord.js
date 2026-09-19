const mongoose = require('mongoose');

const employmentRecordSchema = new mongoose.Schema(
  {
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
      index: true,
    },
    // Employer can be an existing registered employer or unlisted
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      default: null,
      index: true,
    },
    employerName: {
      type: String,
      required: [true, 'Employer name is required'],
      trim: true,
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    currentStatus: {
      type: String,
      enum: ['ACTIVE', 'RESIGNED', 'TERMINATED', 'TRANSFERRED', 'ON_LEAVE'],
      default: 'ACTIVE',
    },
    workLocation: {
      type: String,
      trim: true,
      default: '',
    },
    monthlySalary: {
      type: Number,
      default: 0,
    },
    monthlySalaryRange: {
      type: String,
      enum: [
        'Below ₹10,000',
        '₹10,000–₹15,000',
        '₹15,000–₹20,000',
        '₹20,000–₹25,000',
        '₹25,000–₹35,000',
        '₹35,000–₹50,000',
        'Above ₹50,000',
        'Prefer not to say',
        '',
      ],
      default: '',
    },
    isRelatedToTraining: {
      type: String,
      enum: ['YES', 'PARTLY', 'NO', ''],
      default: 'YES',
    },
    skillsUsed: [
      {
        type: String,
        trim: true,
      },
    ],
    trainingUsefulness: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmploymentRecord', employmentRecordSchema);
