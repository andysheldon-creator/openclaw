# OpenClaw Cost Reduction Strategy

**Goal:** Reduce AI API costs by 80-90% through intelligent model routing, local LLMs, and Claude.ai session tokens.

## Current Problem

**Typical monthly costs:**
- Claude Sonnet 4 API: ~$50-150/month for moderate use
- Heavy usage: $300+/month
- Every API call costs money, even for simple tasks

**Pain points:**
- Using expensive models (Claude Sonnet 4) for everything
- No differentiation between simple/complex tasks
- API calls for routine work that local models could handle
- Paying per token when Claude Pro subscription already exists

---

## Solution Architecture

### 1. **Multi-Tier Model Routing** 🎯

Route requests to the most cost-effective model based on task complexity.

**Tier 1: Local Models (FREE)**
- **Use for:** Simple queries, code formatting, basic Q&A, file operations, searches
- **Models:** 
  - Ollama (llama3.3, qwen2.5-coder, mistral)
  - LM Studio
  - LocalAI
- **Cost:** £0 (one-time hardware cost)
- **Latency:** Very fast (local)

**Tier 2: Cheap Cloud APIs (CHEAP)**
- **Use for:** Medium complexity tasks, research, summaries
- **Providers:**
  - OpenRouter (access to 100+ models, pay-per-use, very cheap)
  - Groq (free tier, extremely fast inference)
  - Together.ai (competitive pricing)
  - Mistral API (cheaper than Claude/GPT-4)
- **Cost:** £5-15/month typical
- **Latency:** Fast

**Tier 3: Claude.ai Session Tokens (INCLUDED)**
- **Use for:** Complex reasoning, important decisions, coding challenges
- **Method:** Use existing Claude Pro subscription via session tokens
- **Cost:** £0 additional (already paying £20/month for Pro)
- **Latency:** Moderate
- **Limits:** Rate-limited but generous for personal use

**Tier 4: Premium APIs (ONLY WHEN NECESSARY)**
- **Use for:** Mission-critical tasks, client work, production deployments
- **Models:** Claude Sonnet 4 API, GPT-4 Turbo
- **Cost:** Pay-per-token (expensive)
- **Latency:** Varies

---

## Implementation Plan

### Phase 1: Claude.ai Session Token Integration (Week 1)

**What:** Access Claude Pro via session tokens instead of API.

**How:**
1. Extract session token from Claude.ai cookies
2. Build HTTP client that mimics browser requests
3. Handle rate limits and session refresh
4. Integrate with OpenClaw's provider system

**Benefits:**
- Use existing £20/month subscription
- No additional API costs
- Access to Claude Sonnet 4 for free (within rate limits)

**Code structure:**
```typescript
// providers/claude-session.ts
export class ClaudeSessionProvider {
  async chat(messages, sessionToken) {
    // Use Claude.ai web API with session token
    // Handle rate limits, retries, session refresh
  }
}
```

**Configuration:**
```yaml
providers:
  claude-session:
    enabled: true
    sessionToken: "${CLAUDE_SESSION_TOKEN}"
    organizationId: "${CLAUDE_ORG_ID}"
    rateLimit:
      requestsPerMinute: 10
      retryAfter: 60
```

---

### Phase 2: Local Model Integration (Week 1-2)

**What:** Run lightweight models locally for simple tasks.

**How:**
1. Install Ollama on your Linux server
2. Download optimized models (llama3.3:8b, qwen2.5-coder:7b)
3. Integrate with OpenClaw via Ollama's OpenAI-compatible API
4. Configure as fallback/default provider

**Models to install:**
- **llama3.3:8b** - General purpose, very capable, 8GB RAM
- **qwen2.5-coder:7b** - Excellent for code, 7GB RAM
- **mistral:7b** - Fast, good reasoning, 7GB RAM
- **phi3:mini** - Tiny, super fast, 2GB RAM (for trivial tasks)

**Benefits:**
- Zero cost per request
- No rate limits
- Works offline
- Fast (local GPU/CPU)

**Installation:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download models
ollama pull llama3.3:8b
ollama pull qwen2.5-coder:7b
ollama pull phi3:mini

