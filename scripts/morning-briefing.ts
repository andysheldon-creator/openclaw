#!/usr/bin/env tsx
/**
 * Morning Briefing - Integrated with OpenClaw
 *
 * Sends daily briefing via configured channel (Telegram)
 * Run via cron: 0 8 * * * cd /path/to/openclaw && tsx scripts/morning-briefing.ts
 */

import { loadSession } from "../src/hooks/session-tracking.js";

const USER_ID = process.env.OPENCLAW_USER_ID || "6116232975";

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

async function getWeather(location: string = "Derbyshire,UK"): Promise<string> {
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=%C+%t`, {
      headers: { "User-Agent": "curl" },
    });

    if (!response.ok) {
      return "☀️ Weather unavailable";
    }

    const text = await response.text();
    return `☀️ ${text.trim()}`;
  } catch (error) {
    return "☀️ Weather unavailable";
  }
}

async function gatherBriefingData(userId: string): Promise<BriefingData> {
  const session = await loadSession(userId);
  const now = new Date();

  const date = now.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: session.preferences.timezone,
  });

  const weather = await getWeather(session.preferences.location);

  return {
    date,
    weather,
    goals: [], // TODO: Extract from MEMORY.md
    pendingItems: session.pendingItems,
    stats: {
      messageCount: session.messageCount,
      totalCost: session.totalCost,
    },
  };
}

function formatBriefing(data: BriefingData): string {
  const parts: string[] = [];

  parts.push("🌅 **Good Morning, Andy!**");
  parts.push(data.date);
  parts.push("");
  parts.push(`**Weather:** ${data.weather}`);
  parts.push("");

  if (data.goals.length > 0) {
    parts.push("🎯 **Active Goals**");
    data.goals.forEach((goal) => parts.push(`• ${goal}`));
    parts.push("");
  }

  if (data.pendingItems.length > 0) {
    parts.push("📋 **Pending Items**");
    data.pendingItems.forEach((item) => parts.push(`• ${item}`));
    parts.push("");
  }

  parts.push("📊 **Yesterday's Activity**");
  parts.push(`• ${data.stats.messageCount} messages`);
  parts.push(`• £${data.stats.totalCost.toFixed(4)} total cost`);
  parts.push("");
  parts.push("---");
  parts.push("_Have a productive day!_");

  return parts.join("\n");
}

async function sendBriefing(userId: string): Promise<void> {
  const now = new Date();
  const hour = now.getHours();

  // Only send 7-9 AM
  if (hour < 7 || hour > 9) {
    console.log(`[Skip] Not morning time (7-9 AM), current: ${hour}:00`);
    return;
  }

  const data = await gatherBriefingData(userId);
  const message = formatBriefing(data);

  console.log("[Morning Briefing]");
  console.log(message);

  // TODO: Send via OpenClaw messaging system
  // For now, just log. Integrate with cron tool or message API.
}

async function main() {
  console.log("🌅 Morning Briefing");
  console.log("=".repeat(50));

  await sendBriefing(USER_ID);

  console.log("=".repeat(50));
  console.log("✅ Complete\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}
