const crypto = require('crypto');
const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');
const Trainee = require('../models/Trainee');
const SystemSetting = require('../models/SystemSetting');
const CommunicationHistory = require('../models/CommunicationHistory');
const IdentityReference = require('../models/IdentityReference');
const timeService = require('../utils/timeService');

const getFollowUpConfig = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    return (
      setting?.followUpConfig || {
        firstFollowUpDays: 3,
        digitalResponseWaitDays: 3,
        callResponseWaitDays: 3,
        tokenExpiryDays: 30,
      }
    );
  } catch (err) {
    return {
      firstFollowUpDays: 3,
      digitalResponseWaitDays: 3,
      callResponseWaitDays: 3,
      tokenExpiryDays: 30,
    };
  }
};

const generateSecureToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Generate Initial 3-day and longitudinal follow-up milestones upon certificate issuance / consent
 */
const createFollowUpSchedule = async ({
  traineeId,
  enrollmentId,
  certificateId,
  providerId,
  certIssueDate,
}) => {
  const baseDate = certIssueDate ? new Date(certIssueDate) : await timeService.getCurrentDate();
  const config = await getFollowUpConfig();
  const createdFollowUps = [];

  const intervals = [
    { type: 'INITIAL_3_DAY', days: config.firstFollowUpDays || 3, label: '3-Day Initial Follow-Up' },
    { type: '30_DAY', days: 30, label: '30-Day Follow-Up' },
    { type: '90_DAY', days: 90, label: '90-Day Follow-Up' },
    { type: '180_DAY', days: 180, label: '180-Day Follow-Up' },
    { type: '365_DAY', days: 365, label: '365-Day / 1-Year Follow-Up' },
  ];

  for (const interval of intervals) {
    const scheduledDate = new Date(
      baseDate.getTime() + interval.days * 24 * 60 * 60 * 1000
    );
    const tokenExpiresAt = new Date(
      scheduledDate.getTime() + (config.tokenExpiryDays || 30) * 24 * 60 * 60 * 1000
    );

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
        trackingConsent: 'GRANTED',
      });

      await CommunicationHistory.create({
        traineeId,
        followUpId: followUp._id,
        providerId,
        channel: 'SYSTEM',
        action: 'FOLLOWUP_SCHEDULED',
        timestamp: baseDate,
        outcome: 'SCHEDULED',
        notes: `${interval.label} milestone automatically scheduled for ${scheduledDate.toISOString().split('T')[0]}.`,
        performedByName: 'Follow-Up Scheduler Engine',
      });
    }

    createdFollowUps.push(followUp);
  }

  // Immediately evaluate if any milestone is already due under the current logical clock
  await evaluateReadiness();

  return createdFollowUps;
};

/**
 * Automatically evaluates all follow-ups against the logical clock
 * Transitions:
 * 1. NOT_DUE -> DUE (when scheduledDate <= logicalNow)
 * 2. WAITING_FOR_RESPONSE -> CALL_REQUIRED (when digitalResponseDeadline <= logicalNow)
 * 3. WAITING_AFTER_CALL -> GOVERNMENT_TRACKING_FLAGGED (when callResponseDeadline <= logicalNow)
 */
