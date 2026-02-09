# OpenRouter Setup & Integration

**Purpose:** Access 100+ AI models at 1/10th the cost of Claude API.

**Cost:** Pay-per-use, no subscription required. ~£10/month for typical usage.

---

## What is OpenRouter?

**OpenRouter** is a unified API that gives you access to:
- 100+ AI models (Llama, Mistral, Qwen, Claude, GPT-4, etc.)
- Single API for all providers
- Automatic failover between providers
- Competitive pricing (often 10x cheaper than direct APIs)

**Example Pricing:**
| Model | OpenRouter | Direct API | Savings |
|-------|-----------|-----------|---------|
| Llama 3.3 70B | $0.59/1M tokens | N/A | N/A |
| Mistral Large | $3/1M tokens | $8/1M | 62% |
| Claude Sonnet 4 | $3/1M tokens | $3/1M | Same |
| GPT-4 Turbo | $10/1M tokens | $10/1M | Same |

**Best models for us:**
- **llama-3.3-70b-instruct** - $0.59/1M (excellent quality, very cheap)
- **mistral-large-2** - $3/1M (great for reasoning)
- **qwen2.5-72b-instruct** - $0.59/1M (code-focused)

---

## Step 1: Sign Up

1. **Go to:** https://openrouter.ai/
2. **Click "Sign In"** (top right)
3. **Sign in with Google** (or email)
4. **Free tier includes:**
   - $1 free credits
   - Access to all models
   - No subscription required

---

## Step 2: Get API Key

1. **After login, go to:** https://openrouter.ai/keys
2. **Click "Create Key"**
3. **Give it a name:** "OptimiserClaw"
4. **Copy the key** (starts with `sk-or-v1-...`)

**Important:** Save this key securely!

```bash
# Add to your environment
export OPENROUTER_API_KEY="sk-or-v1-YOUR-KEY-HERE"
```

---

## Step 3: Add Credits (Optional)

OpenRouter is pay-as-you-go:

1. **Go to:** https://openrouter.ai/credits
2. **Add credits:** £5-20 to start
3. **Auto-reload:** Optional (recommended: reload when balance < £2)

**Typical usage:**
- 1,000 requests/month with llama-3.3-70b ≈ £10
- You can start with free $1 credit to test

---

## Step 4: Test API Key

```bash
# Test with curl
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.3-70b-instruct",
    "messages": [
      {"role": "user", "content": "What is 2+2? Answer in one sentence."}
    ]
  }'
```

**Expected response:**
```json
{
  "id": "gen-...",
  "model": "meta-llama/llama-3.3-70b-instruct",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "2 + 2 equals 4."
    }
  }]
}
```

---

## Available Models (Recommended)

### For General Tasks
- `meta-llama/llama-3.3-70b-instruct` - $0.59/1M tokens
  - Best value for quality
  - Great for summaries, Q&A, research
  
- `mistralai/mistral-large-2` - $3/1M tokens
  - Excellent reasoning
  - Good for complex tasks

### For Code Tasks
- `qwen/qwen-2.5-coder-32b-instruct` - $0.59/1M tokens
  - Specialized for code
  - Alternative to local qwen2.5-coder

### For Cheap/Fast Tasks
- `meta-llama/llama-3.1-8b-instruct` - $0.06/1M tokens
  - Very cheap
  - Fast responses
  - Good for simple tasks

### Full List
See: https://openrouter.ai/models

---

## Integration with OpenClaw

We'll create an OpenRouter provider that uses OpenAI-compatible API:

```typescript
// OpenRouter uses OpenAI API format
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/andysheldon-creator/openclaw',
    'X-Title': 'OptimiserClaw',
  },
});

const response = await openrouter.chat.completions.create({
  model: 'meta-llama/llama-3.3-70b-instruct',
  messages: [
    { role: 'user', content: 'Hello!' },
  ],
});
```

---

## Cost Tracking

OpenRouter provides usage tracking:

1. **Dashboard:** https://openrouter.ai/activity
2. **See:**
   - Requests per model
   - Tokens used
   - Cost per request
   - Total spend

**Export data:**
- CSV export available
- API for programmatic access

---

## Rate Limits

**Free tier:**
- Varies by model
- Generally: 10-20 requests/minute
- More than enough for testing

**Paid tier:**
- Higher limits
- Priority queue
- Faster responses

**Our usage:**
- 20% of requests (medium complexity)
- ~600 requests/month
- Well within limits

---

## Security

**API Key Security:**
```bash
# Store in .env file
echo "OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY" >> ~/.openclaw/.env

# Add to .gitignore
echo ".env" >> .gitignore

# Load in shell
export $(cat ~/.openclaw/.env | xargs)
```

**Best Practices:**
- Never commit API keys to git
- Rotate keys every 90 days
- Use separate keys for dev/prod
- Monitor usage for anomalies

---

## Pricing Examples

### Scenario 1: 100 requests/month
**Model:** llama-3.3-70b (20% of total requests)

**Calculation:**
- 100 requests × 500 tokens avg = 50K tokens
- 50K tokens / 1M × $0.59 = $0.03
- **Cost: ~$0.03/month (£0.02)**

### Scenario 2: 1,000 requests/month
**Model:** llama-3.3-70b (20% of total requests)

**Calculation:**
- 1,000 requests × 500 tokens avg = 500K tokens
- 500K tokens / 1M × $0.59 = $0.30
- **Cost: ~$0.30/month (£0.24)**

### Scenario 3: Mixed usage
- 80% llama-3.3-70b ($0.59/1M)
- 20% mistral-large ($3/1M)
- 1,000 requests, 500 tokens avg

**Calculation:**
- Llama: 400K tokens × $0.59/1M = $0.24
- Mistral: 100K tokens × $3/1M = $0.30
- **Total: $0.54/month (£0.43)**

**Even heavy usage is cheap!**

---

## Comparison: OpenRouter vs Claude API

**Same task (1,000 requests, 500K tokens):**

| Provider | Model | Cost |
|----------|-------|------|
| Claude API | Sonnet 4 | $1.50 (£1.20) |
| OpenRouter | llama-3.3-70b | $0.30 (£0.24) |
| **Savings** | | **80%** |

**Quality:** Llama 3.3 70B is competitive with Claude for most tasks!

---

## Next Steps

1. ✅ Sign up for OpenRouter
2. ✅ Get API key
3. ✅ Add £5-10 credits
4. ⏳ Test API key with curl
5. ⏳ Build OpenRouter provider
6. ⏳ Integrate with routing system

---

**Created:** 2026-02-09  
**Status:** 🟡 Ready for signup  
**Next:** Get API key and start integration
