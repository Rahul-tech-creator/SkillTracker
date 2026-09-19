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

/**
 * Generate a Predefined Case Study Scenario + matching Fixed MCQs.
 * Used exclusively during Provider assessment creation.
 */
const generateCaseStudyWithQuestions = async ({ courseName, skills: rawSkills, difficulty, questionsCount }) => {
  if (!isAvailable()) {
    return null;
  }

  const skills = normalizeSkills(rawSkills);
  if (skills.length === 0) {
    console.error('[QuestionGenerator] No valid skills provided for case study generation');
    return null;
  }

  const count = Math.max(3, Number(questionsCount) || Math.max(skills.length, 5));

  const systemPrompt = `You are a Principal Vocational Assessment Architect and Technical Scenario Designer.
You create realistic, comprehensive technical/vocational case studies and high-quality multiple-choice questions grounded directly in the scenario.

STRICT RULES:
1. Scenario must be detailed, professional, and directly relevant to the course and skills.
   - It must include: (a) Organization / Operational Context, (b) Technical Architecture / Workflow Description, (c) A concrete Problem / Incident / System Challenge, and (d) Operational / Business Constraints.
   - Length: 3-4 comprehensive paragraphs.
2. Generate EXACTLY ${count} multiple-choice questions grounded strictly in the scenario details.
3. Each question must require understanding of the scenario to answer correctly.
4. Each question must have exactly 4 options labeled A, B, C, D.
5. Exactly ONE option must be the correct answer.
6. Map each question to one of the provided skills.
7. Output ONLY valid JSON matching the requested structure.`;

  const userPrompt = `Create a comprehensive Case Study and ${count} MCQs for:
Course: ${courseName}
Skills to Assess:
${skills.map((s, i) => `${i + 1}. ${s.skillName} (ID: "${s.skillId}")`).join('\n')}
Target Difficulty: ${difficulty || 'MIXED'}
Question Count: ${count}

JSON Output Format:
{
  "caseStudy": {
    "title": "Title of the Technical Case Study",
    "scenario": "Full narrative text of the case study with background, system details, incident/problem, and constraints..."
  },
  "questions": [
    {
      "questionText": "Question grounded in scenario...",
      "options": [
        { "label": "A", "text": "Option A" },
        { "label": "B", "text": "Option B" },
        { "label": "C", "text": "Option C" },
        { "label": "D", "text": "Option D" }
      ],
      "correctAnswer": "A",
      "skillId": "${skills[0].skillId}",
      "skillName": "${skills[0].skillName}",
      "difficulty": "INTERMEDIATE",
      "explanation": "Why this answer is correct...",
      "marks": 1
    }
  ]
}`;

  const result = await chatCompletion(systemPrompt, userPrompt, {
    temperature: 0.35,
    expectJson: true,
    jsonMode: true,
  });

  if (!result || result._parseError) {
    console.error('[QuestionGenerator] Failed to get valid JSON for case study');
    return null;
  }

  const caseStudy = result.caseStudy || {};
  if (!caseStudy.title || !caseStudy.scenario) {
    console.error('[QuestionGenerator] Missing caseStudy title or scenario');
    return null;
  }

  const rawQuestions = result.questions || [];
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    console.error('[QuestionGenerator] No questions array in case study response');
    return null;
  }

  const validQuestions = [];
  const validLabels = new Set(['A', 'B', 'C', 'D']);
  const validSkillIds = new Set(skills.map((s) => s.skillId));

  for (const q of rawQuestions) {
    if (!q || typeof q !== 'object') continue;
    const questionText = (q.questionText || q.question || '').toString().trim();
    if (!questionText) continue;

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
    if (!validLabels.has(correctAnswer)) correctAnswer = 'A';

    let assignedSkillId = (q.skillId || '').toString().trim();
    let assignedSkillName = (q.skillName || '').toString().trim();

    if (!validSkillIds.has(assignedSkillId)) {
      const match = skills.find((s) => s.skillName.toLowerCase() === assignedSkillName.toLowerCase());
      if (match) {
        assignedSkillId = match.skillId;
        assignedSkillName = match.skillName;
      } else {
        assignedSkillId = skills[0].skillId;
        assignedSkillName = skills[0].skillName;
      }
    } else {
      const match = skills.find((s) => s.skillId === assignedSkillId);
      if (match) assignedSkillName = match.skillName;
    }

    validQuestions.push({
      questionText,
      options,
      correctAnswer,
      skillId: assignedSkillId,
      skillName: assignedSkillName,
      difficulty: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(q.difficulty?.toString().toUpperCase())
        ? q.difficulty.toString().toUpperCase()
        : 'INTERMEDIATE',
      explanation: (q.explanation || '').toString().trim(),
      marks: Number(q.marks) || 1,
    });
  }

  if (validQuestions.length === 0) {
    console.error('[QuestionGenerator] Case study questions validation failed');
    return null;
  }

  return {
    caseStudy: {
      title: caseStudy.title.trim(),
      scenario: caseStudy.scenario.trim(),
    },
    questions: validQuestions,
  };
};

