#!/bin/bash
# Cleanup Old HAL 9000 (OptimiserClaw Test Bot)

echo "🗑️  Cleaning up old HAL 9000 test bot..."
echo ""

# Remove old test bot files
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades

echo "Removing old config files..."
rm -f .env .env.backup
rm -f session-state.json cost-tracking.json
rm -f ~/.openclaw/memory/intent-memory.json

echo "✅ Old files removed"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "1. Open Telegram and message @BotFather"
echo "2. Send: /deletebot"
echo "3. Select: @OptimiserCLawTestBot"
echo "4. Confirm deletion"
echo ""
echo "Old bot token was: 7553117599:AAHwhMfiATDno8labJ2QCo6U5n0sdGbxWIQ"
echo ""
echo "✅ Cleanup complete!"
