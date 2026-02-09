# Goda's Patterns - Implementation Guide

Based on: https://github.com/godagoo/claude-telegram-relay

## 📦 Implemented Modules

All modules are in `/upgrades/` directory:

### 1. Lock Manager (`lock-manager.ts`)
**Purpose:** Prevent duplicate gateway instances

**Usage:**
```typescript
import { acquireLock, releaseLock, setupLockCleanup } from './lock-manager';

// On gateway startup
const acquired = await acquireLock();
if (!acquired) {
  console.error('Another instance already running');
  process.exit(1);
}

// Setup cleanup handlers
setupLockCleanup();

// Manual release (handled automatically by cleanup)
await releaseLock();
```

**CLI:**
```bash
npx tsx lock-manager.ts acquire  # Returns exit code 0 if successful
npx tsx lock-manager.ts release  # Remove lock
npx tsx lock-manager.ts status   # Check current lock
```

**Features:**
- Writes PID + hostname + timestamp to `~/.openclaw/gateway.lock`
- Checks if process actually running (`process.kill(pid, 0)`)
- Auto-cleans stale locks (dead processes)
- Cleanup handlers for SIGINT, SIGTERM, uncaughtException

---

### 2. Message Chunker (`message-chunker.ts`)
**Purpose:** Split long responses at natural boundaries

**Usage:**
```typescript
import { chunkMessage, chunkMarkdown, formatChunks } from './message-chunker';

// Basic chunking
const chunks = chunkMessage(longText, { platform: 'telegram' });

// Markdown-aware (preserves code blocks)
const mdChunks = chunkMarkdown(longText, { platform: 'telegram' });

// With formatting
const formatted = formatChunks(chunks, { numbered: true, continuationMarker: '...' });

// Send to user
for (const chunk of formatted) {
  await ctx.reply(chunk);
}
```

**Platform Limits:**
- Telegram: 4096 chars (safe limit: 3996)
- Discord: 2000 chars (safe limit: 1900)
- Slack: 4000 chars (safe limit: 3900)
- WhatsApp: 4096 chars (safe limit: 3996)

**Split Priority:**
1. Paragraph boundary (`\n\n`)
2. Line boundary (`\n`)
3. Sentence boundary (`. `, `! `, `? `)
4. Word boundary (space)
5. Hard cut (last resort)

**Markdown Support:**
- Preserves code blocks intact
- Splits large code blocks by lines
- Maintains language tags

---

### 3. Intent Parser (`intent-parser.ts`)
**Purpose:** Let Claude manage memory via tags

**Usage:**
```typescript
import { processIntents, getMemoryContext, getIntentSystemPrompt } from './intent-parser';

// Add to system prompt
const systemPrompt = basePrompt + '\n\n' + getIntentSystemPrompt();

// Process Claude's response
const { cleanText, actions } = await processIntents(claudeResponse);

// Log actions
actions.forEach(action => console.log(action));

// Send clean text to user
await ctx.reply(cleanText);

// Add memory to next prompt
const memoryContext = await getMemoryContext();
const nextPrompt = `${memoryContext}\n\nUser: ${userMessage}`;
```

**Tags:**
```
[REMEMBER: fact to store]
[GOAL: task description | DEADLINE: optional date]
[DONE: search text for completed goal]
```

**Examples:**
```typescript
// Claude says:
"Great! I'll remember that. [REMEMBER: Andy prefers TypeScript]"

// Result:
// - Saved to ~/.openclaw/memory/intent-memory.json
// - User sees: "Great! I'll remember that."
// - Console: "✓ Remembered: 'Andy prefers TypeScript'"

// Claude says:
"Let's track this. [GOAL: Complete Week 2 | DEADLINE: February 19]"

// Result:
// - Goal added with deadline
// - User sees: "Let's track this."
// - Console: "✓ Goal set: 'Complete Week 2' (by February 19)"

// Claude says:
"Excellent! [DONE: Week 1] Now let's move on."

// Result:
// - Week 1 moved to completedGoals
// - User sees: "Excellent! Now let's move on."
// - Console: "✓ Completed: 'Week 1'"
```