/**
 * Asynchronously analyze a single case study answer to produce independent evidence.
 * Does NOT update final competency profile directly.
 */
const analyzeCaseStudyAnswerEvidence = async ({ scenario, question, selectedAnswer, isCorrect, skillName }) => {
  if (!isAvailable()) {
    return {
      competencies: [skillName || 'General'],
      strengths: isCorrect ? [`Correctly addressed ${skillName} in practical scenario`] : [],
      weaknesses: !isCorrect ? [`Demonstrated conceptual gap in ${skillName}`] : [],
      misconceptions: !isCorrect ? [`Selected option ${selectedAnswer} instead of ${question.correctAnswer}`] : [],
      evidenceLevel: 'MEDIUM',
    };
  }

  const selectedOpt = (question.options || []).find((o) => o.label === selectedAnswer);
  const correctOpt = (question.options || []).find((o) => o.label === question.correctAnswer);

  const systemPrompt = `You are an expert psychometric evaluator and technical diagnostic assessor.
Analyze a trainee's response to a case study question and extract structured, objective evidence.
Output ONLY valid JSON.`;

  const userPrompt = `Context Scenario Summary:
${(scenario || '').slice(0, 600)}...

Question:
${question.questionText}

Correct Answer: ${question.correctAnswer}: ${correctOpt?.text || ''}
Trainee Selected: ${selectedAnswer}: ${selectedOpt?.text || ''}
Evaluation: ${isCorrect ? 'CORRECT' : 'INCORRECT'}
Skill: ${skillName}

Provide diagnostic evidence in this exact JSON structure:
{
  "competencies": ["${skillName}"],
  "strengths": ["${isCorrect ? 'Specific technical strength demonstrated' : ''}"],
  "weaknesses": ["${!isCorrect ? 'Specific technical knowledge deficit' : ''}"],
  "misconceptions": ["${!isCorrect ? 'Root cognitive misconception leading to this incorrect choice' : ''}"],
  "evidenceLevel": "HIGH"
}`;

  try {
    const result = await chatCompletion(systemPrompt, userPrompt, {
      temperature: 0.2,
      expectJson: true,
      jsonMode: true,
      maxRetries: 2,
    });

    if (result && !result._parseError) {
      return {
        competencies: Array.isArray(result.competencies) ? result.competencies.filter(Boolean) : [skillName],
        strengths: Array.isArray(result.strengths) ? result.strengths.filter(Boolean) : [],
        weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses.filter(Boolean) : [],
        misconceptions: Array.isArray(result.misconceptions) ? result.misconceptions.filter(Boolean) : [],
        evidenceLevel: ['HIGH', 'MEDIUM', 'LOW'].includes(result.evidenceLevel) ? result.evidenceLevel : 'MEDIUM',
      };
    }
  } catch (err) {
    console.error('[QuestionGenerator] analyzeCaseStudyAnswerEvidence failed:', err.message);
  }

  return {
    competencies: [skillName || 'General'],
    strengths: isCorrect ? [`Correctly addressed ${skillName}`] : [],
    weaknesses: !isCorrect ? [`Incorrect answer on ${skillName}`] : [],
    misconceptions: !isCorrect ? [`Chose ${selectedAnswer} over ${question.correctAnswer}`] : [],
    evidenceLevel: 'LOW',
  };
};

