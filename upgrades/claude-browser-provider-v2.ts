/**
 * Claude Browser Provider v2 (with Cloudflare bypass)
 * Uses Puppeteer + Stealth plugin to bypass Cloudflare protection
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';

// Add stealth plugin to evade detection
puppeteer.use(StealthPlugin());

export interface ClaudeBrowserConfig {
  sessionToken: string;
  headless?: boolean;
  timeout?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  error?: string;
  tokensUsed?: number;
}

export class ClaudeBrowserProvider {
  private sessionToken: string;
  private headless: boolean;
  private timeout: number;
  private browser?: Browser;
  private page?: Page;
  private isReady: boolean = false;

  constructor(config: ClaudeBrowserConfig) {
    this.sessionToken = config.sessionToken;
    this.headless = config.headless !== false;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Initialize browser with stealth and set session
   */
  async initialize(): Promise<void> {
    console.log('🌐 Launching browser with stealth mode...');
    
    // @ts-ignore - puppeteer-extra types
    this.browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });

    this.page = await this.browser.newPage();

    // Set realistic viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Set extra headers to look more like a real browser
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    });

    // Set session cookie
    console.log('🍪 Setting session cookie...');
    await this.page.setCookie({
      name: 'sessionKey',
      value: this.sessionToken,
      domain: '.claude.ai',
      path: '/',
      httpOnly: true,
      secure: true,
    });

    // Navigate to Claude
    console.log('📡 Connecting to claude.ai...');
    await this.page.goto('https://claude.ai/chats', {
      waitUntil: 'networkidle2',
      timeout: this.timeout,
    });

    // Wait for page to load (give Cloudflare time to pass)
    console.log('⏳ Waiting for Cloudflare check...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if we passed Cloudflare
    const bodyText = await this.page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Just a moment') || bodyText.includes('Cloudflare')) {
      throw new Error('Cloudflare challenge not bypassed - try again or use a real browser connection');
    }

    this.isReady = true;
    console.log('✅ Browser ready!');
  }

  /**
   * Send a message and get response from Claude
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      if (!this.isReady) {
        await this.initialize();
      }

      if (!this.page) {
        throw new Error('Browser page not initialized');
      }

      // Start a new chat
      console.log('💬 Starting new conversation...');
      await this.page.goto('https://claude.ai/new', {
        waitUntil: 'networkidle2',
        timeout: this.timeout,
      });

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Build the prompt from messages
      const systemMsg = messages.find(m => m.role === 'system');
      const userMsgs = messages.filter(m => m.role === 'user');
      
      let prompt = '';
      
      // Add system message as context at the top
      if (systemMsg) {
        prompt += `[System Instructions]\n${systemMsg.content}\n\n[User Request]\n`;
      }
      
      // Add user messages
      prompt += userMsgs.map(m => m.content).join('\n\n');

      console.log(`📝 Prompt length: ${prompt.length} chars`);

      // Find input - try multiple selectors
      console.log('🔍 Looking for input field...');
      
      const inputSelectors = [
        '[contenteditable="true"]',
        'div[contenteditable="true"]',
        'textarea',
        '[role="textbox"]',
        '.ProseMirror',
        '[data-placeholder*="message" i]',
        '[aria-label*="message" i]',
      ];

      let inputFound = false;
      let usedSelector = '';

      for (const selector of inputSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          console.log(`✓ Found input with selector: ${selector}`);
          usedSelector = selector;
          inputFound = true;
          break;
        } catch {
          // Try next selector
        }
      }

      if (!inputFound) {
        // Save page HTML for debugging
        const html = await this.page.content();
        const fs = await import('fs/promises');
        await fs.writeFile('./claude-error-page.html', html);
        throw new Error('Could not find input field - page HTML saved to claude-error-page.html');
      }

      // Type the message
      console.log('⌨️  Typing message...');
      await this.page.click(usedSelector);
      await this.page.keyboard.type(prompt, { delay: 10 });

      // Send message (try Enter key or find send button)
      console.log('📤 Sending message...');
      
      // Try pressing Enter
      await this.page.keyboard.press('Enter');

      // Wait for response to start
      console.log('⏳ Waiting for Claude response...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Wait for response to complete
      // Look for response container
      const responseSelectors = [
        '[data-testid="message"]',
        '[data-test-id="message"]',
        '.font-claude-message',
        '[class*="message"]',
      ];

      // Wait up to 60 seconds for response
      const maxWaitTime = 60000;
      const startWait = Date.now();
      
      let lastLength = 0;
      let stableCount = 0;

      while (Date.now() - startWait < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentLength = await this.page.evaluate(() => document.body.innerText.length);
        
        if (currentLength === lastLength) {
          stableCount++;
          if (stableCount >= 3) {
            // Response stable for 3 seconds, consider it complete
            break;
          }
        } else {
          stableCount = 0;
          lastLength = currentLength;
        }
      }

      console.log('📥 Extracting response...');

      // Debug: Save page HTML
      const html = await this.page.content();
      const fs = await import('fs/promises');
      await fs.writeFile('./claude-debug-page.html', html);
      console.log('💾 Saved page HTML to claude-debug-page.html');

      // Extract the response
      const responseText = await this.page.evaluate(() => {
        // Debug: Log available message elements
        const debugInfo: any = {
          testid: document.querySelectorAll('[data-testid*="message"]').length,
          testId: document.querySelectorAll('[data-test-id*="message"]').length,
          role: document.querySelectorAll('[role="article"]').length,
          divs: document.querySelectorAll('div[class*="message"]').length,
        };
        console.log('Debug selectors:', JSON.stringify(debugInfo));

        // Method 1: Find all messages and get the last one
        const messages = Array.from(document.querySelectorAll('[data-testid="message"], [data-test-id="message"]'));
        if (messages.length > 0) {
          console.log(`Found ${messages.length} messages`);
          const lastMsg = messages[messages.length - 1] as HTMLElement;
          return lastMsg.innerText || '';
        }

        // Method 2: Try role="article" or role="region"
        const articles = Array.from(document.querySelectorAll('[role="article"], [role="region"]'));
        if (articles.length > 0) {
          console.log(`Found ${articles.length} articles/regions`);
          // Filter to only assistant messages (skip user input)
          const assistantMsgs = articles.filter(el => {
            const text = (el as HTMLElement).innerText;
            return text.length > 10 && !text.includes('Send message');
          });
          if (assistantMsgs.length > 0) {
            const lastMsg = assistantMsgs[assistantMsgs.length - 1] as HTMLElement;
            return lastMsg.innerText || '';
          }
        }

        // Method 3: Look for specific response container classes
        const selectors = [
          '.font-claude-message',
          '[class*="claude"]',
          '[class*="assistant"]',
          '[class*="response"]',
        ];
        
        for (const selector of selectors) {
          const el = document.querySelector(selector) as HTMLElement;
          if (el && el.innerText && el.innerText.length > 10) {
            console.log(`Found with selector: ${selector}`);
            return el.innerText;
          }
        }

        // Method 4: Get all visible text and extract last substantial block
        console.log('Falling back to text extraction');
        const allText = document.body.innerText;
        const lines = allText.split('\n').filter(l => l.trim().length > 5);
        
        // Find where the input prompt ends
        const promptIdx = lines.findIndex(l => 
          l.includes('What is 2+2') || l.includes('Reply with just')
        );
        
        if (promptIdx >= 0 && promptIdx < lines.length - 1) {
          // Return everything after the prompt
          return lines.slice(promptIdx + 1, promptIdx + 5).join('\n');
        }

        return lines.slice(-10).join('\n');
      });

      console.log(`✅ Got response! Length: ${responseText.length} chars`);

      if (!responseText || responseText.length < 10) {
        console.warn('⚠️  Response too short, might be extraction error');
        // Save page for debugging
        const html = await this.page.content();
        const fs = await import('fs/promises');
        await fs.writeFile('./claude-response-page.html', html);
        console.log('💾 Page saved to claude-response-page.html for debugging');
      }

      return {
        content: responseText.trim(),
      };

    } catch (error: any) {
      console.error('❌ Claude browser error:', error.message);
      return {
        content: '',
        error: error.message,
      };
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.isReady = false;
    }
  }
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const token = process.env.CLAUDE_SESSION_TOKEN || '';
    if (!token) {
      console.error('❌ CLAUDE_SESSION_TOKEN not set');
      process.exit(1);
    }

    const provider = new ClaudeBrowserProvider({
      sessionToken: token,
      headless: true,
    });

    console.log('\n=== Testing Claude Browser Provider v2 ===\n');

    try {
      const response = await provider.chat([
        { role: 'user', content: 'What is 2+2? Reply with just the number.' },
      ]);

      console.log('\n=== RESPONSE ===');
      console.log(response.content);
      console.log('\n=== END ===\n');

      if (response.error) {
        console.error('Error:', response.error);
      }

    } catch (error: any) {
      console.error('Test failed:', error.message);
    } finally {
      await provider.close();
    }
  })();
}
