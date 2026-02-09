/**
 * Test Intelligent Router
 * 
 * Tests the routing decisions for various types of tasks.
 */

import { IntelligentRouter } from './intelligent-router';

function main() {
  console.log('🧪 Testing Intelligent Router...');
  console.log('================================');
  console.log('');

  const router = new IntelligentRouter({
    strategy: 'cost-optimized',
    maxResponseTime: 30,
  });

  // Test cases
  const testCases = [
    // Simple tasks → Local (free)
    {
      name: 'Simple math',
      prompt: 'What is 2+2?',
      expected: 'local',
    },
    {
      name: 'Simple fact',
      prompt: 'What is the capital of France?',
      expected: 'local',
    },
    
    // Code tasks → Local code model
    {
      name: 'Simple code',
      prompt: 'Write a Python function to reverse a string',
      expected: 'local',
    },
    {
      name: 'Complex code',
      prompt: 'Design a distributed system architecture for a microservices platform with event sourcing',
      expected: 'openrouter', // or claude-browser depending on complexity
    },

    // Medium complexity → OpenRouter
    {
      name: 'Research query',
      prompt: 'Explain the differences between REST and GraphQL APIs',
      expected: 'openrouter',
    },
    {
      name: 'Comparison',
      prompt: 'Compare and contrast React and Vue.js frameworks',
      expected: 'openrouter',
    },

    // Complex reasoning → Claude browser
    {
      name: 'Complex analysis',
      prompt: 'Analyze the trade-offs between monolithic and microservices architectures, considering scalability, maintainability, and operational complexity',
      expected: 'claude-browser',
    },
    {
      name: 'Strategic planning',
      prompt: 'Design a comprehensive go-to-market strategy for a B2B SaaS platform targeting enterprise customers',
      expected: 'claude-browser',
    },
  ];

  console.log('Strategy: cost-optimized');
  console.log('');
  console.log('---');
  console.log('');

  // Track stats
  let localCount = 0;
  let openrouterCount = 0;
  let claudeBrowserCount = 0;
  let claudeAPICount = 0;
  let totalCost = 0;

  // Run tests
  testCases.forEach((test, index) => {
    console.log(`${index + 1}️⃣ ${test.name}`);
    console.log(`Prompt: "${test.prompt.substring(0, 80)}${test.prompt.length > 80 ? '...' : ''}"`);
    
    const decision = router.route(test.prompt);
    
    console.log(`✅ Provider: ${decision.provider}`);
    console.log(`   Model: ${decision.model}`);
    console.log(`   Reason: ${decision.reason}`);
    console.log(`   Cost: £${decision.estimatedCost.toFixed(6)}`);
    console.log(`   Time: ~${decision.estimatedTime}s`);
    
    // Track stats
    if (decision.provider === 'local') localCount++;
    if (decision.provider === 'openrouter') openrouterCount++;
    if (decision.provider === 'claude-browser') claudeBrowserCount++;
    if (decision.provider === 'claude-api') claudeAPICount++;
    totalCost += decision.estimatedCost;
    
    console.log('');
  });

  console.log('---');
  console.log('');
  console.log('📊 Routing Statistics');
  console.log('=====================');
  console.log('');
  console.log(`Total requests: ${testCases.length}`);
  console.log(`Local: ${localCount} (${(localCount / testCases.length * 100).toFixed(0)}%)`);
  console.log(`OpenRouter: ${openrouterCount} (${(openrouterCount / testCases.length * 100).toFixed(0)}%)`);
  console.log(`Claude Browser: ${claudeBrowserCount} (${(claudeBrowserCount / testCases.length * 100).toFixed(0)}%)`);
  console.log(`Claude API: ${claudeAPICount} (${(claudeAPICount / testCases.length * 100).toFixed(0)}%)`);
  console.log('');
  console.log(`💰 Total estimated cost: £${totalCost.toFixed(6)}`);
  console.log(`💰 Average per request: £${(totalCost / testCases.length).toFixed(6)}`);
  console.log('');
  
  // Compare to all-Claude-API
  const allClaudeCost = testCases.length * 0.0015; // ~£0.0015 per request
  const savings = allClaudeCost - totalCost;
  const savingsPercent = (savings / allClaudeCost * 100).toFixed(0);
  
  console.log('📊 vs All-Claude-API:');
  console.log(`   All-Claude cost: £${allClaudeCost.toFixed(6)}`);
  console.log(`   Optimized cost: £${totalCost.toFixed(6)}`);
  console.log(`   Savings: £${savings.toFixed(6)} (${savingsPercent}%)`);
  console.log('');
  console.log('✅ Router test complete!');
  console.log('');
  console.log('Next: Integrate with actual providers and test end-to-end');
}

main();
