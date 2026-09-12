const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    traineeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainee',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    followUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      default: null,
    },
    type: {
      type: String,
      enum: ['FOLLOWUP_READY', 'CONSENT_REQUEST', 'CERTIFICATE_ISSUED', 'SYSTEM'],
      default: 'FOLLOWUP_READY',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'READ'],
      default: 'SENT',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ traineeId: 1, followUpId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
