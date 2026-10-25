# ArthaAI — Reference Reuse Matrix & Duplication Resolution
**Generated:** September 2026  
**Status:** Completed Architectural Assessment  

---

## 1. Master Component Reuse Matrix

| Component | Source Project | Source Location | Purpose | Reuse Type | Dependencies | Performance | License | ArthaAI Target Interface | Decision & Rationale |
|---|---|---|---|---|---|---|---|---|---|
| **High-Fidelity Event Simulator & Matcher** | NautilusTrader | `crates/backtest`, `crates/model` | Microsecond tick backtesting, queue priority, realistic slippage & latency | **WRAPPER** | Cython, PyO3, Rust wheels (`pip install nautilus_trader`) | >200,000 ticks/sec | LGPL-3.0 | `BacktestEngine`, `ExecutionEngine` | **USE AS EVENT-DRIVEN ENGINE.** Wrap behind ArthaAI interface. LGPL wheel protects proprietary code. |
| **Order Book L2/L3 Ladder & OFI** | NautilusTrader | `crates/model/src/orderbook/` | Institutional limit order book reconstruction and order flow metrics | **INSPIRED / REIMPLEMENT** | Rust/Polars native | Nanosecond updates | LGPL-3.0 | `OrderFlowEngine`, `MarketSnapshot` | **REIMPLEMENT IN NATIVE RUST/PYTHON.** Avoids C-FFI boundary overhead and provides Indian tick-size customization. |
| **5-Stage Strategy Pipeline** | QuantConnect LEAN | `Algorithm.Framework/` | Separation of Universe → Alpha → Portfolio → Risk → Execution | **INSPIRED** | None (.NET discarded) | Pipeline concept | Apache 2.0 | `Strategy`, `Portfolio`, `RiskEngine` | **ADOPT PIPELINE DESIGN.** Implement purely in Python/Pydantic, completely discarding the .NET/C# runtime. |
| **Insight & PortfolioTarget Models** | QuantConnect LEAN | `Common/Data/Insight.cs`, `Portfolio/` | Structured signal abstraction `{Symbol, Direction, Magnitude, Confidence, Horizon}` | **ADAPTED** | Pydantic v2 | Sub-microsecond | Apache 2.0 | `Insight`, `PortfolioTarget` | **ADAPT INTO ARTHAAI CORE.** Standardizes agent recommendations into mathematical portfolio inputs. |
| **Vectorized Alpha Screener & Grid Search** | VectorBT | `vectorbt/portfolio`, `vectorbt/base` | Multi-parameter strategy sweep across thousands of configurations | **REJECT / REIMPLEMENT** | NumPy, Numba (LLVM) | Sub-second for 10,000 combinations | ⚠️ Apache 2.0 + Commons Clause | `FeatureEngine`, `BacktestEngine` | **REJECT COMMONS CLAUSE EMBEDDING.** Build native Polars/NumPy screener to prevent commercial licensing encumbrance. |
| **Multi-Agent Trading Debate & Consensus** | TradingAgents | `tradingagents/agents/`, `graph/` | Bull vs Bear debate, Risk Management adjudication, consensus voting | **ADAPTED** | LangGraph, Pydantic | LLM latency (500ms - 2s) | Apache 2.0 | `Agent`, `AgentState`, `AgentMessage` | **ADAPT ROLE PERSONAS.** Adapt Bull/Bear/Risk prompts into ArthaAI's 7-role Indian market persona framework. |
| **Financial Analysis Prompt Workflows** | TradingAgents | `tradingagents/prompts/` | Systematic structured prompts for fundamental and technical reasoning | **ADAPTED** | None | Zero runtime cost | Apache 2.0 | `AgentPromptCatalog` | **ADAPT AND ENHANCE.** Adapt prompts for Indian market context (SEBI filings, RBI policy, NSE delivery %). |
| **Graph-Based Agent State Machine** | LangGraph | `langgraph/pregel/`, `graph/` | Deterministic cyclical DAG orchestration, human-in-the-loop, time-travel checkpoints | **DIRECT_DEPENDENCY** | `langgraph`, `langchain-core` | <5ms state transitions | MIT | `AgentWorkflowEngine` | **DIRECT DEPENDENCY.** Mature, MIT-licensed state machine for cyclical multi-agent workflows. |
| **Agent Governance, Org Chart & Budgets** | Paperclip | `packages/shared`, `server/src/` | Agent employee hierarchy, token budget caps, review gates, heartbeats | **INSPIRED / ADAPTED** | TypeScript/Node (if UI used) | <20ms API latency | MIT | `AgentGovernanceEngine`, `AuditLogger` | **ADAPT GOVERNANCE ARCHITECTURE.** Port budget/heartbeat logic to Python FastAPI backend; adapt React dashboard. |
| **Self-Improving Memory & Skill Synthesis** | Hermes Agent | `hermes/memory/`, `hermes/skills/` | SQLite FTS5 persistent facts, 3-tier memory, closed-loop skill crystallization | **ADAPTED** | SQLite (built-in), Pydantic | <2ms query latency | MIT | `RAGEngine`, `EvolutionEngine` | **ADAPT MEMORY & EVOLUTION.** Pure SQLite FTS5 replaces expensive vector DBs. Skill distillation drives strategy auto-evolution. |
| **Unified Financial Data Terminal** | OpenBB | `openbb_platform/` | Multi-provider financial data abstraction across 40+ sources | **REJECT DIRECT EMBEDDING** | 40+ provider packages, Pydantic | Network bound | ⚠️ AGPL-3.0 | `MarketDataProvider`, `NewsProvider` | **REJECT AS EMBEDDED DEPENDENCY.** AGPL-3.0 is viral. Build clean ArthaAI native provider adapters (Kite, NSE, YFinance, FRED). |

