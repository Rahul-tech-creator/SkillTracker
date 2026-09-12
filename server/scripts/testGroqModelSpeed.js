require('dotenv').config();
const OpenAI = require('openai');

async function testModel(modelName) {
  const apiKey = process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  console.log(`Testing model: ${modelName}...`);
  try {
    const res = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are an AI assistant. Output ONLY valid JSON: {"status": "ok", "message": "Hello from Groq"}' },
        { role: 'user', content: 'Say hello in JSON' },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    console.log(`✓ ${modelName} SUCCESS:`, res.choices[0]?.message?.content);
    return true;
  } catch (err) {
    console.error(`❌ ${modelName} failed:`, err.message);
    return false;
  }
}

async function run() {
  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'groq/compound-mini'];
  for (const m of models) {
    await testModel(m);
  }
}

run();
