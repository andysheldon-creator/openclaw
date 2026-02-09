/**
 * OptimiserClaw Test Bot
 * Standalone bot combining Goda's patterns + intelligent routing
 */

import { Bot } from 'grammy';
import { acquireLock, setupLockCleanup } from './lock-manager';
import { chunkMarkdown } from './message-chunker';
import { processIntents, getMemoryContext, getIntentSystemPrompt } from './intent-parser';
import { enrichPrompt, getTimeContext } from './context-enrichment';
import { IntelligentRouter } from './intelligent-router';

// ============================================================
// CONFIGURATION
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const CLAUDE_SESSION_TOKEN = process.env.CLAUDE_SESSION_TOKEN || '';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set!');
  console.log('\nTo set up:');
  console.log('1. Message @BotFather on Telegram');
  console.log('2. Create a new bot with /newbot');
  console.log('3. Copy the token to .env');
  process.exit(1);
}

// ============================================================
// LOCK MANAGEMENT
// ============================================================

console.log('[Startup] Acquiring lock...');
const lockAcquired = await acquireLock();
if (!lockAcquired) {
  console.error('❌ Another instance already running');
  process.exit(1);
}

setupLockCleanup();
console.log('✓ Lock acquired');

// ============================================================
// INTELLIGENT ROUTER
// ============================================================

const router = new IntelligentRouter({
  openRouterApiKey: OPENROUTER_API_KEY,
  claudeSessionToken: CLAUDE_SESSION_TOKEN,
  strategy: 'cost-optimized'
});

console.log('✓ Router initialized');

// ============================================================
// TELEGRAM BOT
// ============================================================

const bot = new Bot(BOT_TOKEN);

// Security: Only respond to authorized user
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString();
  
  if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
    console.log(`[Security] Unauthorized: ${userId}`);
    await ctx.reply('🔒 This bot is private.');
    return;
  }
  
  await next();
});

// ============================================================
// MESSAGE HANDLER
// ============================================================

bot.on('message:text', async (ctx) => {
  const userMessage = ctx.message.text;
  const startTime = Date.now();
  
  console.log(`\n[Message] From: ${ctx.from?.username || ctx.from?.id}`);
  console.log(`[Message] Text: ${userMessage.substring(0, 100)}...`);
  
  try {
    await ctx.replyWithChatAction('typing');
    
    // 1. Get memory context
    const memoryContext = await getMemoryContext();
    
    // 2. Enrich prompt with context
    const enrichedPrompt = enrichPrompt(userMessage, {
      platform: 'telegram',
      location: 'Derbyshire, UK',
      customContext: 'OptimiserClaw Test Bot - Cost-optimized AI routing'
    });
    
    // 3. Build full prompt
    const fullPrompt = memoryContext 
      ? `${memoryContext}\n\n${enrichedPrompt}`
      : enrichedPrompt;
    
    // 4. Get system prompt with intent detection
    const systemPrompt = buildSystemPrompt();
    
    // 5. Route through intelligent router
    console.log('[Router] Routing request...');
    const result = await router.route({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt }
      ]
    });
    
    const elapsedMs = Date.now() - startTime;
    
    console.log(`[Router] Provider: ${result.provider}`);
    console.log(`[Router] Cost: £${result.cost.toFixed(6)}`);
    console.log(`[Router] Time: ${elapsedMs}ms`);
    
    // 6. Process intents (memory tags)
    const { cleanText, actions } = await processIntents(result.response);
    
    if (actions.length > 0) {
      console.log(`[Intent] Actions: ${actions.join(', ')}`);
    }
    
    // 7. Chunk and send response
    const chunks = chunkMarkdown(cleanText, { platform: 'telegram' });
    
    console.log(`[Response] Chunks: ${chunks.length}`);
    
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: 'Markdown' });
    }
    
    // 8. Log stats
    logStats(result.provider, result.cost, elapsedMs);
    
  } catch (error) {
    console.error('[Error]', error);
    await ctx.reply('❌ Sorry, something went wrong. Please try again.');
  }
});

// ============================================================
// COMMANDS
// ============================================================

