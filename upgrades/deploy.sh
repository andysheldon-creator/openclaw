#!/bin/bash
set -e

echo "🚀 OptimiserClaw Test Bot Deployment"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Don't run as root. Run as your user account."
  exit 1
fi

# Check dependencies
echo "📦 Checking dependencies..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install with:"
  echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "   sudo apt-get install -y nodejs"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm not found. Install Node.js first."
  exit 1
fi

echo "✓ Node.js $(node --version)"
echo "✓ npm $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check PM2
if ! command -v pm2 &> /dev/null; then
  echo ""
  echo "⚠️  PM2 not found. Installing globally..."
  sudo npm install -g pm2
fi

echo "✓ PM2 $(pm2 --version)"

# Check .env
if [ ! -f .env ]; then
  echo ""
  echo "⚠️  No .env file found. Creating from template..."
  cp .env.example .env
  echo ""
  echo "📝 Please edit .env with your configuration:"
  echo "   1. Get bot token from @BotFather"
  echo "   2. Get your user ID from @userinfobot"
  echo "   3. Add your OpenRouter API key"
  echo "   4. Add your Claude session token"
  echo ""
  echo "Then run: ./deploy.sh again"
  exit 0
fi

# Validate .env
echo ""
echo "🔍 Validating configuration..."

source .env

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ "$TELEGRAM_BOT_TOKEN" = "your_bot_token_from_botfather" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN not set in .env"
  exit 1
fi

if [ -z "$TELEGRAM_USER_ID" ] || [ "$TELEGRAM_USER_ID" = "your_telegram_user_id" ]; then
  echo "❌ TELEGRAM_USER_ID not set in .env"
  exit 1
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "⚠️  OPENROUTER_API_KEY not set (OpenRouter features disabled)"
fi

if [ -z "$CLAUDE_SESSION_TOKEN" ]; then
  echo "⚠️  CLAUDE_SESSION_TOKEN not set (Claude browser features disabled)"
fi

echo "✓ Configuration valid"

# Check if already running
if pm2 list | grep -q "optimiser-bot"; then
  echo ""
  echo "🔄 Bot already running. Restarting..."
  pm2 restart optimiser-bot
  pm2 logs optimiser-bot --lines 20
  exit 0
fi

# Start bot
echo ""
echo "🚀 Starting bot..."
pm2 start npm --name optimiser-bot -- start

# Save PM2 process list
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Useful commands:"
echo "   pm2 logs optimiser-bot          # View logs"
echo "   pm2 restart optimiser-bot       # Restart bot"
echo "   pm2 stop optimiser-bot          # Stop bot"
echo "   pm2 monit                       # Monitor resources"
echo ""
echo "💬 Test your bot on Telegram!"
echo ""
