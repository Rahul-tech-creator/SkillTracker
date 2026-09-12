const { chatCompletion, isAvailable } = require('./grokClient');

/**
 * AI-assisted funding recommendation based on actual provider performance data.
 */
const analyzeFunding = async ({ schemeName, courseName, budget, district, providers }) => {
  if (!isAvailable()) return null;

  const systemPrompt = `You are a policy analysis assistant for a government vocational training programme.
You provide evidence-based funding recommendations.

STRICT RULES:
1. This is DECISION SUPPORT, not an automatic decision. The administrator makes the final decision.
2. Do NOT change any numerical values. Use ONLY the supplied data.
3. Base ALL recommendations on actual performance evidence.
4. Consider sample sizes and data confidence.
5. Explain WHY each provider is or is not recommended with specific evidence.
6. Do NOT simply say "Provider X is best." Provide nuanced analysis.
7. Acknowledge any data limitations.
8. Output ONLY valid JSON.`;

  const providerDataStr = providers.map((p) => {
    return `Provider: ${p.name}
  District: ${p.district || 'N/A'}
  Historical Sample: ${p.sampleSize} trainees
  Data Confidence: ${p.confidence}
  Performance:
    Completion: ${p.metrics.completion != null ? p.metrics.completion + '%' : 'N/A'}
    Certification: ${p.metrics.certification != null ? p.metrics.certification + '%' : 'N/A'}
    Assessment: ${p.metrics.assessment != null ? p.metrics.assessment + '%' : 'N/A'}
    Employment: ${p.metrics.employment != null ? p.metrics.employment + '%' : 'N/A'}
    Retention: ${p.metrics.retention != null ? p.metrics.retention + '%' : 'N/A'}
    Relevance: ${p.metrics.relevance != null ? p.metrics.relevance + '/5' : 'N/A'}
  Overall Score: ${p.metrics.overallScore != null ? p.metrics.overallScore : 'N/A'}`;
  }).join('\n\n');

  const userPrompt = `Provide a funding analysis for the following scheme:

Scheme: ${schemeName}
Course: ${courseName}
Budget: ₹${budget.toLocaleString()}
District: ${district || 'Not specified'}

Eligible Providers:
${providerDataStr}

Provide analysis in this JSON format:
{
  "summary": "Brief funding analysis summary",
  "providerRecommendations": [
    {
      "provider": "name",
      "recommended": true/false,
      "reasoning": "Detailed evidence-based reasoning",
      "strengths": [],
      "concerns": [],
      "suggestedAllocationPercent": number
    }
  ],
  "keyConsiderations": ["important factors for the administrator"],
  "riskFactors": ["potential risks to consider"],
  "dataGaps": ["areas where more data would improve the analysis"],
  "disclaimer": "This is decision support. The final funding decision rests with the programme administrator."
}`;

  return chatCompletion(systemPrompt, userPrompt, { temperature: 0.3, expectJson: true, jsonMode: true });
};

module.exports = { analyzeFunding };
