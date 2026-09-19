const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    batchName: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    capacity: {
      type: Number,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    mode: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'HYBRID'],
      default: 'OFFLINE',
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ONGOING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'UPCOMING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);
