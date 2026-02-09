import { analyzeComplexity, routeToModel } from "./src/agents/intelligent-routing.js";

const tests = [
  "Hello, how are you?",
  "Explain how to implement a REST API in Node.js with TypeScript",
  "Compare microservices vs monolithic architecture and analyze trade-offs",
];

for (const test of tests) {
  const analysis = analyzeComplexity(test);
  const decision = routeToModel(analysis);
  console.log(`\n"${test}"`);
  console.log(`  Score: ${analysis.score.toFixed(2)}, Type: ${analysis.type}`);
  console.log(`  Route: ${decision.model}`);
  console.log(`  Cost: £${decision.estimatedCost.toFixed(4)}/msg`);
}
