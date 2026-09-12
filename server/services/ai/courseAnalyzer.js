const { chatCompletion, isAvailable } = require('./grokClient');

/**
 * AI analysis of course comparison using actual aggregated data.
 */
const analyzeCourses = async ({ courses }) => {
  if (!isAvailable()) return null;

  const systemPrompt = `You are a data analyst for a government vocational training programme.
You interpret pre-calculated course performance metrics.

STRICT RULES:
1. Do NOT change, recalculate, or invent any numerical values.
2. Base ALL conclusions on supplied data ONLY.
3. Consider sample sizes and data completeness.
4. Identify which courses perform strongly and which need improvement.
5. Output ONLY valid JSON.`;

  const courseDataStr = courses.map((c) => {
    return `Course: ${c.courseName}
  Category: ${c.category || 'N/A'}
  Total Enrolled: ${c.enrolled}
  Metrics:
    Completion: ${c.metrics.completion != null ? c.metrics.completion + '%' : 'N/A'}
    Certification: ${c.metrics.certification != null ? c.metrics.certification + '%' : 'N/A'}
    Assessment Avg: ${c.metrics.assessment != null ? c.metrics.assessment + '%' : 'N/A'}
    Employment: ${c.metrics.employment != null ? c.metrics.employment + '%' : 'N/A'}
    Retention: ${c.metrics.retention != null ? c.metrics.retention + '%' : 'N/A'}
    Relevance: ${c.metrics.relevance != null ? c.metrics.relevance + '/5' : 'N/A'}
    Skill Gap Rate: ${c.metrics.skillGapRate != null ? c.metrics.skillGapRate + '%' : 'N/A'}`;
  }).join('\n\n');

  const userPrompt = `Analyze the following course comparison:

${courseDataStr}

Provide analysis in this JSON format:
{
  "summary": "Brief comparison summary",
  "courseAnalysis": [
    {
      "course": "name",
      "performance": "STRONG/MODERATE/WEAK",
      "strengths": [],
      "weaknesses": [],
      "curriculumRecommendations": []
    }
  ],
  "topPerforming": "course name with evidence",
  "needsImprovement": ["courses needing attention with evidence"],
  "fundingPotential": ["courses where additional funding might have higher impact"],
  "limitations": []
}`;

  return chatCompletion(systemPrompt, userPrompt, { temperature: 0.3, expectJson: true, jsonMode: true });
};

module.exports = { analyzeCourses };
