/**
 * Intent Detection Parser (from Goda's Claude Telegram Relay)
 * Let Claude manage memory by adding tags to responses
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MEMORY_DIR = process.env.OPENCLAW_MEMORY_DIR || join(
  process.env.OPENCLAW_STATE_DIR || join(process.env.HOME || '~', '.openclaw'),
  'memory'
);

export interface Memory {
  facts: string[];
  goals: Goal[];
  completedGoals: CompletedGoal[];
  lastUpdated: string;
}

export interface Goal {
  text: string;
  deadline?: string;
  createdAt: string;
}

export interface CompletedGoal {
  text: string;
  completedAt: string;
}

export interface ParsedIntents {
  remember?: string[];
  goals?: Array<{ text: string; deadline?: string }>;
  done?: string[];
  cleanText: string;
}

/**
 * Parse intent tags from Claude's response
 * Tags: [REMEMBER: fact], [GOAL: task | DEADLINE: date], [DONE: search]
 */
export function parseIntents(response: string): ParsedIntents {
  const intents: ParsedIntents = {
    remember: [],
    goals: [],
    done: [],
    cleanText: response
  };
  
  // Match [REMEMBER: text]
  const rememberRegex = /\[REMEMBER:\s*(.+?)\]/gi;
  let match;
  while ((match = rememberRegex.exec(response)) !== null) {
    intents.remember!.push(match[1].trim());
    intents.cleanText = intents.cleanText.replace(match[0], '');
  }
  
  // Match [GOAL: text | DEADLINE: date] or [GOAL: text]
  const goalRegex = /\[GOAL:\s*(.+?)(?:\s*\|\s*DEADLINE:\s*(.+?))?\]/gi;
  while ((match = goalRegex.exec(response)) !== null) {
    intents.goals!.push({
      text: match[1].trim(),
      deadline: match[2]?.trim()
    });
    intents.cleanText = intents.cleanText.replace(match[0], '');
  }
  
  // Match [DONE: search text]
  const doneRegex = /\[DONE:\s*(.+?)\]/gi;
  while ((match = doneRegex.exec(response)) !== null) {
    intents.done!.push(match[1].trim());
    intents.cleanText = intents.cleanText.replace(match[0], '');
  }
  
  // Clean up whitespace
  intents.cleanText = intents.cleanText.replace(/\n\n\n+/g, '\n\n').trim();
  
  return intents;
}

/**
 * Load memory from disk
 */
