# Morning Briefing Setup

## What It Does

Sends a daily morning digest at 8:00 AM with:
- 🌅 Date and greeting
- ☀️ Weather forecast (Derbyshire, UK)
- 🎯 Active goals from memory
- 📋 Pending items
- 📊 Yesterday's activity stats (messages, cost)
- 🤖 **NEW:** Tech & AI videos (Clawdbot, OpenClaw channels)
- 🏎️ **NEW:** Motoring videos (Chris Slix, Mat Armstrong)

**Example:**
```
🌅 Good Morning, Andy!
Monday, 10 February 2026

Weather
☀️ Partly cloudy +6°C

🎯 Active Goals
• Deploy OptimiserClaw by Feb 19
• Complete Mirror Phase 1

📋 Pending Items
• Review security implementation
• Test image analysis feature

📊 Yesterday's Activity
• 47 messages sent
• £0.0142 total cost

🤖 Tech & AI Updates
• [Building AI Agents with Claude - New Features](https://youtube.com/watch?v=...)
  _Clawdbot_
• [OpenClaw 2.0 Deep Dive](https://youtube.com/watch?v=...)
  _openclawd_

🏎️ Motoring
• [Rebuilding a TOTALED Lamborghini Part 5](https://youtube.com/watch?v=...)
  _Mat Armstrong_
• [My NEW Project Car Revealed!](https://youtube.com/watch?v=...)
  _Chris Slix_

---
Have a productive day! Reply to chat or say "call me" for updates.
```

---

## Setup YouTube Integration

### 1. Get YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key

### 2. Add to .env File

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
nano .env
```

Add line:
```bash
YOUTUBE_API_KEY=YOUR_API_KEY_HERE
```

Save (Ctrl+O, Enter, Ctrl+X)

### 3. Test YouTube Integration

```bash
npm run briefing
```

Should now include YouTube sections if videos are found.

**Note:** Without YouTube API key, briefing still works - just skips video sections.

**YouTube API Quota:** 10,000 units/day (free tier)
- Each search = 100 units
- Morning briefing uses ~500 units/day (5 searches)
- Well within free quota

---

## Manual Test

Test the briefing logic manually:

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
npm run briefing
```

This will:
1. Check if current time is 7-9 AM (only sends during morning)
2. Gather weather, goals, pending items, stats
3. Format and send to Telegram

**Note:** If it's not 7-9 AM, it will skip sending (by design)

To **force test** at any time, edit `morning-briefing.ts` line ~160:
```typescript
// Comment out time check temporarily
// if (hour < 7 || hour > 9) {
//   console.log('[Skip] Not morning time (7-9 AM)');
//   process.exit(0);
// }
```

Then run: `npm run briefing`

Remember to uncomment after testing!

---

## Automated Setup (systemd Timer)

### 1. Create Service File

```bash
sudo nano /etc/systemd/system/optimiser-briefing.service
```

Content:
```ini
[Unit]
Description=OptimiserClaw Morning Briefing
After=network.target

[Service]
Type=oneshot
User=oem
WorkingDirectory=/home/oem/.openclaw/workspace/openclaw-fork/upgrades
Environment="PATH=/home/oem/.nvm/versions/node/v22.22.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/usr/bin/npm run briefing
StandardOutput=journal
StandardError=journal
```

### 2. Create Timer File

```bash
sudo nano /etc/systemd/system/optimiser-briefing.timer
```

Content:
```ini
[Unit]
Description=OptimiserClaw Morning Briefing Timer
Requires=optimiser-briefing.service

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Schedule:** Every day at 8:00 AM (GMT)

### 3. Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer (start on boot)
sudo systemctl enable optimiser-briefing.timer

# Start timer now
sudo systemctl start optimiser-briefing.timer

# Check status
sudo systemctl status optimiser-briefing.timer
```

### 4. Verify Next Run Time

```bash
systemctl list-timers optimiser-briefing.timer
```

Should show: `NEXT` column with tomorrow 08:00:00

