const { chatCompletion, isAvailable } = require('./grokClient');

/**
 * Analyze skill gaps using actual assessment evidence via Grok AI.
 *
 * @param {object} params
 * @param {string} params.courseName
 * @param {Array} params.skillResults - [{ skillName, percentage, questionsTotal, questionsCorrect, wrongTopics[] }]
 * @param {number} params.overallPercentage
 * @param {object} params.deterministic - { strongSkills, developingSkills, weakSkills, criticalGaps }
 * @returns {object|null} Structured AI analysis or null
 */
const analyzeSkillGaps = async ({ courseName, skillResults, overallPercentage, deterministic }) => {
  if (!isAvailable()) return null;

  const systemPrompt = `You are an evidence-based skill assessment analyst for a government vocational training programme.

STRICT RULES:
1. Base ALL conclusions on the supplied assessment evidence ONLY.
2. Do NOT infer employment status, experience, qualifications, salary, or skills not supported by supplied data.
3. Do NOT fabricate statistics or percentages — use ONLY the numbers provided.
4. If evidence is insufficient for a conclusion, state "INSUFFICIENT EVIDENCE".
5. Clearly distinguish between what is measured and what is your interpretation.
6. Use professional, objective language suitable for government decision-support.
7. Output ONLY valid JSON.`;

  const skillDataStr = skillResults.map((s) => {
    let str = `Skill: ${s.skillName}\n  Score: ${s.percentage}% (${s.questionsCorrect}/${s.questionsTotal} correct)`;
    str += `\n  Classification: ${s.classification}`;
    if (s.wrongTopics && s.wrongTopics.length > 0) {
      str += `\n  Incorrect answer areas: ${s.wrongTopics.join(', ')}`;
    }
    return str;
  }).join('\n\n');

  const userPrompt = `Analyze the following skill assessment results in rigorous technical depth:

Course: ${courseName}
Overall Score: ${overallPercentage}%

Skill-wise Results:
${skillDataStr}

Deterministic Classification:
- Strong skills (≥80%): ${deterministic.strongSkills.join(', ') || 'None'}
- Developing skills (60-79%): ${deterministic.developingSkills.join(', ') || 'None'}
- Weak skills (40-59%): ${deterministic.weakSkills.join(', ') || 'None'}
- Critical gaps (<40%): ${deterministic.criticalGaps.join(', ') || 'None'}

CRITICAL INSTRUCTION FOR NUMERIC FIELDS:
For readinessScore, recallScore, applicationScore, analysisScore, synthesisScore:
Provide ONLY a valid numeric integer between 0 and 100, or null if evidence is insufficient.
NEVER provide a string such as "INSUFFICIENT EVIDENCE" or "N/A" for these numeric properties.

Based on this ACTUAL ASSESSMENT EVIDENCE, provide an in-depth diagnostic analysis in this JSON format:
{
  "summary": "Detailed executive analysis summarizing conceptual strengths, specific knowledge deficits, and developmental trajectory.",
  "strongSkills": [
    {
      "skill": "skill name",
      "evidence": "concrete question-level justification for why this skill was mastered"
    }
  ],
  "developingSkills": [
    {
      "skill": "skill name",
      "evidence": "specific topic boundaries where the trainee showed partial understanding"
    }
  ],
  "skillGaps": [
    {
      "skill": "skill name",
      "severity": "HIGH/MEDIUM/LOW",
      "evidence": "specific evidence from incorrect answers and topics",
      "weakTopics": ["specific sub-topics from wrong answers"],
      "recommendedAction": "concrete high-impact pedagogical fix"
    }
  ],
  "misconceptionAnalysis": [
    {
      "topic": "topic name where mistake occurred",
      "identifiedMisconception": "why the trainee likely chose the incorrect option (the underlying misunderstanding)",
      "correctMentalModel": "the exact industry-standard principle they need to internalize",
      "severity": "HIGH/MEDIUM/LOW"
    }
  ],
  "remedialRoadmap": [
    {
      "phase": "Phase 1: Conceptual Stabilization (Days 1-3)",
      "duration": "3 Days (6 Hours)",
      "focus": "Targeted theory and documentation review",
      "milestones": ["Read official guides on failed topics", "Complete conceptual flash drills"],
      "resources": ["Official Documentation & Architecture Whitepapers"]
    },
    {
      "phase": "Phase 2: Applied Laboratory Drills (Days 4-7)",
      "duration": "4 Days (10 Hours)",
      "focus": "Hands-on implementation and failure debugging",
      "milestones": ["Build targeted mini-lab reproducing problem scenario", "Implement unit/integration tests"],
      "resources": ["Guided Coding Labs & Simulation Sandboxes"]
    },
    {
      "phase": "Phase 3: Verification & Capstone (Days 8-14)",
      "duration": "7 Days (12 Hours)",
      "focus": "Peer code review, integration capstone, and re-evaluation",
      "milestones": ["Submit capstone project PR", "Achieve ≥85% on diagnostic re-test"],
      "resources": ["Mentor Code Review & Final Skill Verification"]
    }
  ],
  "careerReadiness": {
    "rating": "JOB_READY / READY_WITH_REMEDIATION / NEEDS_FOUNDATIONAL_TRAINING",
    "readinessScore": 85,
    "justification": "Evidence-based justification linking assessed skills to real-world job role competencies",
    "suggestedRoles": ["Job Role 1", "Job Role 2"],
    "targetCertifications": ["Industry Certification 1", "Industry Certification 2"],
    "salaryGrowthPotential": "Expected salary band uplift upon resolving identified gaps"
  },
  "cognitiveBreakdown": {
    "recallScore": 85,
    "applicationScore": 75,
    "analysisScore": 70,
    "synthesisScore": 65
  },
  "recommendedSkills": ["priority-ordered advanced skills to learn next"],
  "providerActions": ["direct pedagogical interventions for the instructors/trainers"],
  "limitations": ["data limitations based on test sample size"]
}`;

  try {
    const raw = await chatCompletion(systemPrompt, userPrompt, { temperature: 0.3, expectJson: true, jsonMode: true });
    if (!raw || typeof raw !== 'object' || raw._parseError) {
      return null;
    }

    const parseNum = (val) => {
      if (typeof val === 'number' && !isNaN(val)) return Math.min(100, Math.max(0, Math.round(val)));
      if (typeof val === 'string') {
        const n = parseFloat(val);
        if (!isNaN(n)) return Math.min(100, Math.max(0, Math.round(n)));
      }
      return null;
    };

    const cognitive = raw.cognitiveBreakdown || {};
    const recall = parseNum(cognitive.recallScore);
    const application = parseNum(cognitive.applicationScore);
    const analysis = parseNum(cognitive.analysisScore);
    const synthesis = parseNum(cognitive.synthesisScore);

    const hasNullScore = recall === null || application === null || analysis === null || synthesis === null;

    const normalized = {
      summary: typeof raw.summary === 'string' ? raw.summary : '',
      strongSkills: Array.isArray(raw.strongSkills) ? raw.strongSkills : [],
      developingSkills: Array.isArray(raw.developingSkills) ? raw.developingSkills : [],
      skillGaps: Array.isArray(raw.skillGaps) ? raw.skillGaps : [],
      misconceptionAnalysis: Array.isArray(raw.misconceptionAnalysis) ? raw.misconceptionAnalysis : [],
      remedialRoadmap: Array.isArray(raw.remedialRoadmap) ? raw.remedialRoadmap : [],
      careerReadiness: {
        rating: raw.careerReadiness?.rating || 'DEVELOPING',
        readinessScore: parseNum(raw.careerReadiness?.readinessScore) ?? overallPercentage,
        justification: raw.careerReadiness?.justification || '',
        suggestedRoles: Array.isArray(raw.careerReadiness?.suggestedRoles) ? raw.careerReadiness.suggestedRoles : [],
        targetCertifications: Array.isArray(raw.careerReadiness?.targetCertifications) ? raw.careerReadiness.targetCertifications : [],
        salaryGrowthPotential: raw.careerReadiness?.salaryGrowthPotential || '',
      },
      cognitiveBreakdown: {
        recallScore: recall,
        applicationScore: application,
        analysisScore: analysis,
        synthesisScore: synthesis,
        evidenceStatus: hasNullScore ? 'INSUFFICIENT_EVIDENCE' : 'SUFFICIENT',
        notes: hasNullScore ? 'Partial or insufficient evidence detected for select cognitive dimensions.' : '',
      },
      recommendedSkills: Array.isArray(raw.recommendedSkills) ? raw.recommendedSkills : [],
      providerActions: Array.isArray(raw.providerActions) ? raw.providerActions : [],
      limitations: Array.isArray(raw.limitations) ? raw.limitations : [],
    };

    return normalized;
  } catch (err) {
    console.error('analyzeSkillGaps normalization/API error:', err.message);
    return null;
  }
};

module.exports = { analyzeSkillGaps };
