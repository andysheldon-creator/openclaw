#!/usr/bin/env tsx
/**
 * Proactive Check-in - Smart assistant that decides when to message
 * 
 * Run this with cron/scheduler every 30 minutes:
 * */30 * * * * cd /path/to/upgrades && npm run checkin
 */

import 'dotenv/config';
import { Bot } from 'grammy';
import { loadSession, updateLastCheckin, getHoursSinceCheckin } from './session-tracker.js';
import { getMemoryContext } from './intent-parser.js';
import { getTimeContext } from './context-enrichment.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

if (!BOT_TOKEN || !ALLOWED_USER_ID || !OPENROUTER_API_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

interface CheckinDecision {
  shouldCheckin: boolean;
  message: string;
  reason: string;
}

/**
 * Ask Claude if we should check in with the user
 */
async function decideCheckin(userId: string): Promise<CheckinDecision> {
  const session = await loadSession(userId);
  const memory = await getMemoryContext();
  const { greeting, timeContext } = getTimeContext();
  
  // Get time since last activity
  const lastActivity = new Date(session.lastActivity);
  const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
  
  // Get time since last check-in
  const hoursSinceCheckin = await getHoursSinceCheckin(userId);
  
  // Extract active goals from memory
  const activeGoals = memory.match(/🎯 Active Goals:\n(.*?)(?=\n\n|$)/s)?.[1]?.trim() || 'None';
  
  // Build context for Claude
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: session.preferences.timezone,
  });
  
  const prompt = `You are a proactive AI assistant. Decide if you should check in with Andy right now.

CONTEXT:
- Current time: ${timeString} (${timeContext})
- ${Math.round(hoursSinceActivity)} hours since last message
- ${hoursSinceCheckin === Infinity ? 'Never checked in before' : `${Math.round(hoursSinceCheckin)} hours since last check-in`}
- Active goals: ${activeGoals}
- Pending items: ${session.pendingItems.length > 0 ? session.pendingItems.join(', ') : 'None'}
- Location: ${session.preferences.location}

RULES:
1. Don't be annoying - max 2-3 check-ins per day
2. Only check in if there's a GOOD REASON:
   - Goal deadline approaching
   - Long silence during work hours (>8 hours, 9am-6pm)
   - Important pending item
3. Be brief, helpful, and NOT intrusive
4. Consider time of day:
   - Don't interrupt early morning (6am-8am)
   - Don't interrupt late night (10pm-6am)
   - Don't interrupt deep work hours unnecessarily
5. If nothing important OR last check-in was <6 hours ago, respond with NO
6. If last activity was <2 hours ago, definitely respond with NO (user is active)

RESPOND IN THIS EXACT FORMAT:
DECISION: YES or NO
MESSAGE: [Your brief, helpful message if YES, or "none" if NO]
REASON: [One-line explanation of your decision]`;

  console.log('[Checkin] Asking Claude for decision...');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct', // Use cheap model for decisions
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }
    
    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || '';
    
    console.log('[Checkin] Claude response:', output.substring(0, 200));
    
    // Parse response
    const decisionMatch = output.match(/DECISION:\s*(YES|NO)/i);
    const messageMatch = output.match(/MESSAGE:\s*(.+?)(?=\nREASON:|$)/is);
    const reasonMatch = output.match(/REASON:\s*(.+)/is);
    
    const shouldCheckin = decisionMatch?.[1]?.toUpperCase() === 'YES';
    const message = messageMatch?.[1]?.trim() || '';
    const reason = reasonMatch?.[1]?.trim() || 'No reason provided';
    
    return {
      shouldCheckin: shouldCheckin && message !== 'none',
      message,
      reason,
    };
    
  } catch (error: any) {
    console.error('[Checkin] Error:', error);
    return {
      shouldCheckin: false,
      message: '',
      reason: `Error: ${error.message}`,
    };
  }
}

/**
 * Send check-in message to user
 */
async function sendCheckin(userId: string, message: string): Promise<void> {
  const bot = new Bot(BOT_TOKEN);
  
  try {
    await bot.api.sendMessage(userId, message, { parse_mode: 'Markdown' });
    console.log('[Checkin] ✅ Message sent');
    
    // Update last check-in time
    await updateLastCheckin(userId);
    
  } catch (error: any) {
    console.error('[Checkin] Failed to send message:', error);
    throw error;
  }
}

/**
 * Main check-in logic
 */
async function main() {
  console.log('🔔 Proactive Check-in Agent');
  console.log('='.repeat(50));
  
  const decision = await decideCheckin(ALLOWED_USER_ID);
  
  console.log(`[Decision] Should checkin: ${decision.shouldCheckin}`);
  console.log(`[Decision] Reason: ${decision.reason}`);
  
  if (decision.shouldCheckin) {
    console.log(`[Decision] Message: ${decision.message.substring(0, 100)}...`);
    await sendCheckin(ALLOWED_USER_ID, decision.message);
  } else {
    console.log('[Decision] No check-in needed');
  }
  
  console.log('='.repeat(50));
  console.log('✅ Check-in complete\n');
  process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