### 5. View Logs

```bash
# Recent briefings
journalctl -u optimiser-briefing.service -n 20

# Follow live (test tomorrow morning)
journalctl -u optimiser-briefing.service -f

# Today's briefing
journalctl -u optimiser-briefing.service --since today
```

---

## Alternative: Cron Setup

If you prefer cron over systemd:

```bash
crontab -e
```

Add:
```cron
# Morning briefing at 8:00 AM every day
0 8 * * * cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades && npm run briefing >> /tmp/morning-briefing.log 2>&1
```

View logs:
```bash
tail -f /tmp/morning-briefing.log
```

---

## Features

### ✅ Currently Included

1. **Weather** - Live forecast from wttr.in (no API key needed)
   - Location: Derbyshire, UK (configurable)
   - Shows conditions + temperature

2. **Active Goals** - Extracted from memory
   - Reads from `~/.openclaw/memory/intent-memory.json`
   - Shows current goals with deadlines

3. **Pending Items** - From session state
   - Reads from `~/.openclaw/sessions/optimiser-session.json`
   - Shows tracked pending tasks

4. **Yesterday's Stats** - Session metrics
   - Message count
   - Total cost

### ⏰ Time-Gated

Briefing only sends between **7:00 AM - 9:00 AM** (GMT)
- Before 7 AM: Skips (too early)
- After 9 AM: Skips (too late)
- This prevents duplicate sends if cron/timer runs multiple times

### 📅 Future Enhancements (Optional)

To add calendar integration:

1. **Google Calendar API**
   ```bash
   npm install googleapis
   ```

2. **Set up OAuth** (one-time)
   - Go to https://console.cloud.google.com
   - Enable Google Calendar API
   - Create OAuth credentials
   - Download `credentials.json`

3. **Uncomment calendar section** in `morning-briefing.ts` line ~80:
   ```typescript
   // Implement getCalendarEvents()
   async function getCalendarEvents(): Promise<string[]> {
     const calendar = google.calendar('v3');
     const events = await calendar.events.list({
       calendarId: 'primary',
       timeMin: (new Date()).toISOString(),
       maxResults: 5,
       singleEvents: true,
       orderBy: 'startTime',
     });
     return events.data.items.map(e => `${e.start.dateTime} - ${e.summary}`);
   }
   ```

**For now:** Calendar integration skipped (requires OAuth setup)

---

## Cost

- Weather: FREE (wttr.in)
- Goals/stats: FREE (local JSON files)
- Message: FREE (just one Telegram message/day)
- Calendar API: FREE (within Google's free tier: 1M requests/day)

**Total added cost: £0/month** 🎉

---

## Customization

### Change Time

Edit timer file:
```ini
OnCalendar=*-*-* 07:30:00  # 7:30 AM instead of 8:00 AM
```

Or cron:
```cron
30 7 * * *  # 7:30 AM
```

### Change Location

Edit `morning-briefing.ts` line ~55:
```typescript
const weather = await getWeather('London,UK');  // Change location
```

### Add More Sections

Add to `formatBrief ing()` function line ~120:
```typescript
// Add custom section
parts.push('🔔 **Reminders**');
parts.push('• Review Mirror diagnostics');
parts.push('');
```

---

## Disable Briefing

### Temporary (pause):
```bash
sudo systemctl stop optimiser-briefing.timer
```

### Permanent (disable):
```bash
sudo systemctl disable optimiser-briefing.timer
sudo systemctl stop optimiser-briefing.timer
```

Or remove cron job:
```bash
crontab -e  # Comment out or delete the line
```

---

## Testing Checklist

- [ ] Manual test: `npm run briefing` (works?)
- [ ] Force send (comment out time check, test message format)
- [ ] Enable systemd timer
- [ ] Verify next run time: `systemctl list-timers`
- [ ] Check logs tomorrow morning: `journalctl -u optimiser-briefing.service`

---

**Status:** Ready to deploy. Test manually first, then enable timer for daily 8 AM delivery! 🌅
