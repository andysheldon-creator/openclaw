/**
 * Test Claude Browser Provider
 * 
 * Usage:
 *   CLAUDE_SESSION_TOKEN="your-token" npx tsx test-claude-browser.ts
 */

import { ClaudeBrowserProvider } from './claude-browser-provider';

async function main() {
  const sessionToken = process.env.CLAUDE_SESSION_TOKEN;

  if (!sessionToken) {
    console.error('❌ Error: CLAUDE_SESSION_TOKEN environment variable not set');
    console.error('');
    console.error('Usage:');
    console.error('  export CLAUDE_SESSION_TOKEN="sk-ant-sid02-YOUR-TOKEN-HERE"');
    console.error('  npx tsx test-claude-browser.ts');
    process.exit(1);
  }

  console.log('🧪 Testing Claude Browser Provider...');
  console.log('================================');
  console.log('');

  const provider = new ClaudeBrowserProvider({
    sessionToken,
    headless: true, // Set to false to see the browser window
  });

  try {
    // Test 1: Connection
    console.log('1️⃣ Testing session token authentication...');
    const isValid = await provider.testConnection();
    
    if (!isValid) {
      console.error('❌ Session token invalid or expired');
      console.error('');
      console.error('Please:');
      console.error('  1. Login to https://claude.ai');
      console.error('  2. Open DevTools (F12) → Application → Cookies');
      console.error('  3. Copy sessionKey value');
      console.error('  4. Update CLAUDE_SESSION_TOKEN');
      await provider.close();
      process.exit(1);
    }

    console.log('✅ Session token is valid!');
    console.log('---');
    console.log('');

    // Test 2: Send a message
    console.log('2️⃣ Sending test message to Claude...');
    console.log('Question: What is 2+2? Answer in one sentence.');
    console.log('');

    const response = await provider.chat([
      { role: 'user', content: 'What is 2+2? Answer in one sentence.' },
    ]);

    if (response.error) {
      console.error('❌ Error:', response.error);
      await provider.close();
      process.exit(1);
    }

    console.log('✅ Claude responded:');
    console.log('   ' + response.content);
    console.log('');
    console.log('---');
    console.log('');

    // Success!
    console.log('✅ All tests passed!');
    console.log('');
    console.log('💰 Cost for this test: £0.00 (using Pro subscription)');
    console.log('📊 If using Claude API: ~£0.01');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Add to OpenClaw provider system');
    console.log('  2. Build intelligent router');
    console.log('  3. Test with real workload');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await provider.close();
  }
}

main().catch(console.error);