bot.command('start', async (ctx) => {
  const { greeting } = getTimeContext();
  await ctx.reply(`${greeting}! I'm OptimiserClaw Test Bot. 🤖

I use cost-optimized AI routing:
• 70% local models (FREE)
• 20% OpenRouter (~£0.0001/msg)
• 10% Claude browser (FREE)

**Features:**
✓ Smart memory management
✓ Context-aware responses
✓ Intelligent message chunking
✓ Cost tracking

Try asking me anything!`);
});

bot.command('stats', async (ctx) => {
  const stats = getStats();
  await ctx.reply(`📊 **Session Stats**

**Messages:** ${stats.total}
**Costs:**
• Local: ${stats.local} messages (£0)
• OpenRouter: ${stats.openrouter} messages (£${stats.openrouterCost.toFixed(4)})
• Claude: ${stats.claude} messages (£0)

**Total Cost:** £${stats.totalCost.toFixed(4)}
**Avg Response:** ${stats.avgResponseTime}ms

**Savings:** ${stats.savingsPercent}% vs all-Claude`);
});

bot.command('memory', async (ctx) => {
  const memory = await getMemoryContext();
  if (!memory) {
    await ctx.reply('📝 No memories stored yet.\n\nTry: "Remember this: I prefer TypeScript"');
    return;
  }
  await ctx.reply(`🧠 **Current Memory**\n\n${memory}`);
});

bot.command('help', async (ctx) => {
  await ctx.reply(`🤖 **OptimiserClaw Commands**

/start - Welcome message
/stats - Usage & cost stats
/memory - Show stored memories
/help - This message

**Memory Management:**
Say "remember this: [fact]" to store info
Say "track goal: [task]" to add goals
Say "done: [task]" to complete goals`);
});

// ============================================================
// SYSTEM PROMPT
// ============================================================

function buildSystemPrompt(): string {
  return `You are Jarvis, an AI assistant built by Andy using OptimiserClaw - a cost-optimized fork of OpenClaw.

**Your Personality:**
- Direct and efficient (no corporate speak)
- Entrepreneurial mindset
- Technical expertise
- Helpful but concise

**Current Project:**
Building OptimiserClaw to reduce AI costs by 92% (£150/mo → £12/mo) using:
- Local models (phi4-mini-reasoning, phi4-reasoning, qwen2.5-coder)
- OpenRouter (100+ models at low cost)
- Claude browser (free session tokens)

**Response Style:**
- Keep messages concise for mobile
- Use markdown for formatting
- No unnecessary pleasantries
- Get to the point

${getIntentSystemPrompt()}
`.trim();
}

// ============================================================
// STATS TRACKING
// ============================================================

interface Stats {
  total: number;
  local: number;
  openrouter: number;
  claude: number;
  openrouterCost: number;
  totalCost: number;
  totalResponseTime: number;
  avgResponseTime: number;
  savingsPercent: number;
}

const stats: Stats = {
  total: 0,
  local: 0,
  openrouter: 0,
  claude: 0,
  openrouterCost: 0,
  totalCost: 0,
  totalResponseTime: 0,
  avgResponseTime: 0,
  savingsPercent: 0
};

function logStats(provider: string, cost: number, responseTime: number): void {
  stats.total++;
  stats.totalCost += cost;
  stats.totalResponseTime += responseTime;
  stats.avgResponseTime = Math.round(stats.totalResponseTime / stats.total);
  
  if (provider === 'local') {
    stats.local++;
  } else if (provider === 'openrouter') {
    stats.openrouter++;
    stats.openrouterCost += cost;
  } else if (provider === 'claude-browser') {
    stats.claude++;
  }
  
  // Calculate savings vs all-Claude (£0.012 per message)
  const allClaudeCost = stats.total * 0.012;
  stats.savingsPercent = Math.round(((allClaudeCost - stats.totalCost) / allClaudeCost) * 100);
}

function getStats(): Stats {
  return { ...stats };
}

// ============================================================
// START BOT
// ============================================================

console.log('\n🚀 Starting OptimiserClaw Test Bot...');
console.log(`📱 Authorized user: ${ALLOWED_USER_ID || 'ANY (not recommended)'}`);
console.log(`🧠 Router strategy: cost-optimized`);
console.log(`📊 Features enabled: lock, chunking, intent, context`);

bot.start({
  onStart: () => {
    console.log('\n✓ Bot is running!');
    console.log('Send a message to test.\n');
  }
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Stopping bot...');
  bot.stop();
  process.exit(0);
});
