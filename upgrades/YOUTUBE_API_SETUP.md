# YouTube API Setup for Morning Briefing

## Quick Setup (5 Minutes)

### 1. Get YouTube Data API v3 Key

**Go to:** https://console.cloud.google.com/apis/credentials

1. **Create/Select Project**
   - Click dropdown at top
   - "New Project" → Name: "OptimiserClaw"
   - Wait for creation (~30 seconds)

2. **Enable YouTube Data API v3**
   - Go to: https://console.cloud.google.com/apis/library
   - Search: "YouTube Data API v3"
   - Click it → "Enable"

3. **Create API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - "Create Credentials" → "API Key"
   - Copy the key (looks like: `AIzaSyB...`)
   - Click "Restrict Key" (recommended)
     - API restrictions → Select "YouTube Data API v3"
     - Save

### 2. Add to .env

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
nano .env
```

Add line:
```bash
YOUTUBE_API_KEY=AIzaSyB_YOUR_KEY_HERE
```

Save: Ctrl+O, Enter, Ctrl+X

### 3. Restart Timer (if already running)

```bash
sudo systemctl restart optimiser-briefing.timer
```

---

## What Gets Included

### 🤖 Tech & AI Section

Searches for videos from:
- Clawdbot
- openclawd
- OpenClaw

Shows videos from **last 24 hours** with clickable links

### 🏎️ Motoring Section

Searches for videos from:
- Chris Slix
- Mat Armstrong

Shows videos from **last 24 hours** with clickable links

---

## Example Output

```markdown
🤖 Tech & AI Updates
• [Building AI Agents with Claude - New Features](https://youtube.com/watch?v=abc123)
  _Clawdbot_
• [OpenClaw 2.0 Deep Dive](https://youtube.com/watch?v=def456)
  _openclawd_

🏎️ Motoring
• [Rebuilding a TOTALED Lamborghini Part 5](https://youtube.com/watch?v=ghi789)
  _Mat Armstrong_
• [My NEW Project Car Revealed!](https://youtube.com/watch?v=jkl012)
  _Chris Slix_
```

Links are clickable in Telegram!

---

## Customization

### Add More Channels

Edit `morning-briefing.ts`:

```typescript
// Tech channels
async function getTechVideos(): Promise<YouTubeVideo[]> {
  const channels = [
    'Clawdbot', 
    'openclawd', 
    'OpenClaw',
    'Fireship',  // ADD YOUR CHANNELS HERE
    'Theo - t3.gg',
  ];
  return getYouTubeVideos(channels);
}

// Motoring channels
async function getMotoringVideos(): Promise<YouTubeVideo[]> {
  const channels = [
    'Chris Slix', 
    'Mat Armstrong',
    'Tavarish',  // ADD YOUR CHANNELS HERE
    'CarThrottle',
  ];
  return getYouTubeVideos(channels);
}
```

Restart bot: `pm2 restart optimiser-bot`

### Add New Categories

Want a **Gaming** section? Add to `morning-briefing.ts`:

```typescript
// After getMotoringVideos()
async function getGamingVideos(): Promise<YouTubeVideo[]> {
  const channels = ['IGN', 'GameSpot', 'Linus Tech Tips'];
  return getYouTubeVideos(channels);
}

// Update gatherBriefingData to fetch gaming videos
const [weather, goals, stats, techVideos, motoringVideos, gamingVideos] = await Promise.all([
  // ...existing...
  getGamingVideos(),
]);

// Update formatBriefing to include gaming section
if (data.gamingVideos.length > 0) {
  parts.push('🎮 **Gaming**');
  data.gamingVideos.forEach(video => {
    const title = video.title.length > 60 ? video.title.substring(0, 57) + '...' : video.title;
    parts.push(`• [${title}](${video.url})`);
    parts.push(`  _${video.channel}_`);
  });
  parts.push('');
}
```

---

## YouTube API Quotas

**Free Tier:** 10,000 units/day

**Morning briefing usage:**
- Each channel search: ~100 units
- Total searches: 5 (Clawdbot, openclawd, OpenClaw, Chris Slix, Mat Armstrong)
- **Cost per briefing: ~500 units**
- **Daily quota: Enough for 20 briefings** (you only run 1/day)

**Well within free quota!** 🎉

To check quota usage:
https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

---

## Troubleshooting

### "API key not valid"

1. Check key is correct in .env
2. Verify YouTube Data API v3 is **enabled**
3. Wait 1-2 minutes after creating key (propagation delay)
4. Check API restrictions allow YouTube Data API v3

### "Quota exceeded"

Rare with only 1 briefing/day. If hit:
- Wait until midnight PST (quota resets)
- Or reduce number of channels searched

### No videos showing

Normal if:
- Channels haven't posted in last 24 hours
- Channel names don't match exactly (case-insensitive search)

Try manually: Search YouTube for "Clawdbot" - see recent uploads

### Links not clickable in Telegram

- Make sure using Markdown format: `[text](url)`
- Bot sends with `parse_mode: 'Markdown'`
- Links should be blue and clickable

---

## Cost

**YouTube API:** FREE (within quota)
**Total briefing cost:** Still £0/month 🎉

---

## Privacy

YouTube API collects:
- What channels you search for
- When you search (timestamps)

**Does NOT collect:**
- What videos you watch
- Your personal YouTube data
- Viewing history

API key only has search permissions, nothing else.

---

**Status:** Ready to use! Get your API key and enjoy enhanced morning briefings. 🌅
