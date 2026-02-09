/**
 * Cost Tracker
 * 
 * Tracks all requests, costs, and provider usage.
 * Stores data in JSON file for persistence.
 */

import fs from 'fs';
import path from 'path';

export interface RequestLog {
  timestamp: number;
  provider: 'local' | 'openrouter' | 'claude-browser' | 'claude-api';
  model: string;
  prompt: string;
  response: string;
  cost: number; // GBP
  tokensUsed?: number;
  responseTime: number; // seconds
  routingReason: string;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  byProvider: {
    [provider: string]: {
      requests: number;
      cost: number;
      tokens: number;
      avgResponseTime: number;
    };
  };
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  projectedMonthlyCost: number;
  savingsVsClaudeAPI: number;
  byProvider: {
    [provider: string]: {
      requests: number;
      cost: number;
      percentage: number;
    };
  };
}

export class CostTracker {
  private logFile: string;
  private logs: RequestLog[] = [];

  constructor(logFile: string = './cost-tracking.json') {
    this.logFile = path.resolve(logFile);
    this.loadLogs();
  }

  /**
   * Log a request
   */
  logRequest(log: RequestLog): void {
    this.logs.push(log);
    this.saveLogs();
  }

  /**
   * Get all logs
   */
  getAllLogs(): RequestLog[] {
    return this.logs;
  }

  /**
   * Get logs for a specific date
   */
  getLogsForDate(date: string): RequestLog[] {
    return this.logs.filter(log => {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      return logDate === date;
    });
  }

  /**
   * Get logs for a specific month
   */
  getLogsForMonth(month: string): RequestLog[] {
    return this.logs.filter(log => {
      const logMonth = new Date(log.timestamp).toISOString().substring(0, 7);
      return logMonth === month;
    });
  }

  /**
   * Get daily statistics
   */
  getDailyStats(date: string): DailyStats {
    const logs = this.getLogsForDate(date);
    
    const stats: DailyStats = {
      date,
      totalRequests: logs.length,
      totalCost: 0,
      totalTokens: 0,
      byProvider: {},
    };

    logs.forEach(log => {
      stats.totalCost += log.cost;
      stats.totalTokens += log.tokensUsed || 0;

      if (!stats.byProvider[log.provider]) {
        stats.byProvider[log.provider] = {
          requests: 0,
          cost: 0,
          tokens: 0,
          avgResponseTime: 0,
        };
      }

      stats.byProvider[log.provider].requests++;
      stats.byProvider[log.provider].cost += log.cost;
      stats.byProvider[log.provider].tokens += log.tokensUsed || 0;
    });

    // Calculate average response times
    Object.keys(stats.byProvider).forEach(provider => {
      const providerLogs = logs.filter(l => l.provider === provider);
      const totalTime = providerLogs.reduce((sum, l) => sum + l.responseTime, 0);
      stats.byProvider[provider].avgResponseTime = totalTime / providerLogs.length;
    });

    return stats;
  }

  /**
   * Get monthly statistics
   */
  getMonthlyStats(month: string): MonthlyStats {
    const logs = this.getLogsForMonth(month);
    
    const totalCost = logs.reduce((sum, log) => sum + log.cost, 0);
    const totalTokens = logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);

    // Calculate projected monthly cost (based on days elapsed)
    const daysInMonth = new Date(
      parseInt(month.split('-')[0]),
      parseInt(month.split('-')[1]),
      0
    ).getDate();
    
    const today = new Date();
    const currentDay = today.getDate();
    const projectedMonthlyCost = (totalCost / currentDay) * daysInMonth;

    // Calculate savings vs all-Claude-API
    const claudeAPICostPerRequest = 0.0015; // ~£0.0015 per request
    const potentialClaudeCost = logs.length * claudeAPICostPerRequest;
    const savingsVsClaudeAPI = potentialClaudeCost - totalCost;

    const stats: MonthlyStats = {
      month,
      totalRequests: logs.length,
      totalCost,
      totalTokens,
      projectedMonthlyCost,
      savingsVsClaudeAPI,
      byProvider: {},
    };

    // Calculate per-provider stats
    logs.forEach(log => {
      if (!stats.byProvider[log.provider]) {
        stats.byProvider[log.provider] = {
          requests: 0,
          cost: 0,
          percentage: 0,
        };
      }

      stats.byProvider[log.provider].requests++;
      stats.byProvider[log.provider].cost += log.cost;
    });

    // Calculate percentages
    Object.keys(stats.byProvider).forEach(provider => {
      stats.byProvider[provider].percentage = 
        (stats.byProvider[provider].requests / logs.length) * 100;
    });

    return stats;
  }

  /**
   * Get total savings to date
   */
  getTotalSavings(): number {
    const allLogs = this.getAllLogs();
    const actualCost = allLogs.reduce((sum, log) => sum + log.cost, 0);
    const claudeAPICost = allLogs.length * 0.0015;
    return claudeAPICost - actualCost;
  }

  /**
   * Export data for dashboard
   */
  exportDashboardData(): any {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);

    return {
      daily: this.getDailyStats(today),
      monthly: this.getMonthlyStats(thisMonth),
      totalSavings: this.getTotalSavings(),
      totalRequests: this.logs.length,
      recentLogs: this.logs.slice(-10).reverse(),
    };
  }

  /**
   * Load logs from file
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const data = fs.readFileSync(this.logFile, 'utf-8');
        this.logs = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load logs, starting fresh');
      this.logs = [];
    }
  }

  /**
   * Save logs to file
   */
  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
}

// Example usage:
/*
const tracker = new CostTracker();

tracker.logRequest({
  timestamp: Date.now(),
  provider: 'openrouter',
  model: 'llama-3.3-70b',
  prompt: 'What is 2+2?',
  response: '4',
  cost: 0.000017,
  tokensUsed: 37,
  responseTime: 3.04,
  routingReason: 'Medium complexity',
});

const monthlyStats = tracker.getMonthlyStats('2026-02');
console.log('Monthly cost:', monthlyStats.totalCost);
console.log('Savings:', monthlyStats.savingsVsClaudeAPI);
*/
