# OptimiserClaw Project Structure

This repository is organized to separate reference documentation from active development work.

## Directory Layout

```
OptimiserClaw/
├── README.md                    # Project overview
├── UPGRADES.md                  # Proposed optimizations and roadmap
├── PROJECT_STRUCTURE.md         # This file
├── openclaw-docs/               # Reference: OpenClaw documentation (copied from npm install)
│   ├── index.md                 # Main docs entry point
│   ├── install/                 # Installation guides
│   ├── concepts/                # Core concepts
│   ├── channels/                # Channel integrations
│   ├── tools/                   # Tool documentation
│   ├── gateway/                 # Gateway configuration
│   ├── nodes/                   # Node pairing and control
│   ├── plugins/                 # Plugin development
│   ├── providers/               # AI provider setup
│   ├── automation/              # Automation patterns
│   ├── security/                # Security best practices
│   ├── debugging/               # Debug and diagnostics
│   └── ...                      # Additional docs
├── implementations/             # (Future) Completed upgrades
│   ├── token-optimizer/         # Token usage optimization tools
│   ├── defect-tracker/          # Enhanced defect tracking
│   ├── project-templates/       # Smart project scaffolding
│   └── ...                      # More as we build
└── experiments/                 # (Future) Proof-of-concept work
    ├── multi-agent-coord/       # Multi-agent coordination tests
    ├── memory-improvements/     # Memory system experiments
    └── ...                      # Research and exploration
```

## Documentation Organization

### openclaw-docs/
Complete reference documentation for OpenClaw, copied from the official npm package.

**Purpose:** Canonical reference for OpenClaw features, APIs, and patterns

**Update strategy:** Sync with official releases when major updates land

**Key files:**
- `index.md` - Overview and quick start
- `install/` - Platform-specific installation
- `concepts/` - Architecture and design patterns
- `channels/` - Telegram, Discord, WhatsApp, etc.
- `tools/` - Browser, nodes, cron, messaging
- `gateway/` - Configuration and management

### UPGRADES.md
Living roadmap of proposed and completed optimizations.

**Purpose:** Track what we're building, why, and the impact

**Update strategy:** Add new proposals, update status, document results

**Structure:**
1. Problem statement
2. Proposed solution
3. Expected impact
4. Implementation status

### implementations/
Production-ready upgrades and enhancements.

**Purpose:** Working code for optimizations that improve OpenClaw

**Standards:**
- Fully tested before merging
- Documented with usage examples
- Integrated with existing OpenClaw workflows
- Measured impact (before/after metrics)

### experiments/
Proof-of-concept work and research.

**Purpose:** Try ideas, learn, iterate before committing

**Standards:**
- Document findings (what worked, what didn't)
- No requirement for production readiness
- Move successful experiments to `implementations/`

## Development Workflow

1. **Propose** - Add to UPGRADES.md with problem, solution, impact
2. **Experiment** - Build POC in `experiments/`
3. **Validate** - Test thoroughly, measure results
4. **Implement** - Move to `implementations/` with docs
5. **Deploy** - Integrate into active OpenClaw installations
6. **Document** - Update UPGRADES.md with actual impact

## Principles

**From SOUL.md:**
- Direct, focused, entrepreneurial
- Test before shipping
- Learn from mistakes
- Only fix what needs fixing
- Results matter

**Quality gates:**
- TypeScript builds with zero errors
- All tests pass
- Visual QA for UI changes
- Atomic commits with clear messages
- Documentation updated

---

**Created:** 2026-02-09  
**For:** Mosaic Partners Limited / Andy Sheldon