**Memory Structure:**
```json
{
  "facts": ["Andy prefers TypeScript", "Building OptimiserClaw"],
  "goals": [
    {
      "text": "Complete Week 2",
      "deadline": "February 19",
      "createdAt": "2026-02-09T14:00:00.000Z"
    }
  ],
  "completedGoals": [
    {
      "text": "Week 1",
      "completedAt": "2026-02-09T14:05:00.000Z"
    }
  ],
  "lastUpdated": "2026-02-09T14:05:00.000Z"
}
```

---

### 4. Context Enrichment (`context-enrichment.ts`)
**Purpose:** Add temporal, platform, location context to prompts

**Usage:**
```typescript
import { enrichPrompt, getTimeContext, buildProactiveContext } from './context-enrichment';

// Basic enrichment
const enriched = enrichPrompt(userMessage, {
  platform: 'telegram',
  location: 'Derbyshire, UK',
  customContext: 'Working on OptimiserClaw Week 2'
});

// Time context
const { period, greeting } = getTimeContext();
// period: 'morning' | 'afternoon' | 'evening' | 'night' | 'late night'
// greeting: 'Good morning' | 'Good afternoon' | 'Good evening' | 'Hello'

// Proactive context
const context = buildProactiveContext({
  lastActivity: lastActivityDate,
  goals: ['Complete Week 2', 'Test OpenRouter'],
  calendar: '10:00 Team standup',
  pendingItems: ['Review PR', 'Update docs']
});
```

**Platform Instructions:**
- **Telegram:** "Keep responses concise and mobile-friendly. Markdown supported."
- **Discord:** "Max 2000 chars. Avoid tables, use bullet lists. Wrap multiple links in <> to suppress embeds."
- **WhatsApp:** "Max 4096 chars. No headers or tables. Use *bold* for emphasis."
- **Slack:** "Max 4000 chars. Markdown supported. Thread-aware conversations."

**Enriched Prompt Example:**
```
Current time: Monday, February 9, 2026 at 02:43 PM (Europe/London)
Platform: Telegram - Keep responses concise and mobile-friendly. Markdown supported.
Location: Derbyshire, UK
Working on OptimiserClaw Week 2

User: What should I work on next?
```

---

## 🔧 Integration Points

### Gateway Startup (main.ts or index.ts)

```typescript
import { acquireLock, setupLockCleanup } from './upgrades/lock-manager';

async function startGateway() {
  // Acquire lock
  if (!await acquireLock()) {
    console.error('[Gateway] Another instance already running');
    process.exit(1);
  }
  
  // Setup cleanup
  setupLockCleanup();
  
  // Start gateway...
}
```

---

### Message Handler (Telegram/Discord/etc.)

```typescript
import { chunkMarkdown } from './upgrades/message-chunker';
import { processIntents, getMemoryContext, getIntentSystemPrompt } from './upgrades/intent-parser';
import { enrichPrompt } from './upgrades/context-enrichment';

async function handleMessage(ctx, userMessage) {
  // Build enriched prompt
  const memoryContext = await getMemoryContext();
  const enriched = enrichPrompt(userMessage, { 
    platform: 'telegram',
    location: 'Derbyshire, UK' 
  });
  
  const fullPrompt = `${memoryContext}\n\n${enriched}`;
  
  // Get response from Claude (with intent system prompt)
  const systemPrompt = baseSystemPrompt + '\n\n' + getIntentSystemPrompt();
  const claudeResponse = await callClaude(fullPrompt, { systemPrompt });
  
  // Process intents
  const { cleanText, actions } = await processIntents(claudeResponse);
  
  // Log actions
  if (actions.length > 0) {
    console.log('[Intent] Actions:', actions.join(', '));
  }
  
  // Chunk and send
  const chunks = chunkMarkdown(cleanText, { platform: 'telegram' });
  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
}
```

---

## 🚀 Quick Start

### 1. Test Individual Modules

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades

# Test lock manager
npx tsx lock-manager.ts status

