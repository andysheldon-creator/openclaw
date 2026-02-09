/**
 * Demo Dashboard
 * 
 * Creates sample data and generates a dashboard to demonstrate the cost tracking system.
 */

import { CostTracker } from './cost-tracker';
import { generateDashboard } from './generate-dashboard';

function main() {
  console.log('🎨 Generating demo dashboard...');
  console.log('');

  const tracker = new CostTracker('./demo-cost-tracking.json');

  // Clear existing logs for demo
  tracker.clearLogs();

  // Generate sample data for the past 30 days
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const samplePrompts = [
    'What is 2+2?',
    'Write a Python function to reverse a string',
    'Explain REST vs GraphQL',
    'Design a microservices architecture',
    'How do I center a div in CSS?',
    'What are the benefits of TypeScript?',
    'Create a TODO app in React',
    'Analyze trade-offs of different database types',
    'Write a function to find prime numbers',
    'Explain quantum computing in simple terms',
  ];

  const providers: Array<'local' | 'openrouter' | 'claude-browser' | 'claude-api'> = [
    'local',
    'local',
    'local',
    'local',
    'local',
    'local',
    'local', // 70% local
    'openrouter',
    'openrouter', // 20% openrouter
    'claude-browser', // 10% claude browser
  ];

  const models = {
    local: ['phi4-mini-reasoning', 'qwen2.5-coder:7b', 'phi4-reasoning'],
    openrouter: ['meta-llama/llama-3.3-70b-instruct', 'qwen/qwen-2.5-coder-32b-instruct'],
    'claude-browser': ['claude-sonnet-4'],
    'claude-api': ['claude-sonnet-4'],
  };

  const costs = {
    local: 0,
    openrouter: 0.00003,
    'claude-browser': 0,
    'claude-api': 0.0015,
  };

  const responseTimes = {
    local: 3,
    openrouter: 4,
    'claude-browser': 15,
    'claude-api': 3,
  };

  // Generate ~500 requests over 30 days
  for (let day = 0; day < 30; day++) {
    const requestsToday = 10 + Math.floor(Math.random() * 10); // 10-20 requests per day

    for (let i = 0; i < requestsToday; i++) {
      const timestamp = now - (30 - day) * dayMs + Math.random() * dayMs;
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const prompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
      const model = models[provider][Math.floor(Math.random() * models[provider].length)];

      tracker.logRequest({
        timestamp,
        provider,
        model,
        prompt,
        response: 'Sample response...',
        cost: costs[provider] * (0.8 + Math.random() * 0.4), // ±20% variance
        tokensUsed: Math.floor(50 + Math.random() * 200),
        responseTime: responseTimes[provider] * (0.8 + Math.random() * 0.4),
        routingReason: 'Sample routing decision',
      });
    }
  }

  console.log('✅ Generated sample data');
  console.log('');

  // Generate dashboard
  const data = tracker.exportDashboardData();
  
  console.log('📊 Dashboard Data:');
  console.log('=================');
  console.log('');
  console.log(`Total requests: ${data.totalRequests}`);
  console.log(`Total savings: £${data.totalSavings.toFixed(2)}`);
  console.log(`This month cost: £${data.monthly.totalCost.toFixed(4)}`);
  console.log(`Projected monthly: £${data.monthly.projectedMonthlyCost.toFixed(2)}`);
  console.log(`Savings vs Claude API: £${data.monthly.savingsVsClaudeAPI.toFixed(2)} (${((data.monthly.savingsVsClaudeAPI / (data.monthly.totalCost + data.monthly.savingsVsClaudeAPI)) * 100).toFixed(0)}%)`);
  console.log('');
  console.log('Provider distribution:');
  Object.entries(data.monthly.byProvider).forEach(([provider, stats]: [string, any]) => {
    console.log(`  ${provider}: ${stats.requests} requests (${stats.percentage.toFixed(0)}%) - £${stats.cost.toFixed(6)}`);
  });
  console.log('');

  // Generate HTML dashboard
  generateDashboard(tracker, './demo-dashboard.html');
  
  console.log('');
  console.log('✅ Demo dashboard created!');
  console.log('');
  console.log('📂 Open in browser:');
  console.log(`   file://${process.cwd()}/demo-dashboard.html`);
  console.log('');
  console.log('💡 To use with real data:');
  console.log('   - Integrate cost-tracker.ts with unified-provider.ts');
  console.log('   - Log every request automatically');
  console.log('   - Run generate-dashboard periodically (cron job)');
}

main();
