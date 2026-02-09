/**
 * Unified Provider System
 * 
 * Connects all providers (local, OpenRouter, Claude) with intelligent routing.
 * Single interface to send messages and automatically route to best provider.
 */

import { IntelligentRouter, RoutingDecision } from './intelligent-router';
import { OpenRouterProvider } from './openrouter-provider';
import { ClaudeBrowserProvider } from './claude-browser-provider';
import { CostTracker } from './cost-tracker';

export interface UnifiedConfig {
  // API keys
  openrouterApiKey?: string;
  claudeSessionToken?: string;
  claudeApiKey?: string;

  // Routing strategy
  strategy?: 'cost-optimized' | 'quality-first' | 'balanced';

  // Provider toggles
  enableLocal?: boolean;
  enableOpenRouter?: boolean;
  enableClaudeBrowser?: boolean;
  enableClaudeAPI?: boolean;

  // Local model paths (for Ollama)
  ollamaBaseUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  cost: number; // GBP
  tokensUsed?: number;
  responseTime: number; // seconds
  routingReason: string;
  error?: string;
}

export class UnifiedProvider {
  private router: IntelligentRouter;
  private openrouter?: OpenRouterProvider;
  private claudeBrowser?: ClaudeBrowserProvider;
  private ollamaBaseUrl: string;
  private costTracker: CostTracker;

  constructor(config: UnifiedConfig) {
    // Initialize cost tracker
    this.costTracker = new CostTracker('./cost-tracking.json');
    // Initialize router
    this.router = new IntelligentRouter({
      strategy: config.strategy || 'cost-optimized',
      allowLocal: config.enableLocal !== false,
      allowOpenRouter: config.enableOpenRouter !== false && !!config.openrouterApiKey,
      allowClaudeBrowser: config.enableClaudeBrowser !== false && !!config.claudeSessionToken,
      allowClaudeAPI: config.enableClaudeAPI !== false && !!config.claudeApiKey,
    });

    // Initialize OpenRouter if key provided
    if (config.openrouterApiKey) {
      this.openrouter = new OpenRouterProvider({
        apiKey: config.openrouterApiKey,
      });
    }

    // Initialize Claude Browser if token provided
    if (config.claudeSessionToken) {
      this.claudeBrowser = new ClaudeBrowserProvider({
        sessionToken: config.claudeSessionToken,
        headless: true,
      });
    }

    // Ollama configuration
    this.ollamaBaseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
  }

  /**
   * Send a chat message with automatic routing
   */
  async chat(messages: ChatMessage[], context?: string[]): Promise<ChatResponse> {
    const startTime = Date.now();

    // Get last user message for routing
    const userMessage = messages.filter(m => m.role === 'user').pop();
    if (!userMessage) {
      throw new Error('No user message provided');
    }

    // For routing, use ONLY the context array (which should be original message)
    // This prevents memory/enrichment from affecting routing decisions
    const routingPrompt = context && context.length > 0 ? context[0] : userMessage.content;
    
    // Route to best provider based on ORIGINAL message
    const decision = this.router.route(routingPrompt, []);

    console.log(`🎯 Routing to: ${decision.provider} (${decision.model})`);
    console.log(`📝 Reason: ${decision.reason}`);

    try {
      let response: ChatResponse;

      // Execute based on routing decision
      switch (decision.provider) {
        case 'local':
          response = await this.executeLocal(messages, decision);
          break;

        case 'openrouter':
          response = await this.executeOpenRouter(messages, decision);
          break;

        case 'claude-browser':
          response = await this.executeClaudeBrowser(messages, decision);
          break;

        case 'claude-api':
          response = await this.executeClaudeAPI(messages, decision);
          break;

        default:
          throw new Error(`Unknown provider: ${decision.provider}`);
      }

      // Add response time
      response.responseTime = (Date.now() - startTime) / 1000;

      // Log request for cost tracking
      this.costTracker.logRequest({
        timestamp: startTime,
        provider: response.provider as any,
        model: response.model,
        prompt: userMessage.content,
        response: response.content,
        cost: response.cost,
        tokensUsed: response.tokensUsed,
        responseTime: response.responseTime,
        routingReason: response.routingReason,
      });

      return response;

    } catch (error: any) {
      return {
        content: '',
        provider: decision.provider,
        model: decision.model,
        cost: 0,
        responseTime: (Date.now() - startTime) / 1000,
        routingReason: decision.reason,
        error: error.message,
      };
    }
  }

