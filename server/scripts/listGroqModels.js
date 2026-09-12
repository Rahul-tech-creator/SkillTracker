require('dotenv').config();
const OpenAI = require('openai');

async function checkModels() {
  const apiKey = process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  try {
    const list = await client.models.list();
    console.log('Available models on Groq:');
    list.data.forEach((m) => console.log(' -', m.id));
  } catch (err) {
    console.error('Failed to list models:', err.message);
  }
}

checkModels();
