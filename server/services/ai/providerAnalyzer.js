const { chatCompletion, isAvailable } = require('./grokClient');

/**
 * AI analysis of provider comparison using actual calculated metrics.
 *
 * @param {object} params
 * @param {string} params.courseName
 * @param {Array} params.providers - [{ name, metrics: { completion, certification, assessment, employment, retention, relevance, followUp, overallScore }, sampleSize, confidence }]
 * @returns {object|null}
 */
const analyzeProviders = async ({ courseName, providers }) => {
  if (!isAvailable()) return null;

  const systemPrompt = `You are a data analyst for a government vocational training programme.
You interpret pre-calculated provider performance metrics.

STRICT RULES:
1. Do NOT change, recalculate, or invent any numerical values.
2. The numerical ranking has been calculated by the system. Do NOT alter it.
3. Base ALL conclusions on supplied data ONLY.
4. Identify strengths, weaknesses, and notable differences.
5. Consider sample size and data confidence in your interpretation.
6. Suggest areas needing further investigation where data is ambiguous.
7. Use professional, objective language suitable for government decision-support.
8. Output ONLY valid JSON.`;

  const providerDataStr = providers.map((p, i) => {
    return `Provider: ${p.name}
  Sample Size: ${p.sampleSize} trainees
  Data Confidence: ${p.confidence}
  Metrics:
    Completion Rate: ${p.metrics.completion != null ? p.metrics.completion + '%' : 'N/A'}
    Certification Rate: ${p.metrics.certification != null ? p.metrics.certification + '%' : 'N/A'}
    Assessment Performance: ${p.metrics.assessment != null ? p.metrics.assessment + '%' : 'N/A'}
    Employment Rate: ${p.metrics.employment != null ? p.metrics.employment + '%' : 'N/A'}
    Retention Rate: ${p.metrics.retention != null ? p.metrics.retention + '%' : 'N/A'}
    Training Relevance: ${p.metrics.relevance != null ? p.metrics.relevance + '/5' : 'N/A'}
    Follow-Up Completion: ${p.metrics.followUp != null ? p.metrics.followUp + '%' : 'N/A'}
  Overall Score: ${p.metrics.overallScore != null ? p.metrics.overallScore : 'N/A'}`;
  }).join('\n\n');

  const userPrompt = `Analyze the following provider comparison for course: ${courseName}

${providerDataStr}

Provide analysis in this JSON format:
{
  "summary": "Brief comparison summary",
  "providerAnalysis": [
    {
      "provider": "name",
      "strengths": ["evidence-based strengths"],
      "weaknesses": ["evidence-based weaknesses"],
      "notableFindings": ["any notable observations"]
    }
  ],
  "majorDifferences": ["key differences between providers with evidence"],
  "areasNeedingInvestigation": ["areas where data is ambiguous or insufficient"],
  "recommendations": ["evidence-based recommendations for programme administrators"],
  "limitations": ["limitations of this analysis"]
}`;

  return chatCompletion(systemPrompt, userPrompt, { temperature: 0.3, expectJson: true, jsonMode: true });
};

module.exports = { analyzeProviders };
