/**
 * Session State Tracker - Persist conversation state and context
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.openclaw', 'sessions');
const SESSION_FILE = join(SESSION_DIR, 'optimiser-session.json');

export interface SessionState {
  sessionId: string;
  userId: string;
  lastActivity: string; // ISO timestamp
  messageCount: number;
  preferences: {
    timezone: string;
    location: string;
    language: string;
  };
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    provider?: string;
    cost?: number;
  }>;
  pendingItems: string[];
  lastCheckinTime?: string; // ISO timestamp
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Load session state (or create new)
 */
export async function loadSession(userId: string): Promise<SessionState> {
  try {
    await mkdir(SESSION_DIR, { recursive: true });
    const data = await readFile(SESSION_FILE, 'utf-8');
    const session = JSON.parse(data) as SessionState;
    
    // Verify userId matches
    if (session.userId === userId) {
      return session;
    }
  } catch (error) {
    // File doesn't exist or parse error, create new session
  }
  
  // Create new session
  return {
    sessionId: generateSessionId(),
    userId,
    lastActivity: new Date().toISOString(),
    messageCount: 0,
    preferences: {
      timezone: 'Europe/London',
      location: 'Derbyshire, UK',
      language: 'en',
    },
    conversationHistory: [],
    pendingItems: [],
    totalCost: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Save session state
 */
export async function saveSession(session: SessionState): Promise<void> {
  await mkdir(SESSION_DIR, { recursive: true });
  session.updatedAt = new Date().toISOString();
  await writeFile(SESSION_FILE, JSON.stringify(session, null, 2));
}

/**
 * Update session with new message
 */
export async function updateSession(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  provider: string,
  cost: number
): Promise<SessionState> {
  const session = await loadSession(userId);
  
  const timestamp = new Date().toISOString();
  
  // Add to conversation history (keep last 20 messages)
  session.conversationHistory.push(
    { role: 'user', content: userMessage, timestamp },
    { role: 'assistant', content: assistantMessage, timestamp, provider, cost }
  );
  
  // Trim to last 20 messages (10 exchanges)
  if (session.conversationHistory.length > 20) {
    session.conversationHistory = session.conversationHistory.slice(-20);
  }
  
  session.messageCount++;
  session.lastActivity = timestamp;
  session.totalCost += cost;
  
  await saveSession(session);
  return session;
}

/**
 * Add pending item
 */
export async function addPendingItem(userId: string, item: string): Promise<void> {
  const session = await loadSession(userId);
  if (!session.pendingItems.includes(item)) {
    session.pendingItems.push(item);
    await saveSession(session);
  }
}

/**
 * Remove pending item
 */
export async function removePendingItem(userId: string, searchText: string): Promise<boolean> {
  const session = await loadSession(userId);
  const index = session.pendingItems.findIndex(item =>
    item.toLowerCase().includes(searchText.toLowerCase())
  );
  
  if (index === -1) return false;
  
  session.pendingItems.splice(index, 1);
  await saveSession(session);
  return true;
}

/**
 * Get context summary for prompts
 */
export async function getSessionContext(userId: string): Promise<string> {
  const session = await loadSession(userId);
  
  const parts: string[] = [];
  
  // Recent activity
  const lastActivityDate = new Date(session.lastActivity);
  const hoursSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceActivity > 1) {
    parts.push(`Last activity: ${Math.round(hoursSinceActivity)} hours ago`);
  }
  
  // Pending items
  if (session.pendingItems.length > 0) {
    parts.push(`Pending: ${session.pendingItems.join(', ')}`);
  }
  
  // Recent conversation summary (last 3 exchanges)
  const recentMessages = session.conversationHistory.slice(-6);
  if (recentMessages.length > 0) {
    const summary = recentMessages
      .map(m => `${m.role}: ${m.content.substring(0, 50)}...`)
      .join('\n');
    parts.push(`Recent conversation:\n${summary}`);
  }
  
  return parts.length > 0 ? parts.join('\n\n') : '';
}

/**
 * Update last check-in time (for proactive check-ins)
 */
export async function updateLastCheckin(userId: string): Promise<void> {
  const session = await loadSession(userId);
  session.lastCheckinTime = new Date().toISOString();
  await saveSession(session);
}

/**
 * Get hours since last check-in
 */
export async function getHoursSinceCheckin(userId: string): Promise<number> {
  const session = await loadSession(userId);
  
  if (!session.lastCheckinTime) {
    return Infinity; // Never checked in
  }
  
  const lastCheckin = new Date(session.lastCheckinTime);
  return (Date.now() - lastCheckin.getTime()) / (1000 * 60 * 60);
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get session stats for /stats command
 */
export async function getSessionStats(userId: string): Promise<{
  messageCount: number;
  totalCost: number;
  avgCostPerMessage: number;
  sessionDuration: string;
  lastActivity: string;
}> {
  const session = await loadSession(userId);
  
  const createdAt = new Date(session.createdAt);
  const lastActivity = new Date(session.lastActivity);
  const durationMs = lastActivity.getTime() - createdAt.getTime();
  const durationHours = Math.round(durationMs / (1000 * 60 * 60));
  
  return {
    messageCount: session.messageCount,
    totalCost: session.totalCost,
    avgCostPerMessage: session.messageCount > 0 ? session.totalCost / session.messageCount : 0,
    sessionDuration: durationHours < 24 
      ? `${durationHours} hours`
      : `${Math.round(durationHours / 24)} days`,
    lastActivity: lastActivity.toLocaleString('en-GB', { 
      timeZone: session.preferences.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  };
}
