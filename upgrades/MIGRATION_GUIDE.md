# Migration Guide - Main OpenClaw → OptimiserClaw

**Purpose:** Transfer Jarvis's identity, memory, and context to OptimiserClaw

**Date:** 2026-02-09  
**From:** Main OpenClaw (current bot)  
**To:** OptimiserClaw (cost-optimized bot)

---

## What Gets Migrated

### 1. Identity & Personality
- `SOUL.md` - Your personality and operating principles
- `IDENTITY.md` - Name, emoji, avatar
- `USER.md` - Info about Andy
- `AGENTS.md` - Workspace instructions
- `TOOLS.md` - Local tool notes

### 2. Memory
- `MEMORY.md` - Long-term curated memory
- `memory/*.md` - Daily memory logs

### 3. Projects
- `projects/` - The Mirror and other projects
- `dashboard/` - Metrics dashboard

### 4. Configuration
- Telegram bot token (already configured)
- API keys (already configured)

---

## Migration Steps

### Step 1: Copy Identity Files

```bash
cd /home/oem/.openclaw/workspace

# Copy to OptimiserClaw workspace
cp SOUL.md openclaw-fork/upgrades/
cp IDENTITY.md openclaw-fork/upgrades/
cp USER.md openclaw-fork/upgrades/
cp AGENTS.md openclaw-fork/upgrades/
cp TOOLS.md openclaw-fork/upgrades/
cp HEARTBEAT.md openclaw-fork/upgrades/
cp avatar.png openclaw-fork/upgrades/

echo "✅ Identity files copied"
```

### Step 2: Copy Memory Files

```bash
# Copy main memory
cp MEMORY.md openclaw-fork/upgrades/

# Copy daily memory folder
cp -r memory openclaw-fork/upgrades/

echo "✅ Memory files copied"
```

### Step 3: Symlink Projects (Keep in One Place)

```bash
# Create symlinks to avoid duplication
cd openclaw-fork/upgrades
ln -s ../../projects projects
ln -s ../../dashboard dashboard

echo "✅ Projects linked"
```

### Step 4: Update OptimiserClaw Bot Configuration

The bot needs to know where to find workspace files.

Edit `optimiser-bot.ts`:

```typescript
// At the top, after imports
const WORKSPACE_DIR = process.cwd();  // upgrades/ directory
```

**No changes needed** - bot already uses relative paths!

### Step 5: Stop Main OpenClaw Gateway

```bash
# Stop the main OpenClaw daemon (frees up Telegram)
openclaw gateway stop

# Verify it's stopped
openclaw gateway status
```

### Step 6: Update Telegram Bot Token

**Option A:** Reconfigure main OpenClaw's bot to use OptimiserClaw  
**Option B:** Keep separate bots (you choose which to message)

**For Option A:**
```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades
nano .env
```

Change to use MAIN bot token instead of test bot token.

### Step 7: Restart OptimiserClaw with New Identity

```bash
pm2 restart optimiser-bot

# Check logs
pm2 logs optimiser-bot --lines 20
```

### Step 8: Test Migration

Send message on Telegram:
- "Who are you?"
- "What are my active goals?"
- "What's The Mirror project?"

Should respond with YOUR context (Jarvis personality, knows about Mirror, etc.)

---

## Quick Migration Script

Want to do it all at once? Run this:

```bash
cd /home/oem/.openclaw/workspace

# Copy identity
cp SOUL.md IDENTITY.md USER.md AGENTS.md TOOLS.md HEARTBEAT.md avatar.png openclaw-fork/upgrades/

# Copy memory
cp MEMORY.md openclaw-fork/upgrades/
cp -r memory openclaw-fork/upgrades/

# Link projects (avoid duplication)
cd openclaw-fork/upgrades
ln -sf ../../projects projects
ln -sf ../../dashboard dashboard

# Restart bot
pm2 restart optimiser-bot

echo "✅ Migration complete!"
echo "Send a test message on Telegram to verify"
```

---

## Verification Checklist

After migration, verify:

- [ ] Bot responds with Jarvis personality
- [ ] Bot knows about The Mirror project
- [ ] Bot remembers your goals
- [ ] Bot knows Andy's preferences
- [ ] Morning briefing still works
- [ ] Image analysis works
- [ ] Session tracking works

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Start main OpenClaw again
openclaw gateway start

# Stop OptimiserClaw
pm2 stop optimiser-bot

# Verify main OpenClaw is running
openclaw gateway status
```

---

## What Happens to Main OpenClaw?

**After migration:**
- Main OpenClaw gateway: STOPPED (saves resources)
- OptimiserClaw: RUNNING as primary bot
- All workspace files: Shared/linked (no duplication)
- Cost: Drops from £150/month → £10.62/month 🎉

**You can always:**
- Restart main OpenClaw if needed
- Keep both running (different bots)
- Switch back and forth

---

## Telegram Bot Options

### Option 1: Same Bot, New Backend
Update main OpenClaw config to use OptimiserClaw's routing

**Pros:** Same Telegram bot handle  
**Cons:** Requires main OpenClaw config changes

### Option 2: Switch Bots
Use @OptimiserCLawTestBot as your primary

**Pros:** Clean separation, easy rollback  
**Cons:** Different bot handle

### Option 3: Both Running
Keep both, use whichever you prefer

**Pros:** Maximum flexibility  
**Cons:** Uses both API quotas

---

## Recommended Approach

**I recommend Option 2** (use OptimiserClaw bot):

1. Run quick migration script above
2. Stop main OpenClaw gateway
3. Use @OptimiserCLawTestBot from now on
4. Keep main OpenClaw installed (for rollback if needed)

**Benefits:**
- 93% cost savings immediately
- All new features (YouTube briefings, security, sessions)
- Can always switch back if needed

---

## Next Steps

Ready to migrate? Say the word and I'll:
1. Run the migration script
2. Stop main OpenClaw
3. Verify OptimiserClaw has your identity
4. Test everything works

**Want me to do it now?** (takes ~2 minutes)
