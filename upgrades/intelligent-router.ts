/**
 * Intelligent Router
 * 
 * Automatically selects the best AI model/provider based on:
 * - Task complexity
 * - Task type (code, reasoning, simple query)
 * - Cost vs quality trade-off
 * - Response time requirements
 */

export interface RouterConfig {
  strategy?: 'cost-optimized' | 'quality-first' | 'balanced';
  maxResponseTime?: number; // seconds
  allowLocal?: boolean;
  allowOpenRouter?: boolean;
  allowClaudeBrowser?: boolean;
  allowCl audeAPI?: boolean;
}

export interface RoutingDecision {
  provider: 'local' | 'openrouter' | 'claude-browser' | 'claude-api';
  model: string;
  reason: string;
  estimatedCost: number; // GBP
  estimatedTime: number; // seconds
}

export interface TaskAnalysis {
  complexity: number; // 0-1 (0=trivial, 1=very complex)
  taskType: 'code' | 'math' | 'reasoning' | 'creative' | 'factual' | 'general';
  requiresFreshData: boolean;
  isTimeCritical: boolean;
  contextSize: 'small' | 'medium' | 'large';
}

export class IntelligentRouter {
  private strategy: 'cost-optimized' | 'quality-first' | 'balanced';
  private maxResponseTime: number;
  private allowLocal: boolean;
  private allowOpenRouter: boolean;
  private allowClaudeBrowser: boolean;
  private allowClaudeAPI: boolean;

  constructor(config: RouterConfig = {}) {
    this.strategy = config.strategy || 'cost-optimized';
    this.maxResponseTime = config.maxResponseTime || 30;
    this.allowLocal = config.allowLocal !== false;
    this.allowOpenRouter = config.allowOpenRouter !== false;
    this.allowClaudeBrowser = config.allowClaudeBrowser !== false;
    this.allowClaudeAPI = config.allowClaudeAPI !== false;
  }

  /**
   * Analyze task to understand complexity and type
   */
  analyzeTask(prompt: string, context?: string[]): TaskAnalysis {
    const lowerPrompt = prompt.toLowerCase();
    
    console.log(`🔍 Analyzing prompt: "${prompt.substring(0, 100)}..."`);
    console.log(`🔍 Context items: ${context?.length || 0}`);
    
    // Detect task type
    let taskType: TaskAnalysis['taskType'] = 'general';
    
    if (this.isCodeTask(lowerPrompt)) {
      taskType = 'code';
      console.log(`🔍 Detected as CODE task`);
    } else if (this.isMathTask(lowerPrompt)) {
      taskType = 'math';
    } else if (this.isReasoningTask(lowerPrompt)) {
      taskType = 'reasoning';
    } else if (this.isCreativeTask(lowerPrompt)) {
      taskType = 'creative';
      console.log(`🔍 Detected as CREATIVE task`);
    } else if (this.isFactualTask(lowerPrompt)) {
      taskType = 'factual';
      console.log(`🔍 Detected as FACTUAL task`);
    }

    // Calculate complexity (0-1)
    let complexity = this.calculateComplexity(prompt, context);
    
    // Reduce complexity for simple task types
    if (taskType === 'creative' && prompt.length < 100) complexity *= 0.6;
    if (taskType === 'factual') complexity *= 0.7;

    // Detect if fresh data needed
    const requiresFreshData = /\b(today|now|current|latest|recent)\b/i.test(prompt);

    // Detect time criticality
    const isTimeCritical = /\b(urgent|quick|fast|immediately|asap)\b/i.test(prompt);

    // Context size
    const totalChars = prompt.length + (context?.join('').length || 0);
    const contextSize: TaskAnalysis['contextSize'] = 
      totalChars < 500 ? 'small' :
      totalChars < 2000 ? 'medium' : 'large';

    return {
      complexity,
      taskType,
      requiresFreshData,
      isTimeCritical,
      contextSize,
    };
  }

  /**
   * Route task to best provider/model
   */
  route(prompt: string, context?: string[]): RoutingDecision {
    const analysis = this.analyzeTask(prompt, context);

    console.log(`📊 Task analysis: complexity=${analysis.complexity.toFixed(2)}, type=${analysis.taskType}`);

    // Strategy: Cost-Optimized (default)
    if (this.strategy === 'cost-optimized') {
      return this.routeCostOptimized(analysis);
    }

    // Strategy: Quality-First
    if (this.strategy === 'quality-first') {
      return this.routeQualityFirst(analysis);
    }

    // Strategy: Balanced
    return this.routeBalanced(analysis);
  }

