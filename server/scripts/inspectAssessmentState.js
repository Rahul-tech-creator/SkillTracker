require('dotenv').config();
const mongoose = require('mongoose');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skilling_tracker');
  const Assessment = require('../models/Assessment');
  const AssessmentAttempt = require('../models/AssessmentAttempt');
  const QuestionBank = require('../models/QuestionBank');

  const assessments = await Assessment.find().lean();
  console.log('Assessments found:', assessments.length);
  for (const a of assessments) {
    console.log(`\nAssessment ID: ${a._id}`);
    console.log(`Title: ${a.title}`);
    console.log(`Status: ${a.status}`);
    console.log(`Questions count: ${a.questions?.length}`);
    if (a.questions && a.questions.length > 0) {
      console.log('Q0 keys:', Object.keys(a.questions[0]));
      console.log('Q0 questionId:', a.questions[0].questionId);
      console.log('Q0 questionText:', a.questions[0].questionText);
      console.log('Q0 options:', a.questions[0].options);
    }
  }

  const attempts = await AssessmentAttempt.find().lean();
  console.log('\nTotal Attempts:', attempts.length);
  for (const at of attempts.slice(0, 5)) {
    console.log(`Attempt ${at._id} | status: ${at.status} | currentQuestionId: ${at.currentQuestionId} | answers count: ${at.answers?.length} | answeredQIds: ${at.answeredQuestionIds}`);
  }

  const qbCount = await QuestionBank.countDocuments();
  console.log('\nTotal QuestionBank records:', qbCount);

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
