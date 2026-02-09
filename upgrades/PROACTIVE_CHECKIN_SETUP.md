# Proactive Check-in Setup

## What It Does

The bot will intelligently check in with you 2-3 times per day based on:
- Time since last message (long silences during work hours)
- Active goals and deadlines
- Pending items
- Time of day (won't interrupt early morning or late night)

Claude decides IF and WHEN to message - not hardcoded schedules.

## Manual Test

Test the check-in logic manually:

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
npm run checkin
```

This will:
1. Analyze current context (goals, time, activity)
2. Ask Claude if a check-in is needed
3. Send message if YES, or skip if NO
4. Show decision reasoning in console

## Automated Setup (systemd Timer)

### 1. Create Service File

```bash
sudo nano /etc/systemd/system/optimiser-checkin.service
```

Content:
```ini
[Unit]
Description=OptimiserClaw Proactive Check-in
After=network.target

[Service]
Type=oneshot
User=oem
WorkingDirectory=/home/oem/.openclaw/workspace/openclaw-fork/upgrades
Environment="PATH=/home/oem/.nvm/versions/node/v22.22.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/usr/bin/npm run checkin
StandardOutput=journal
StandardError=journal
```

### 2. Create Timer File

```bash
sudo nano /etc/systemd/system/optimiser-checkin.timer
```

Content:
```ini
[Unit]
Description=OptimiserClaw Check-in Timer
Requires=optimiser-checkin.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=30min
Persistent=true

[Install]
WantedBy=timers.target
```

**Schedule:**
- Runs 5 minutes after boot
- Then every 30 minutes
- Persists across reboots

### 3. Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer (start on boot)
sudo systemctl enable optimiser-checkin.timer

# Start timer now
sudo systemctl start optimiser-checkin.timer

# Check status
sudo systemctl status optimiser-checkin.timer
```

### 4. View Logs

```bash
# Recent check-ins
journalctl -u optimiser-checkin.service -n 50

# Follow live
journalctl -u optimiser-checkin.service -f

# Today's check-ins
journalctl -u optimiser-checkin.service --since today
```

## Alternative: Cron Setup

If you prefer cron over systemd:

```bash
crontab -e
```

Add:
```cron
# OptimiserClaw proactive check-in (every 30 minutes)
*/30 * * * * cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades && npm run checkin >> /tmp/optimiser-checkin.log 2>&1
```

View logs:
```bash
tail -f /tmp/optimiser-checkin.log
```

## How It Works

### Decision Logic (in Claude's prompt)

**Context gathered:**
- Current time + time of day context
- Hours since last message
- Hours since last check-in
- Active goals from memory
- Pending items
- User location

**Rules enforced:**
1. Max 2-3 check-ins per day
2. Only check in if good reason:
   - Goal deadline approaching
   - Long silence during work hours (>8 hours, 9am-6pm)
   - Important pending item
3. Never interrupt:
   - Early morning (6am-8am)
   - Late night (10pm-6am)
   - If last activity <2 hours ago (user is active)
   - If last check-in <6 hours ago (too frequent)

**Claude responds with:**
```
DECISION: YES or NO
MESSAGE: [Brief, helpful message]
REASON: [Why it decided this]
```

### Example Decisions

**YES - Long silence with approaching deadline:**
```
DECISION: YES
MESSAGE: Hey Andy! It's been 10 hours - how's OptimiserClaw deployment coming? 
         Deadline in 8 days. Need any help?
REASON: Long work-hours silence + approaching goal deadline
```

**NO - Recent activity:**
```
DECISION: NO
MESSAGE: none
REASON: User was active 1 hour ago, no need to interrupt
```

**NO - Too frequent:**
```
DECISION: NO
MESSAGE: none
REASON: Checked in 4 hours ago, waiting for more context
```

## Tuning Check-in Frequency

### More Frequent (every 20 minutes)

Edit timer:
```ini
OnUnitActiveSec=20min
```

Or cron:
```cron
*/20 * * * *
```

### Less Frequent (every hour)

Edit timer:
```ini
OnUnitActiveSec=1h
```

Or cron:
```cron
0 * * * *
```

**Recommendation:** Start with 30 minutes. Claude's rules prevent spam anyway.

## Disable Check-ins

### Temporary (pause):
```bash
sudo systemctl stop optimiser-checkin.timer
```

### Permanent (disable):
```bash
sudo systemctl disable optimiser-checkin.timer
sudo systemctl stop optimiser-checkin.timer
```

Or remove cron job:
```bash
crontab -e  # Comment out or delete the line
```

## Cost

- Uses Llama 3.3 70B for decision (cheap: ~£0.0003 per check)
- Runs 48 times per day (every 30 min) = ~£0.014/day = **£0.42/month**
- Most checks result in NO (no message sent)
- Actual messages: 2-3 per day max

**Total added cost: ~£0.42/month** (negligible)

## Testing

### Force a check-in (manual test):
```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
npm run checkin
```

### Simulate long silence:
Edit `proactive-checkin.ts` and hardcode:
```typescript
const hoursSinceActivity = 12; // Simulate 12 hours
```

Then run:
```bash
npm run checkin
```

You should get a check-in message if it's during work hours.

---

**Status:** Ready to deploy. Test manually first, then enable systemd timer.