  /**
   * Cost-optimized routing: Use cheapest option that meets quality needs
   * 
   * PREFERENCE: OpenRouter > Local models (local models too slow on this hardware)
   */
  private routeCostOptimized(analysis: TaskAnalysis): RoutingDecision {
    // ALWAYS prefer OpenRouter for any task (cheap, fast, reliable)
    if (this.allowOpenRouter) {
      // Simple/medium tasks → Cheapest paid model (up to 0.6 complexity)
      if (analysis.complexity < 0.6) {
        return {
          provider: 'openrouter',
          model: 'meta-llama/llama-3.3-70b-instruct',
          reason: 'Simple-medium task, Llama 3.3 70B (£0.0003/msg)',
          estimatedCost: 0.0003,
          estimatedTime: 2,
        };
      }

      // Very complex tasks → Claude Sonnet (best quality)
      if (analysis.complexity >= 0.7) {
        return {
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          reason: 'Complex task requiring Claude quality',
          estimatedCost: 0.003, // £0.003/message
          estimatedTime: 3,
        };
      }

      // Code tasks → Code-specialized model
      if (analysis.taskType === 'code') {
        return {
          provider: 'openrouter',
          model: 'qwen/qwen-2.5-coder-32b-instruct',
          reason: 'Code task, specialized model',
          estimatedCost: 0.0003,
          estimatedTime: 3,
        };
      }

      // Medium complexity → Best value model
      return {
        provider: 'openrouter',
        model: 'meta-llama/llama-3.3-70b-instruct',
        reason: 'Medium complexity, best value',
        estimatedCost: 0.0003,
        estimatedTime: 3,
      };
    }

    // Fallback to local ONLY if OpenRouter unavailable
    if (this.allowLocal) {
      return {
        provider: 'local',
        model: 'phi4-mini-reasoning',
        reason: 'Fallback to local (OpenRouter unavailable)',
        estimatedCost: 0,
        estimatedTime: 10,
      };
    }

    // Last resort: error
    throw new Error('No providers available - enable at least OpenRouter or local models');
  }

  /**
   * Quality-first routing: Use best model available
   */
  private routeQualityFirst(analysis: TaskAnalysis): RoutingDecision {
    // Always prefer Claude for quality
    if (this.allowClaudeAPI) {
      return {
        provider: 'claude-api',
        model: 'claude-sonnet-4',
        reason: 'Quality-first strategy',
        estimatedCost: 0.0015,
        estimatedTime: 3,
      };
    }

    if (this.allowClaudeBrowser) {
      return {
        provider: 'claude-browser',
        model: 'claude-sonnet-4',
        reason: 'Quality-first, using browser provider',
        estimatedCost: 0,
        estimatedTime: 10,
      };
    }

    // Fallback to OpenRouter or local
    return this.routeCostOptimized(analysis);
  }

  /**
   * Balanced routing: Balance cost and quality
   */
  private routeBalanced(analysis: TaskAnalysis): RoutingDecision {
    // Simple → Local
    if (analysis.complexity < 0.3 && this.allowLocal) {
      return this.routeCostOptimized(analysis);
    }

    // Medium → OpenRouter
    if (analysis.complexity < 0.7 && this.allowOpenRouter) {
      return {
        provider: 'openrouter',
        model: 'meta-llama/llama-3.3-70b-instruct',
        reason: 'Balanced: good quality, low cost',
        estimatedCost: 0.0003,
        estimatedTime: 4,
      };
    }

    // Complex → Claude browser
    if (this.allowClaudeBrowser) {
      return {
        provider: 'claude-browser',
        model: 'claude-sonnet-4',
        reason: 'Balanced: high quality, free',
        estimatedCost: 0,
        estimatedTime: 10,
      };
    }

    // Fallback
    return this.fallbackRoute(analysis);
  }

