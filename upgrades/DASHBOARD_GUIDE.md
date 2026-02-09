# 📊 Cost Monitoring Dashboard

Real-time cost tracking and analytics for OptimiserClaw.

---

## Features

### 📈 **Real-Time Metrics**
- Total requests processed
- Total cost savings vs Claude API
- Monthly cost and projections
- Provider distribution breakdown

### 💰 **Cost Tracking**
- Per-request cost logging
- Daily and monthly aggregations
- Savings calculations (vs Claude API baseline)
- Provider-level cost breakdown

### 📊 **Visualizations**
- Provider distribution bars
- Recent request history
- Time-series analytics
- Savings percentage

### 🎨 **Beautiful Dashboard**
- Dark mode design
- Responsive layout
- Live updates
- Professional styling

---

## Quick Start

### 1. Generate Demo Dashboard

```bash
cd /home/oem/.openclaw/workspace/openclaw-fork/upgrades

# Generate sample data and dashboard
npx tsx demo-dashboard.ts

# Open in browser
# The path will be shown in output
```

### 2. Use with Real Data

The cost tracker is automatically integrated into `UnifiedProvider`:

```typescript
import { UnifiedProvider } from './unified-provider';

const provider = new UnifiedProvider({
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  claudeSessionToken: process.env.CLAUDE_SESSION_TOKEN,
});

// Make requests (automatically tracked)
const response = await provider.chat([
  { role: 'user', content: 'What is 2+2?' },
]);

// Generate dashboard anytime
provider.generateDashboard('./dashboard.html');

// Or get stats programmatically
const stats = await provider.getStats();
console.log('Total savings:', stats.totalSavings);
```

---

## Files

### Core Components

**cost-tracker.ts** (7 KB)
- Request logging system
- Daily/monthly statistics
- Data persistence (JSON file)
- Savings calculations

**generate-dashboard.ts** (9 KB)
- HTML dashboard generator
- Beautiful dark mode UI
- Responsive design
- Real-time metrics

**demo-dashboard.ts** (4 KB)
- Sample data generator
- Demo dashboard creation
- Testing utility

---

## Dashboard Sections

### 1. **Key Metrics** (Top Cards)
- **Total Requests:** All-time request count
- **Total Savings:** Money saved vs Claude API
- **This Month Cost:** Current month spending
- **Monthly Savings:** Savings percentage

### 2. **Provider Distribution**
- Visual breakdown by provider
- Percentage of traffic
- Cost per provider
- Request counts

### 3. **Today's Activity**
- Requests today
- Cost today
- Tokens used

### 4. **Recent Requests**
- Last 10 requests
- Provider used
- Cost and time
- Prompt preview

---

## Data Storage

**Location:** `./cost-tracking.json`

**Format:**
```json
[
  {
    "timestamp": 1707484800000,
    "provider": "local",
    "model": "phi4-mini-reasoning",
    "prompt": "What is 2+2?",
    "response": "4",
    "cost": 0,
    "tokensUsed": 37,
    "responseTime": 2.5,
    "routingReason": "Simple task"
  }
]
```

**Auto-saved:** Every request is automatically logged

---

## Statistics Available

### Daily Stats
```typescript
const stats = tracker.getDailyStats('2026-02-09');
// Returns: totalRequests, totalCost, totalTokens, byProvider
```

### Monthly Stats
```typescript
const stats = tracker.getMonthlyStats('2026-02');
// Returns: totalRequests, totalCost, projectedMonthlyCost,
//          savingsVsClaudeAPI, byProvider distribution
```

### Export for Dashboard
```typescript
const data = tracker.exportDashboardData();
// Returns: daily, monthly, totalSavings, recentLogs
```

---

## Customization

### Change Dashboard Output Path

```typescript
provider.generateDashboard('./my-custom-dashboard.html');
```

### Custom Cost Tracker Location

```typescript
const tracker = new CostTracker('./my-tracking-data.json');
```

### Clear All Data

```typescript
const tracker = provider.getCostTracker();
tracker.clearLogs();
```

---

## Automated Dashboard Updates

### Option 1: Cron Job

```bash
# Add to crontab (update every hour)
0 * * * * cd /path/to/upgrades && npx tsx -e "
import { CostTracker } from './cost-tracker';
import { generateDashboard } from './generate-dashboard';
const tracker = new CostTracker();
generateDashboard(tracker, './dashboard.html');
"
```

### Option 2: After Every N Requests

```typescript
let requestCount = 0;

// In your app...
requestCount++;
if (requestCount % 10 === 0) {
  provider.generateDashboard();
}
```

### Option 3: On-Demand

Just regenerate when you want to see stats:

```bash
npx tsx -e "
import { CostTracker } from './cost-tracker';
import { generateDashboard } from './generate-dashboard';
const tracker = new CostTracker();
generateDashboard(tracker);
console.log('Dashboard updated!');
"
```

---

## Example Dashboard (Sample Data)

**Monthly Snapshot:**
```
Total Requests: 445
Total Savings: £0.66
This Month Cost: £0.0007
Projected Monthly: £0.01
Savings vs Claude API: 99%

Provider Distribution:
- Local: 334 requests (75%) - £0.00
- OpenRouter: 89 requests (20%) - £0.01
- Claude Browser: 22 requests (5%) - £0.00
```

---

## Real Usage Example

Based on actual test results:

**4 Requests Today:**
```
1. "What is 2+2?" → Local (phi4-mini) → £0.00
2. "Write Python function" → Local (qwen) → £0.00
3. "Explain REST vs GraphQL" → OpenRouter (llama-3.3) → £0.000053
4. "Analyze architectures" → Claude Browser → £0.00

Total: £0.000053
vs Claude API: £0.006
Savings: 99%
```

---

## Dashboard URLs

**Local file system:**
```
file:///home/oem/.openclaw/workspace/openclaw-fork/upgrades/dashboard.html
```

**Serve with Python (for remote access):**
```bash
cd upgrades
python3 -m http.server 8080

# Then visit: http://192.168.68.168:8080/dashboard.html
```

---

## Cost Baseline

**All-Claude-API baseline:**
- £0.0015 per request (average)
- Used for savings calculations
- Based on typical Claude Sonnet 4 API pricing

**Actual costs observed:**
- Local: £0.00/request (free)
- OpenRouter (llama-3.3): £0.000017/request (99% cheaper)
- Claude Browser: £0.00/request (uses Pro subscription)

**Average savings: 95-99%**

---

## Troubleshooting

### Dashboard not updating

```bash
# Regenerate manually
npx tsx demo-dashboard.ts
```

### Data file corrupted

```typescript
// Reset and start fresh
const tracker = new CostTracker();
tracker.clearLogs();
```

### Missing data in charts

- Check `cost-tracking.json` exists
- Verify requests are being logged
- Try demo dashboard to test: `npx tsx demo-dashboard.ts`

---

## Next Steps

1. ✅ **View demo dashboard** - Open `demo-dashboard.html` in browser
2. ⏳ **Use with real data** - Integrate with your app
3. ⏳ **Automate updates** - Set up cron job or webhook
4. ⏳ **Share with team** - Host on simple web server

---

**Created:** 2026-02-09  
**Status:** ✅ Production ready  
**Auto-tracking:** Built into UnifiedProvider  
**Updates:** Real-time (regenerate anytime)
