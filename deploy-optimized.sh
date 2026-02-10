#!/bin/bash
set -e

echo "🚀 OpenClaw Optimized Deployment"
echo "================================="
echo ""

# Set environment variables
export OPENROUTER_API_KEY="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"

# Create optimized config
cat > /home/oem/.openclaw/openclaw-optimized.json << 'EOF'
{
  "messages": {
    "ackReactionScope": "group-mentions"
  },
  "agents": {
    "defaults": {
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      },
      "compaction": {
        "mode": "safeguard"
      },
      "workspace": "/home/oem/.openclaw/workspace",
      "intelligentRouting": {
        "enabled": true,
        "verbose": true
      },
      "model": {
        "primary": "openrouter/anthropic/claude-sonnet-4-5",
        "fallbacks": [
          "openrouter/meta-llama/llama-3.3-70b-instruct"
        ]
      },
      "models": {
        "openrouter/anthropic/claude-sonnet-4-5": {
          "alias": "claude-sonnet"
        },
        "openrouter/anthropic/claude-opus-4": {
          "alias": "claude-opus"
        },
        "openrouter/meta-llama/llama-3.3-70b-instruct": {
          "alias": "llama"
        },
        "openrouter/qwen/qwen2.5-coder-32b-instruct": {
          "alias": "qwen-coder"
        },
        "openrouter/qwen/qwen2.5-72b-instruct": {
          "alias": "qwen"
        },
        "openrouter/deepseek/deepseek-chat": {
          "alias": "deepseek"
        },
        "openrouter/deepseek/deepseek-reasoner": {
          "alias": "deepseek-r1"
        },
        "openrouter/google/gemini-2.0-flash-exp:free": {
          "alias": "gemini-free"
        },
        "openrouter/google/gemini-flash-1.5": {
          "alias": "gemini"
        },
        "openrouter/openai/gpt-4o": {
          "alias": "gpt4o"
        },
        "openrouter/openai/gpt-4o-mini": {
          "alias": "gpt4o-mini"
        }
      }
    }
  },
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "optimized_hal_9000_token_v2"
    },
    "port": 18790,
    "bind": "loopback",
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    }
  },
  "auth": {
    "profiles": {
      "openrouter:default": {
        "provider": "openrouter",
        "mode": "api_key"
      }
    }
  },
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": true
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "8443131696:AAENxabDJcx1Ryz-nxBJ1G2kKZ2R8N8i-9M"
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": {
          "enabled": true
        }
      }
    }
  },
  "wizard": {
    "lastRunAt": "2026-02-09T21:30:00.000Z",
    "lastRunVersion": "2026.1.30",
    "lastRunCommand": "onboard",
    "lastRunMode": "local"
  },
  "meta": {
    "lastTouchedVersion": "2026.1.30+optimized",
    "lastTouchedAt": "2026-02-09T21:30:00.000Z"
  }
}
EOF

echo "✅ Created optimized config at /home/oem/.openclaw/openclaw-optimized.json"
echo ""

# Add OpenRouter API key to credentials
echo "📝 Setting up OpenRouter credentials..."
mkdir -p /home/oem/.openclaw/credentials
cat > /home/oem/.openclaw/credentials/openrouter-default.json << 'CRED_EOF'
{
  "type": "api_key",
  "key": "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",
  "provider": "openrouter"
}
CRED_EOF
chmod 600 /home/oem/.openclaw/credentials/openrouter-default.json

echo "✅ OpenRouter credentials configured"
echo ""

# Build if not already built
if [ ! -d "dist" ]; then
  echo "🔨 Building OpenClaw..."
  npm run build
  echo "✅ Build complete"
  echo ""
fi

echo "🎉 Deployment Complete!"
echo ""
echo "To start the optimized bot:"
echo ""
echo "  cd /home/oem/.openclaw/workspace/openclaw-fork"
echo "  OPENCLAW_CONFIG=/home/oem/.openclaw/openclaw-optimized.json ./dist/cli.mjs gateway start"
echo ""
echo "Or with PM2:"
echo ""
echo "  pm2 start ./dist/cli.mjs --name openclaw-optimized -- gateway start"
echo "  pm2 save"
echo ""
echo "Bot will use existing Telegram connection (Jarvis bot)"
echo "Intelligent routing: ENABLED"
echo "Expected savings: 93% (£150/mo → £10.62/mo)"
echo ""
