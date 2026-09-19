const crypto = require('crypto');
const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');
const Trainee = require('../models/Trainee');
const CommunicationAttempt = require('../models/CommunicationAttempt');
const SystemSetting = require('../models/SystemSetting');
const timeService = require('../utils/timeService');

const generateSecureToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

const getFollowUpConfig = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    if (setting && setting.followUpConfig) {
      return setting.followUpConfig;
    }
  } catch (err) {
    console.error('getFollowUpConfig error:', err);
  }
  return {
    firstFollowUpDays: 90,
    digitalResponseWaitDays: 3,
    callResponseWaitDays: 3,
    tokenExpiryDays: 45,
  };
};

/**
 * Standard Longitudinal Post-Training Follow-Up Milestones
 * Calculated from training completion / certificate issuance baseline:
 * 3-Month (90 Days) -> 6-Month (180 Days) -> 9-Month (270 Days) -> 12-Month (365 Days)
 */
const createFollowUpSchedule = async ({
  traineeId,
  enrollmentId,
  certificateId,
  providerId,
  certIssueDate,
}) => {
  const baseDate = certIssueDate ? new Date(certIssueDate) : await timeService.getCurrentDate();
  const createdFollowUps = [];

  const intervals = [
    { type: '3_MONTH', days: 90, label: '3-Month Post-Training Outcome Milestone' },
    { type: '6_MONTH', days: 180, label: '6-Month Career Retention Milestone' },
    { type: '9_MONTH', days: 270, label: '9-Month Wage Growth & Skill Reassessment Milestone' },
    { type: '12_MONTH', days: 365, label: '12-Month Longitudinal Impact & Livelihood Milestone' },
  ];

  for (const interval of intervals) {
    const scheduledDate = new Date(baseDate.getTime() + interval.days * 24 * 60 * 60 * 1000);
    const tokenExpiresAt = new Date(scheduledDate.getTime() + 45 * 24 * 60 * 60 * 1000);

    let followUp = await FollowUp.findOne({
      traineeId,
      enrollmentId,
      followUpType: interval.type,
    });

    if (!followUp) {
      const token = generateSecureToken();
      followUp = await FollowUp.create({
        traineeId,
        enrollmentId,
        certificateId,
        providerId,
        followUpType: interval.type,
        daysInterval: interval.days,
        scheduledDate,
        followUpToken: token,
        tokenExpiresAt,
        status: 'NOT_DUE',
        escalationStage: 'NOT_STARTED',
        trackingConsent: 'GRANTED',
      });
    }

    createdFollowUps.push(followUp);
  }

  return createdFollowUps;
};

/**
 * Evaluate follow-up readiness and trigger automated Day 0 -> Day 3 -> Day 6 escalation
 */
const evaluateReadiness = async () => {
  try {
    const now = await timeService.getCurrentDate();

    // 1. Mark NOT_DUE -> DUE when scheduled date arrives
    await FollowUp.updateMany(
      {
        status: 'NOT_DUE',
        scheduledDate: { $lte: now },
        trackingConsent: 'GRANTED',
      },
      {
        $set: { status: 'DUE' },
      }
    );

    // 2. Day 0: Dispatch digital follow-up (WhatsApp / Email)
    const dueFollowUps = await FollowUp.find({
      status: 'DUE',
      escalationStage: 'NOT_STARTED',
      trackingConsent: 'GRANTED',
    }).populate('traineeId');

    for (const f of dueFollowUps) {
      if (!f.traineeId) continue;
      const channel = f.traineeId.preferredChannel || 'WHATSAPP';
      f.status = 'DIGITAL_CONTACTED';
      f.escalationStage = 'DAY_0_DIGITAL';
      f.digitalSentAt = now;
      await f.save();

      await CommunicationAttempt.create({
        traineeId: f.traineeId._id,
        followUpId: f._id,
        providerId: f.providerId,
        channel,
        stage: 'DAY_0_DIGITAL',
        destination: channel === 'EMAIL' ? f.traineeId.email : f.traineeId.phone,
        status: 'DELIVERED',
        messageSnippet: `Government Skilling Outcome Survey initiated for ${f.followUpType} milestone.`,
        attemptedAt: now,
      });
    }

    // 3. Day 3: If still not responded after 3 days, trigger reminder
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const needReminder = await FollowUp.find({
      status: 'DIGITAL_CONTACTED',
      escalationStage: 'DAY_0_DIGITAL',
      digitalSentAt: { $lte: threeDaysAgo },
      trackingConsent: 'GRANTED',
    }).populate('traineeId');

    for (const f of needReminder) {
      if (!f.traineeId) continue;
      f.escalationStage = 'DAY_3_REMINDER';
      f.reminderSentAt = now;
      await f.save();

      await CommunicationAttempt.create({
        traineeId: f.traineeId._id,
        followUpId: f._id,
        providerId: f.providerId,
        channel: f.traineeId.preferredChannel || 'WHATSAPP',
        stage: 'DAY_3_REMINDER',
        destination: f.traineeId.phone || f.traineeId.email,
        status: 'DELIVERED',
        messageSnippet: `Gentle Reminder: Please complete your ${f.followUpType} career progression checkpoint.`,
        attemptedAt: now,
      });
    }

    // 4. Day 6: If still no response after another 3 days, escalate to Assisted Call Queue!
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const needOperatorCall = await FollowUp.find({
      status: 'DIGITAL_CONTACTED',
      escalationStage: 'DAY_3_REMINDER',
      reminderSentAt: { $lte: sixDaysAgo },
      trackingConsent: 'GRANTED',
    });

    for (const f of needOperatorCall) {
      f.status = 'CALL_REQUIRED';
      f.escalationStage = 'DAY_6_ASSISTED_CALL';
      f.escalatedToCallQueueAt = now;
      await f.save();
    }
  } catch (err) {
    console.error('evaluateReadiness error:', err);
  }
};

module.exports = {
  createFollowUpSchedule,
  evaluateReadiness,
  generateSecureToken,
  getFollowUpConfig,
};
