import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/andysheldon-creator/openclaw',
    'X-Title': 'OptimiserClaw',
  },
});

async function testModels() {
  const modelsToTry = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-flash-1.5-8b',
    'google/gemini-flash-1.5',
    'google/gemini-pro-1.5',
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`\nTrying: ${model}`);
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Say "OK" only.' }],
        max_tokens: 10,
      });

      console.log(`✓ ${model} works!`);
      console.log(`  Response: ${response.choices[0]?.message?.content}`);
      console.log(`  Usage: ${JSON.stringify(response.usage)}`);

    } catch (error: any) {
      console.log(`✗ ${model} failed: ${error.message}`);
    }
  }
}

testModels();
