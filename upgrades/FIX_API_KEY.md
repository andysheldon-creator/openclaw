# URGENT: Fix OpenRouter API Key

## Problem

Bot returns empty responses. OpenRouter API returns:
```
{"error": {"message": "User not found.", "code": 401}}
```

**Root cause:** API key is invalid/expired/revoked.

## Fix Steps

### 1. Generate New API Key

Visit: https://openrouter.ai/settings/keys

1. Sign in to OpenRouter
2. Go to "API Keys" section
3. Click "Create Key"
4. Name it: "OptimiserClaw"
5. Copy the new key (starts with `sk-or-v1-...`)

### 2. Update .env File

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
nano .env
```

Replace this line:
```bash
OPENROUTER_API_KEY=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
```

With your new key:
```bash
OPENROUTER_API_KEY=sk-or-v1-YOUR_NEW_KEY_HERE
```

Save (Ctrl+O, Enter, Ctrl+X)

### 3. Test API Key

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades

# Test with curl
curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_NEW_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'
```

Should return: `{"id": "...", "choices": [{"message": {"content": "..."}}]}`

NOT: `{"error": {"message": "User not found.", "code": 401}}`

### 4. Restart Bot

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
pm2 restart optimiser-bot

# Check logs
pm2 logs optimiser-bot --lines 20
```

### 5. Test Bot

Send message on Telegram: "Hello"

Should respond normally, not "✅ Done" (empty response).

## Verification

Run regression test suite:
```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
npm run test:full
```

Should pass all provider tests.

## Why This Happened

Possible reasons:
1. API key expired (OpenRouter keys can have expiration dates)
2. Account disabled/suspended
3. Spending limit hit on this specific key
4. Key revoked manually

## Prevention

1. **Set up billing**: Add payment method to OpenRouter to avoid free tier limits
2. **Monitor credits**: Check https://openrouter.ai/settings/billing regularly
3. **Set spending limits**: Configure max spend per key
4. **Test script**: Add automated API key health check

## Quick Health Check Script

```bash
#!/bin/bash
# File: check-api-health.sh

API_KEY=$(grep OPENROUTER_API_KEY .env | cut -d '=' -f2)

echo "Testing OpenRouter API key..."
RESPONSE=$(curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 5
  }')

if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ API Key INVALID"
  echo "$RESPONSE"
  exit 1
else
  echo "✅ API Key Valid"
  exit 0
fi
```

Usage:
```bash
chmod +x check-api-health.sh
./check-api-health.sh
```

Add to cron (daily check):
```cron
0 8 * * * cd /path/to/upgrades && ./check-api-health.sh >> /tmp/api-health.log 2>&1
```

---

**Status:** Waiting for new API key from OpenRouter.