  /**
   * Calculate task complexity (0-1)
   */
  private calculateComplexity(prompt: string, context?: string[]): number {
    let complexity = 0.5; // Start at medium
    const lowerPrompt = prompt.toLowerCase();

    // Length indicators
    if (prompt.length < 50) complexity -= 0.2;
    if (prompt.length > 200) complexity += 0.1;
    if (prompt.length > 500) complexity += 0.2;

    // High-complexity architectural/system design indicators
    const architecturalKeywords = [
      'architect', 'microservice', 'monolith', 'distributed',
      'scalab', 'pattern', 'design pattern', 'system design',
      'trade-off', 'pros and cons', 'versus', ' vs ', ' v ',
      'event-driven', 'event driven', 'event', 'driven',
    ];
    const foundArchitectural = architecturalKeywords.filter(kw => 
      lowerPrompt.includes(kw)
    ).length;
    if (foundArchitectural > 0) {
      complexity += Math.min(foundArchitectural * 0.15, 0.4); // Higher weight
    }

    // Multi-faceted analysis indicators (compare X vs Y, etc)
    if (/\b(compare|contrast)\b.*\b(and|vs|versus|v)\b/i.test(prompt)) {
      complexity += 0.2;
    }

    // Standard complex task keywords
    const complexKeywords = [
      'analyz', 'design', 'optim', 'refactor', 'explain',
      'evaluat', 'critiqu', 'improv', 'strateg', 'framework',
      'comprehensiv', 'detail', 'deep dive', 'in-depth',
    ];
    const foundKeywords = complexKeywords.filter(kw => 
      lowerPrompt.includes(kw)
    ).length;
    complexity += Math.min(foundKeywords * 0.1, 0.3);

    // Simple keywords (decrease complexity)
    const simpleKeywords = ['what', 'when', 'where', 'list', 'name', 'is', 'tell', 'joke', 'weather', 'hello', 'hi'];
    const foundSimple = simpleKeywords.filter(kw => 
      lowerPrompt.includes(kw)
    ).length;
    complexity -= Math.min(foundSimple * 0.15, 0.4);

    // Context adds small amount (don't let history inflate simple questions)
    if (context && context.length > 5) complexity += 0.05;

    // Clamp to 0-1
    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Detect if task is code-related
   */
  private isCodeTask(prompt: string): boolean {
    const codeKeywords = [
      'code', 'function', 'class', 'method', 'api', 'debug',
      'refactor', 'python', 'javascript', 'typescript', 'java',
      'implement', 'algorithm', 'bug', 'error', 'compile',
    ];
    
    return codeKeywords.some(kw => prompt.includes(kw));
  }

  /**
   * Detect if task is math-related
   */
  private isMathTask(prompt: string): boolean {
    const mathKeywords = ['calculate', 'solve', 'equation', 'math', 'formula'];
    const hasNumbers = /\d/.test(prompt);
    const hasMathSymbols = /[\+\-\*\/\=\(\)]/.test(prompt);
    
    return mathKeywords.some(kw => prompt.includes(kw)) || 
           (hasNumbers && hasMathSymbols);
  }

  /**
   * Detect if task requires reasoning
   */
  private isReasoningTask(prompt: string): boolean {
    const reasoningKeywords = [
      'why', 'how', 'explain', 'reason', 'because', 'analyze',
      'evaluate', 'compare', 'pros and cons', 'trade-off',
    ];
    
    return reasoningKeywords.some(kw => prompt.includes(kw));
  }

  /**
   * Detect if task is creative
   */
  private isCreativeTask(prompt: string): boolean {
    const creativeKeywords = [
      'write', 'create', 'generate', 'story', 'poem', 'idea',
      'brainstorm', 'imagine', 'creative', 'design', 'joke', 'funny',
    ];
    
    return creativeKeywords.some(kw => prompt.toLowerCase().includes(kw));
  }

  /**
   * Detect if task is factual
   */
  private isFactualTask(prompt: string): boolean {
    const factualKeywords = [
      'what is', 'who is', 'when', 'where', 'definition',
      'fact', 'information', 'lookup', 'find',
    ];
    
    return factualKeywords.some(kw => prompt.includes(kw));
  }

  /**
   * Fallback routing when preferred options unavailable
   */
  private fallbackRoute(analysis: TaskAnalysis): RoutingDecision {
    if (this.allowLocal) {
      return {
        provider: 'local',
        model: 'phi4-reasoning',
        reason: 'Fallback to local model',
        estimatedCost: 0,
        estimatedTime: 5,
      };
    }

    throw new Error('No routing options available');
  }
}

// Example usage:
/*
const router = new IntelligentRouter({
  strategy: 'cost-optimized',
  maxResponseTime: 30,
});

const decision = router.route('Write a Python function to reverse a string');

console.log('Provider:', decision.provider);
console.log('Model:', decision.model);
console.log('Reason:', decision.reason);
console.log('Cost:', decision.estimatedCost, 'GBP');
console.log('Time:', decision.estimatedTime, 'seconds');
*/
