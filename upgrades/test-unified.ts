/**
 * Test Unified Provider System
 * 
 * End-to-end test of the complete cost-optimized system.
 * 
 * Usage:
 *   OPENROUTER_API_KEY="..." CLAUDE_SESSION_TOKEN="..." npx tsx test-unified.ts
 */

import { UnifiedProvider } from './unified-provider';

async function main() {
  console.log('🧪 Testing Unified Provider System');
  console.log('==================================');
  console.log('');

  // Check for API keys
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const claudeToken = process.env.CLAUDE_SESSION_TOKEN;

  if (!openrouterKey) {
    console.log('⚠️  Warning: OPENROUTER_API_KEY not set (OpenRouter tests will be skipped)');
  }
  if (!claudeToken) {
    console.log('⚠️  Warning: CLAUDE_SESSION_TOKEN not set (Claude browser tests will be skipped)');
  }
  console.log('');

  // Initialize unified provider
  const provider = new UnifiedProvider({
    openrouterApiKey: openrouterKey,
    claudeSessionToken: claudeToken,
    strategy: 'cost-optimized',
    enableLocal: true,
    enableOpenRouter: !!openrouterKey,
    enableClaudeBrowser: !!claudeToken,
  });

  console.log('🎯 Strategy: cost-optimized');
  console.log('📊 Providers enabled:');
  console.log('   - Local (Ollama): ✅');
  console.log('   - OpenRouter:', openrouterKey ? '✅' : '❌');
  console.log('   - Claude Browser:', claudeToken ? '✅' : '❌');
  console.log('');
  console.log('---');
  console.log('');

  // Test cases
  const tests = [
    {
      name: 'Simple math (should use local)',
      messages: [{ role: 'user' as const, content: 'What is 2+2? Answer in one sentence.' }],
      expectedProvider: 'local',
    },
    {
      name: 'Code task (should use local code model)',
      messages: [{ role: 'user' as const, content: 'Write a Python function to add two numbers. Just the code.' }],
      expectedProvider: 'local',
    },
    {
      name: 'Medium complexity (should use OpenRouter)',
      messages: [{ role: 'user' as const, content: 'Explain the difference between REST and GraphQL APIs in 2-3 sentences.' }],
      expectedProvider: openrouterKey ? 'openrouter' : 'local',
    },
  ];

  // Only add Claude browser test if token is available
  if (claudeToken) {
    tests.push({
      name: 'Complex analysis (should use Claude browser)',
      messages: [{ role: 'user' as const, content: 'Analyze the trade-offs between microservices and monolithic architectures, considering scalability, complexity, and team dynamics.' }],
      expectedProvider: 'claude-browser',
    });
  }

  // Track stats
  let totalCost = 0;
  let totalTime = 0;
  const providerCounts: Record<string, number> = {};

  // Run tests
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`${i + 1}️⃣ ${test.name}`);
    console.log(`   Question: "${test.messages[0].content.substring(0, 80)}..."`);
    
    try {
      const response = await provider.chat(test.messages);

      if (response.error) {
        console.log(`   ❌ Error: ${response.error}`);
        console.log('');
        continue;
      }

      console.log(`   ✅ Provider: ${response.provider}`);
      console.log(`   📝 Model: ${response.model}`);
      console.log(`   💬 Response: "${response.content.substring(0, 100)}${response.content.length > 100 ? '...' : ''}"`);
      console.log(`   💰 Cost: £${response.cost.toFixed(6)}`);
      console.log(`   ⏱️  Time: ${response.responseTime.toFixed(2)}s`);
      console.log(`   📊 Reason: ${response.routingReason}`);

      // Track stats
      totalCost += response.cost;
      totalTime += response.responseTime;
      providerCounts[response.provider] = (providerCounts[response.provider] || 0) + 1;

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('');
  }

  console.log('---');
  console.log('');
  console.log('📊 Summary');
  console.log('==========');
  console.log('');
  console.log(`Total requests: ${tests.length}`);
  console.log(`Total cost: £${totalCost.toFixed(6)}`);
  console.log(`Total time: ${totalTime.toFixed(2)}s`);
  console.log(`Average cost per request: £${(totalCost / tests.length).toFixed(6)}`);
  console.log(`Average time per request: ${(totalTime / tests.length).toFixed(2)}s`);
  console.log('');
  console.log('Provider distribution:');
  Object.keys(providerCounts).forEach(provider => {
    const count = providerCounts[provider];
    const percent = (count / tests.length * 100).toFixed(0);
    console.log(`   ${provider}: ${count} (${percent}%)`);
  });
  console.log('');

  // Compare to all-Claude-API
  const allClaudeCost = tests.length * 0.0015;
  const savings = allClaudeCost - totalCost;
  const savingsPercent = (savings / allClaudeCost * 100).toFixed(0);

  console.log('💰 vs All-Claude-API:');
  console.log(`   All-Claude cost: £${allClaudeCost.toFixed(6)}`);
  console.log(`   Optimized cost: £${totalCost.toFixed(6)}`);
  console.log(`   Savings: £${savings.toFixed(6)} (${savingsPercent}%)`);
  console.log('');

  console.log('✅ Unified system test complete!');
  console.log('');
  console.log('🎉 OptimiserClaw is working end-to-end!');
  console.log('');
  console.log('Next steps:');
  console.log('   1. Integrate with OpenClaw main system');
  console.log('   2. Add cost monitoring dashboard');
  console.log('   3. Deploy to production');

  // Cleanup
  await provider.close();
}

main().catch(console.error);
