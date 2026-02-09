#!/bin/bash
# Test script for local Ollama models
# Run: bash upgrades/test-local-models.sh

echo "🧪 Testing Local Models..."
echo "================================"
echo ""

# Test phi4-mini-reasoning
echo "1️⃣ Testing phi4-mini-reasoning (fast, small)..."
echo "Question: What is 2+2?"
ollama run phi4-mini-reasoning "What is 2+2? Answer in one sentence." 2>/dev/null
echo ""
echo "---"
echo ""

# Test phi4-reasoning  
echo "2️⃣ Testing phi4-reasoning (complex reasoning)..."
echo "Question: Design a simple TODO API"
ollama run phi4-reasoning "Design a REST API for a todo app. List 3-5 endpoints only." 2>/dev/null
echo ""
echo "---"
echo ""

# Test qwen2.5-coder (if available)
echo "3️⃣ Testing qwen2.5-coder:7b (code specialist)..."
if ollama list | grep -q "qwen2.5-coder"; then
    echo "Question: Write a Python function to reverse a string"
    ollama run qwen2.5-coder:7b "Write a Python function to reverse a string. Just the code, no explanation." 2>/dev/null
else
    echo "⏳ qwen2.5-coder:7b still downloading... check 'ollama list'"
fi
echo ""
echo "---"
echo ""

echo "✅ Testing complete!"
echo ""
echo "💰 Cost for these 3 tests: £0.00 (local models)"
echo "📊 If using Claude API: ~£0.02"
echo ""
echo "Next: Integrate with OpenClaw providers"