# Test
ollama run llama3.3:8b "Hello, test response"
```

**OpenClaw config:**
```yaml
providers:
  ollama:
    enabled: true
    baseUrl: "http://localhost:11434"
    models:
      - name: "llama3.3"
        alias: "local-general"
      - name: "qwen2.5-coder"
        alias: "local-code"
      - name: "phi3:mini"
        alias: "local-fast"
```

---

### Phase 3: OpenRouter Integration (Week 2)

**What:** Access 100+ models at competitive prices through one API.

**Why OpenRouter:**
- Pay-per-use (no subscription)
- Access to Llama 3.3, Mistral, Qwen, etc. at 1/10th Claude API cost
- Automatic failover between providers
- Free tier available

**Pricing examples (vs Claude API):**
| Model | OpenRouter | Claude API | Savings |
|-------|-----------|-----------|---------|
| Llama 3.3 70B | $0.59/1M tokens | N/A | N/A |
| Mistral Large | $3/1M tokens | N/A | N/A |
| Claude Sonnet 4 | $3/1M (input) | $3/1M | Same |
| GPT-4o | $2.50/1M | $5/1M | 50% |

**Configuration:**
```yaml
providers:
  openrouter:
    enabled: true
    apiKey: "${OPENROUTER_API_KEY}"
    defaultModel: "meta-llama/llama-3.3-70b-instruct"
    fallbackModels:
      - "mistralai/mistral-large-2"
      - "anthropic/claude-sonnet-4"
```

---

### Phase 4: Intelligent Router (Week 2-3)

**What:** Automatically route requests to the cheapest capable model.

**How:**
1. Classify incoming requests (simple/medium/complex)
2. Route to appropriate tier
3. Track costs and performance
4. Learn from usage patterns

**Classification logic:**
```typescript
function classifyTask(message: string, context: Context): TaskTier {
  // Simple tasks (local models)
  if (isFileOperation(message)) return 'local-fast'
  if (isBasicQuery(message)) return 'local-general'
  if (isCodeFormatting(message)) return 'local-code'
  
  // Medium tasks (cheap cloud)
  if (isResearch(message)) return 'openrouter-cheap'
  if (isSummary(message)) return 'openrouter-cheap'
  
  // Complex tasks (Claude session)
  if (isComplexReasoning(message)) return 'claude-session'
  if (hasLargeContext(context)) return 'claude-session'
  
  // Mission-critical (premium API)
  if (isProductionDeploy(message)) return 'claude-api'
  if (requiresMax(message)) return 'claude-api'
  
  // Default: start cheap, escalate if needed
  return 'local-general'
}
```

**Smart escalation:**
- Start with local model
- If response quality is poor, retry with cloud
- If cloud fails, escalate to Claude session
- Only use premium API when explicitly requested

**Configuration:**
```yaml
routing:
  enabled: true
  strategy: "cost-optimized" # or "quality-first" or "balanced"
  
  rules:
    - pattern: "file|read|write|list|search"
      provider: "ollama"
      model: "phi3:mini"
    
    - pattern: "code|debug|test|review"
      provider: "ollama"
      model: "qwen2.5-coder"
    
    - pattern: "research|summarize|explain"
      provider: "openrouter"
      model: "meta-llama/llama-3.3-70b"
    
    - pattern: "complex|critical|important"
      provider: "claude-session"
      model: "claude-sonnet-4"
  
  fallback:
    onError: "escalate" # try next tier up
    onRateLimit: "queue" # wait and retry
    onTimeout: "retry-cheaper" # try faster model
```

---

### Phase 5: Cost Monitoring Dashboard (Week 3)

**What:** Track costs, usage, and savings in real-time.

**Features:**
- Cost per provider/model/day/month
- Request distribution (local vs cloud vs API)
- Savings vs "all Claude API" baseline
- Quality metrics (user satisfaction, retry rates)

**Example output:**
```
OpenClaw Cost Dashboard - February 2026

Total Spend: £8.40
vs All-Claude-API: £142.50 (94% savings 🎉)

Breakdown:
  Local Models (Ollama):    £0.00  (2,450 requests, 68%)
  OpenRouter (cheap):       £6.20  (890 requests, 25%)
  Claude Session Tokens:    £0.00  (180 requests, 5%)
  Claude API (premium):     £2.20  (45 requests, 2%)

