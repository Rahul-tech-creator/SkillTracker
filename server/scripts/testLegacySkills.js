require('dotenv').config();
const { generateQuestions } = require('../services/ai/questionGenerator');

async function testLegacySkillsInput() {
  console.log('Testing question generation with legacy string array skills...');
  try {
    const questions = await generateQuestions({
      courseName: 'Full-Stack Web Development',
      skills: ['React.js', 'Node.js', 'MongoDB Database'], // String array!
      difficulty: 'INTERMEDIATE',
      questionsPerSkill: 3,
    });

    if (questions && questions.length > 0) {
      console.log(`✓ SUCCESS! Generated ${questions.length} questions from string array skills!`);
      console.log('Sample Question 1:', questions[0].questionText);
      console.log('Skill Name:', questions[0].skillName);
      console.log('Skill ID:', questions[0].skillId);
      console.log('Options:', questions[0].options);
      console.log('Correct Answer:', questions[0].correctAnswer);
    } else {
      console.error('❌ Failed: empty questions');
    }
  } catch (err) {
    console.error('❌ Error during legacy skills test:', err);
  }
}

testLegacySkillsInput();
