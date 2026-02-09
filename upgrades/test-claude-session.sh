#!/bin/bash
# Test Claude.ai session token
# Usage: bash upgrades/test-claude-session.sh

set -e

echo "🧪 Testing Claude Session Token..."
echo "================================"
echo ""

# Check for required env vars
if [ -z "$CLAUDE_SESSION_TOKEN" ]; then
    echo "❌ Error: CLAUDE_SESSION_TOKEN not set"
    echo ""
    echo "To set it:"
    echo "  export CLAUDE_SESSION_TOKEN='sk-ant-sid01-YOUR-TOKEN-HERE'"
    echo ""
    echo "See CLAUDE_SESSION_TOKEN_SETUP.md for extraction guide"
    exit 1
fi

if [ -z "$CLAUDE_ORG_ID" ]; then
    echo "⚠️  Warning: CLAUDE_ORG_ID not set"
    echo "Attempting to fetch from API..."
    echo ""
fi

# Test 1: Verify token works
echo "1️⃣ Testing session token authentication..."
ORG_RESPONSE=$(curl -s -X GET "https://claude.ai/api/organizations" \
  -H "Cookie: sessionKey=${CLAUDE_SESSION_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$ORG_RESPONSE" | grep -q "uuid"; then
    echo "✅ Session token is valid!"
    
    # Extract org ID if not set
    if [ -z "$CLAUDE_ORG_ID" ]; then
        CLAUDE_ORG_ID=$(echo "$ORG_RESPONSE" | grep -oP '"uuid"\s*:\s*"\K[^"]+' | head -1)
        echo "📝 Found Organization ID: $CLAUDE_ORG_ID"
        echo ""
        echo "Add to your environment:"
        echo "  export CLAUDE_ORG_ID='$CLAUDE_ORG_ID'"
        echo ""
    fi
else
    echo "❌ Session token invalid or expired"
    echo "Response: $ORG_RESPONSE"
    echo ""
    echo "Please:"
    echo "  1. Login to https://claude.ai"
    echo "  2. Extract new sessionKey cookie"
    echo "  3. Update CLAUDE_SESSION_TOKEN"
    exit 1
fi

echo "---"
echo ""

# Test 2: Create conversation
if [ -n "$CLAUDE_ORG_ID" ]; then
    echo "2️⃣ Creating test conversation..."
    
    CONV_UUID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)
    
    CONV_RESPONSE=$(curl -s -X POST \
      "https://claude.ai/api/organizations/${CLAUDE_ORG_ID}/chat_conversations" \
      -H "Cookie: sessionKey=${CLAUDE_SESSION_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "anthropic-client-sha: unknown" \
      -d "{
        \"uuid\": \"${CONV_UUID}\",
        \"name\": \"OpenClaw Test\"
      }")
    
    if echo "$CONV_RESPONSE" | grep -q "uuid"; then
        CONVERSATION_ID=$(echo "$CONV_RESPONSE" | grep -oP '"uuid"\s*:\s*"\K[^"]+' | head -1)
        echo "✅ Conversation created: $CONVERSATION_ID"
    else
        echo "❌ Failed to create conversation"
        echo "Response: $CONV_RESPONSE"
        exit 1
    fi
    
    echo "---"
    echo ""
    
    # Test 3: Send message
    echo "3️⃣ Sending test message to Claude..."
    echo "Question: What is 2+2? Answer in one sentence."
    echo ""
    
    COMPLETION_RESPONSE=$(curl -s -X POST \
      "https://claude.ai/api/organizations/${CLAUDE_ORG_ID}/chat_conversations/${CONVERSATION_ID}/completion" \
      -H "Cookie: sessionKey=${CLAUDE_SESSION_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "anthropic-client-sha: unknown" \
      -d '{
        "prompt": "Human: What is 2+2? Answer in one sentence.\n\nAssistant:",
        "timezone": "Europe/London",
        "attachments": [],
        "files": []
      }')
    
    # Extract completion from streaming response
    ANSWER=$(echo "$COMPLETION_RESPONSE" | grep -oP '"completion"\s*:\s*"\K[^"]+' | tail -1)
    
    if [ -n "$ANSWER" ]; then
        echo "✅ Claude responded:"
        echo "   $ANSWER"
    else
        echo "❌ No response from Claude"
        echo "Raw response:"
        echo "$COMPLETION_RESPONSE"
        exit 1
    fi
else
    echo "⏭️  Skipping conversation tests (no CLAUDE_ORG_ID)"
fi

echo ""
echo "---"
echo ""
echo "✅ All tests passed!"
echo ""
echo "💰 Cost for this test: £0.00 (using Pro subscription)"
echo "📊 If using Claude API: ~£0.01"
echo ""
echo "Next steps:"
echo "  1. Add tokens to OpenClaw config"
echo "  2. Build provider integration"
echo "  3. Test with real workload"
echo ""
echo "Save your tokens:"
echo "  export CLAUDE_SESSION_TOKEN='$CLAUDE_SESSION_TOKEN'"
if [ -n "$CLAUDE_ORG_ID" ]; then
    echo "  export CLAUDE_ORG_ID='$CLAUDE_ORG_ID'"
fi
