# Paperclip — Forensic Analysis
**Source:** https://github.com/paperclipai/paperclip  
**Version Studied:** Latest main branch (cloned repository, 6,637 files)  
**License:** MIT License (Permissive)  
**Language:** TypeScript / Node.js + React (Vite)  

---

## 1. What Problem Does It Solve?

While frameworks like LangGraph or AutoGen focus on DAG-based prompting and function calling for individual agent loops, **Paperclip solves organizational governance and operations for teams of AI agents**.

Key problems it solves:
- **"Agent Management Chaos":** Coordinating 10+ autonomous agents working simultaneously without losing track of state, expenses, or goals.
- **Org Hierarchy & Governance:** Modeling agents as organizational employees (e.g. Chief Risk Officer, Lead Quant, Execution Specialist) with defined reporting lines, delegated authority, and approval boundaries.
- **Budget & Cost Caps:** Enforcing strict token and dollar limits per agent, per task, and per day to prevent runaway API spend.
- **Heartbeat-Driven Scheduling:** Running proactive background agent routines (e.g. hourly market scans, post-market audits) triggered by schedules, webhooks, or issue comments rather than only synchronous user prompts.
- **Human-in-the-Loop Review Gates:** Forcing high-risk actions (e.g. placing live trades > ₹1,00,000, altering portfolio risk caps) to require human manager approval in the UI before execution.

---

## 2. Architecture & Source Tree Overview

```
reference/Paperclip/
├── server/                    — Node.js / Express backend server
│   ├── src/
│   │   ├── app.ts             — Server orchestration, middleware, error handling
│   │   ├── runtime-api.ts     — Agent runtime API (heartbeats, logs, state transitions)
│   │   ├── routes/            — REST endpoints for tasks, agents, orgs, approvals, audits
│   │   ├── services/          — Task dispatcher, heartbeat scheduler, budget tracker
│   │   └── storage/           — PostgreSQL / SQLite persistence for agent state & traces
├── ui/                        — React + Vite front-end dashboard
│   ├── src/components/        — Org chart visualizer, Task board (Kanban), Agent logs,
│   │                            Approval dialogs, Token/cost burn charts
├── packages/
│   ├── shared/                — TypeScript data models: Agent, Task, Org, Heartbeat, Budget
│   ├── adapters/              — Agent runtime adapters:
│   │   ├── hermes/            — Nous Research Hermes Agent adapter (local CLI + HTTP gateway)
│   │   ├── claude-local/      — Anthropic Claude CLI adapter
│   │   ├── codex-local/       — OpenAI Codex/GPT adapter
│   │   └── cursor-local/      — Cursor IDE runner adapter
│   ├── mcp-server/            — Model Context Protocol (MCP) server & client abstractions
│   └── paperclip-runner/      — Sandboxed execution runner for agent tool processes
```

---

## 3. Core Abstractions & Data Models

### 3.1 Agent & Org Hierarchy
- `Company`: Root organizational entity.
- `Agent`: An autonomous agent worker characterized by:
  - `role`: e.g. "Risk Manager", "Sentiment Analyst", "Lead Execution Trader".
  - `managerId`: Pointer to supervising agent or human manager.
  - `adapterType`: Execution environment (`hermes_local`, `hermes_gateway`, `http`, etc.).
  - `budget`: Monthly/daily token and USD spending caps.
- `Task`: A unit of work assigned to an agent, featuring status states: `TODO`, `IN_PROGRESS`, `REVIEW_REQUIRED`, `APPROVED`, `COMPLETED`, `FAILED`.

### 3.2 Heartbeat System
Instead of endless while-loops, agents operate on periodic or event-driven **Heartbeats**:
1. Heartbeat scheduler triggers an agent waking up.
2. The agent inspects its inbox, pending tasks, and recent market notifications.
3. The agent invokes tools, produces thought transcripts, and posts task progress.
4. If a threshold is crossed (e.g. risk breach detected), the agent issues an alert or pauses for approval.
5. The session state is serialized, token usage recorded, and the process idles until the next heartbeat.

### 3.3 Structured Transcript Parsing & UI Cards
Paperclip parses stdout/stderr from agent runs into typed `TranscriptEntry` streams, rendering interactive UI cards for tool calls, reasoning traces, bash commands, and error rollbacks.

---

## 4. Architectural Forensic Questions (Phases C)

### What problem does it solve?
Multi-agent team governance, organizational delegation, budget monitoring, and human review gates for production agent fleets.

### What is its best component?
1. **The Agent Governance & Approval Pipeline:** The concept of modeling agents with manager hierarchies, budgets, and explicit human approval gates before executing high-impact actions.
2. **Heartbeat & Event Wake System:** Elegant asynchronous lifecycle management avoiding hung infinite loops.
3. **The Web UI Dashboard:** Complete modern React interface for agent inspection, org trees, and real-time task progress.

### What should ArthaAI reuse?
- **Governance & Organizational Hierarchy Concepts:** Structure ArthaAI's 7 trading personas (Macro Analyst, Fundamental Analyst, Quantitative Modeler, Sentiment Analyst, Risk Officer, Execution Trader, System Auditor) using Paperclip's role, delegation, and reporting-line design.
- **Budgeting & Kill-Switch Architecture:** Replicate Paperclip's token/USD spending limits and risk gate policies.
- **Heartbeat Lifecycle:** Adopt the heartbeat paradigm for scheduled market monitoring (e.g. Pre-Market 8:45 AM, Opening Bell 9:15 AM, Mid-Session 12:00 PM, Closing Bell 3:15 PM, Post-Market 4:00 PM).

### What should ArthaAI wrap?
- If ArthaAI adopts a TypeScript/React dashboard, Paperclip's frontend components (task manager, agent cards, approval notifications) can be adapted directly.

### What should ArthaAI rewrite or develop natively?
- **Finance-Native State & Domain Models:** Paperclip is domain-agnostic (geared towards software development and general business). ArthaAI needs trading-specific domains: Order Book, Greek Exposures, Portfolio Drawdown, Margin Utilization, SEBI Compliance, and NSE/BSE holidays.
- **Python Integration:** ArthaAI's analytical core is Python (FastAPI/Polars/PyTorch/Nautilus). Paperclip's Node.js backend must either be called via REST/WebSocket or reimplemented natively in Python/FastAPI to maintain a single unified runtime.

### What should ArthaAI avoid?
- Do not make the core quantitative research loop dependent on a Node.js daemon. Quant strategies, backtests, and real-time tick processing must run directly in Python/Rust without Node.js intermediaries.

### What dependencies would it introduce?
- If run as an external governance service: Node.js 20+, pnpm, PostgreSQL/SQLite.
- If adapted into Python: Zero Node.js dependencies; reimplemented using FastAPI, Pydantic, and WebSockets.

### What performance cost would it introduce?
- Node.js runtime overhead is minimal (<50ms for REST/WebSocket updates), but cross-process IPC between Python and Node.js introduces serialization latency.

### What license constraints exist?
- **MIT License.** Highly permissive. ArthaAI can freely adapt, borrow architectural patterns, or reuse UI components with attribution.

### What maintenance risks exist?
- Multi-language complexity (Python for Quant + TypeScript/Node for Governance) if Paperclip is run as a separate service.
