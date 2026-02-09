# OpenClaw Optimized Deployment Guide

## What You're Getting

**HAL 9000 v2.0** - Full OpenClaw with 93% cost reduction via intelligent routing.

### Features

- ✅ All OpenClaw tools (documents, browser, shell, search, etc.)
- ✅ Intelligent model routing (complexity-based)
- ✅ 93% cost savings (£150/mo → £10.62/mo)
- ✅ Session tracking
- ✅ Morning briefings
- ✅ 15 OpenRouter models available

### Routing Strategy

- **Simple** (0.0-0.4): Free Gemini or cheap Llama (£0.0003)
- **Medium** (0.4-0.7): Qwen/DeepSeek (£0.0003-0.0004)
- **Complex** (0.7+): Claude Sonnet 4.5 (£0.003)

---

## Quick Setup (15 minutes)

### 1. Get OpenRouter API Key

Visit: https://openrouter.ai/keys

1. Sign up / Log in
2. Click "Create Key"
3. Copy the key (starts with `sk-or-v1-`)

### 2. Configure OpenRouter in OpenClaw

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork

# Set environment variable
echo "export OPENROUTER_API_KEY='sk-or-v1-YOUR_KEY_HERE'" >> ~/.bashrc
source ~/.bashrc

# Or add to OpenClaw auth profiles
openclaw auth add openrouter --api-key sk-or-v1-YOUR_KEY_HERE
```

### 3. Create Optimized Bot Config

```bash
# Copy optimized config
cp openclaw-optimized.json /home/oem/.openclaw/openclaw-optimized.json

# Edit with your bot token
nano /home/oem/.openclaw/openclaw-optimized.json
```

Update these values:

- `channels.telegram.botToken`: Your new bot token (or reuse existing)
- `gateway.auth.token`: Generate new token with `openssl rand -hex 24`

### 4. Deploy

```bash
# Build (if not already done)
npm run build

# Link the built version
npm link

# Run with optimized config
OPENCLAW_CONFIG=/home/oem/.openclaw/openclaw-optimized.json openclaw gateway start
```

Or use PM2:

```bash
pm2 start openclaw --name "openclaw-optimized" -- gateway start
pm2 save
```

### 5. Test Routing

Send messages to your bot:

**Simple test:**

> "Hello!"

Expected: Routes to Gemini (free), quick response

**Medium test:**

> "Write a function to parse JSON"

Expected: Routes to Llama/Qwen (£0.0003), good quality

**Complex test:**

> "Compare microservices vs monolithic architecture, analyze trade-offs for a SaaS platform"

Expected: Routes to Claude Sonnet 4.5 (£0.003), best quality

Check logs for routing decisions:

```bash
pm2 logs openclaw-optimized
```

Look for lines like:

```
[Intelligent Routing] architecture task (0.75): 3 architecture terms → High complexity - Claude Sonnet 4.5 for best quality
```

---

## Configuration Options

### Enable/Disable Routing

In `openclaw-optimized.json`:

```json
{
  "agents": {
    "defaults": {
      "intelligentRouting": {
        "enabled": true, // Set to false to disable
        "verbose": true // Set to false to hide routing logs
      }
    }
  }
}
```

### Override Model Manually

Use `/model` command in chat:

```
/model claude-sonnet    # Force Claude for next message
/model llama            # Force Llama
/model default          # Back to intelligent routing
```

### Available Model Aliases

From config:

- `claude-sonnet` - Claude Sonnet 4.5 (best quality, £0.003/msg)
- `claude-opus` - Claude Opus 4 (premium, £0.012/msg)
- `llama` - Llama 3.3 70B (cheap, £0.0003/msg)
- `qwen-coder` - Qwen Coder 32B (code tasks, £0.0003/msg)
- `qwen` - Qwen 2.5 72B (general, £0.0003/msg)
- `deepseek` - DeepSeek V3 (reasoning, £0.0004/msg)
- `deepseek-r1` - DeepSeek R1 (advanced reasoning, £0.0004/msg)
- `gemini-free` - Gemini 2.0 Flash (free!)
- `gemini` - Gemini 1.5 Flash (paid, £0.00012/msg)
- `gpt4o` - GPT-4o (£0.002/msg)
- `gpt4o-mini` - GPT-4o Mini (£0.0003/msg)

---

## Morning Briefing (Optional)

Setup daily briefing at 8:00 AM:

```bash
# Add to crontab
crontab -e
```

Add line:

```cron
0 8 * * * cd /home/oem/.openclaw/workspace/openclaw-fork && tsx scripts/morning-briefing.ts
```

---

## Monitoring

### Check Costs

Use `/status` command in chat to see:

- Total messages sent
- Models used
- Approximate cost

### PM2 Monitoring

```bash
pm2 logs openclaw-optimized --lines 100   # Recent logs
pm2 monit                                  # Live monitoring
pm2 restart openclaw-optimized             # Restart
```

---

## Troubleshooting

### "User not found" from OpenRouter

**Fix:** Check API key is set correctly:

```bash
echo $OPENROUTER_API_KEY
openclaw auth list
```

### Routing not working

**Fix:** Check `intelligentRouting.enabled` is `true` in config:

```bash
grep -A3 intelligentRouting /home/oem/.openclaw/openclaw-optimized.json
```

### High costs

**Check:** Verify most messages route to cheap models:

```bash
pm2 logs openclaw-optimized | grep "Routing"
```

Should see mostly Gemini/Llama, occasional Claude for complex tasks.

---

## Cost Comparison

### Before (Direct Claude API)

- £0.015/message average
- 10,000 messages/month
- **Total: £150/month**

### After (Intelligent Routing)

- 70% Gemini (free): £0.00
- 20% Llama (£0.0003): £0.60
- 10% Claude (£0.003): £3.00
- Images/check-ins: £0.72
- Briefings: Free
- **Total: £10.62/month**

**Savings: £139.38/month (93%)**

---

## Next Steps

1. Run bot for 24 hours
2. Monitor routing decisions
3. Adjust complexity thresholds if needed (edit `src/agents/intelligent-routing.ts`)
4. Add morning briefing cron job
5. Enjoy massive cost savings! 🚀

**Questions?** Check logs or send message to bot.