---

## 2. Forensic Duplication Resolution

Across the 8 studied repositories, significant overlapping functionality was identified. ArthaAI enforces a single architectural winner for each subsystem:

### 2.1 Multi-Agent Frameworks
- **Contenders:** TradingAgents (LangGraph-based), Paperclip (Process-based), Hermes (Autonomous Loop), LangGraph (StateGraph/Pregel).
- **Winner:** **LangGraph (for Orchestration) + TradingAgents (for Trading Personas) + Paperclip (for Governance)**.
  - *Rationale:* LangGraph provides rock-solid state checkpointing and cyclical execution; TradingAgents contributes domain-tested trading personas; Paperclip adds token budgets and risk gates.

### 2.2 Memory & Retrieval Systems
- **Contenders:** Hermes (3-Tier SQLite FTS5 + Skills), TradingAgents (ChromaDB / Pinecone vector DB), Paperclip (PostgreSQL JSON store).
- **Winner:** **Hermes 3-Tier Holographic SQLite FTS5 Architecture**.
  - *Rationale:* Zero external dependencies, ultra-fast (<2ms), zero embedding API costs for structured facts, and native support for procedural code skills. External vector DBs (Chroma/Pinecone) are relegated to optional secondary plugins for unstructured PDF filings.

### 2.3 Backtesting Engines
- **Contenders:** NautilusTrader (Event-driven Rust), VectorBT (Vectorized Numba), QuantConnect LEAN (C# Event-driven), TradingAgents (Simple synthetic mock).
- **Winner:** **Dual-Engine Architecture: ArthaAI Polars/NumPy (Screening) + NautilusTrader (Tick/Execution Simulation)**.
  - *Phase 1 (Screening):* Native ArthaAI Polars engine scans 10,000 parameter sets in seconds.
  - *Phase 2 (Verification & Execution):* Top 3 candidate strategies run through NautilusTrader's event loop with realistic queue order books, latency, and slippage.
  - *LEAN is discarded* due to C#/.NET runtime friction. *VectorBT is discarded* due to Commons Clause licensing.

### 2.4 Data Providers & Abstractions
- **Contenders:** OpenBB (AGPL 40+ providers), QuantConnect LEAN DataFeeds (C#), NautilusTrader Data Engine (Rust), TradingAgents YFinance wrapper.
- **Winner:** **ArthaAI Native Provider Registry (`MarketDataProvider`)**.
  - *Rationale:* OpenBB's AGPL-3.0 license poses severe viral licensing risks. LEAN requires C#. Nautilus lacks Indian brokers. ArthaAI defines a clean Pydantic-based `MarketDataProvider` with zero-copy Polars outputs, supporting Zerodha Kite, Angel One SmartAPI, Upstox, Dhan, NSE Python, and Yahoo Finance natively.

### 2.5 Strategy Architecture
- **Contenders:** LEAN 5-Stage Framework, NautilusTrader TradingStrategy, TradingAgents Prompt Chains.
- **Winner:** **LEAN 5-Stage Pipeline (`Universe → Alpha → Portfolio → Risk → Execution`)**.
  - *Rationale:* Decouples market intelligence from execution mechanics. Multi-agent debate generates Alphas; mathematical portfolio optimization sizes positions; hardcoded risk rules vet trades; execution algorithms route orders.
