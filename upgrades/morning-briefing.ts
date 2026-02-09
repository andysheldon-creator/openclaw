#!/usr/bin/env tsx
/**
 * Morning Briefing - Daily digest at 8:00 AM
 * 
 * Run via cron:
 * 0 8 * * * cd /path/to/upgrades && npm run briefing
 */

import 'dotenv/config';
import { Bot } from 'grammy';
import { loadSession } from './session-tracker.js';
import { getMemoryContext } from './intent-parser.js';
import { getTimeContext } from './context-enrichment.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID || '';

if (!BOT_TOKEN || !ALLOWED_USER_ID) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

interface BriefingData {
  date: string;
  weather: string;
  goals: string[];
  pendingItems: string[];
  stats: {
    messageCount: number;
    totalCost: number;
  };
}

/**
 * Get weather for location
 * Uses wttr.in (no API key needed)
 */
async function getWeather(location: string = 'Derbyshire,UK'): Promise<string> {
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=%C+%t`, {
      headers: { 'User-Agent': 'curl' },
    });
    
    if (!response.ok) {
      return '☀️ Weather unavailable';
    }
    
    const text = await response.text();
    return `☀️ ${text.trim()}`;
  } catch (error) {
    console.error('[Weather] Error:', error);
    return '☀️ Weather unavailable';
  }
}

/**
 * Get active goals from memory
 */
async function getActiveGoals(): Promise<string[]> {
  const memory = await getMemoryContext();
  
  if (!memory) return [];
  
  // Extract goals from memory
  const goalsMatch = memory.match(/🎯 Active Goals:\n(.*?)(?=\n\n|$)/s);
  if (!goalsMatch) return [];
  
  const goalsText = goalsMatch[1].trim();
  if (!goalsText || goalsText === 'None') return [];
  
  // Split into individual goals
  return goalsText
    .split('\n')
    .map(line => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * Get calendar events (placeholder - requires Google Calendar API)
 */
async function getCalendarEvents(): Promise<string[]> {
  // TODO: Implement Google Calendar API integration
  // For now, return placeholder
  return [
    // 'No calendar integration yet',
  ];
}

/**
 * Get session stats
 */
async function getSessionStats(userId: string): Promise<{ messageCount: number; totalCost: number }> {
  const session = await loadSession(userId);
  return {
    messageCount: session.messageCount,
    totalCost: session.totalCost,
  };
}

/**
 * Gather all briefing data
 */
async function gatherBriefingData(userId: string): Promise<BriefingData> {
  const session = await loadSession(userId);
  const now = new Date();
  
  // Format date
  const date = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: session.preferences.timezone,
  });
  
  // Gather data in parallel
  const [weather, goals, stats] = await Promise.all([
    getWeather(session.preferences.location),
    getActiveGoals(),
    getSessionStats(userId),
  ]);
  
  return {
    date,
    weather,
    goals,
    pendingItems: session.pendingItems,
    stats,
  };
}

/**
 * Format briefing message
 */
function formatBriefing(data: BriefingData): string {
  const parts: string[] = [];
  
  // Header
  parts.push('🌅 **Good Morning, Andy!**');
  parts.push(data.date);
  parts.push('');
  
  // Weather
  parts.push(`**Weather**`);
  parts.push(data.weather);
  parts.push('');
  
  // Calendar (if available)
  // const calendar = await getCalendarEvents();
  // if (calendar.length > 0) {
  //   parts.push('📅 **Today\'s Schedule**');
  //   calendar.forEach(event => parts.push(`• ${event}`));
  //   parts.push('');
  // }
  
  // Active goals
  if (data.goals.length > 0) {
    parts.push('🎯 **Active Goals**');
    data.goals.forEach(goal => parts.push(`• ${goal}`));
    parts.push('');
  }
  
  // Pending items
  if (data.pendingItems.length > 0) {
    parts.push('📋 **Pending Items**');
    data.pendingItems.forEach(item => parts.push(`• ${item}`));
    parts.push('');
  }
  
  // Session stats
  parts.push('📊 **Yesterday\'s Activity**');
  parts.push(`• ${data.stats.messageCount} messages sent`);
  parts.push(`• £${data.stats.totalCost.toFixed(4)} total cost`);
  parts.push('');
  
  // Footer
  parts.push('---');
  parts.push('_Have a productive day! Reply to chat or say "call me" for updates._');
  
  return parts.join('\n');
}

/**
 * Send briefing to user
 */
async function sendBriefing(userId: string): Promise<void> {
  const bot = new Bot(BOT_TOKEN);
  
  try {
    console.log('[Briefing] Gathering data...');
    const data = await gatherBriefingData(userId);
    
    console.log('[Briefing] Formatting message...');
    const message = formatBriefing(data);
    
    console.log('[Briefing] Sending to user...');
    await bot.api.sendMessage(userId, message, { parse_mode: 'Markdown' });
    
    console.log('[Briefing] ✅ Sent successfully');
    
  } catch (error: any) {
    console.error('[Briefing] Failed:', error);
    throw error;
  }
}

/**
 * Main briefing logic
 */
async function main() {
  console.log('🌅 Morning Briefing Agent');
  console.log('='.repeat(50));
  
  const now = new Date();
  const hour = now.getHours();
  
  console.log(`[Time] Current hour: ${hour}`);
  
  // Only send between 7 AM - 9 AM
  if (hour < 7 || hour > 9) {
    console.log('[Skip] Not morning time (7-9 AM)');
    console.log('='.repeat(50));
    process.exit(0);
  }
  
  await sendBriefing(ALLOWED_USER_ID);
  
  console.log('='.repeat(50));
  console.log('✅ Briefing complete\n');
  process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