/**
 * Generate a single genuinely dynamic Adaptive Question calibrated to trainee's current competency profile.
 * Never predefined.
 */
const generateAdaptiveQuestion = async ({ courseName, skills, competencyProfile, targetSkill, targetDifficulty, previousQuestions = [] }) => {
  if (!isAvailable()) {
    console.error('[QuestionGenerator] AI service unavailable for adaptive question generation');
    return null;
  }

  const skillName = targetSkill.skillName;
  const skillId = targetSkill.skillId;
  const difficulty = targetDifficulty || 'INTERMEDIATE';

  const prevList = previousQuestions
    .filter(Boolean)
    .slice(-8)
    .map((q, idx) => `${idx + 1}. ${q.slice(0, 100)}`)
    .join('\n');

  const systemPrompt = `You are an Adaptive Testing Engine. You generate ONE targeted, rigorous multiple-choice question on the fly.
Target Skill: ${skillName} (ID: "${skillId}")
Target Difficulty: ${difficulty}

RULES:
1. Generate EXACTLY ONE question.
2. Exactly 4 options labeled A, B, C, D.
3. Exactly 1 correct answer (A, B, C, or D).
4. Difficulty calibration:
   - BEGINNER: Tests foundational concepts, terminology, syntax, basic mechanics.
   - INTERMEDIATE: Tests practical application, common operational scenarios, component integration.
   - ADVANCED: Tests edge cases, performance optimization, concurrency, system design tradeoffs.
5. NEVER repeat or closely paraphrase any of the previous questions listed below.
6. Output ONLY valid JSON.`;

  const userPrompt = `Course: ${courseName}
Skill: ${skillName}
Difficulty: ${difficulty}
Trainee Context: Calibrating ${skillName} at ${difficulty} level based on recent performance.

Previous questions already asked (DO NOT REPEAT ANY OF THESE):
${prevList || 'None'}

Output JSON Format:
{
  "questionText": "The specific question text",
  "options": [
    { "label": "A", "text": "Option A text" },
    { "label": "B", "text": "Option B text" },
    { "label": "C", "text": "Option C text" },
    { "label": "D", "text": "Option D text" }
  ],
  "correctAnswer": "B",
  "skillId": "${skillId}",
  "skillName": "${skillName}",
  "difficulty": "${difficulty}",
  "explanation": "Detailed explanation of why the correct option is right and others are wrong",
  "marks": 1
}`;

  const result = await chatCompletion(systemPrompt, userPrompt, {
    temperature: 0.35,
    expectJson: true,
    jsonMode: true,
    maxRetries: 2,
  });

  if (!result || result._parseError) {
    console.error('[QuestionGenerator] Failed to get valid adaptive question JSON');
    return null;
  }

  const q = result.question || result;
  const questionText = (q.questionText || q.question || '').toString().trim();
  if (!questionText) {
    console.error('[QuestionGenerator] Adaptive question missing questionText');
    return null;
  }

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

  if (options.length !== 4) {
    console.error('[QuestionGenerator] Adaptive question did not contain 4 valid options');
    return null;
  }

  const validLabels = new Set(['A', 'B', 'C', 'D']);
  let correctAnswer = (q.correctAnswer || q.answer || 'A').toString().trim().toUpperCase();
  if (!validLabels.has(correctAnswer)) correctAnswer = 'A';

  return {
    questionText,
    options,
    correctAnswer,
    skillId,
    skillName,
    difficulty,
    explanation: (q.explanation || '').toString().trim(),
    marks: Number(q.marks) || 1,
  };
};

module.exports = {
  generateQuestions,
  generateCaseStudyWithQuestions,
  analyzeCaseStudyAnswerEvidence,
  generateAdaptiveQuestion,
  normalizeSkills,
};