  /**
   * Execute on local Ollama model
   */
  private async executeLocal(messages: ChatMessage[], decision: RoutingDecision): Promise<ChatResponse> {
    const prompt = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');

    const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: decision.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.response || '',
      provider: 'local',
      model: decision.model,
      cost: 0, // Local is free
      tokensUsed: data.eval_count,
      responseTime: 0, // Set by caller
      routingReason: decision.reason,
    };
  }

  /**
   * Execute on OpenRouter
   */
  private async executeOpenRouter(messages: ChatMessage[], decision: RoutingDecision): Promise<ChatResponse> {
    if (!this.openrouter) {
      throw new Error('OpenRouter not configured');
    }

    const response = await this.openrouter.chat(messages, decision.model);

    if (response.error) {
      console.error(`❌ OpenRouter returned error for model ${decision.model}:`, response.error);
      throw new Error(response.error);
    }

    if (!response.content || response.content.length === 0) {
      console.error(`❌ OpenRouter returned empty content for model ${decision.model}`);
      console.error('   Full response:', JSON.stringify(response));
    }

    return {
      content: response.content,
      provider: 'openrouter',
      model: response.model,
      cost: (response.cost || 0) * 0.8, // Convert USD to GBP (~0.8)
      tokensUsed: response.tokensUsed?.total,
      responseTime: 0, // Set by caller
      routingReason: decision.reason,
    };
  }

  /**
   * Execute on Claude browser
   */
  private async executeClaudeBrowser(messages: ChatMessage[], decision: RoutingDecision): Promise<ChatResponse> {
    if (!this.claudeBrowser) {
      throw new Error('Claude browser not configured');
    }

    const response = await this.claudeBrowser.chat(messages);

    if (response.error) {
      throw new Error(response.error);
    }

    return {
      content: response.content,
      provider: 'claude-browser',
      model: 'claude-sonnet-4',
      cost: 0, // Using Pro subscription
      responseTime: 0, // Set by caller
      routingReason: decision.reason,
    };
  }

  /**
   * Execute on Claude API
   */
  private async executeClaudeAPI(messages: ChatMessage[], decision: RoutingDecision): Promise<ChatResponse> {
    throw new Error('Claude API not yet implemented - use browser provider or OpenRouter instead');
    // TODO: Implement when needed
  }

  /**
   * Close all providers
   */
  async close(): Promise<void> {
    if (this.claudeBrowser) {
      await this.claudeBrowser.close();
    }
  }

  /**
   * Get statistics for all providers
   */
  async getStats(): Promise<any> {
    return this.costTracker.exportDashboardData();
  }

  /**
   * Get cost tracker instance
   */
  getCostTracker(): CostTracker {
    return this.costTracker;
  }

  /**
   * Generate HTML dashboard
   */
  generateDashboard(outputPath: string = './dashboard.html'): void {
    const { generateDashboard } = require('./generate-dashboard');
    generateDashboard(this.costTracker, outputPath);
  }
}

// Example usage:
/*
const provider = new UnifiedProvider({
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  claudeSessionToken: process.env.CLAUDE_SESSION_TOKEN,
  strategy: 'cost-optimized',
});

const response = await provider.chat([
  { role: 'user', content: 'What is 2+2?' },
]);

console.log(response.content);
console.log('Provider:', response.provider);
console.log('Cost:', response.cost, 'GBP');
console.log('Time:', response.responseTime, 's');

await provider.close();
*/
