#!/bin/bash
# Migration Script - Transfer Jarvis identity to OptimiserClaw
# Author: Jarvis
# Date: 2026-02-09

set -e  # Exit on error

echo "🔄 Starting Migration: Main OpenClaw → OptimiserClaw"
echo "=" | tr -d '\n' | xargs -I {} printf '%0.s={}\n' {1..60}
echo

WORKSPACE="/home/oem/.openclaw/workspace"
TARGET="${WORKSPACE}/openclaw-fork/upgrades"

# Step 1: Copy identity files
echo "📝 Step 1: Copying identity files..."
cd "$WORKSPACE"

files=(
  "SOUL.md"
  "IDENTITY.md"
  "USER.md"
  "AGENTS.md"
  "TOOLS.md"
  "HEARTBEAT.md"
  "avatar.png"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$TARGET/"
    echo "  ✓ Copied $file"
  else
    echo "  ⚠ Skip $file (not found)"
  fi
done

echo

# Step 2: Copy memory files
echo "🧠 Step 2: Copying memory files..."

if [ -f "MEMORY.md" ]; then
  cp "MEMORY.md" "$TARGET/"
  echo "  ✓ Copied MEMORY.md"
else
  echo "  ⚠ MEMORY.md not found"
fi

if [ -d "memory" ]; then
  cp -r "memory" "$TARGET/"
  echo "  ✓ Copied memory/ directory"
else
  echo "  ⚠ memory/ directory not found"
fi

echo

# Step 3: Link projects (avoid duplication)
echo "🔗 Step 3: Linking projects..."
cd "$TARGET"

if [ -d "../../projects" ]; then
  ln -sf "../../projects" projects
  echo "  ✓ Linked projects/"
fi

if [ -d "../../dashboard" ]; then
  ln -sf "../../dashboard" dashboard
  echo "  ✓ Linked dashboard/"
fi

echo

# Step 4: Verify files
echo "✅ Step 4: Verifying migration..."

verify_files=(
  "SOUL.md"
  "IDENTITY.md"
  "USER.md"
  "MEMORY.md"
)

all_good=true
for file in "${verify_files[@]}"; do
  if [ -f "$TARGET/$file" ]; then
    echo "  ✓ $file present"
  else
    echo "  ❌ $file MISSING!"
    all_good=false
  fi
done

echo

if [ "$all_good" = true ]; then
  echo "🎉 Migration Complete!"
  echo
  echo "Next steps:"
  echo "1. Stop main OpenClaw: openclaw gateway stop"
  echo "2. Restart OptimiserClaw: pm2 restart optimiser-bot"
  echo "3. Test on Telegram: Send 'Who are you?'"
  echo
  echo "To rollback: openclaw gateway start && pm2 stop optimiser-bot"
else
  echo "⚠️  Migration completed with warnings"
  echo "Some files were missing - check above"
fi

echo
echo "=" | tr -d '\n' | xargs -I {} printf '%0.s={}\n' {1..60}
