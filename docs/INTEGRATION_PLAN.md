# ArthaAI — Master Integration Plan, Dependency Strategy & Build Order
**Phase:** Step 0 Completion  
**Date:** September 2026  
**Status:** Awaiting User Approval to Commence Step 1  

---

## 1. Executive Summary

ArthaAI represents an institutional-grade, multi-agent algorithmic trading and quantitative intelligence framework tailored for the Indian financial markets (NSE, BSE, MCX) and global assets.

Rather than fragmenting development or blindly merging disparate open-source repositories, ArthaAI has conducted an exhaustive forensic examination of eight industry-defining codebases:
1. **TradingAgents** (TauricResearch) — Multi-agent persona debate and prompt orchestration.
2. **LangGraph** (LangChain) — Cyclical DAG state machine and checkpointing.
3. **OpenBB** (OpenBB Finance) — Data aggregation terminal.
4. **Paperclip** (Paperclip AI) — Agent organizational hierarchy, token budgets, and governance.
5. **NautilusTrader** (Nautech Systems) — High-throughput event-driven backtesting and order simulation.
6. **VectorBT** (Polakow) — High-speed vectorized parameter grid screening.
7. **LEAN** (QuantConnect) — 5-stage algorithm framework (Universe, Alpha, Portfolio, Risk, Execution).
8. **Hermes Agent** (Nous Research) — 3-tier memory, SQLite FTS5, and closed-loop skill evolution.

---

## 2. Dependency Strategy Map (Phase G)

| External Project | Acquisition Mechanism | Rationale & Isolation Strategy |
|---|---|---|
| **LangGraph** | `pip install langgraph langchain-core` | Direct mature pip dependency. Zero license risk (MIT). Handles cyclical graph execution. |
| **NautilusTrader** | `pip install nautilus_trader` | Direct pre-compiled binary wheel. LGPL-3.0 boundary strictly respected: linked as an external library without modifying internal Rust crates, keeping ArthaAI IP proprietary. |
| **TradingAgents** | Internal Adapted Implementation (`artha_ai/agents/personas/`) | Apache 2.0. Prompts and debate state adapted directly into native Pydantic models. Hardcoded US tickers replaced with Indian equity and F&O instruments. |
| **Hermes Agent** | Internal Adapted Implementation (`artha_ai/memory/`, `artha_ai/evolution/`) | MIT. SQLite FTS5 memory engine and closed-loop skill synthesis adapted into native async Python modules. Replaces heavy vector databases. |
| **Paperclip** | Internal Adapter / Reimplementation (`artha_ai/governance/`) | MIT. Token budgeting, heartbeat scheduler, and human review gates adapted into FastAPI backend; React dashboard adapted for TradingView visualization. |
| **QuantConnect LEAN** | Architectural Clean-Room Adaptation (`artha_ai/strategy/pipeline/`) | Apache 2.0. The 5-stage algorithm framework is adopted purely in Python, completely eliminating the C#/.NET runtime and Pythonnet bridging. |
| **OpenBB** | **REJECTED AS DEPENDENCY** (Clean-Room Native Connectors) | ⚠️ AGPL-3.0 viral risk. ArthaAI writes native, independent connectors (`artha_ai/data/providers/`) for Zerodha Kite, Angel One, Upstox, Dhan, NSE Python, and Yahoo Finance. |
| **VectorBT** | **REJECTED AS DEPENDENCY** (Clean-Room Native Polars Screener) | ⚠️ Commons Clause commercial restriction. ArthaAI writes a native Polars/NumPy/Numba matrix screening engine (`artha_ai/quant/screener.py`). |

---

## 3. High-Performance Technology Stack

- **Core Engine Runtime:** Python 3.11+ (Type hints, AsyncIO, Pydantic v2).
- **Quantitative & Data Layer:** **Polars** (SIMD multi-threaded DataFrame engine) + **NumPy** + **Numba** (LLVM JIT compilation).
- **Event-Driven Simulation:** **NautilusTrader** (Rust core wrapped via PyO3).
- **Agent Orchestration:** **LangGraph** (StateGraph / Pregel execution engine).
- **Memory & Fact Retrieval:** **SQLite FTS5** (Holographic local text search) + **DuckDB** (Local OLAP analytical queries).
- **API & Streaming Server:** **FastAPI** + **WebSockets** + **Uvicorn**.
- **Frontend Dashboard:** **React** + **Vite** + **TailwindCSS / Vanilla CSS** + **TradingView Lightweight Charts**.
- **Broker Connectivity (Indian Markets):** Native REST/WebSocket SDKs (Kite Connect, SmartAPI, Upstox v2, DhanHQ).

---

## 4. Master Implementation Roadmap & Phased Build Order

### Phase 0: Forensic Analysis & Integration Blueprint (COMPLETED)
- [x] Acquisition and deep source inspection of 8 reference repositories.
- [x] Production of 8 forensic analysis reports in `docs/reference-analysis/`.
- [x] Reference reuse matrix (`docs/REFERENCE_REUSE_MATRIX.md`).
- [x] Intellectual property and licensing audit (`docs/LICENSE_AUDIT.md`).
- [x] Performance and latency benchmarking audit (`docs/PERFORMANCE_AUDIT.md`).
- [x] Complete ArthaAI architecture blueprint and data contracts (`docs/ARTHAAI_FINAL_ARCHITECTURE.md`).

---

