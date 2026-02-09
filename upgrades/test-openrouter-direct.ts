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
  try {
    console.log('Testing OpenRouter with Gemini 2.0 Flash Thinking...');
    
    const response = await client.chat.completions.create({
      model: 'google/gemini-2.0-flash-thinking-exp:free',
      messages: [
        { role: 'user', content: 'What is 2+2? Reply with just the answer.' },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    console.log('\n✓ Response received:');
    console.log('Model:', response.model);
    console.log('Content:', response.choices[0]?.message?.content);
    console.log('Usage:', response.usage);
    console.log('\nFull response:', JSON.stringify(response, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

test();
