require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const assert = require('assert');
const crypto = require('crypto');

const User = require('../models/User');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const FollowUp = require('../models/FollowUp');
const OutcomeRecord = require('../models/OutcomeRecord');
const IdentityReference = require('../models/IdentityReference');
const ConsentHistory = require('../models/ConsentHistory');
const CallAttempt = require('../models/CallAttempt');
const CommunicationHistory = require('../models/CommunicationHistory');
const SystemSetting = require('../models/SystemSetting');
const { validateAadhaar, maskAadhaar, hashAadhaar } = require('../utils/aadhaarValidator');
const followUpEngine = require('../services/followUpEngine');

const runTests = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker';
    await mongoose.connect(uri);
    console.log('Connected to DB for pipeline verification...');

    // Test 1: Aadhaar Validation & Masking
    console.log('\n[Test 1] Verhoeff Aadhaar Validation & Masking...');
    assert.strictEqual(validateAadhaar('123456789012').valid, false, '123456789012 should fail Verhoeff');
    assert.strictEqual(maskAadhaar('984801234567'), 'XXXX-XXXX-4567');
    const h1 = hashAadhaar('984801234567');
    const h2 = hashAadhaar('984801234567');
    assert.strictEqual(h1, h2, 'Hash must be deterministic for unique lookups');
    console.log('✓ Aadhaar validation, masking, and hashing passed.');

    // Test 2: System Settings Check
    console.log('\n[Test 2] Follow-Up System Settings...');
    const config = await followUpEngine.getFollowUpConfig();
    assert.strictEqual(config.firstFollowUpDays, 3, 'firstFollowUpDays must default to 3');
    assert.strictEqual(config.digitalResponseWaitDays, 3, 'digitalResponseWaitDays must default to 3');
    assert.strictEqual(config.callResponseWaitDays, 3, 'callResponseWaitDays must default to 3');
    console.log('✓ Configurable settings retrieved correctly:', config);

    // Test 3: Verify Seeded Follow-Up Scenarios
    console.log('\n[Test 3] Verifying Seeded Follow-Up Scenarios...');
    const dueFollowUp = await FollowUp.findOne({ status: 'DUE' }).populate('traineeId');
    assert(dueFollowUp, 'Must have a follow-up in DUE state');
    assert(dueFollowUp.followUpToken, 'DUE follow-up must have a token');
    console.log(`✓ DUE Follow-Up verified for ${dueFollowUp.traineeId?.maskedAadhaar}`);

    const waitingFollowUp = await FollowUp.findOne({ status: 'WAITING_FOR_RESPONSE' });
    assert(waitingFollowUp, 'Must have a follow-up in WAITING_FOR_RESPONSE');
    assert.strictEqual(waitingFollowUp.digitalChannel, 'WHATSAPP');
    console.log('✓ WAITING_FOR_RESPONSE Follow-Up verified');

    const callReqFollowUp = await FollowUp.findOne({ status: 'CALL_REQUIRED' });
    assert(callReqFollowUp, 'Must have a follow-up in CALL_REQUIRED');
    console.log('✓ CALL_REQUIRED Follow-Up verified');

    const callAttFollowUp = await FollowUp.findOne({ status: 'WAITING_AFTER_CALL' });
    assert(callAttFollowUp, 'Must have a follow-up in WAITING_AFTER_CALL');
    const callAttempt = await CallAttempt.findOne({ followUpId: callAttFollowUp._id });
    assert(callAttempt, 'CallAttempt record must exist');
    assert.strictEqual(callAttempt.callOutcome, 'NO_ANSWER');
    console.log('✓ WAITING_AFTER_CALL and CallAttempt record verified');

    const govFlaggedFollowUp = await FollowUp.findOne({ status: 'GOVERNMENT_TRACKING_FLAGGED' });
    assert(govFlaggedFollowUp, 'Must have a follow-up in GOVERNMENT_TRACKING_FLAGGED');
    const idRef = await IdentityReference.findOne({ traineeId: govFlaggedFollowUp.traineeId });
    assert(idRef, 'IdentityReference queue entry must exist');
    assert.strictEqual(idRef.status, 'PENDING_GOVERNMENT_ACTION');
    console.log('✓ GOVERNMENT_TRACKING_FLAGGED and IdentityReference queue verified');

    const returnedFollowUp = await FollowUp.findOne({ status: 'RETURNED' });
    assert(returnedFollowUp, 'Must have a follow-up in RETURNED');
    console.log('✓ RETURNED Follow-Up verified');

    const optedOutFollowUp = await FollowUp.findOne({ status: 'OPTED_OUT' });
    assert(optedOutFollowUp, 'Must have a follow-up in OPTED_OUT');
    const consentHist = await ConsentHistory.findOne({ traineeId: optedOutFollowUp.traineeId });
    assert(consentHist, 'ConsentHistory record must exist');
    assert.strictEqual(consentHist.status, 'WITHDRAWN');
    console.log('✓ OPTED_OUT and ConsentHistory record verified');

    // Test 4: Communication History Audit Trail
    console.log('\n[Test 4] Verifying Communication History Audit Trail...');
    const commEntries = await CommunicationHistory.find({});
    assert(commEntries.length >= 6, 'Must have multiple communication audit records');
    console.log(`✓ Communication History contains ${commEntries.length} auditable events.`);

    // Test 5: Engine State Machine Transition Simulation
    console.log('\n[Test 5] Running Engine State Machine Readiness Evaluation...');
    const evalResult = await followUpEngine.evaluateReadiness();
    assert(evalResult, 'Engine evaluation must return a summary object');
    console.log('✓ Engine evaluation executed cleanly:', evalResult);

    console.log('\n=============================================================');
    console.log('🎉 ALL 5 ADVANCED LONGITUDINAL PIPELINE TESTS PASSED 100%!');
    console.log('=============================================================');
    process.exit(0);
  } catch (err) {
    console.error('Test suite failed:', err);
    process.exit(1);
  }
};

runTests();
