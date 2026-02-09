import type { ModelDefinitionConfig } from "../config/types.js";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4-5";
export const OPENROUTER_DEFAULT_MODEL_REF = `openrouter/${OPENROUTER_DEFAULT_MODEL_ID}`;

/**
 * OpenRouter model catalog with pricing.
 * Pricing is per 1M tokens in USD, converted to per-token GBP cost.
 */
export const OPENROUTER_MODEL_CATALOG = [
  // Claude models
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    reasoning: true,
    input: ["text", "image"] as const,
    contextWindow: 200000,
    maxTokens: 8192,
    cost: {
      input: 2.4,  // $3/1M tokens * 0.8 GBP/USD
      output: 12.0, // $15/1M tokens * 0.8 GBP/USD
      cacheRead: 0.24,
      cacheWrite: 3.0,
    },
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    reasoning: true,
    input: ["text", "image"] as const,
    contextWindow: 200000,
    maxTokens: 16384,
    cost: {
      input: 12.0,  // $15/1M tokens * 0.8 GBP/USD
      output: 60.0, // $75/1M tokens * 0.8 GBP/USD
      cacheRead: 1.2,
      cacheWrite: 15.0,
    },
  },

  // Meta Llama models
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    reasoning: false,
    input: ["text"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 0.24,  // $0.3/1M tokens * 0.8 GBP/USD
      output: 0.24,
      cacheRead: 0,
      cacheWrite: 0,
    },
  },
  {
    id: "meta-llama/llama-3.2-90b-vision-instruct",
    name: "Llama 3.2 90B Vision",
    reasoning: false,
    input: ["text", "image"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 0.4,
      output: 0.4,
      cacheRead: 0,
      cacheWrite: 0,
    },
  },

  // Qwen models
  {
    id: "qwen/qwen2.5-coder-32b-instruct",
    name: "Qwen 2.5 Coder 32B",
    reasoning: false,
    input: ["text"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 0.24,
      output: 0.24,
      cacheRead: 0,
      cacheWrite: 0,
    },
  },
  {
    id: "qwen/qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    reasoning: false,
    input: ["text"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 0.32,
      output: 0.32,
      cacheRead: 0,
      cacheWrite: 0,
    },
  },

  // DeepSeek models
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    reasoning: true,
    input: ["text"] as const,
    contextWindow: 163840,
    maxTokens: 8192,
    cost: {
      input: 0.16,
      output: 0.64,
      cacheRead: 0.016,
      cacheWrite: 0.08,
    },
  },
  {
    id: "deepseek/deepseek-reasoner",
    name: "DeepSeek R1",
    reasoning: true,
    input: ["text"] as const,
    contextWindow: 163840,
    maxTokens: 8192,
    cost: {
      input: 0.16,
      output: 0.64,
      cacheRead: 0,
      cacheWrite: 0,
    },
  },

  // Google models
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    reasoning: false,
    input: ["text", "image"] as const,
    contextWindow: 1048576,
    maxTokens: 8192,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini 1.5 Flash",
    reasoning: false,
    input: ["text", "image"] as const,
    contextWindow: 1048576,
    maxTokens: 8192,
    cost: {
      input: 0.06,
      output: 0.18,
      cacheRead: 0.006,
      cacheWrite: 0.03,
    },
  },

  // OpenAI models
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    reasoning: false,
    input: ["text", "image"] as const,
    contextWindow: 128000,
    maxTokens: 16384,
    cost: {
      input: 2.0,
      output: 8.0,
      cacheRead: 1.0,
      cacheWrite: 2.5,
    },
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    reasoning: false,
    input: ["text", "image"] as const,
    contextWindow: 128000,
    maxTokens: 16384,
    cost: {
      input: 0.12,
      output: 0.48,
      cacheRead: 0.06,
      cacheWrite: 0.15,
    },
  },
] as const;

export type OpenRouterCatalogEntry = (typeof OPENROUTER_MODEL_CATALOG)[number];

/**
 * Build a ModelDefinitionConfig from an OpenRouter catalog entry.
 */
export function buildOpenRouterModelDefinition(
  entry: OpenRouterCatalogEntry,
): ModelDefinitionConfig {
  return {
    id: entry.id,
    name: entry.name,
    reasoning: entry.reasoning,
    input: [...entry.input],
    cost: entry.cost,
    contextWindow: entry.contextWindow,
    maxTokens: entry.maxTokens,
  };
}

/**
 * Discover models from OpenRouter - returns static catalog.
 * OpenRouter API discovery requires authentication, so we use static catalog.
 */
export async function discoverOpenRouterModels(): Promise<ModelDefinitionConfig[]> {
  return OPENROUTER_MODEL_CATALOG.map(buildOpenRouterModelDefinition);
}
