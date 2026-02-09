/**
 * Claude Browser Provider (with better extraction)
 * Uses Puppeteer to control claude.ai with session token
 */

import puppeteer, { Browser, Page } from 'puppeteer';

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
    this.timeout = config.timeout || 60000; // Increased to 60s
  }

  /**
   * Initialize browser and set session
   */
  async initialize(): Promise<void> {
    console.log('🌐 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
    });

    // Navigate to Claude
    console.log('📡 Connecting to claude.ai...');
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

      // Find the input field and type the message
      console.log('⌨️  Typing message...');
      
      // Wait for the input to be available
      await this.page.waitForSelector('[contenteditable="true"]', {
        timeout: this.timeout,
      });

      // Click and type
      await this.page.click('[contenteditable="true"]');
      await this.page.keyboard.type(prompt, { delay: 30 });

      // Send the message
      console.log('📤 Sending message...');
      await this.page.keyboard.press('Enter', { delay: 100 });

      // Wait for response (simple approach: wait for typing indicator to disappear)
      console.log('⏳ Waiting for Claude response...');
      
      // Wait a bit for response to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Wait for response to finish (look for completed response)
      await this.page.waitForFunction(
        () => {
          // Look for any text in assistant response area
          const content = document.body.innerText;
          return content.length > 100; // Wait until there's substantial content
        },
        { timeout: this.timeout, polling: 1000 }
      );

      // Extra wait to ensure response is complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract the response - try multiple selectors
      const responseText = await this.page.evaluate(() => {
        // Try to find Claude's response
        // Method 1: Look for the last assistant message
        const messages = Array.from(document.querySelectorAll('[data-testid="message"]'));
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          return lastMsg.textContent || '';
        }

        // Method 2: Look for any div with claude's response
        const assistant = document.querySelector('[data-role="assistant"]');
        if (assistant) {
          return assistant.textContent || '';
        }

        // Method 3: Just get all visible text and return the last substantial block
        const allText = document.body.innerText;
        const lines = allText.split('\n').filter(l => l.trim().length > 20);
        return lines.slice(-5).join('\n');
      });

      console.log(`✅ Got response! Length: ${responseText.length} chars`);

      if (!responseText || responseText.length < 10) {
        console.warn('⚠️  Response too short, might be extraction error');
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
