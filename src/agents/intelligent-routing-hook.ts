/**
 * Intelligent Routing Hook
 * 
 * Pre-processor that analyzes message complexity and overrides model selection
 * when intelligent routing is enabled in config.
 */

import type { OpenClawConfig } from "../config/config.js";
import { analyzeComplexity, routeToModel, type RoutingDecision } from "./intelligent-routing.js";
import { parseModelRef, modelKey } from "./model-selection.js";

export interface RoutingContext {
  message: string;
  previousMessages?: string[];
  userRequestedModel?: string;
  defaultModel: string;
  config: OpenClawConfig;
}

export interface RoutingResult {
  shouldOverride: boolean;
  provider?: string;
  model?: string;
  reasoning?: string;
  originalModel: string;
}

/**
 * Hook function that intercepts model selection for intelligent routing.
 */
export function applyIntelligentRouting(context: RoutingContext): RoutingResult {
  const { message, previousMessages, userRequestedModel, defaultModel, config } = context;

  // Check if intelligent routing is enabled
  const routingEnabled = config.agents?.defaults?.intelligentRouting?.enabled ?? false;
  
  if (!routingEnabled) {
    return {
      shouldOverride: false,
      originalModel: userRequestedModel || defaultModel,
    };
  }

  // Respect explicit user model choice
  if (userRequestedModel) {
    return {
      shouldOverride: false,
      originalModel: userRequestedModel,
    };
  }

  // Analyze complexity and route
  const analysis = analyzeComplexity(message, previousMessages);
  const decision = routeToModel(analysis);

  // Build model key for routing
  const routedModelKey = `${decision.provider}/${decision.model}`;

  // Check if routed model is available in config
  const availableModels = config.agents?.defaults?.models ?? {};
  const isAvailable = routedModelKey in availableModels || 
                      decision.model in availableModels;

  if (!isAvailable) {
    // Fallback to default model if routed model not configured
    return {
      shouldOverride: false,
      originalModel: defaultModel,
    };
  }

  return {
    shouldOverride: true,
    provider: decision.provider,
    model: decision.model,
    reasoning: decision.reasoning,
    originalModel: defaultModel,
  };
}

/**
 * Resolve final model after applying intelligent routing.
 */
export function resolveModelWithRouting(context: RoutingContext): string {
  const result = applyIntelligentRouting(context);
  
  if (!result.shouldOverride) {
    return context.userRequestedModel || context.defaultModel;
  }

  return `${result.provider}/${result.model}`;
}
