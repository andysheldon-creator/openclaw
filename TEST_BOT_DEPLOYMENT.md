# Test Bot Deployment Plan

**Safe, Zero-Risk Integration Testing**

## Overview

- **Main Bot:** v2026.2.9 on port 18789 (UNTOUCHED, production)
- **Test Bot:** v2026.2.6-3 on port 18790 (intelligent routing enabled)
- **Risk:** ZERO - completely separate instances

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Main OpenClaw (Production - UNTOUCHED)            │
│  - Port: 18789                                      │
│  - Config: /home/oem/.openclaw/openclaw.json        │
│  - Version: 2026.2.9                                │
│  - Model: Direct Claude (expensive)                 │
│  - Status: STABLE, DO NOT MODIFY                    │
│  - Telegram: @jarvis (existing bot)                 │
└─────────────────────────────────────────────────────┘
                         │
                         │ No interaction
                         ▼
┌─────────────────────────────────────────────────────┐
│  Test Bot (Experimental - Safe to Break)           │
│  - Port: 18790                                      │
│  - Config: /home/oem/.openclaw/openclaw-test.json   │
│  - Version: 2026.2.6-3 + intelligent routing        │
│  - Model: OpenRouter with smart routing             │
│  - Status: TESTING                                  │
│  - Telegram: OPTION A or B below                    │
└─────────────────────────────────────────────────────┘
```

## Telegram Options

**OPTION A: Same Bot Token (Simpler)**

- Use existing bot token
- Only ONE instance can be active at a time
- To test: Stop main, start test
- To rollback: Stop test, start main
- ⚠️ Requires stopping main temporarily

**OPTION B: New Bot Token (Safer)**

- Create new test bot via @BotFather
- Both instances run simultaneously
- Main stays active during testing
- Test on separate bot
- ✅ ZERO downtime for production

**RECOMMENDATION: Option B** - Get new bot token for testing

## Deployment Steps

### 1. Create Test Bot (Optional - if using Option B)

```bash
# Message @BotFather on Telegram:
/newbot
# Name: HAL Test Bot
# Username: hal_test_9000_bot
# Copy the token
```

### 2. Create Test Config

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork
cp openclaw-optimized.json /home/oem/.openclaw/openclaw-test.json

# Edit test config:
nano /home/oem/.openclaw/openclaw-test.json

# Set:
# - gateway.port: 18790
# - channels.telegram.botToken: <test-bot-token> (if Option B)
# - intelligentRouting.enabled: true
```

### 3. Add OpenRouter Credentials

```bash
# Already done - key in upgrades/.env
export OPENROUTER_API_KEY="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"

# Or add to auth profiles:
mkdir -p /home/oem/.openclaw/credentials
cat > /home/oem/.openclaw/credentials/openrouter-test.json << 'EOF'
{
  "type": "api_key",
  "key": "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",
  "provider": "openrouter"
}
EOF
chmod 600 /home/oem/.openclaw/credentials/openrouter-test.json
```

### 4. Start Test Bot

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork

# Using PM2 (recommended):
OPENCLAW_CONFIG=/home/oem/.openclaw/openclaw-test.json \
  pm2 start openclaw.mjs --name hal-test -- gateway start

# Or direct (for debugging):
OPENCLAW_CONFIG=/home/oem/.openclaw/openclaw-test.json \
  ./openclaw.mjs gateway start
```

### 5. Monitor Test Bot

```bash
# Watch logs:
pm2 logs hal-test --lines 100

# Look for intelligent routing decisions:
pm2 logs hal-test | grep "Intelligent Routing"

# Check status:
pm2 status hal-test
```

### 6. Test Routing

Send messages to test bot:

**Simple test:**

> "Hello"
> Expected: Routes to Gemini (free), log shows complexity=0.00

**Medium test:**

> "Write a Python function to sort a list"
> Expected: Routes to Llama (£0.0003), log shows complexity=0.3-0.5

**Complex test:**

> "Compare microservices vs monolithic architecture for a SaaS platform. Analyze trade-offs, scalability, deployment complexity, and cost implications."
> Expected: Routes to Claude Sonnet 4.5 (£0.003), log shows complexity=0.8-1.0

### 7. Monitor for 24-48 Hours

- Check routing decisions are sensible
- Verify cost savings (most messages to Gemini/Llama)
- Ensure quality acceptable
- Watch for any crashes or errors

## Rollback Plan

**If test bot has issues:**

```bash
# Just stop it:
pm2 stop hal-test
pm2 delete hal-test

# Main bot keeps running - NO IMPACT
```

**If test bot works perfectly:**

```bash
# After 24-48h testing, migrate main to use test config:
systemctl --user stop openclaw-gateway
cp /home/oem/.openclaw/openclaw-test.json /home/oem/.openclaw/openclaw.json
systemctl --user start openclaw-gateway

# Verify main bot now has intelligent routing:
# Send test messages and check logs
```

## Success Criteria

Before migrating to production:

- ✅ Test bot runs 24+ hours without crashes
- ✅ Routing decisions make sense (simple→cheap, complex→Claude)
- ✅ 70%+ messages route to Gemini/Llama (cost savings verified)
- ✅ Quality acceptable (responses still helpful)
- ✅ All core tools work (browser, exec, memory, etc.)
- ✅ Andy approves migration

## Monitoring Commands

```bash
# Quick status:
pm2 status

# Live routing logs:
pm2 logs hal-test | grep "Routing\|complexity"

# Cost tracking (manual):
pm2 logs hal-test | grep "Cost:" | wc -l  # Count messages

# Check for errors:
pm2 logs hal-test --err

# Restart if needed:
pm2 restart hal-test
```

## Version Tracking

**Current State:**

- Main: v2026.2.9 (production, stable)
- Test: v2026.2.6-3 (testing, experimental)
- Gap: iOS pairing, BlueBubbles, Grok, some Telegram fixes

**Next Review:** March 10, 2026

- Check for new OpenClaw releases
- Assess security patches
- Decide on merge vs stay on 2026.2.6-3

---

**STATUS: Ready to deploy once build completes** ✅
