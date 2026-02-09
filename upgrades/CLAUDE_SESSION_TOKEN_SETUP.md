# Claude.ai Session Token Setup

**Purpose:** Use your existing Claude Pro subscription via session tokens instead of paying for API access.

**Cost Savings:** £0 additional (you already pay £20/month for Claude Pro)

---

## Step 1: Extract Session Token from Browser

### Option A: Chrome DevTools (Recommended)

1. **Open Claude.ai in Chrome**
   - Go to https://claude.ai
   - Make sure you're logged in to your Claude Pro account

2. **Open DevTools**
   - Press `F12` or right-click → "Inspect"
   - Click the "Application" tab (if not visible, click >> to find it)

3. **Navigate to Cookies**
   - In left sidebar: Application → Storage → Cookies
   - Click on `https://claude.ai`

4. **Find sessionKey**
   - Look for cookie named `sessionKey`
   - Copy the entire "Value" (long string like `sk-ant-sid01-...`)

5. **Save it securely**
   ```bash
   # Add to your environment or config
   export CLAUDE_SESSION_TOKEN="sk-ant-sid01-YOUR-ACTUAL-TOKEN-HERE"
   ```

### Option B: Firefox DevTools

1. Open https://claude.ai (logged in)
2. Press `F12` → "Storage" tab
3. Cookies → https://claude.ai
4. Find `sessionKey`, copy the value

### Option C: Browser Extension (EditThisCookie)

1. Install "EditThisCookie" extension
2. Visit https://claude.ai (logged in)
3. Click extension icon
4. Find `sessionKey` cookie
5. Copy value

---

## Step 2: Verify Token Works

Test the token with a simple curl request:

```bash
curl -X POST https://claude.ai/api/organizations \
  -H "Cookie: sessionKey=YOUR_SESSION_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Expected:** JSON response with your organization details

**If error:** Token invalid or expired (re-login to Claude.ai and get new token)

---

## Step 3: Get Organization ID

You need your Claude organization ID for API calls:

```bash
# Method 1: From API
curl -X POST https://claude.ai/api/organizations \
  -H "Cookie: sessionKey=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" | jq '.[0].uuid'

# Method 2: From Claude.ai URL
# When logged in, look at URL: https://claude.ai/chat/SOME-CHAT-ID
# Your org ID is visible in the network tab when you create a conversation
```

Save the organization UUID:

```bash
export CLAUDE_ORG_ID="YOUR-ORG-UUID-HERE"
```

---

## Step 4: Test Chat Request

Send a test message to Claude via session token:

```bash
curl -X POST "https://claude.ai/api/organizations/${CLAUDE_ORG_ID}/chat_conversations" \
  -H "Cookie: sessionKey=${CLAUDE_SESSION_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "anthropic-client-sha: unknown" \
  -d '{
    "uuid": "'"$(uuidgen)"'",
    "name": "Test from API"
  }'
```

**Expected:** JSON response with new conversation ID

**Then send a message:**

```bash
CONVERSATION_ID="<uuid-from-previous-response>"

curl -X POST "https://claude.ai/api/organizations/${CLAUDE_ORG_ID}/chat_conversations/${CONVERSATION_ID}/completion" \
  -H "Cookie: sessionKey=${CLAUDE_SESSION_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "anthropic-client-sha: unknown" \
  -d '{
    "prompt": "Hello, Claude! What is 2+2?",
    "timezone": "Europe/London",
    "attachments": [],
    "files": []
  }'
```

**Expected:** Streaming response with Claude's answer

---

## Step 5: Add to OpenClaw Config

Once you have working tokens, add to your OpenClaw configuration:

```yaml
# ~/.openclaw/config.yaml (or wherever your config lives)

providers:
  claude-session:
    enabled: true
    sessionToken: "${CLAUDE_SESSION_TOKEN}"  # Use env var for security
    organizationId: "${CLAUDE_ORG_ID}"
    
    # Rate limiting (Claude Pro has generous limits)
    rateLimit:
      requestsPerMinute: 10
      requestsPerHour: 200
    
    # Auto-retry on rate limit
    retryAfter: 60  # seconds
    
    # Model selection
    model: "claude-sonnet-4"
```

**Security note:** Never commit session tokens to git! Use environment variables.

---

## Session Token Lifespan

**How long do tokens last?**
- Typically 30-90 days
- May expire sooner if you logout or change password
- Will expire if Claude detects suspicious activity

**When tokens expire:**
1. You'll get 401/403 errors
2. Just re-login to Claude.ai
3. Extract new session token
4. Update your config

**Auto-refresh strategy (future):**
We'll build a token refresh mechanism that:
- Detects when token is about to expire
- Prompts you to re-login
- Or automates re-authentication (if feasible)

---

## Security Best Practices

### ✅ DO:
- Store tokens in environment variables
- Use `.env` files (add to `.gitignore`)
- Rotate tokens every 30 days manually
- Monitor for unusual activity on your Claude account

### ❌ DON'T:
- Commit tokens to git repos
- Share tokens with anyone
- Use tokens on untrusted devices
- Hardcode tokens in source code

---

## Example Environment Setup

Create `/home/oem/.openclaw/.env`:

```bash
# Claude.ai Session Tokens
CLAUDE_SESSION_TOKEN="sk-ant-sid01-YOUR-ACTUAL-TOKEN-HERE"
CLAUDE_ORG_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Load in your shell:

```bash
# Add to ~/.bashrc or ~/.zshrc
if [ -f ~/.openclaw/.env ]; then
    export $(cat ~/.openclaw/.env | xargs)
fi
```

---

## Troubleshooting

### Error: "unauthorized" or 401
- Token expired → Get new token
- Not logged in to Claude.ai → Login first
- Wrong cookie name → Must be exactly `sessionKey`

### Error: "rate_limit_error"
- Too many requests → Wait 60 seconds
- Reduce `requestsPerMinute` in config
- Use fallback to local models or OpenRouter

### Error: "organization not found"
- Wrong org ID → Double-check UUID
- Account issue → Verify Claude Pro subscription active

### No response / hangs
- Network issue → Check connection
- Claude.ai down → Check status.anthropic.com
- Timeout too short → Increase timeout in config

---

## Rate Limits (Claude Pro)

**Estimated limits** (not officially documented):
- ~10-20 requests per minute
- ~200-300 requests per hour
- ~2000-3000 requests per day

**Much more generous than free tier!**

These are estimates based on community testing. Your mileage may vary.

**Strategy:**
- Use session tokens for 8% of requests (complex reasoning)
- Use local models for 70% (simple tasks)
- Use OpenRouter for 20% (medium complexity)
- Reserve API for 2% (critical, client work)

---

## Next Steps

1. ✅ Extract session token from browser
2. ✅ Test token with curl
3. ✅ Get organization ID
4. ✅ Test chat request
5. ⏳ Build Claude session provider (`src/providers/claude-session.ts`)
6. ⏳ Add to OpenClaw routing logic
7. ⏳ Test end-to-end

---

**Created:** 2026-02-09  
**Status:** 🟡 Awaiting token extraction  
**Next:** Extract your session token and test it!
