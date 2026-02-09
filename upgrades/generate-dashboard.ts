/**
 * Dashboard Generator
 * 
 * Generates an HTML dashboard showing cost tracking and usage statistics.
 */

import { CostTracker } from './cost-tracker';
import fs from 'fs';

export function generateDashboard(tracker: CostTracker, outputPath: string = './dashboard.html'): void {
  const data = tracker.exportDashboardData();
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OptimiserClaw Cost Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f23;
      color: #e4e4e7;
      padding: 2rem;
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #a1a1aa;
      margin-bottom: 2rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 1.5rem;
      transition: transform 0.2s, border-color 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      border-color: #667eea;
    }

    .stat-label {
      color: #a1a1aa;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #e4e4e7;
    }

    .stat-value.success {
      color: #10b981;
    }

    .stat-value.warning {
      color: #f59e0b;
    }

    .stat-subtext {
      color: #71717a;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .section {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #e4e4e7;
    }

    .provider-bar {
      margin-bottom: 1rem;
    }

    .provider-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .provider-name {
      color: #e4e4e7;
      font-weight: 600;
    }

    .provider-percentage {
      color: #a1a1aa;
    }

    .bar {
      height: 8px;
      background: #27272a;
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      transition: width 0.5s ease;
    }

    .bar-fill.local {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    .bar-fill.openrouter {
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .bar-fill.claude-browser {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }

    .bar-fill.claude-api {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    .log-table {
      width: 100%;
      border-collapse: collapse;
    }

    .log-table th {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 2px solid #27272a;
      color: #a1a1aa;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .log-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #27272a;
      font-size: 0.875rem;
    }

    .log-table tr:hover {
      background: #27272a;
    }

    .provider-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .provider-badge.local {
      background: #10b98120;
      color: #10b981;
    }

    .provider-badge.openrouter {
      background: #667eea20;
      color: #667eea;
    }

    .provider-badge.claude-browser {
      background: #f59e0b20;
      color: #f59e0b;
    }

    .provider-badge.claude-api {
      background: #ef444420;
      color: #ef4444;
    }

    .cost {
      font-family: 'Courier New', monospace;
      color: #10b981;
    }

    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #27272a;
      color: #71717a;
      font-size: 0.875rem;
    }

    .updated {
      color: #a1a1aa;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>💰 OptimiserClaw Dashboard</h1>
    <p class="subtitle">Cost tracking & usage statistics</p>
    <p class="updated">Last updated: ${new Date().toLocaleString()}</p>

    <!-- Key Metrics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Requests</div>
        <div class="stat-value">${data.totalRequests.toLocaleString()}</div>
        <div class="stat-subtext">All time</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Total Savings</div>
        <div class="stat-value success">£${data.totalSavings.toFixed(2)}</div>
        <div class="stat-subtext">vs Claude API</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">This Month Cost</div>
        <div class="stat-value">£${data.monthly.totalCost.toFixed(4)}</div>
        <div class="stat-subtext">Projected: £${data.monthly.projectedMonthlyCost.toFixed(2)}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Monthly Savings</div>
        <div class="stat-value success">${((data.monthly.savingsVsClaudeAPI / (data.monthly.totalCost + data.monthly.savingsVsClaudeAPI)) * 100).toFixed(0)}%</div>
        <div class="stat-subtext">£${data.monthly.savingsVsClaudeAPI.toFixed(2)} saved</div>
      </div>
    </div>

    <!-- Provider Distribution -->
    <div class="section">
      <h2 class="section-title">Provider Distribution (This Month)</h2>
      ${Object.entries(data.monthly.byProvider || {}).map(([provider, stats]: [string, any]) => `
        <div class="provider-bar">
          <div class="provider-label">
            <span class="provider-name">${provider}</span>
            <span class="provider-percentage">${stats.requests} requests (${stats.percentage.toFixed(0)}%) • £${stats.cost.toFixed(6)}</span>
          </div>
          <div class="bar">
            <div class="bar-fill ${provider}" style="width: ${stats.percentage}%"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Today's Stats -->
    <div class="section">
      <h2 class="section-title">Today's Activity</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Requests</div>
          <div class="stat-value">${data.daily.totalRequests}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cost</div>
          <div class="stat-value">£${data.daily.totalCost.toFixed(6)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tokens</div>
          <div class="stat-value">${data.daily.totalTokens.toLocaleString()}</div>
        </div>
      </div>
    </div>

    <!-- Recent Requests -->
    <div class="section">
      <h2 class="section-title">Recent Requests</h2>
      <table class="log-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Provider</th>
            <th>Prompt</th>
            <th>Cost</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${data.recentLogs.map((log: any) => `
            <tr>
              <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
              <td><span class="provider-badge ${log.provider}">${log.provider}</span></td>
              <td>${log.prompt.substring(0, 60)}${log.prompt.length > 60 ? '...' : ''}</td>
              <td class="cost">£${log.cost.toFixed(6)}</td>
              <td>${log.responseTime.toFixed(2)}s</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>OptimiserClaw by Jarvis 🤖 • Created ${new Date().toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  console.log(`✅ Dashboard generated: ${outputPath}`);
}

// Example usage:
/*
import { CostTracker } from './cost-tracker';

const tracker = new CostTracker();
generateDashboard(tracker, './dashboard.html');
console.log('Dashboard created! Open dashboard.html in your browser.');
*/
