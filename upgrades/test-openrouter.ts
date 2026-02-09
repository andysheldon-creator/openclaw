/**
 * Test OpenRouter Provider
 * 
 * Usage:
 *   OPENROUTER_API_KEY="your-key" npx tsx test-openrouter.ts
 */

import { OpenRouterProvider } from './openrouter-provider';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: OPENROUTER_API_KEY environment variable not set');
    console.error('');
    console.error('Get your API key:');
    console.error('  1. Sign up at https://openrouter.ai/');
    console.error('  2. Go to https://openrouter.ai/keys');
    console.error('  3. Create a key');
    console.error('');
    console.error('Usage:');
    console.error('  export OPENROUTER_API_KEY="sk-or-v1-YOUR-KEY-HERE"');
    console.error('  npx tsx test-openrouter.ts');
    process.exit(1);
  }

  console.log('🧪 Testing OpenRouter Provider...');
  console.log('================================');
  console.log('');

  const provider = new OpenRouterProvider({
    apiKey,
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
  });

  try {
    // Test 1: Connection
    console.log('1️⃣ Testing API key...');
    const isValid = await provider.testConnection();
    
    if (!isValid) {
      console.error('❌ API key invalid or connection failed');
      console.error('');
      console.error('Please check:');
      console.error('  1. API key is correct');
      console.error('  2. You have credits in your account');
      console.error('  3. Internet connection is working');
      process.exit(1);
    }

    console.log('✅ API key is valid!');
    console.log('---');
    console.log('');

    // Test 2: Simple query
    console.log('2️⃣ Testing simple query...');
    console.log('Model: llama-3.3-70b-instruct');
    console.log('Question: What is 2+2? Answer in one sentence.');
    console.log('');

    const response1 = await provider.chat([
      { role: 'user', content: 'What is 2+2? Answer in one sentence.' },
    ]);

    if (response1.error) {
      console.error('❌ Error:', response1.error);
      process.exit(1);
    }

    console.log('✅ Response:', response1.content);
    console.log('💰 Cost: $' + (response1.cost || 0).toFixed(6), '(~£' + ((response1.cost || 0) * 0.8).toFixed(6) + ')');
    console.log('📊 Tokens:', response1.tokensUsed?.total || 'unknown');
    console.log('');
    console.log('---');
    console.log('');

    // Test 3: Code query with code model
    console.log('3️⃣ Testing code model...');
    console.log('Model: qwen-2.5-coder-32b-instruct');
    console.log('Question: Write a Python function to reverse a string.');
    console.log('');

    const response2 = await provider.chat(
      [{ role: 'user', content: 'Write a Python function to reverse a string. Just the code, no explanation.' }],
      'qwen/qwen-2.5-coder-32b-instruct'
    );

    if (response2.error) {
      console.error('❌ Error:', response2.error);
    } else {
      console.log('✅ Response:');
      console.log(response2.content);
      console.log('');
      console.log('💰 Cost: $' + (response2.cost || 0).toFixed(6), '(~£' + ((response2.cost || 0) * 0.8).toFixed(6) + ')');
      console.log('📊 Tokens:', response2.tokensUsed?.total || 'unknown');
    }
    console.log('');
    console.log('---');
    console.log('');

    // Test 4: Fast/cheap model
    console.log('4️⃣ Testing fast/cheap model...');
    console.log('Model: llama-3.1-8b-instruct');
    console.log('Question: Name 3 colors.');
    console.log('');

    const response3 = await provider.chat(
      [{ role: 'user', content: 'Name 3 colors. Just list them.' }],
      'meta-llama/llama-3.1-8b-instruct'
    );

    if (response3.error) {
      console.error('❌ Error:', response3.error);
    } else {
      console.log('✅ Response:', response3.content);
      console.log('💰 Cost: $' + (response3.cost || 0).toFixed(6), '(~£' + ((response3.cost || 0) * 0.8).toFixed(6) + ')');
      console.log('📊 Tokens:', response3.tokensUsed?.total || 'unknown');
    }
    console.log('');
    console.log('---');
    console.log('');

    // Summary
    const totalCost = (response1.cost || 0) + (response2.cost || 0) + (response3.cost || 0);
    console.log('✅ All tests passed!');
    console.log('');
    console.log('💰 Total cost: $' + totalCost.toFixed(6), '(~£' + (totalCost * 0.8).toFixed(6) + ')');
    console.log('📊 Cost comparison:');
    console.log('   OpenRouter (3 requests): ~£' + (totalCost * 0.8).toFixed(6));
    console.log('   Claude API (3 requests): ~£0.03');
    console.log('   Local models (3 requests): £0.00');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Add to OpenClaw routing system');
    console.log('  2. Configure model selection rules');
    console.log('  3. Monitor usage and costs');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
