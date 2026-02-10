# HAL 9000 2.0 - Complete Setup Guide

## Overview

Create a new bot with full personality, memory, and cost optimization.

---

## Part 1: Create New Bot

### Via Telegram @BotFather:

```
/newbot
Bot name: HAL 9000 2.0
Username: hal_9000_v2_bot
```

**Save the token:** `<YOUR_BOT_TOKEN_HERE>`

---

## Part 2: Configure Bot Workspace

### Create HAL 2.0 Workspace

```bash
# Create dedicated workspace
mkdir -p /home/oem/.openclaw-hal2
cd /home/oem/.openclaw-hal2

# Copy soul files from main workspace
cp /home/oem/.openclaw/workspace/SOUL.md .
cp /home/oem/.openclaw/workspace/USER.md .
cp /home/oem/.openclaw/workspace/AGENTS.md .
cp /home/oem/.openclaw/workspace/TOOLS.md .
cp /home/oem/.openclaw/workspace/IDENTITY.md .
cp /home/oem/.openclaw/workspace/HEARTBEAT.md .

# Create memory directory
mkdir -p memory

# Copy recent memories (last 7 days)
cp /home/oem/.openclaw/workspace/memory/2026-02-*.md memory/ 2>/dev/null || true

# Copy MEMORY.md (long-term memory)
cp /home/oem/.openclaw/workspace/MEMORY.md . 2>/dev/null || true
```

### Verify Soul Transfer

```bash
cd /home/oem/.openclaw-hal2
ls -la *.md
# Should see: SOUL.md, USER.md, AGENTS.md, TOOLS.md, IDENTITY.md, HEARTBEAT.md, MEMORY.md
```

---

## Part 3: Create HAL 2.0 Configuration

### Generate Config

```bash
cat > /home/oem/.openclaw-hal2/openclaw.json << 'HALCONFIG'
{
  "meta": {
    "lastTouchedVersion": "2026.2.6-3",
    "lastTouchedAt": "2026-02-10T12:52:00.000Z"
  },
  "wizard": {
    "lastRunAt": "2026-02-10T12:52:00.000Z",
    "lastRunVersion": "2026.2.6-3",
    "lastRunCommand": "manual",
    "lastRunMode": "local"
  },
  "auth": {
    "profiles": {
      "openrouter:default": {
        "provider": "openrouter",
        "mode": "api_key"
      }
    }
  },
  "agents": {
    "defaults": {
      "intelligentRouting": {
        "enabled": true,
        "verbose": true
      },
      "model": {
        "primary": "openrouter/anthropic/claude-sonnet-4-5",
        "fallbacks": [
          "openrouter/meta-llama/llama-3.3-70b-instruct",
          "openrouter/google/gemini-2.0-flash-exp:free"
        ]
      },
      "models": {
        "openrouter/anthropic/claude-sonnet-4-5": {
          "alias": "claude-sonnet"
        },
        "openrouter/anthropic/claude-opus-4": {
          "alias": "claude-opus"
        },
        "openrouter/meta-llama/llama-3.3-70b-instruct": {
          "alias": "llama"
        },
        "openrouter/qwen/qwen2.5-coder-32b-instruct": {
          "alias": "qwen-coder"
        },
        "openrouter/qwen/qwen2.5-72b-instruct": {
          "alias": "qwen"
        },
        "openrouter/deepseek/deepseek-chat": {
          "alias": "deepseek"
        },
        "openrouter/deepseek/deepseek-reasoner": {
          "alias": "deepseek-r1"
        },
        "openrouter/google/gemini-2.0-flash-exp:free": {
          "alias": "gemini-free"
        },
        "openrouter/google/gemini-flash-1.5": {
          "alias": "gemini"
        },
        "openrouter/openai/gpt-4o": {
          "alias": "gpt4o"
        },
        "openrouter/openai/gpt-4o-mini": {
          "alias": "gpt4o-mini"
        }
      },
      "workspace": "/home/oem/.openclaw-hal2",
      "compaction": {
        "mode": "safeguard"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    }
  },
  "messages": {
    "ackReactionScope": "group-mentions"
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto"
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": {
          "enabled": true
        }
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "dmPolicy": "pairing",
      "botToken": "REPLACE_WITH_HAL_2.0_TOKEN",
      "groupPolicy": "allowlist",
      "streamMode": "partial"
    }
  },
  "gateway": {
    "port": 18790,
    "mode": "embedded",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "hal2_secure_token_v2_2026"
    },
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": true
      }
    }
  }
}
HALCONFIG

# Replace bot token
read -p "Enter HAL 2.0 bot token: " HAL_TOKEN
sed -i "s/REPLACE_WITH_HAL_2.0_TOKEN/$HAL_TOKEN/" /home/oem/.openclaw-hal2/openclaw.json
```

### Add OpenRouter Credentials

```bash
mkdir -p /home/oem/.openclaw-hal2/credentials
cat > /home/oem/.openclaw-hal2/credentials/openrouter-default.json << 'CRED'
{
  "type": "api_key",
  "key": "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",
  "provider": "openrouter"
}
CRED
chmod 600 /home/oem/.openclaw-hal2/credentials/openrouter-default.json
```

