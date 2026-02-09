/**
 * Claude Session Provider
 * 
 * Uses Claude.ai session tokens instead of API to leverage existing Claude Pro subscription.
 * Cost: £0 additional (uses existing £20/month Pro subscription)
 */

import { v4 as uuidv4 } from 'uuid';

export interface ClaudeSessionConfig {
  sessionToken: string;
  organizationId: string;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  retryAfter?: number; // seconds to wait on rate limit
  model?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  conversationId?: string;
  error?: string;
}

export class ClaudeSessionProvider {
  private sessionToken: string;
  private organizationId: string;
  private rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  private retryAfter: number;
  private model: string;

  // Rate limiting tracking
  private requestTimestamps: number[] = [];
  
  constructor(config: ClaudeSessionConfig) {
    this.sessionToken = config.sessionToken;
    this.organizationId = config.organizationId;
    this.rateLimit = {
      requestsPerMinute: config.rateLimit?.requestsPerMinute || 10,
      requestsPerHour: config.rateLimit?.requestsPerHour || 200,
    };
    this.retryAfter = config.retryAfter || 60;
    this.model = config.model || 'claude-sonnet-4';
  }

  /**
   * Check if we're within rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean up old timestamps
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;
    
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneHourAgo);
    
    // Check hourly limit
    if (this.requestTimestamps.length >= this.rateLimit.requestsPerHour) {
      const waitMs = this.requestTimestamps[0] + (60 * 60 * 1000) - now;
      throw new Error(`Rate limit (hourly): ${this.rateLimit.requestsPerHour} requests/hour. Retry in ${Math.ceil(waitMs / 1000)}s`);
    }
    
    // Check per-minute limit
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    if (recentRequests.length >= this.rateLimit.requestsPerMinute) {
      const waitMs = recentRequests[0] + 60 * 1000 - now;
      throw new Error(`Rate limit (minute): ${this.rateLimit.requestsPerMinute} requests/min. Retry in ${Math.ceil(waitMs / 1000)}s`);
    }
  }

  /**
   * Record a request for rate limiting
   */
  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Create a new conversation
   */
  private async createConversation(name?: string): Promise<string> {
    const conversationUuid = uuidv4();
    
    const response = await fetch(
      `https://claude.ai/api/organizations/${this.organizationId}/chat_conversations`,
      {
        method: 'POST',
        headers: {
          'Cookie': `sessionKey=${this.sessionToken}`,
          'Content-Type': 'application/json',
          'anthropic-client-sha': 'unknown',
        },
        body: JSON.stringify({
          uuid: conversationUuid,
          name: name || 'OpenClaw Session',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create conversation: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.uuid || conversationUuid;
  }

  /**
   * Send a message and get response
   */
  async chat(messages: ChatMessage[], conversationId?: string): Promise<ChatResponse> {
    try {
      // Check rate limits
      await this.checkRateLimit();

      // Create conversation if needed
      const convId = conversationId || await this.createConversation();

      // Build prompt from messages
      const prompt = this.buildPrompt(messages);

      // Send completion request
      const response = await fetch(
        `https://claude.ai/api/organizations/${this.organizationId}/chat_conversations/${convId}/completion`,
        {
          method: 'POST',
          headers: {
            'Cookie': `sessionKey=${this.sessionToken}`,
            'Content-Type': 'application/json',
            'anthropic-client-sha': 'unknown',
          },
          body: JSON.stringify({
            prompt,
            timezone: 'Europe/London',
            attachments: [],
            files: [],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        
        // Handle specific errors
        if (response.status === 401 || response.status === 403) {
          throw new Error('Session token expired. Please re-login to Claude.ai and update token.');
        }
        if (response.status === 429) {
          throw new Error(`Rate limited. Wait ${this.retryAfter}s and retry.`);
        }
        
        throw new Error(`Claude API error: ${response.status} ${error}`);
      }

      // Record successful request
      this.recordRequest();

      // Parse streaming response
      const content = await this.parseStreamingResponse(response);

      return {
        content,
        conversationId: convId,
      };

    } catch (error: any) {
      return {
        content: '',
        error: error.message,
      };
    }
  }

  /**
   * Build prompt from messages array
   */
  private buildPrompt(messages: ChatMessage[]): string {
    // Claude.ai expects a single prompt string
    // We'll format it with role labels
    return messages
      .map(msg => {
        if (msg.role === 'system') {
          return `System: ${msg.content}`;
        }
        if (msg.role === 'user') {
          return `Human: ${msg.content}`;
        }
        return `Assistant: ${msg.content}`;
      })
      .join('\n\n') + '\n\nAssistant:';
  }

  /**
   * Parse streaming response from Claude.ai
   */
  private async parseStreamingResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Claude.ai sends SSE format: data: {...}\n\n
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.completion) {
                content = json.completion;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return content.trim();
  }

  /**
   * Test if session token is valid
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `https://claude.ai/api/organizations`,
        {
          method: 'GET',
          headers: {
            'Cookie': `sessionKey=${this.sessionToken}`,
          },
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Example usage:
/*
const provider = new ClaudeSessionProvider({
  sessionToken: process.env.CLAUDE_SESSION_TOKEN!,
  organizationId: process.env.CLAUDE_ORG_ID!,
  rateLimit: {
    requestsPerMinute: 10,
    requestsPerHour: 200,
  },
});

const response = await provider.chat([
  { role: 'user', content: 'What is 2+2?' },
]);

console.log(response.content);
*/
