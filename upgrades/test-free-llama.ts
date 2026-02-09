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
    console.log('Testing free Llama 3.3 70B...');
    
    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'user', content: 'What is 2+2? Reply with just the answer.' },
      ],
      max_tokens: 100,
    });

    console.log('\n✓ Response received:');
    console.log('Model:', response.model);
    console.log('Content:', response.choices[0]?.message?.content);
    console.log('Usage:', response.usage);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
    }
  }
}

test();