---

## Part 4: Start HAL 9000 2.0

### Using PM2 (Recommended)

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork

# Start HAL 2.0
OPENCLAW_CONFIG=/home/oem/.openclaw-hal2/openclaw.json \
  pm2 start openclaw.mjs --name hal-2.0 -- gateway start

# Save PM2 state
pm2 save

# Check status
pm2 status
```

### Monitor Startup

```bash
# Watch logs
pm2 logs hal-2.0 --lines 50

# Look for:
# - "Gateway started on port 18790"
# - "Telegram bot connected"
# - "Intelligent routing enabled"
```

---

## Part 5: Test HAL 9000 2.0

### Send Test Messages

**To HAL 2.0** (via new bot):

```
/start
```

Expected: Greeting from HAL 9000 2.0 with personality

**Simple routing test:**

```
Hi HAL!
```

Expected: Routes to Gemini (free), log shows complexity=0.00

**Medium test:**

```
Write a Python function to calculate fibonacci numbers
```

Expected: Routes to Llama (£0.0003), log shows complexity=0.3-0.5

**Complex test:**

```
Analyze the trade-offs between event-driven architecture and traditional request-response patterns for a distributed system. Consider scalability, consistency, and operational complexity.
```

Expected: Routes to Claude Sonnet 4.5 (£0.003), log shows complexity=0.8+

### Verify Soul Transfer

```
Who are you?
```

Expected: Should identify as HAL 9000, mention partnership with Andy, building multi-million £ business

```
What's our mission?
```

Expected: Should reference The Mirror project, Mosaic Partners, platforms and apps

---

## Part 6: Verify Parallel Operation

### Check Both Bots Running

```bash
pm2 status

# Should see:
# - Main bot (Jarvis) on port 18789 - production
# - HAL 2.0 on port 18790 - test with routing
```

### Test Isolation

- Message main bot (Jarvis) → should respond normally
- Message HAL 2.0 → should respond with routing
- No cross-talk, completely independent

---

## Part 7: Monitor & Optimize

### Watch Routing Decisions

```bash
pm2 logs hal-2.0 | grep "Intelligent Routing"
```

Expected output:

```
[Intelligent Routing] general task (0.00): simple query → Simple task - Gemini 2.0 Flash (free)
[Intelligent Routing] code task (0.30): code detected → Simple-medium task - Llama 3.3 70B
[Intelligent Routing] architecture task (0.85): 3 architecture terms → High complexity - Claude Sonnet 4.5
```

### Track Costs

After 24 hours, check distribution:

```bash
pm2 logs hal-2.0 | grep "Route:" | sort | uniq -c
```

Expected:

- 70%+ → Gemini (free) or Llama (£0.0003)
- 20% → Qwen/DeepSeek (£0.0003-0.0004)
- 10% → Claude (£0.003)

---

## Success Criteria

Before considering migration:

- ✅ HAL 2.0 runs 24+ hours without crashes
- ✅ Personality intact (responds as HAL 9000)
- ✅ Memory working (remembers The Mirror, Andy, mission)
- ✅ Routing sensible (simple→cheap, complex→Claude)
- ✅ 70%+ cost savings observed
- ✅ Quality acceptable
- ✅ All tools work (can exec, read files, search, etc.)

---

## Cleanup Old Bot (After HAL 2.0 Verified)

```bash
# Remove old test bot workspace
rm -rf /home/oem/.openclaw/workspace/openclaw-fork/upgrades

# Archive old memory if needed
mkdir -p /home/oem/.openclaw/archive
mv ~/.openclaw/memory/intent-memory.json /home/oem/.openclaw/archive/ 2>/dev/null || true
```

---

## Rollback Plan

**If HAL 2.0 has issues:**

```bash
# Stop HAL 2.0
pm2 stop hal-2.0
pm2 delete hal-2.0

# Main bot (Jarvis) continues working - NO IMPACT
```

**If HAL 2.0 works perfectly:**

```bash
# After 48h successful testing, can optionally migrate main to use routing:
# (Requires separate discussion and approval)
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│  Jarvis (Main Production Bot)                  │
│  - Port: 18789                                  │
│  - Version: 2026.2.9                            │
│  - Model: Direct Claude (expensive)             │
│  - Workspace: /home/oem/.openclaw/workspace     │
│  - Token: 8443131696:AAENxabDJcx1R...           │
│  - Status: UNTOUCHED, STABLE                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  HAL 9000 2.0 (Test Bot with Routing)          │
│  - Port: 18790                                  │
│  - Version: 2026.2.6-3 + routing                │
│  - Model: OpenRouter with intelligent routing   │
│  - Workspace: /home/oem/.openclaw-hal2          │
│  - Token: <NEW_TOKEN>                           │
│  - Status: TESTING, ISOLATED                    │
│  - Cost: 93% savings                            │
└─────────────────────────────────────────────────┘
```

Both run simultaneously, zero interference.

---

**READY TO EXECUTE!** 🔴👁️
