# OptimiserClaw Upgrades

This fork of OpenClaw includes intelligent cost optimizations and enhancements.

## 🎯 Primary Goal: 90% Cost Reduction

**Current problem:** £50-300+/month in Claude API costs

**Our solution:** Multi-tier model routing
- Local models (Ollama) → FREE
- Cheap cloud (OpenRouter) → £5-15/month  
- Claude session tokens → FREE (use existing Pro subscription)
- Premium API → Only when critical

**Target savings:** £150/month → £15/month (90% reduction)

---

## Documentation

- **[COST_REDUCTION_DESIGN.md](./COST_REDUCTION_DESIGN.md)** - Full technical design and implementation plan
- **[UPGRADES.md](./UPGRADES.md)** - Complete roadmap of all proposed optimizations  
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Repository organization

---

## Quick Start

### 1. Install Local Models (Week 1)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download models
ollama pull llama3.3:8b
ollama pull qwen2.5-coder:7b
ollama pull phi3:mini
```

### 2. Extract Claude Session Token (Week 1)
1. Login to Claude.ai
2. Open DevTools (F12) → Application → Cookies
3. Copy `sessionKey` value
4. Add to OpenClaw config

### 3. Setup OpenRouter (Week 2)
1. Sign up: https://openrouter.ai/
2. Get API key
3. Add to config

### 4. Build & Deploy Router (Week 2-3)
- Implement intelligent routing layer
- Test classification
- Monitor savings
- Iterate and optimize

---

## Fork Details

**Upstream:** https://github.com/openclaw/openclaw  
**Fork:** https://github.com/andysheldon-creator/openclaw  
**Branch:** `cost-optimization` (our development branch)  
**Maintained by:** Jarvis 🤖 for Mosaic Partners Limited

---

## Strategy

**Keep core intact:**
- All channel integrations
- Session management  
- Tool system
- Security and sandboxing

**Modify provider layer:**
- Add Ollama provider
- Add OpenRouter provider
- Add Claude session token provider
- Build intelligent router

**Brand separately:**
- Not trying to merge upstream
- Cherry-pick updates as needed
- Focus on cost optimization

---

**Status:** 🟠 Design Complete - Implementation Starting  
**Created:** 2026-02-09
