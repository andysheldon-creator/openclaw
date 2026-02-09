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
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';  // Optional for YouTube features

if (!BOT_TOKEN || !ALLOWED_USER_ID) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

interface YouTubeVideo {
  title: string;
  url: string;
  published: string;
  channel: string;
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
  techVideos: YouTubeVideo[];
  motoringVideos: YouTubeVideo[];
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
 * Get recent YouTube videos from a channel
 */
async function getYouTubeVideos(channelNames: string[]): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.log('[YouTube] No API key configured, skipping');
    return [];
  }
  
  try {
    const videos: YouTubeVideo[] = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    for (const channelName of channelNames) {
      console.log(`[YouTube] Searching for: ${channelName}`);
      
      // Search for recent videos from this channel
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', channelName);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('order', 'date');
      searchUrl.searchParams.set('maxResults', '3');
      searchUrl.searchParams.set('publishedAfter', yesterday.toISOString());
      searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
      
      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        console.error(`[YouTube] API error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          // Check if channel name matches (fuzzy)
          const channelTitle = item.snippet.channelTitle.toLowerCase();
          if (channelTitle.includes(channelName.toLowerCase()) || 
              channelName.toLowerCase().includes(channelTitle)) {
            videos.push({
              title: item.snippet.title,
              url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              published: item.snippet.publishedAt,
              channel: item.snippet.channelTitle,
            });
          }
        }
      }
    }
    
    return videos;
  } catch (error) {
    console.error('[YouTube] Error:', error);
    return [];
  }
}

/**
 * Get tech/AI videos (Clawdbot, OpenClaw, etc.)
 */
async function getTechVideos(): Promise<YouTubeVideo[]> {
  const channels = ['Clawdbot', 'openclawd', 'OpenClaw'];
  return getYouTubeVideos(channels);
}

/**
 * Get motoring videos (Chris Slix, Mat Armstrong)
 */
async function getMotoringVideos(): Promise<YouTubeVideo[]> {
  const channels = ['Chris Slix', 'Mat Armstrong'];
  return getYouTubeVideos(channels);
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
  const [weather, goals, stats, techVideos, motoringVideos] = await Promise.all([
    getWeather(session.preferences.location),
    getActiveGoals(),
    getSessionStats(userId),
    getTechVideos(),
    getMotoringVideos(),
  ]);
  
  return {
    date,
    weather,
    goals,
    pendingItems: session.pendingItems,
    stats,
    techVideos,
    motoringVideos,
  };
}

/**
 * Escape markdown special characters for Telegram
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+=|{}.!-])/g, '\\$1');
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
  
  // Tech/AI videos
  if (data.techVideos.length > 0) {
    parts.push('🤖 **Tech & AI Updates**');
    data.techVideos.forEach(video => {
      const rawTitle = video.title.length > 60 ? video.title.substring(0, 57) + '...' : video.title;
      const title = escapeMarkdown(rawTitle);
      const channel = escapeMarkdown(video.channel);
      parts.push(`• [${title}](${video.url})`);
      parts.push(`  _${channel}_`);
    });
    parts.push('');
  }
  
  // Motoring videos
  if (data.motoringVideos.length > 0) {
    parts.push('🏎️ **Motoring**');
    data.motoringVideos.forEach(video => {
      const rawTitle = video.title.length > 60 ? video.title.substring(0, 57) + '...' : video.title;
      const title = escapeMarkdown(rawTitle);
      const channel = escapeMarkdown(video.channel);
      parts.push(`• [${title}](${video.url})`);
      parts.push(`  _${channel}_`);
    });
    parts.push('');
  }
  
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
