const { chatCompletion, isAvailable } = require('./grokClient');

/**
 * Robust skill normalizer to handle both string array and object array input.
 */
const normalizeSkills = (rawSkills) => {
  if (!Array.isArray(rawSkills)) return [];
  return rawSkills
    .map((s, idx) => {
      if (typeof s === 'string') {
        const name = s.trim();
        if (!name) return null;
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `skill_${idx + 1}`;
        return { skillId: id, skillName: name };
      }
      if (typeof s === 'object' && s !== null) {
        const name = (s.skillName || s.name || s.title || s.skillId || '').toString().trim();
        if (!name) return null;
        const id = (s.skillId || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `skill_${idx + 1}`).toString().trim();
        return { skillId: id, skillName: name };
      }
      return null;
    })
    .filter(Boolean);
};

/**
 * Generate MCQ assessment questions using Groq / Grok AI.
 *
 * @param {object} params
 * @param {string} params.courseName
 * @param {Array} params.skills - [{ skillId, skillName }] or ["React", "Node"]
 * @param {string} params.difficulty - BEGINNER/INTERMEDIATE/ADVANCED/MIXED
 * @param {number} params.questionsPerSkill
 * @returns {Array|null} Array of question objects or null on failure
 */
const generateQuestions = async ({ courseName, skills: rawSkills, difficulty, questionsPerSkill }) => {
  if (!isAvailable()) {
    return null;
  }

  const skills = normalizeSkills(rawSkills);
  if (skills.length === 0) {
    console.error('[QuestionGenerator] No valid skills provided to generate questions');
    return null;
  }

  const qps = Math.max(1, Number(questionsPerSkill) || 3);
  const totalQuestions = skills.length * qps;

  const systemPrompt = `You are an expert assessment designer for vocational training and skill development programmes.
You generate high-quality multiple-choice questions (MCQs) for skill assessments.

STRICT RULES:
- Generate EXACTLY ${qps} questions for EACH of the ${skills.length} skills.
- Each question must have exactly 4 options labelled A, B, C, D.
- Exactly ONE option must be the correct answer.
- Distractors must be plausible but clearly incorrect.
- Each question must be mapped to exactly ONE skill.
- Include a mix of conceptual and practical/application questions.
- No duplicate questions.
- No ambiguous wording.
- Provide a brief explanation for the correct answer.
- Output ONLY valid JSON. No markdown, no extra text.`;

  const userPrompt = `Generate a skill assessment for the following course:

Course: ${courseName || 'Vocational Training'}

Skills to assess:
${skills.map((s, i) => `${i + 1}. ${s.skillName} (skillId: "${s.skillId}")`).join('\n')}

Requirements:
- Difficulty Level: ${difficulty || 'MIXED'}
- Questions per skill: ${qps}
- Total questions: ${totalQuestions}
${difficulty === 'MIXED' ? '- Include a mix of BEGINNER, INTERMEDIATE, and ADVANCED questions for each skill.' : ''}

Output format — a JSON object with a "questions" array:
{
  "questions": [
    {
      "questionText": "The question text here",
      "options": [
        { "label": "A", "text": "Option A text" },
        { "label": "B", "text": "Option B text" },
        { "label": "C", "text": "Option C text" },
        { "label": "D", "text": "Option D text" }
      ],
      "correctAnswer": "B",
      "skillId": "${skills[0].skillId}",
      "skillName": "${skills[0].skillName}",
      "difficulty": "BEGINNER",
      "explanation": "Explanation of why the correct answer is correct",
      "marks": 1
    }
  ]
}

Generate EXACTLY ${qps} questions for EACH of the ${skills.length} skills (${totalQuestions} total).
Output ONLY the JSON object. No other text.`;

  const result = await chatCompletion(systemPrompt, userPrompt, {
    temperature: 0.4,
    expectJson: true,
    jsonMode: true,
  });

  if (!result || result._parseError) {
    return null;
  }

  // Validate the response structure
  const rawQuestions = Array.isArray(result) ? result : result.questions || result.data || [];
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    console.error('[QuestionGenerator] No questions array in response');
    return null;
  }

  // Validate each question
  const validQuestions = [];
  const validLabels = new Set(['A', 'B', 'C', 'D']);
  const validSkillIds = new Set(skills.map((s) => s.skillId));

  for (const q of rawQuestions) {
    if (!q || typeof q !== 'object') continue;

    const questionText = (q.questionText || q.question || '').toString().trim();
    if (!questionText) continue;

    // Normalize options
    let options = [];
    if (Array.isArray(q.options)) {
      options = q.options.map((opt, i) => {
        if (typeof opt === 'string') {
          const label = ['A', 'B', 'C', 'D'][i] || 'A';
          return { label, text: opt.trim() };
        }
        if (typeof opt === 'object' && opt !== null) {
          const label = (opt.label || ['A', 'B', 'C', 'D'][i] || 'A').toString().trim().toUpperCase();
          const text = (opt.text || opt.value || opt.option || '').toString().trim();
          return { label, text };
        }
        return null;
      }).filter(Boolean);
    }

    if (options.length !== 4) continue;

    let correctAnswer = (q.correctAnswer || q.answer || 'A').toString().trim().toUpperCase();
    if (!validLabels.has(correctAnswer)) {
      correctAnswer = 'A';
    }

    // Match or resolve skill
    let assignedSkillId = (q.skillId || '').toString().trim();
    let assignedSkillName = (q.skillName || '').toString().trim();

    if (!validSkillIds.has(assignedSkillId)) {
      const qNameLower = (assignedSkillName || assignedSkillId || '').toLowerCase();
      const match = skills.find((s) => {
        const sNameLower = (s.skillName || '').toLowerCase();
        const sIdLower = (s.skillId || '').toLowerCase();
        return (
          (sNameLower && qNameLower && (sNameLower === qNameLower || sNameLower.includes(qNameLower) || qNameLower.includes(sNameLower))) ||
          (sIdLower && qNameLower && sIdLower === qNameLower)
        );
      });

      if (match) {
        assignedSkillId = match.skillId;
        assignedSkillName = match.skillName;
      } else {
        // Fallback to first skill if only 1 skill or close default
        assignedSkillId = skills[0].skillId;
        assignedSkillName = skills[0].skillName;
      }
    } else {
      const matched = skills.find((s) => s.skillId === assignedSkillId);
      if (matched) {
        assignedSkillName = matched.skillName;
      }
    }

    validQuestions.push({
      questionText,
      options,
      correctAnswer,
      skillId: assignedSkillId,
      skillName: assignedSkillName || assignedSkillId,
      difficulty: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(q.difficulty?.toString().toUpperCase())
        ? q.difficulty.toString().toUpperCase()
        : 'INTERMEDIATE',
      explanation: (q.explanation || '').toString().trim(),
      marks: Number(q.marks) || 1,
    });
  }

  if (validQuestions.length === 0) {
    console.error('[QuestionGenerator] No valid questions after parsing and validation');
    return null;
  }

  return validQuestions;
};

module.exports = { generateQuestions, normalizeSkills };
