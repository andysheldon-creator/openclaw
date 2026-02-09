# Goda's Features - What We Haven't Implemented Yet

**Analysis Date:** 2026-02-09

## ✅ Already Implemented (6 of 6 Core Patterns)

1. **✅ Lock Management** - Prevent duplicate instances (`lock-manager.ts`)
2. **✅ Smart Chunking** - Natural boundary splitting (`message-chunker.ts`)
3. **✅ Intent Detection** - Memory tags `[REMEMBER:]`, `[GOAL:]`, `[DONE:]` (`intent-parser.ts`)
4. **✅ Context Enrichment** - Time/location in prompts (`context-enrichment.ts`)
5. **✅ Security** - Single-user allowlist + prompt injection protection
6. **✅ Intelligent Routing** - Multi-tier model selection (`intelligent-router.ts`)

---

## ❌ Not Yet Implemented (Advanced Features)

### 1. Proactive Check-ins (Smart Assistant)

**What it does:**
- Bot decides IF and WHEN to message you (not on schedule)
- Claude analyzes: time of day, goals, activity, pending tasks
- Max 2-3 check-ins per day (not annoying)

**Example decision logic:**
```
Context:
- Current time: 14:30 (afternoon)
- 8 hours since last message
- Active goal: "Deploy OptimiserClaw by Feb 19"
- Deadline approaching (10 days left)

Claude decides: "YES, check in about deployment progress"
Message: "Hey Andy! How's OptimiserClaw deployment coming? 
         10 days until deadline - need any help?"
```

**Implementation complexity:** Medium
- Requires state tracking (last check-in time)
- Requires Claude decision prompt
- Requires scheduling (cron or interval)

**Value for us:** HIGH - Proactive assistance without being annoying

---

### 2. Morning Briefing

**What it does:**
- Daily digest at 8:00 AM:
  - Weather
  - Calendar (today's events)
  - Unread emails (count + urgent)
  - Active goals
  - AI/tech news

**Example output:**
```
🌅 Good Morning, Andy!
Monday, February 9

☀️ Weather: Sunny, 22°C (Derbyshire)

📅 Today:
- 10:00 Team standup
- 14:00 Client call

📧 Inbox: 3 unread (1 urgent)

🎯 Goals:
- Deploy OptimiserClaw (10 days left)
- Complete Mirror Phase 1

🤖 AI News:
- OpenRouter added 5 new models
- Llama 3.4 released
```

**Implementation complexity:** High
- Requires Gmail API integration
- Requires Google Calendar API
- Requires weather API
- Requires news sources (RSS/Perplexity)

**Value for us:** Medium - Nice to have, not critical

---

### 3. Session State Tracking

**What it does:**
- Persist full conversation state to JSON:
  - Session ID
  - Last activity timestamp
  - Conversation history (last N messages)
  - User preferences
  - Pending tasks

**Goda's approach:**
```json
{
  "sessionId": "abc-123-def",
  "lastActivity": "2026-02-09T19:00:00Z",
  "userId": "6116232975",
  "preferences": {
    "timezone": "Europe/London",
    "language": "en"
  },
  "pendingItems": [
    "Review security implementation",
    "Test complexity routing"
  ]
}
```

**vs What we have:**
- We have intent-memory.json (facts + goals)
- We DON'T persist full session state
- We DON'T track pending items separately

**Implementation complexity:** Low
- Simple JSON file read/write
- Add to existing intent-parser.ts

**Value for us:** Medium - Useful for context continuity

---

### 4. Voice Message Transcription

**What it does:**
- User sends voice message on Telegram
- Bot transcribes to text (Whisper/Gemini)
- Processes as normal text message
- Optionally responds with voice (ElevenLabs TTS)

**Goda's status:** Placeholder only (not implemented)
- She documented it but never built it

**APIs needed:**
- Whisper (OpenAI) - $0.006/minute
- Gemini (Google) - Free tier available
- ElevenLabs - TTS ($5-$22/month)

**Implementation complexity:** Medium
- Download voice file from Telegram
- Call transcription API
- Process transcript
- (Optional) Generate voice response

**Value for us:** Low - We mostly type, not essential

---

### 5. Image & Document Support

**What it does:**
- User uploads image → Claude analyzes it
- User uploads PDF/doc → Claude reads content
- Vision API integration

**Goda's approach:**
- Save file locally
- Pass file path to Claude CLI with `--image` flag
- Claude handles vision internally

**Implementation complexity:** Low-Medium
- Telegram file download
- Pass to vision model (Claude/Gemini/GPT-4V)

**Value for us:** Medium - Useful for screenshots, diagrams

---

### 6. Supabase + Vector Search

**What it does:**
- Cloud-based memory (vs local JSON files)
- Semantic search: "Find that thing I said about Mirror pricing"
- PostgreSQL + pgvector for embeddings
- Syncs across devices

**Implementation complexity:** High
- Requires Supabase account + setup
- Requires embedding generation (OpenAI/local)
- Requires vector search queries

**Value for us:** Low - Local JSON is fine for now

---

### 7. Calendar & Email Integration

**What it does:**
- Read Google Calendar for morning briefing
- Read Gmail unread count + urgent emails
- Auto-reply drafts for common queries

**Implementation complexity:** High
- OAuth setup
- Google API credentials
- Permission scopes
- Rate limits

**Value for us:** Low - Not critical right now

---

### 8. OS-Level Daemon Setup

**What it does:**
- Bot runs as system service (survives reboots)
- Auto-starts on login
- Logging to system logs

**Goda's approach:**
- macOS: launchd (LaunchAgent)
- Linux: systemd service
- Windows: Task Scheduler

**vs What we have:**
- PM2 process manager (good enough)

**Implementation complexity:** Low
- Write systemd service file
- Enable service

**Value for us:** Low - PM2 works fine

---

## 🎯 Priority Ranking

### HIGH Priority (Implement Soon)
1. **✅ DONE - Proactive Check-ins** - Most valuable feature
   - Implementation: 2-3 hours
   - Value: HIGH (proactive assistance)

### MEDIUM Priority (Nice to Have)
2. **Session State Tracking** - Context continuity
   - Implementation: 1 hour
   - Value: Medium
   
3. **Image Support** - Screenshots, diagrams
   - Implementation: 2 hours
   - Value: Medium

### LOW Priority (Not Urgent)
4. Voice transcription - Rarely use voice
5. Morning briefing - Can check email/calendar ourselves
6. Supabase - Local JSON sufficient
7. Calendar/email - Too much API setup
8. OS daemon - PM2 works

---

## 📊 Summary

**Implemented:** 6/6 core patterns (100%)
- Lock, chunking, intent, context, security, routing

**Not Implemented:** 8 advanced features
- 1 HIGH priority (proactive check-ins)
- 2 MEDIUM priority (session state, images)
- 5 LOW priority (voice, briefing, cloud, integrations, daemon)

**Recommendation:**
1. Implement proactive check-ins next (2-3 hours, high value)
2. Add session state tracking (1 hour, easy win)
3. Consider image support later (useful for Mirror mockups)
4. Skip the rest for now (low value vs effort)

---

## Next Steps

Want me to implement **proactive check-ins** now? It's the most valuable missing feature - bot will intelligently check in on goals, deadlines, and long silences without being annoying.
