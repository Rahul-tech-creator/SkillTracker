const OpenAI = require('openai');

let client = null;
let currentProvider = 'unknown';

/**
 * Resolve API Key from environment
 */
const getApiKey = () => {
  return process.env.GROQ_API_KEY || process.env.XAI_API_KEY || '';
};

/**
 * Determine API Provider (Groq vs xAI Grok)
 */
const getProviderConfig = () => {
  const apiKey = getApiKey();
  if (!apiKey) return { provider: 'none', baseURL: '', defaultModel: '' };

  // Groq API keys start with 'gsk_'
  if (apiKey.startsWith('gsk_') || process.env.GROQ_API_KEY) {
    let model = process.env.GROQ_MODEL || process.env.XAI_MODEL || 'openai/gpt-oss-120b';
    // Normalize model if user typed groq-3-mini or grok or generic
    if (model.includes('grok') || model.includes('groq') || model.includes('llama')) {
      model = 'openai/gpt-oss-120b';
    }

    return {
      provider: 'Groq',
      baseURL: 'https://api.groq.com/openai/v1',
      defaultModel: model,
    };
  }

  // xAI Grok API keys (or generic OpenAI compatible)
  return {
    provider: 'xAI Grok',
    baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
    defaultModel: process.env.XAI_MODEL || 'grok-3-mini',
  };
};

/**
 * Get or create the AI client.
 */
const getClient = () => {
  if (client) return client;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  const config = getProviderConfig();
  currentProvider = config.provider;

  client = new OpenAI({
    apiKey,
    baseURL: config.baseURL,
  });

  return client;
};

/**
 * Check if AI API is configured and available.
 */
const isAvailable = () => {
  return !!getApiKey();
};

/**
 * Get active AI engine details
 */
const getEngineInfo = () => {
  const config = getProviderConfig();
  return {
    available: isAvailable(),
    provider: config.provider,
    model: config.defaultModel,
  };
};

/**
 * Send a chat completion request to Groq / Grok.
 * @param {string} systemPrompt - System message
 * @param {string} userPrompt - User message
 * @param {object} options - Optional overrides
 * @returns {object|null} Parsed JSON response or null on failure
 */
const chatCompletion = async (systemPrompt, userPrompt, options = {}) => {
  const ai = getClient();
  if (!ai) {
    return null;
  }

  const config = getProviderConfig();
  let model = options.model || config.defaultModel;

  // Normalize model name for Groq if needed
  if (config.provider === 'Groq' && (model.includes('grok') || model.includes('groq'))) {
    model = 'llama-3.3-70b-versatile';
  }

  const maxRetries = options.maxRetries || 2;
  const temperature = options.temperature ?? 0.3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        console.error(`[AIClient:${config.provider}] Empty response on attempt ${attempt}`);
        continue;
      }

      // Try to parse as JSON
      if (options.expectJson !== false) {
        try {
          // Extract JSON from markdown code blocks if present
          let jsonStr = content;
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
          }
          const parsed = JSON.parse(jsonStr);
          return parsed;
        } catch (parseErr) {
          console.error(`[AIClient:${config.provider}] JSON parse failed on attempt ${attempt}:`, parseErr.message);
          if (attempt < maxRetries) continue;
          return { _raw: content, _parseError: true };
        }
      }

      return content;
    } catch (err) {
      console.error(`[AIClient:${config.provider}] API error on attempt ${attempt}:`, err.message);
      if (attempt >= maxRetries) {
        return null;
      }
    }
  }

  return null;
};

module.exports = { getClient, isAvailable, getEngineInfo, chatCompletion };
