import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/andysheldon-creator/openclaw',
    'X-Title': 'OptimiserClaw Test',
  },
});

async function test() {
  const freeModels = [
    'qwen/qwen3-4b:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemma-3-4b-it:free',
  ];

  for (const model of freeModels) {
    try {
      console.log(`\nTesting: ${model}`);
      
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'user', content: 'What is 2+2? Reply with just the number.' },
        ],
        max_tokens: 50,
      });

      console.log(`✓ ${model} WORKS!`);
      console.log(`  Response: ${response.choices[0]?.message?.content}`);
      break;

    } catch (error: any) {
      console.log(`✗ ${model} failed: ${error.message}`);
    }
  }
}

test();
