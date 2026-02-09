# Local Models Setup (Week 1)

**Date:** 2026-02-09  
**Hardware:** XPS-15-9560  
**Ollama Version:** Pre-installed ✅

---

## Installed Models

### 1. phi4-mini-reasoning (3.2 GB) ✅
**Purpose:** Fast reasoning for simple tasks  
**Use cases:**
- Quick questions
- File operations
- Basic code formatting
- Simple logic

**Speed:** Very fast  
**Quality:** High (Microsoft's latest small model)

---

### 2. phi4-reasoning (11 GB) ✅
**Purpose:** Complex reasoning tasks  
**Use cases:**
- Architecture decisions
- Complex debugging
- Multi-step planning
- Advanced code review

**Speed:** Moderate  
**Quality:** Excellent (Microsoft's full reasoning model)

---

### 3. qwen2.5-coder:7b (4.7 GB) 🔄 Downloading
**Purpose:** Code-specific tasks  
**Use cases:**
- Code generation
- Refactoring
- Bug fixes
- Documentation

**Speed:** Fast  
**Quality:** Excellent for code (Alibaba's specialized model)

---

## Model Selection Strategy

**Tier 1 (FREE - Local):**
- **Simple/Fast:** phi4-mini-reasoning
- **Code:** qwen2.5-coder:7b
- **Complex reasoning:** phi4-reasoning

**Tier 2 (CHEAP - OpenRouter):**
- llama-3.3-70b-instruct ($0.59/1M tokens)
- mistral-large ($3/1M tokens)

**Tier 3 (INCLUDED - Claude Session):**
- Claude Sonnet 4 (use existing Pro subscription)

**Tier 4 (PREMIUM - API):**
- Claude Sonnet 4 API (only when critical)

---

## Hardware Compatibility

**Your XPS-15-9560:**
- ✅ phi4-mini-reasoning (3.2GB) - runs great
- ✅ phi4-reasoning (11GB) - runs well
- ✅ qwen2.5-coder:7b (4.7GB) - runs great
- ❌ llama3.3:70b (42GB) - too large, use OpenRouter instead

**Memory usage:**
- phi4-mini: ~4GB RAM
- phi4-reasoning: ~12GB RAM (will use swap if needed)
- qwen2.5-coder: ~6GB RAM

---

## Testing Local Models

```bash
# Test phi4-mini-reasoning
ollama run phi4-mini-reasoning "What is 2+2? Explain briefly."

# Test phi4-reasoning
ollama run phi4-reasoning "Design a simple REST API for a todo app."

# Test qwen2.5-coder (when download completes)
ollama run qwen2.5-coder:7b "Write a Python function to reverse a string."
```

---

## OpenClaw Integration (Next Step)

Create new provider in `/src/providers/ollama.ts`:

```typescript
export class OllamaProvider {
  async chat(messages, model = 'phi4-mini-reasoning') {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    });
    return response.json();
  }
}
```

---

## Cost Savings Estimate

**Before (all Claude API):**
- 100 requests/day = 3,000/month
- ~500K tokens
- Cost: ~£50/month

**After (local models for 70%):**
- 70 local (phi4-mini/qwen): £0
- 20 OpenRouter: £4
- 8 Claude session: £0
- 2 Claude API: £1
- **Total: £5/month (90% savings)**

---

**Status:** Models downloading, ready to test in ~5 minutes  
**Next:** Build Ollama provider integration
