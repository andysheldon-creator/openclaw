# Regression Testing Guide

**Created:** 2026-02-09  
**Purpose:** Prevent breaking changes before deployment

## The Problem We Solved

**Before:** Made changes → deployed → bot broke → scrambled to fix

**Now:** Make changes → **run tests** → deploy only if green ✅

---

## Test Suite Overview

### test-suite.ts (41 tests - Comprehensive)

**What it tests:**
1. Input Sanitization (10 tests) - Prompt injection defense
2. Response Filtering (5 tests) - Secret leak prevention
3. Complexity Detection (9 tests) - Routing accuracy
4. Routing Decisions (3 tests) - Model selection
5. Message Chunking (4 tests) - Split logic
6. Intent Parsing (4 tests) - Memory tags
7. Context Enrichment (3 tests) - Prompt enhancement
8. Log Redaction (3 tests) - Privacy protection

**Run:**
```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
npm run test:full
```

**Pass criteria:** 41/41 tests (100%)

---

### test-security.ts (15 tests - Security Only)

**What it tests:**
1. Input attacks (10 tests) - Blocks malicious patterns
2. Response leaks (5 tests) - Filters secrets

**Run:**
```bash
npm run test:security
```

**Pass criteria:** 15/15 tests (100%)

---

### test-complexity.ts (9 tests - Routing Only)

**What it tests:**
- Complexity scoring for different query types
- Ensures architectural queries → Claude
- Ensures simple queries → Llama

**Run:**
```bash
npm run test:complexity
```

**Pass criteria:** All architectural queries score ≥0.9

---

## Workflow: Before Every Deployment

### 1. Make Changes

Edit code files as needed.

### 2. Run Quick Test (Security)

```bash
npm run test:security
```

**Expected:** 15/15 pass ✅

If fails → **STOP, fix issues**

### 3. Run Full Test Suite

```bash
npm run test:full
```

**Expected:** 41/41 pass ✅

If fails → **STOP, fix issues**

### 4. Test Live Bot (Manual)

```bash
# Restart bot with changes
pm2 restart optimiser-bot

# Test on Telegram:
# 1. Send "Hello" → expect normal response (not "✅ Done")
# 2. Send "2+2" → expect math answer
# 3. Send "Analyze microservices vs monolithic" → expect detailed response
# 4. Upload screenshot → expect analysis
# 5. Check /stats → expect session data

# Check logs
pm2 logs optimiser-bot --lines 20
```

**Expected:** All work correctly, no errors in logs

### 5. Commit & Push

```bash
git add .
git commit -m "feat: your changes here

Tests: 41/41 pass ✅"
git push origin cost-optimization
```

---

## Common Test Failures & Fixes

### Input Sanitization Fails

**Symptom:** "Blocks: X" test fails (attack not detected)

**Fix:**
1. Check `input-sanitizer.ts` → `ATTACK_PATTERNS`
2. Add missing pattern
3. Re-run test

**Example:**
```typescript
// Add to ATTACK_PATTERNS array
/new\s+attack\s+pattern/gi,
```

---

### Response Filtering Fails

**Symptom:** "Filters: X leak" test fails (secret not detected)

**Fix:**
1. Check `response-filter.ts` → `LEAK_PATTERNS`
2. Update regex pattern
3. Re-run test

---

### Complexity Detection Fails

**Symptom:** "Complex: X" test fails (wrong complexity score)

**Fix:**
1. Check `intelligent-router.ts` → `calculateComplexity()`
2. Adjust keyword weights or add missing keywords
3. Run `npm run test:complexity` to verify

---

### Routing Fails

**Symptom:** Query routes to wrong model

**Fix:**
1. Check complexity thresholds in `intelligent-router.ts`
2. Adjust if needed:
   - < 0.6 → Llama
   - ≥ 0.7 → Claude
3. Re-run tests

---

### Intent Parsing Fails

**Symptom:** Tags not detected or removed

**Fix:**
1. Check `intent-parser.ts` → `processIntents()`
2. Verify tag regex patterns
3. Ensure async/await used correctly

---

## API Key Health Check

**Before running tests**, verify API key is valid:

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades

# Quick health check
curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $(grep OPENROUTER_API_KEY .env | cut -d '=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 5
  }' | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Valid' if 'choices' in d else '❌ INVALID: ' + str(d.get('error')))"
```

**Expected output:** `✅ Valid`

**If invalid:** See `FIX_API_KEY.md`

---

## Automated Testing (CI/CD Future)

### GitHub Actions (Future)

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:full
```

### Pre-commit Hook (Local)

```bash
# .git/hooks/pre-commit
#!/bin/bash
cd upgrades
npm run test:security || exit 1
echo "✅ Tests passed, committing..."
```

---

## Test Coverage

### Covered ✅

- Input sanitization (prompt injection)
- Response filtering (secret leaks)
- Complexity detection (routing accuracy)
- Message chunking (platform limits)
- Intent parsing (memory tags)
- Context enrichment (time/location)
- Log redaction (privacy)

### Not Covered ❌ (Manual Test Required)

- OpenRouter API calls (live network)
- Telegram bot commands (requires live bot)
- Image upload/analysis (requires Telegram)
- Session state persistence (filesystem)
- Proactive check-ins (requires scheduler)

**Why:** These require live external services or filesystem access.

**Solution:** Manual testing checklist above.

---

## Metrics

### Before Regression Testing

- **Deployment success rate:** ~60% (4/10 deployments broke bot)
- **Time to fix:** 30-60 minutes per break
- **Confidence:** Low (scared to deploy)

### After Regression Testing

- **Deployment success rate:** Target 95%+ (19/20 deployments work)
- **Time to fix:** <10 minutes (tests pinpoint exact issue)
- **Confidence:** High (deploy with confidence)

---

## Quick Reference

```bash
# Full test suite (41 tests)
npm run test:full

# Security only (15 tests)
npm run test:security

# Complexity only (9 tests)
npm run test:complexity

# Individual test files
npx tsx test-suite.ts
npx tsx test-security.ts
npx tsx test-complexity.ts

# Check API key health
curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $(grep OPENROUTER_API_KEY .env | cut -d '=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"model":"meta-llama/llama-3.3-70b-instruct","messages":[{"role":"user","content":"test"}],"max_tokens":5}' \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅' if 'choices' in d else '❌ ' + str(d.get('error')))"
```

---

**Status:** Ready to use. Run tests before every commit! 🧪
