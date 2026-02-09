/**
 * OpenRouter Provider
 * 
 * Access 100+ AI models at competitive prices through a unified API.
 * Uses OpenAI SDK since OpenRouter is OpenAI-compatible.
 */

import OpenAI from 'openai';

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  referer?: string;
  title?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number; // USD
  error?: string;
}

export class OpenRouterProvider {
  private client: OpenAI;
  private defaultModel: string;
  private maxTokens: number;
  private temperature: number;

  // Pricing per 1M tokens (input/output)
  private modelPricing: { [key: string]: { input: number; output: number } } = {
    'meta-llama/llama-3.3-70b-instruct': { input: 0.59, output: 0.59 },
    'meta-llama/llama-3.1-8b-instruct': { input: 0.06, output: 0.06 },
    'mistralai/mistral-large-2': { input: 3.00, output: 3.00 },
    'qwen/qwen-2.5-coder-32b-instruct': { input: 0.59, output: 0.59 },
    'anthropic/claude-sonnet-4': { input: 3.00, output: 15.00 },
  };

  constructor(config: OpenRouterConfig) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': config.referer || 'https://github.com/andysheldon-creator/openclaw',
        'X-Title': config.title || 'OptimiserClaw',
      },
    });

    this.defaultModel = config.defaultModel || 'meta-llama/llama-3.3-70b-instruct';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Send chat message and get response
   */
  async chat(messages: ChatMessage[], model?: string): Promise<ChatResponse> {
    try {
      const selectedModel = model || this.defaultModel;

      const response = await this.client.chat.completions.create({
        model: selectedModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response from model');
      }

      // Calculate cost
      const usage = response.usage;
      const cost = usage ? this.calculateCost(
        selectedModel,
        usage.prompt_tokens,
        usage.completion_tokens
      ) : undefined;

      return {
        content: choice.message.content,
        model: selectedModel,
        tokensUsed: usage ? {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens,
        } : undefined,
        cost,
      };

    } catch (error: any) {
      return {
        content: '',
        model: model || this.defaultModel,
        error: error.message,
      };
    }
  }

  /**
   * Calculate cost in USD based on usage
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      return 0; // Unknown model, can't calculate
    }

    const promptCost = (promptTokens / 1_000_000) * pricing.input;
    const completionCost = (completionTokens / 1_000_000) * pricing.output;
    
    return promptCost + completionCost;
  }

  /**
   * Get available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map(m => m.id);
    } catch (error) {
      console.error('Failed to list models:', error);
      return Object.keys(this.modelPricing);
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Hello' },
      ]);
      return !response.error;
    } catch {
      return false;
    }
  }

  /**
   * Get recommended model for task type
   */
  getRecommendedModel(taskType: 'general' | 'code' | 'fast' | 'reasoning'): string {
    const recommendations = {
      general: 'meta-llama/llama-3.3-70b-instruct',   // Best value
      code: 'qwen/qwen-2.5-coder-32b-instruct',       // Code specialist
      fast: 'meta-llama/llama-3.1-8b-instruct',       // Very cheap
      reasoning: 'mistralai/mistral-large-2',         // Complex tasks
    };

    return recommendations[taskType];
  }
}

// Example usage:
/*
const provider = new OpenRouterProvider({
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultModel: 'meta-llama/llama-3.3-70b-instruct',
});

const response = await provider.chat([
  { role: 'user', content: 'What is 2+2?' },
]);

console.log(response.content);
console.log('Cost:', response.cost, 'USD');
console.log('Tokens:', response.tokensUsed);
*/
