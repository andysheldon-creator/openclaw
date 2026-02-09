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
  const prompt = "Analyze and compare the architectural design patterns of microservices vs monolithic systems. Provide a comprehensive evaluation.";
  
  console.log('Testing free Gemma 3 4B with complex query...\n');
  
  try {
    const response = await client.chat.completions.create({
      model: 'google/gemma-3-4b-it:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });

    console.log('✓ SUCCESS');
    console.log('Response length:', response.choices[0]?.message?.content?.length);
    console.log('First 200 chars:', response.choices[0]?.message?.content?.substring(0, 200));

  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