const evaluateReadiness = async () => {
  try {
    const logicalNow = await timeService.getCurrentDate();
    const config = await getFollowUpConfig();
    let updatedCount = 0;

    // -------------------------------------------------------------
    // TRANSITION 1: NOT_DUE / SCHEDULED -> DUE / READY
    // -------------------------------------------------------------
    const dueFollowUps = await FollowUp.find({
      status: { $in: ['NOT_DUE', 'SCHEDULED'] },
      scheduledDate: { $lte: logicalNow },
      trackingConsent: { $ne: 'WITHDRAWN' },
    }).populate('traineeId');

    for (const followUp of dueFollowUps) {
      followUp.status = 'DUE';
      if (!followUp.followUpToken) {
        followUp.followUpToken = generateSecureToken();
        followUp.tokenExpiresAt = new Date(
          logicalNow.getTime() + (config.tokenExpiryDays || 30) * 24 * 60 * 60 * 1000
        );
      }
      await followUp.save();
      updatedCount++;

      // Update trainee current status
      if (followUp.traineeId) {
        await Trainee.findByIdAndUpdate(followUp.traineeId._id, {
          currentFollowUpStatus: 'DUE',
        });
      }

      // Record communication history
      await CommunicationHistory.create({
        traineeId: followUp.traineeId?._id || followUp.traineeId,
        followUpId: followUp._id,
        providerId: followUp.providerId,
        channel: 'SYSTEM',
        action: 'FOLLOWUP_DUE',
        timestamp: logicalNow,
        outcome: 'DUE',
        notes: `Follow-up milestone ${followUp.followUpType.replace('_', '-')} became DUE. WhatsApp & Email ready for dispatch.`,
        performedByName: 'Follow-Up Engine',
      });

      // Dispatch internal notification to trainee
      if (followUp.traineeId && followUp.traineeId.userId) {
        const existingNotification = await Notification.findOne({
          traineeId: followUp.traineeId._id,
          followUpId: followUp._id,
          type: 'FOLLOWUP_READY',
        });

        if (!existingNotification) {
          await Notification.create({
            traineeId: followUp.traineeId._id,
            userId: followUp.traineeId.userId,
            followUpId: followUp._id,
            type: 'FOLLOWUP_READY',
            title: `${followUp.followUpType.replace('_', '-')} Follow-Up Questionnaire Ready`,
            message: `Your ${followUp.followUpType.replace('_', '-')} post-training outcome follow-up is now available. Please share your current employment & career status.`,
            status: 'SENT',
            sentAt: logicalNow,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // TRANSITION 2: WAITING_FOR_RESPONSE / DIGITAL_CONTACTED -> CALL_REQUIRED
    // (If 3 days have elapsed without response)
    // -------------------------------------------------------------
    const callEscalationDue = await FollowUp.find({
      status: { $in: ['WAITING_FOR_RESPONSE', 'DIGITAL_CONTACTED'] },
      digitalResponseDeadline: { $lte: logicalNow },
      trackingConsent: { $ne: 'WITHDRAWN' },
    }).populate('traineeId');

    for (const followUp of callEscalationDue) {
      followUp.status = 'CALL_REQUIRED';
      followUp.callRequiredAt = logicalNow;
      await followUp.save();
      updatedCount++;

      if (followUp.traineeId) {
        await Trainee.findByIdAndUpdate(followUp.traineeId._id, {
          currentFollowUpStatus: 'CALL_REQUIRED',
        });
      }

      await CommunicationHistory.create({
        traineeId: followUp.traineeId?._id || followUp.traineeId,
        followUpId: followUp._id,
        providerId: followUp.providerId,
        channel: 'SYSTEM',
        action: 'ESCALATED_TO_CALL',
        timestamp: logicalNow,
        outcome: 'NO_DIGITAL_RESPONSE',
        notes: `No response received after ${config.digitalResponseWaitDays || 3} days from digital contact. Escalated to Provider Phone Call required.`,
        performedByName: 'Escalation Engine',
      });
    }

    // -------------------------------------------------------------
    // TRANSITION 3: WAITING_AFTER_CALL / CALL_ATTEMPTED -> GOVERNMENT_TRACKING_FLAGGED
    // (If 3 days have elapsed after call attempt with no response)
    // -------------------------------------------------------------
    const govEscalationDue = await FollowUp.find({
      status: { $in: ['WAITING_AFTER_CALL', 'CALL_ATTEMPTED'] },
      callResponseDeadline: { $lte: logicalNow },
      trackingConsent: { $ne: 'WITHDRAWN' },
    }).populate('traineeId');

    for (const followUp of govEscalationDue) {
      followUp.status = 'GOVERNMENT_TRACKING_FLAGGED';
      followUp.escalatedToGovernmentAt = logicalNow;
      await followUp.save();
      updatedCount++;

      const traineeDoc = followUp.traineeId;
      if (traineeDoc) {
        await Trainee.findByIdAndUpdate(traineeDoc._id, {
          currentFollowUpStatus: 'GOVERNMENT_TRACKING_FLAGGED',
        });

        // Insert or update in IdentityReference Government Tracking Queue
        const existingRef = await IdentityReference.findOne({ traineeId: traineeDoc._id });
        if (!existingRef) {
          await IdentityReference.create({
            traineeId: traineeDoc._id,
            providerId: followUp.providerId,
            enrollmentId: followUp.enrollmentId,
            governmentIdType: traineeDoc.governmentIdType || 'AADHAAR',
            maskedIdNumber: traineeDoc.maskedAadhaar || 'XXXX-XXXX-1234',
            encryptedIdHash: traineeDoc.aadhaarHash || '',
            status: 'PENDING_GOVERNMENT_ACTION',
            escalatedAt: logicalNow,
            lastContactDate: followUp.callAttemptedAt || followUp.digitalContactedAt || logicalNow,
            digitalAttemptsCount: 1,
            callAttemptsCount: followUp.callAttemptsCount || 1,
            lastKnownLocation: traineeDoc.location || '',
            governmentTrackingNotes: [
              {
                note: 'Case automatically flagged for authorized identity tracking after exhausted digital and call attempts.',
                actionTaken: 'FLAGGED_FOR_GOVERNMENT_TRACKING',
                updatedByName: 'System Escalation Automation',
                updatedAt: logicalNow,
              },
            ],
          });
        } else {
          existingRef.status = 'PENDING_GOVERNMENT_ACTION';
          existingRef.escalatedAt = logicalNow;
          existingRef.callAttemptsCount = (existingRef.callAttemptsCount || 0) + 1;
          existingRef.governmentTrackingNotes.push({
            note: 'Additional follow-up milestone escalated to government tracking queue.',
            actionTaken: 'RE_FLAGGED_FOR_TRACKING',
            updatedByName: 'System Escalation Automation',
            updatedAt: logicalNow,
          });
          await existingRef.save();
        }
      }

      await CommunicationHistory.create({
        traineeId: followUp.traineeId?._id || followUp.traineeId,
        followUpId: followUp._id,
        providerId: followUp.providerId,
        channel: 'GOVERNMENT',
        action: 'ESCALATED_TO_GOVERNMENT',
        timestamp: logicalNow,
        outcome: 'NO_RESPONSE_AFTER_CALL',
        notes: `No response received after phone call attempt. Case flagged for authorized government identity tracking queue.`,
        performedByName: 'Escalation Engine',
      });
    }

    return updatedCount;
  } catch (error) {
    console.error('evaluateReadiness error:', error.message);
    return 0;
  }
};

module.exports = {
  createFollowUpSchedule,
  evaluateReadiness,
  generateSecureToken,
  getFollowUpConfig,
};
