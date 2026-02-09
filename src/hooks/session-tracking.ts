/**
 * Session Tracking Hook
 *
 * Tracks conversation state, costs, and context for proactive features.
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface SessionState {
  userId: string;
  lastActivity: number;
  lastCheckIn: number;
  messageCount: number;
  totalCost: number;
  sessionStart: number;
  pendingItems: string[];
  preferences: {
    timezone: string;
    location: string;
    language: string;
  };
  recentMessages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
}

const SESSION_DIR = path.join(process.env.HOME || "", ".openclaw", "sessions");
const MAX_RECENT_MESSAGES = 20;

async function ensureSessionDir(): Promise<void> {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch (error) {
    // Ignore if exists
  }
}

function getSessionPath(userId: string): string {
  return path.join(SESSION_DIR, `session-${userId}.json`);
}

export async function loadSession(userId: string): Promise<SessionState> {
  await ensureSessionDir();
  const sessionPath = getSessionPath(userId);

  try {
    const data = await fs.readFile(sessionPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Create new session
    const newSession: SessionState = {
      userId,
      lastActivity: Date.now(),
      lastCheckIn: 0,
      messageCount: 0,
      totalCost: 0,
      sessionStart: Date.now(),
      pendingItems: [],
      preferences: {
        timezone: "Europe/London",
        location: "Derbyshire,UK",
        language: "en",
      },
      recentMessages: [],
    };
    await saveSession(newSession);
    return newSession;
  }
}

export async function saveSession(session: SessionState): Promise<void> {
  await ensureSessionDir();
  const sessionPath = getSessionPath(session.userId);
  await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
}

export async function updateSession(
  userId: string,
  updates: Partial<SessionState>,
): Promise<SessionState> {
  const session = await loadSession(userId);
  const updated = { ...session, ...updates, lastActivity: Date.now() };
  await saveSession(updated);
  return updated;
}

export async function trackMessage(params: {
  userId: string;
  role: "user" | "assistant";
  content: string;
  cost?: number;
}): Promise<void> {
  const session = await loadSession(params.userId);

  // Add message to recent history
  session.recentMessages.push({
    role: params.role,
    content: params.content,
    timestamp: Date.now(),
  });

  // Keep only last N messages
  if (session.recentMessages.length > MAX_RECENT_MESSAGES) {
    session.recentMessages = session.recentMessages.slice(-MAX_RECENT_MESSAGES);
  }

  // Update counters
  if (params.role === "assistant") {
    session.messageCount++;
    if (params.cost) {
      session.totalCost += params.cost;
    }
  }

  await saveSession(session);
}

export async function shouldCheckIn(userId: string): Promise<boolean> {
  const session = await loadSession(userId);
  const now = Date.now();
  const hoursSinceLastActivity = (now - session.lastActivity) / (1000 * 60 * 60);
  const hoursSinceLastCheckIn = (now - session.lastCheckIn) / (1000 * 60 * 60);

  // Check in if:
  // - >6 hours since last check-in
  // - >2 hours since last activity (during work hours)
  // - Never checked in and >8 hours since session start

  const workHours = new Date().getHours();
  const isWorkHours = workHours >= 9 && workHours < 18;

  if (hoursSinceLastCheckIn < 6) {
    return false;
  }

  if (!isWorkHours) {
    return false;
  }

  if (hoursSinceLastActivity > 8 || (hoursSinceLastActivity > 2 && session.lastCheckIn === 0)) {
    return true;
  }

  return false;
}