### Phase 1: Core Foundation & Data Abstraction Layer (Sprint 1)
- **1.1 Project Structure Setup:** Establish `artha_ai/` repository layout, poetry/pyproject tooling, and linting rules.
- **1.2 Core Data Models:** Implement Pydantic v2 value objects (`Instrument`, `MarketSnapshot`, `OrderRequest`, `OrderFill`, `Position`, `Insight`, `PortfolioTarget`).
- **1.3 Market Data Providers:** Build clean-room asynchronous adapters for Yahoo Finance, NSE Python, and Zerodha Kite Connect mock feeds.
- **1.4 High-Speed Parquet & Polars Store:** Implement local zero-copy time-series caching using Polars and Parquet.

### Phase 2: Quantitative, Order Flow & Options Engines (Sprint 2)
- **2.1 Feature Engine:** SIMD-accelerated Polars technical indicator library (EMA, RSI, Supertrend, ATR, VWAP).
- **2.2 Order Flow Engine:** Level 2/Level 3 bid-ask depth reconstructor and Order Flow Imbalance (OFI) calculator.
- **2.3 Options Engine:** Black-76 and Bjerksund-Stensland Greek calculators, Implied Volatility surface generator, and NSE Max Pain calculator.
- **2.4 Vectorized Alpha Screener:** Native Polars/Numba combinatorial parameter screener (10,000 parameter sets in <2 seconds).

### Phase 3: Multi-Agent Intelligence & Memory Subsystem (Sprint 3)
- **3.1 3-Tier Holographic Memory:** SQLite FTS5 persistence for session memory, permanent market rules, and user preferences.
- **3.2 Seven Persona Agents:** Implement domain-specialized personas (Macro Analyst, Fundamental Analyst, Quantitative Modeler, Sentiment Analyst, Risk Officer, Execution Specialist, Lead Auditor).
- **3.3 LangGraph State Machine:** Cyclical Bull-vs-Bear debate graph with consensus scoring and token burn monitoring.
- **3.4 Paperclip-Inspired Governance:** Enforce token budget limits, daily spend caps, and human-in-the-loop review gates.

### Phase 4: Strategy, Portfolio & Risk Engines (Sprint 4)
- **4.1 5-Stage Strategy Pipeline:** Implement Universe Selection → Alpha Generation → Portfolio Sizing → Risk Filtering → Execution.
- **4.2 Portfolio Optimizer:** Equal Risk Contribution and volatility-weighted capital allocator.
- **4.3 Pre-Trade Risk Engine:** Hardcoded circuit breakers, daily maximum drawdown filters, single-stock position caps, and margin checks.

### Phase 5: Backtesting, Execution & Self-Evolution (Sprint 5)
- **5.1 NautilusTrader Wrapper:** Event-driven tick-by-tick simulation adapter with realistic order book queue matching.
- **5.2 Paper Trading Node:** Live market WebSocket listener connected to simulated order matching engine.
- **5.3 Evaluation Engine:** Performance tearsheets (Sharpe, Sortino, Calmar, Max Drawdown, Win Rate, Alpha, Beta).
- **5.4 Evolution Engine:** Hermes-style closed-loop skill crystallization for automated strategy refinement.

### Phase 6: TradingView Dashboard & Production Hardening (Sprint 6)
- **6.1 FastAPI Realtime Gateway:** WebSocket streaming of ticks, agent debate logs, and portfolio equity curves.
- **6.2 React TradingView Dashboard:** Interactive charting with multi-agent thought visualizers and approval gates.
- **6.3 Live Indian Broker Integrations:** Production testing on Zerodha Kite Connect, Angel One, and Upstox.

---

## 5. Risk Assessment & Mitigation Matrix

| Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Viral AGPL License Contamination (OpenBB)** | **CRITICAL** | Zero dependency on OpenBB. All data connectors are built natively using clean-room REST/WebSocket calls with CI license scanning. |
| **Commercial Encumbrance (VectorBT Commons Clause)** | **HIGH** | Discard VectorBT as an embedded engine. Build native Polars/NumPy matrix screener without Commons Clause encumbrance. |
| **LLM Latency Delaying Intraday Trades** | **HIGH** | Two-Speed Architecture: Quant indicators and risk filters run at microsecond speeds in the fast loop; multi-agent LLMs run asynchronously on higher timeframes (5m, 15m). |
| **Unbounded LLM Token Costs** | **MEDIUM** | Paperclip-inspired token budget supervisor with hard daily dollar caps and automatic fallback to local models (Ollama/vLLM). |
| **Look-Ahead Bias in Backtesting** | **HIGH** | NautilusTrader event-driven engine enforces strict chronological causality with nanosecond timestamp sequencing. |

---

## 6. Recommended Immediate Next Step

🛑 **CRITICAL MILESTONE: STEP 0 COMPLETE.**

In accordance with user instructions:
- **No ArthaAI application code has been written yet.**
- All 8 repositories have been forensically studied, mapped, audited, and resolved.
- Complete documentation suite is generated in `docs/`:
  - `docs/reference-analysis/01-TradingAgents.md`
  - `docs/reference-analysis/02-LangGraph.md`
  - `docs/reference-analysis/03-OpenBB.md`
  - `docs/reference-analysis/04-NautilusTrader.md`
  - `docs/reference-analysis/05-Paperclip.md`
  - `docs/reference-analysis/06-VectorBT.md`
  - `docs/reference-analysis/07-LEAN.md`
  - `docs/reference-analysis/08-Hermes.md`
  - `docs/REFERENCE_REUSE_MATRIX.md`
  - `docs/LICENSE_AUDIT.md`
  - `docs/ARTHAAI_CORE_INTERFACES.md`
  - `docs/PERFORMANCE_AUDIT.md`
  - `docs/ARTHAAI_FINAL_ARCHITECTURE.md`
  - `docs/INTEGRATION_PLAN.md`

**STOP. AWAITING USER APPROVAL BEFORE COMMENCING IMPLEMENTATION.**