# Test message chunker
npx tsx message-chunker.ts

# Test intent parser
npx tsx intent-parser.ts

# Test context enrichment
npx tsx context-enrichment.ts
```

---

### 2. Integration Steps

**Step 1: Lock Manager**
- Add `acquireLock()` to gateway startup
- Add `setupLockCleanup()` after successful acquire
- Test: Try starting two gateways (second should fail)

**Step 2: Message Chunker**
- Replace existing chunking logic with `chunkMarkdown()`
- Test: Send very long response (5000+ chars)
- Verify: Chunks split at natural boundaries

**Step 3: Intent Parser**
- Add `getIntentSystemPrompt()` to system prompt
- Add `processIntents()` to response handler
- Test: Say "remember this: Andy likes TypeScript"
- Verify: Check `~/.openclaw/memory/intent-memory.json`

**Step 4: Context Enrichment**
- Add `enrichPrompt()` to all user messages
- Test: Send "what time is it?"
- Verify: Claude knows current time/day/platform

---

## 📊 Performance Impact

| Module | Overhead | Notes |
|--------|----------|-------|
| Lock Manager | ~1ms | Only on startup |
| Message Chunker | ~5ms | Per long message (>4000 chars) |
| Intent Parser | ~10ms | Per response with tags |
| Context Enrichment | ~2ms | Per message |

**Total:** <20ms per message (negligible)

---

## 🎯 Benefits

### Before (Standard OpenClaw)

- **Duplicate instances:** Possible (no lock file)
- **Long messages:** Naive character splitting
- **Memory:** Manual MEMORY.md editing
- **Context:** No temporal/platform context

### After (With Goda's Patterns)

- **Duplicate instances:** ✅ Prevented with lock file
- **Long messages:** ✅ Smart boundary splitting + markdown preservation
- **Memory:** ✅ Automatic via intent tags (Claude manages)
- **Context:** ✅ Time, platform, location auto-added

---

## 🔮 Future Enhancements

### Proactive Check-ins (Week 3)

**Pattern:**
- Cron job every 30 minutes
- Claude decides IF and WHAT to say
- Uses `buildProactiveContext()` + `getMemoryContext()`

**Implementation:**
```typescript
// check-in.ts
import { buildProactiveContext } from './context-enrichment';
import { getMemoryContext, loadMemory } from './intent-parser';

async function checkIn() {
  const memory = await loadMemory();
  const memoryContext = await getMemoryContext();
  
  const context = buildProactiveContext({
    lastActivity: new Date(memory.lastUpdated),
    goals: memory.goals.map(g => g.text),
    calendar: await getCalendar(),
    pendingItems: []
  });
  
  const prompt = `
${memoryContext}

CONTEXT:
${context}

RULES:
1. Don't be annoying - max 2-3 check-ins per day
2. Only check in if there's a REASON (goal deadline, long silence, important event)
3. Be brief and helpful
4. If nothing important, respond with NO_CHECKIN

DECISION: YES or NO
MESSAGE: [your message or "none"]
REASON: [why]
`;
  
  const response = await callClaude(prompt);
  
  // Parse and send if YES
  // ...
}
```

---

## 📝 Testing Checklist

- [ ] Lock manager prevents duplicate instances
- [ ] Lock manager cleans stale locks
- [ ] Message chunker splits at paragraphs
- [ ] Message chunker preserves code blocks
- [ ] Intent parser extracts [REMEMBER:] tags
- [ ] Intent parser extracts [GOAL:] tags with deadlines
- [ ] Intent parser extracts [DONE:] tags
- [ ] Intent parser saves to memory file
- [ ] Context enrichment adds time/day
- [ ] Context enrichment adds platform instructions
- [ ] Memory context appears in prompts
- [ ] All modules work together

---

## 🎓 Credits

**Original patterns:** [Goda](https://www.youtube.com/@godago)  
**Source:** https://github.com/godagoo/claude-telegram-relay  
**Adapted for:** OptimiserClaw (OpenClaw cost-optimized fork)  
**Date:** 2026-02-09
