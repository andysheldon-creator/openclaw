#!/usr/bin/env tsx
/**
 * Test complexity detection with various queries
 */

import { IntelligentRouter } from './intelligent-router.js';

const router = new IntelligentRouter({ strategy: 'cost-optimized' });

const testQueries = [
  '2+2',
  'Hello, how are you?',
  'What is the weather today?',
  'Analyze and compare the architectural design patterns of microservices vs monolithic systems. Provide detailed pros and cons.',
  'Design a distributed system architecture for high scalability',
  'Explain how React hooks work',
  'Write a simple Python function to sort a list',
  'Compare REST vs GraphQL APIs with trade-offs',
  'Evaluate the system design patterns for event-driven architecture',
];

console.log('🧪 Testing Complexity Detection\n');
console.log('=' .repeat(80));

for (const query of testQueries) {
  const analysis = router.analyzeTask(query);
  const decision = router.route(query);
  
  console.log(`\n📝 Query: "${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`);
  console.log(`   Complexity: ${analysis.complexity.toFixed(2)}`);
  console.log(`   Type: ${analysis.taskType}`);
  console.log(`   🎯 Route: ${decision.provider} → ${decision.model}`);
  console.log(`   💰 Cost: £${decision.estimatedCost.toFixed(6)}`);
  console.log(`   📊 Reason: ${decision.reason}`);
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Test complete!\n');
