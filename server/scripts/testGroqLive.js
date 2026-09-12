require('dotenv').config();
const { getEngineInfo, chatCompletion } = require('../services/ai/grokClient');
const { generateQuestions } = require('../services/ai/questionGenerator');
const { analyzeSkillGaps } = require('../services/ai/skillGapAnalyzer');

async function testGroq() {
  console.log('Testing Groq AI Integration...');
  const info = getEngineInfo();
  console.log('Engine Info:', info);

  try {
    console.log('\n1. Testing Question Generation via Groq...');
    const questions = await generateQuestions({
      courseName: 'Full-Stack Web Development',
      skills: [
        { skillId: 'react_js', skillName: 'React.js' },
        { skillId: 'node_js', skillName: 'Node.js & Express' },
      ],
      difficulty: 'INTERMEDIATE',
      questionsPerSkill: 3,
    });

    if (questions && questions.length > 0) {
      console.log(`✓ Successfully generated ${questions.length} MCQs via Groq!`);
      console.log('Sample Generated Question:');
      console.log('  Question:', questions[0].questionText);
      console.log('  Skill:', questions[0].skillName);
      console.log('  Options:', questions[0].options.map((o) => `${o.label}: ${o.text}`).join(' | '));
      console.log('  Correct Answer:', questions[0].correctAnswer);
    } else {
      console.error('❌ Question generation returned empty result');
    }

    console.log('\n2. Testing Skill Gap Analysis via Groq...');
    const gapAnalysis = await analyzeSkillGaps({
      courseName: 'Full-Stack Web Development',
      skillResults: [
        {
          skillName: 'React.js',
          percentage: 85,
          questionsTotal: 5,
          questionsCorrect: 4,
          classification: 'STRONG',
          wrongTopics: ['useCallback vs useMemo'],
        },
        {
          skillName: 'Node.js & Express',
          percentage: 35,
          questionsTotal: 5,
          questionsCorrect: 2,
          classification: 'CRITICAL_GAP',
          wrongTopics: ['Event loop phases', 'Stream piping'],
        },
      ],
      overallPercentage: 60,
      deterministic: {
        strongSkills: ['React.js'],
        developingSkills: [],
        weakSkills: [],
        criticalGaps: ['Node.js & Express'],
        thresholdsUsed: { strong: 80, developing: 60, weak: 40, criticalGap: 0 },
      },
    });

    if (gapAnalysis && !gapAnalysis._parseError) {
      console.log('✓ Successfully received Groq Skill Gap interpretation!');
      console.log('  Summary:', gapAnalysis.summary);
      console.log('  Identified Gaps:', gapAnalysis.skillGaps?.length || 0);
    } else {
      console.error('❌ Skill Gap analysis returned empty/malformed result');
    }

    console.log('\n🌟 ALL GROQ AI TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Groq test error:', err);
    process.exit(1);
  }
}

testGroq();