Top Models:
  1. phi3:mini (local)          1,420 req  £0.00
  2. llama3.3:8b (local)         890 req  £0.00
  3. llama-3.3-70b (OpenRouter)  680 req  £4.80
  4. claude-session              180 req  £0.00
  5. claude-api                   45 req  £2.20

Quality Score: 4.6/5.0
Avg Response Time: 1.2s
```

---

## Expected Savings

### Scenario 1: Light User (100 requests/day)

**Before (all Claude API):**
- 100 req/day × 30 days = 3,000 requests
- ~500K tokens/month
- Cost: ~£50/month

**After (optimized routing):**
- 70% local (2,100 req): £0
- 20% OpenRouter (600 req): £4
- 8% Claude session (240 req): £0
- 2% Claude API (60 req): £1
- **Total: £5/month (90% savings)**

### Scenario 2: Heavy User (500 requests/day)

**Before (all Claude API):**
- 500 req/day × 30 days = 15,000 requests
- ~2.5M tokens/month
- Cost: ~£250/month

**After (optimized routing):**
- 70% local (10,500 req): £0
- 20% OpenRouter (3,000 req): £18
- 8% Claude session (1,200 req): £0
- 2% Claude API (300 req): £5
- **Total: £23/month (91% savings)**

---

## Technical Requirements

### Hardware for Local Models

**Minimum (runs phi3:mini, mistral:7b):**
- CPU: 4 cores
- RAM: 8GB
- Disk: 20GB free
- **Works on your XPS-15-9560** ✅

**Recommended (runs llama3.3:70b):**
- CPU: 8+ cores
- RAM: 64GB or GPU with 24GB VRAM
- Disk: 100GB free

**Your current setup:**
- Can run 7B-8B models easily
- phi3:mini will be very fast
- llama3.3:8b will work well
- For 70B models, use OpenRouter instead

### Software Dependencies

```bash
# Ollama (local models)
curl -fsSL https://ollama.com/install.sh | sh

# OpenRouter (cheap cloud)
# Just need API key: https://openrouter.ai/

# Claude session token extractor
# Browser extension or manual cookie export
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Install Ollama on XPS-15-9560
- [ ] Download phi3:mini, llama3.3:8b, qwen2.5-coder:7b
- [ ] Test local models (quality, speed, memory usage)
- [ ] Extract Claude.ai session token
- [ ] Build Claude session provider
- [ ] Test Claude session API integration

### Week 2: Integration
- [ ] Sign up for OpenRouter (free tier)
- [ ] Add OpenRouter provider to OpenClaw
- [ ] Build intelligent router
- [ ] Configure routing rules
- [ ] Test request classification
- [ ] Deploy to production

### Week 3: Optimization
- [ ] Build cost monitoring dashboard
- [ ] Track usage patterns
- [ ] Fine-tune routing rules
- [ ] Optimize model selection
- [ ] Document savings

---

## Risk Mitigation

**Risk 1: Local models too slow/low quality**
- Mitigation: Escalate to cloud automatically
- Fallback: OpenRouter cheap models

**Risk 2: Claude session tokens expire**
- Mitigation: Auto-refresh mechanism
- Fallback: Switch to API for critical tasks
- Manual: Re-login every 30 days

**Risk 3: OpenRouter rate limits**
- Mitigation: Multiple API keys
- Fallback: Other providers (Together.ai, Groq)

**Risk 4: Quality degradation**
- Mitigation: Track user satisfaction scores
- Fallback: Escalate to premium when quality drops

---

## Success Metrics

**Primary:**
- **90% cost reduction** (£150/month → £15/month)
- **Zero quality degradation** (user satisfaction ≥4.5/5.0)

**Secondary:**
- 70%+ requests served by local models
- <2s average response time
- 99% uptime (with fallbacks)

---

## Next Steps

1. **Approve this design** - Andy reviews and signs off
2. **Install Ollama** - Get local models running
3. **Extract Claude token** - Access Claude Pro via session
4. **Build router** - Intelligent model selection
5. **Deploy & monitor** - Track savings, optimize

---

**Created:** 2026-02-09  
**Owner:** Jarvis 🤖  
**For:** Andy Sheldon / Mosaic Partners Limited  
**Status:** 🟡 Design Complete - Awaiting Approval
