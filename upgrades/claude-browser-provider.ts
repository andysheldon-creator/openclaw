/**
 * Claude Browser Provider
 * 
 * Uses Puppeteer to control a real browser and bypass Cloudflare protection.
 * Allows using Claude.ai session tokens to leverage existing Claude Pro subscription.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface ClaudeBrowserConfig {
  sessionToken: string;
  headless?: boolean; // false for debugging
  timeout?: number; // milliseconds
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  error?: string;
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
    this.headless = config.headless !== false; // default true
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  /**
   * Initialize browser and set session cookie
   */
  async initialize(): Promise<void> {
    if (this.isReady) return;

    console.log('🌐 Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.page = await this.browser.newPage();

    // Set session cookie
    await this.page.setCookie({
      name: 'sessionKey',
      value: this.sessionToken,
      domain: '.claude.ai',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    });

    // Set realistic viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to Claude.ai to trigger session
    console.log('🔑 Loading Claude.ai with session token...');
    await this.page.goto('https://claude.ai/chats', {
      waitUntil: 'networkidle2',
      timeout: this.timeout,
    });

    // Wait for page to load
    await this.page.waitForSelector('body', { timeout: this.timeout });

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

      // Build the prompt from messages
      const prompt = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n');

      // Find the input field and type the message
      console.log('⌨️  Typing message...');
      
      // Wait for the input to be available
      await this.page.waitForSelector('[contenteditable="true"]', {
        timeout: this.timeout,
      });

      // Click and type
      await this.page.click('[contenteditable="true"]');
      await this.page.keyboard.type(prompt, { delay: 50 });

      // Send the message (look for send button or press Enter)
      await this.page.keyboard.press('Enter', { delay: 100 });

      // Wait for response to appear
      console.log('⏳ Waiting for Claude response...');
      await this.page.waitForFunction(
        () => {
          // Look for response text in the page
          const messages = document.querySelectorAll('[data-test-render-count]');
          return messages.length >= 2; // User message + Claude response
        },
        { timeout: this.timeout }
      );

      // Give it a moment to finish streaming
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract Claude's response
      const response = await this.page.evaluate(() => {
        const messages = Array.from(document.querySelectorAll('[data-test-render-count]'));
        // Last message should be Claude's response
        const lastMessage = messages[messages.length - 1];
        return lastMessage?.textContent || '';
      });

      console.log('✅ Got response from Claude!');

      return {
        content: response.trim(),
      };

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      return {
        content: '',
        error: error.message,
      };
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.isReady = false;
      console.log('🔒 Browser closed');
    }
  }

  /**
   * Test if session token is valid
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!this.page) return false;

      // Check if we're logged in by looking for user-specific elements
      const isLoggedIn = await this.page.evaluate(() => {
        // Look for elements that only appear when logged in
        return document.body.innerHTML.includes('New chat') || 
               document.body.innerHTML.includes('Recent conversations');
      });

      return isLoggedIn;
    } catch {
      return false;
    }
  }
}

// Example usage:
/*
const provider = new ClaudeBrowserProvider({
  sessionToken: process.env.CLAUDE_SESSION_TOKEN!,
  headless: true, // false to see browser window
});

const response = await provider.chat([
  { role: 'user', content: 'What is 2+2?' },
]);

console.log(response.content);

await provider.close();
*/
