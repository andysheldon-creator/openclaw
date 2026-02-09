/**
 * Context Enrichment (from Goda's Claude Telegram Relay)
 * Add temporal, location, and platform context to prompts
 */

export interface ContextOptions {
  includeTime?: boolean;
  includeTimezone?: boolean;
  includeDay?: boolean;
  platform?: 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'cli';
  location?: string;
  customContext?: string;
}

/**
 * Build enriched prompt with context
 */
export function enrichPrompt(userMessage: string, options: ContextOptions = {}): string {
  const {
    includeTime = true,
    includeTimezone = true,
    includeDay = true,
    platform = 'telegram',
    location,
    customContext
  } = options;
  
  const contextLines: string[] = [];
  
  // Temporal context
  if (includeTime || includeDay || includeTimezone) {
    const now = new Date();
    
    const formatOptions: Intl.DateTimeFormatOptions = {};
    if (includeDay) {
      formatOptions.weekday = 'long';
      formatOptions.year = 'numeric';
      formatOptions.month = 'long';
      formatOptions.day = 'numeric';
    }
    if (includeTime) {
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
    }
    
    const timezone = includeTimezone 
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;
    
    const timeStr = now.toLocaleString('en-US', {
      ...formatOptions,
      timeZone: timezone
    });
    
    contextLines.push(`Current time: ${timeStr}${timezone ? ` (${timezone})` : ''}`);
  }
  
  // Platform-specific instructions
  const platformInstructions = getPlatformInstructions(platform);
  if (platformInstructions) {
    contextLines.push(platformInstructions);
  }
  
  // Location context
  if (location) {
    contextLines.push(`Location: ${location}`);
  }
  
  // Custom context
  if (customContext) {
    contextLines.push(customContext);
  }
  
  // Build final prompt
  if (contextLines.length === 0) {
    return userMessage;
  }
  
  return `${contextLines.join('\n')}\n\nUser: ${userMessage}`;
}

/**
 * Get platform-specific formatting instructions
 */
function getPlatformInstructions(platform: string): string | null {
  const instructions: Record<string, string> = {
    telegram: 'Platform: Telegram - Keep responses concise and mobile-friendly. Markdown supported.',
    discord: 'Platform: Discord - Max 2000 chars. Avoid tables, use bullet lists. Wrap multiple links in <> to suppress embeds.',
    whatsapp: 'Platform: WhatsApp - Max 4096 chars. No headers or tables. Use *bold* for emphasis.',
    slack: 'Platform: Slack - Max 4000 chars. Markdown supported. Thread-aware conversations.',
    cli: 'Platform: CLI - Full formatting available. Can use colors and extended output.'
  };
  
  return instructions[platform] || null;
}

/**
 * Get time-of-day context
 */
export function getTimeContext(): { period: string; greeting: string } {
  const hour = new Date().getHours();
  
  if (hour < 6) {
    return { period: 'late night', greeting: 'Hello' };
  } else if (hour < 12) {
    return { period: 'morning', greeting: 'Good morning' };
  } else if (hour < 17) {
    return { period: 'afternoon', greeting: 'Good afternoon' };
  } else if (hour < 21) {
    return { period: 'evening', greeting: 'Good evening' };
  } else {
    return { period: 'night', greeting: 'Good evening' };
  }
}

/**
 * Get day-of-week context
 */
export function getDayContext(): { isWeekend: boolean; isWorkday: boolean; day: string } {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  return {
    isWeekend: dayNum === 0 || dayNum === 6,
    isWorkday: dayNum >= 1 && dayNum <= 5,
    day
  };
}

/**
 * Build activity context (time since last interaction)
 */
export function getActivityContext(lastActivityTime: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - lastActivityTime.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return `Last activity: ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `Last activity: ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `Last activity: ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Full context builder for proactive messages
 */
export function buildProactiveContext(options: {
  lastActivity?: Date;
  goals?: string[];
  calendar?: string;
  pendingItems?: string[];
}): string {
  const lines: string[] = [];
  
  // Time context
  const { period, greeting } = getTimeContext();
  const { day, isWeekend } = getDayContext();
  lines.push(`Time: ${period} (${day}${isWeekend ? ', weekend' : ''})`);
  
  // Activity
  if (options.lastActivity) {
    lines.push(getActivityContext(options.lastActivity));
  }
  
  // Goals
  if (options.goals && options.goals.length > 0) {
    lines.push(`Active goals: ${options.goals.join(', ')}`);
  }
  
  // Calendar
  if (options.calendar) {
    lines.push(`Calendar: ${options.calendar}`);
  }
  
  // Pending items
  if (options.pendingItems && options.pendingItems.length > 0) {
    lines.push(`Pending: ${options.pendingItems.join(', ')}`);
  }
  
  return lines.join('\n');
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== Context Enrichment Test ===\n');
  
  const userMessage = "What should I work on next?";
  
  console.log('1. Basic enrichment (Telegram):');
  console.log(enrichPrompt(userMessage, { platform: 'telegram' }));
  
  console.log('\n2. Discord formatting:');
  console.log(enrichPrompt(userMessage, { platform: 'discord' }));
  
  console.log('\n3. With location:');
  console.log(enrichPrompt(userMessage, { 
    platform: 'telegram',
    location: 'Derbyshire, UK' 
  }));
  
  console.log('\n4. Custom context:');
  console.log(enrichPrompt(userMessage, { 
    platform: 'telegram',
    customContext: 'Working on OptimiserClaw Week 2' 
  }));
  
  console.log('\n5. Time context:');
  console.log(getTimeContext());
  
  console.log('\n6. Day context:');
  console.log(getDayContext());
  
  console.log('\n7. Activity context:');
  const lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  console.log(getActivityContext(lastActivity));
  
  console.log('\n8. Proactive context:');
  console.log(buildProactiveContext({
    lastActivity,
    goals: ['Complete Week 2 features', 'Test OpenRouter integration'],
    calendar: 'No events today',
    pendingItems: ['Review PR', 'Update docs']
  }));
}