export async function loadMemory(): Promise<Memory> {
  try {
    await mkdir(MEMORY_DIR, { recursive: true });
    const memoryFile = join(MEMORY_DIR, 'intent-memory.json');
    const content = await readFile(memoryFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      facts: [],
      goals: [],
      completedGoals: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Save memory to disk
 */
export async function saveMemory(memory: Memory): Promise<void> {
  await mkdir(MEMORY_DIR, { recursive: true });
  const memoryFile = join(MEMORY_DIR, 'intent-memory.json');
  memory.lastUpdated = new Date().toISOString();
  await writeFile(memoryFile, JSON.stringify(memory, null, 2));
}

/**
 * Add fact to memory
 */
export async function addFact(fact: string): Promise<string> {
  const memory = await loadMemory();
  
  // Avoid duplicates
  if (!memory.facts.includes(fact)) {
    memory.facts.push(fact);
    await saveMemory(memory);
    return `✓ Remembered: "${fact}"`;
  }
  
  return `Already remembered: "${fact}"`;
}

/**
 * Add goal to memory
 */
export async function addGoal(text: string, deadline?: string): Promise<string> {
  const memory = await loadMemory();
  
  memory.goals.push({
    text,
    deadline,
    createdAt: new Date().toISOString()
  });
  
  await saveMemory(memory);
  
  return deadline 
    ? `✓ Goal set: "${text}" (by ${deadline})`
    : `✓ Goal set: "${text}"`;
}

/**
 * Mark goal as complete
 */
export async function completeGoal(searchText: string): Promise<string> {
  const memory = await loadMemory();
  
  const index = memory.goals.findIndex(g => 
    g.text.toLowerCase().includes(searchText.toLowerCase())
  );
  
  if (index === -1) {
    return `No goal found matching "${searchText}"`;
  }
  
  const [completed] = memory.goals.splice(index, 1);
  memory.completedGoals.push({
    text: completed.text,
    completedAt: new Date().toISOString()
  });
  
  await saveMemory(memory);
  
  return `✓ Completed: "${completed.text}"`;
}

/**
 * Get memory context for prompts
 * Includes both long-term (MEMORY.md) and short-term (intent-memory.json)
 */
export async function getMemoryContext(): Promise<string> {
  const lines: string[] = [];
  
  // 1. Load long-term curated memory (MEMORY.md)
  try {
    const memoryMdPath = join(process.cwd(), 'MEMORY.md');
    const memoryMd = await readFile(memoryMdPath, 'utf-8');
    if (memoryMd.trim()) {
      lines.push('📚 LONG-TERM MEMORY (curated):');
      lines.push(memoryMd.trim());
      lines.push('');
    }
  } catch (error) {
    // MEMORY.md not found, skip
  }
  
  // 2. Load short-term memory (facts/goals from tags)
  const memory = await loadMemory();
  
  if (memory.facts.length > 0) {
    lines.push('📝 SHORT-TERM MEMORY (recent facts):');
    memory.facts.forEach(fact => lines.push(`- ${fact}`));
    lines.push('');
  }
  
  if (memory.goals.length > 0) {
    lines.push('ACTIVE GOALS:');
    memory.goals.forEach(goal => {
      const deadline = goal.deadline ? ` (by ${goal.deadline})` : '';
      lines.push(`- ${goal.text}${deadline}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Process intents from Claude's response
 */
export async function processIntents(response: string): Promise<{ cleanText: string; actions: string[] }> {
  const intents = parseIntents(response);
  const actions: string[] = [];
  
  // Process REMEMBER tags
  if (intents.remember && intents.remember.length > 0) {
    for (const fact of intents.remember) {
      const result = await addFact(fact);
      actions.push(result);
    }
  }
  
  // Process GOAL tags
  if (intents.goals && intents.goals.length > 0) {
    for (const goal of intents.goals) {
      const result = await addGoal(goal.text, goal.deadline);
      actions.push(result);
    }
  }
  
  // Process DONE tags
  if (intents.done && intents.done.length > 0) {
    for (const search of intents.done) {
      const result = await completeGoal(search);
      actions.push(result);
    }
  }
  
  return {
    cleanText: intents.cleanText,
    actions
  };
}

/**
 * Get system prompt addition for intent detection
 */
export function getIntentSystemPrompt(): string {
  return `
MEMORY MANAGEMENT:
When the user mentions something to remember, goals, or task completions,
include these tags in your response (they will be processed automatically):

[REMEMBER: fact to store]
[GOAL: task description | DEADLINE: optional date]
[DONE: search text for completed goal]

Examples:
- "I'll remember that. [REMEMBER: Andy prefers TypeScript over JavaScript]"
- "Got it! [GOAL: Finish OptimiserClaw Week 2 | DEADLINE: 2026-02-19]"
- "Great work! [DONE: Week 1] The cost reduction is complete."

The tags will be stripped before the user sees your response.
`.trim();
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('=== Intent Parser Test ===\n');
    
    const testResponse = `
Great! I'll make a note of that. [REMEMBER: Andy is building OptimiserClaw to reduce AI costs]

Let's track this as a goal. [GOAL: Complete Week 2 features | DEADLINE: February 19]

And since Week 1 is done, [DONE: Week 1] we can focus on the next phase.

Here's the plan going forward...
`.trim();
    
    console.log('Original response:');
    console.log(testResponse);
    console.log('\n--- Processing Intents ---\n');
    
    const { cleanText, actions } = await processIntents(testResponse);
    
    console.log('Actions taken:');
    actions.forEach(action => console.log(`  ${action}`));
    
    console.log('\nCleaned response (what user sees):');
    console.log(cleanText);
    
    console.log('\n--- Memory State ---\n');
    const memory = await loadMemory();
    console.log(JSON.stringify(memory, null, 2));
    
    console.log('\n--- Memory Context (for next prompt) ---\n');
    console.log(await getMemoryContext());
  })();
}
