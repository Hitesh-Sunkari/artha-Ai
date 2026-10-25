# ArthaAI — Module Ownership & Architectural Audit
**Document Status:** RATIFIED (Step 0.6)  
**Standard:** Single Ownership & Five-Question Justification for Every Module  

---

## 1. Domain Ownership Matrix

Every domain concern within ArthaAI has exactly one authoritative owner:

| Functional Concern | Authoritative Module Owner | Secondary Consumers | Forbidden Implementers |
|---|---|---|---|
| **Domain Entities & Contracts** | `src/arthaai/core/` | All downstream modules | No module may define duplicate Instrument/Order classes |
| **Market Data Ingestion & Sanitization** | `src/arthaai/data/` | `features/`, `backtest/` | Strategy may not ingest raw HTTP/WS directly |
| **Technical Feature Calculation** | `src/arthaai/features/` | `strategy/`, `backtest/` | Core domain may not contain indicator math |
| **Order Book & Microstructure** | `src/arthaai/microstructure/` | `strategy/`, `backtest/` | Data layer only stores ticks; microstructure derives metrics |
| **Derivatives & Volatility Surfaces** | `src/arthaai/options/` | `strategy/`, `backtest/` | Features layer does not price options |
| **5-Stage Trading Strategy Pipeline** | `src/arthaai/strategy/` | `backtest/`, `gateway/` | Intelligence layer does not emit trade orders |
| **LLM Research & Qualitative Reasoning** | `src/arthaai/intelligence/` | `strategy/` (via cached schemas) | Fast execution loop never imports intelligence modules |
| **Historical Simulation & Verification** | `src/arthaai/backtest/` | `research/`, `evaluation/` | Strategy code remains backend-agnostic |
| **Tear Sheets & Quantitative Metrics** | `src/arthaai/evaluation/` | `control_plane/`, `gateway/` | Backtest engine runs simulations; evaluation scores them |
| **Reproducibility & Registries** | `src/arthaai/control_plane/` | `backtest/`, `strategy/` | Gateway merely displays registry data |
| **Strategy Adaptation & Parameter Tuning** | `src/arthaai/evolution/` | `control_plane/` | Live trading does not mutate without governance gate |
| **Third-Party Framework Bridges** | `src/arthaai/integrations/` | Respective callers | Core and strategy must never import integrations |
| **Network Protocol Delivery (HTTP/WS)** | `src/arthaai/gateway/` | `dashboard/` | Core domain never imports FastAPI/Uvicorn |
| **Visual Dashboard** | `dashboard/` | End user | Backend engines never render HTML/Canvas |

---

## 2. Exhaustive Five-Question Module Audit

### 2.1 `src/arthaai/core/` (Foundational Domain Layer)

#### `core/clock/timezone.py`
- **Why does it exist?** Enforces strict UTC timezone-awareness across all timestamps and provides explicit conversion to `Asia/Kolkata` (IST).
- **What depends on it?** All events, market snapshots, backtesters, and broker connectors.
- **What does it depend on?** Python standard library (`datetime`, `zoneinfo`).
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Removing it leads to naive datetime bugs and exchange session mismatches.

#### `core/instruments/contracts.py`
- **Why does it exist?** Definitive Pydantic models for Equity, Futures, Options, Lot sizes, and Tick sizes.
- **What depends on it?** `data/`, `strategy/`, `orders/`, `backtest/`.
- **What does it depend on?** `core/clock/timezone.py`, `pydantic`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** It is the foundational taxonomy of tradable assets.

#### `core/events/market_events.py`
- **Why does it exist?** High-performance representations of raw market ticks, trade prints, and bar events.
- **What depends on it?** `data/`, `microstructure/`, `features/`, `backtest/`.
- **What does it depend on?** `core/instruments/contracts.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Essential for streaming and backtest event loops.

#### `core/market/snapshot.py`
- **Why does it exist?** Immutable container holding current L1 prices, OHLCV rolling bars, and Level 2 depth.
- **What depends on it?** `strategy/`, `microstructure/`, `features/`.
- **What does it depend on?** `core/events/market_events.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Provides standardized point-in-time market state.

#### `core/orders/order.py`
- **Why does it exist?** Value objects for `OrderRequest`, `OrderFill`, `OrderStatus`, and statutory tax tracking.
- **What depends on it?** `strategy/execution/`, `strategy/risk/`, `backtest/`, `gateway/`.
- **What does it depend on?** `core/instruments/contracts.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Unifies orders across simulated and live execution.

#### `core/portfolio/position.py`
- **Why does it exist?** Tracks open positions, average entry prices, realized/unrealized PnL, and margin.
- **What depends on it?** `strategy/portfolio/`, `strategy/risk/`, `evaluation/`.
- **What does it depend on?** `core/instruments/contracts.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Core accounting foundation.

#### `core/signals/insight.py`
- **Why does it exist?** Formal data contract for alpha signals: `{symbol, direction, confidence, magnitude, horizon}`.
- **What depends on it?** `strategy/alpha/`, `strategy/portfolio/`, `backtest/`.
- **What does it depend on?** `core/clock/timezone.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Decouples alpha generation from portfolio sizing.

---

### 2.2 `src/arthaai/data/` (Data Ingestion & Storage)

#### `data/providers/base.py`
- **Why does it exist?** Abstract interface defining asynchronous methods for historical bars, snapshots, and WebSocket tick streaming.
- **What depends on it?** `data/providers/*.py`, `strategy/`.
- **What does it depend on?** `core/`.
- **Is it core or adapter?** **CORE INTERFACE.**
- **Can it be removed?** **No.** Ensures broker provider swappability.

#### `data/providers/zerodha.py`, `angelone.py`, `upstox.py`, `dhan.py`, `nse.py`, `yfinance.py`
- **Why do they exist?** Concrete broker and market data adapters for Indian brokers and public feeds.
- **What depends on it?** Live runner, data ingestion CLI scripts.
- **What does it depend on?** `data/providers/base.py`, `httpx`, `websockets`.
- **Is it core or adapter?** **ADAPTER.**
- **Can they be removed?** Individual providers can be disabled, but at least one live provider is required for production.

#### `data/quality/engine.py` & `rules.py`
- **Why do they exist?** Automated gatekeeper validating incoming feeds for missing bars, negative prices, duplicate ticks, and timezone corruption.
- **What depends on it?** `data/ingestion/`, `backtest/`.
- **What does it depend on?** `data/schemas/bar.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Prevents corrupted data from entering quantitative models.

#### `data/ingestion/parquet_writer.py` & `tick_buffer.py`
- **Why do they exist?** High-throughput lock-free buffer aggregating live ticks and flushing to compressed Parquet files.
- **What depends on it?** Realtime data ingestion daemon.
- **What does it depend on?** `core/events/`, `pyarrow`, `polars`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Essential for building proprietary historical tick archives.

---

### 2.3 `src/arthaai/features/` (Quantitative Features)

#### `features/registry.py`
- **Why does it exist?** Enforces the `FeatureDefinition` contract; registers every technical indicator with code version and mathematical formula.
- **What depends on it?** `strategy/alpha/`, `control_plane/features/`.
- **What does it depend on?** `core/`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Vital for feature governance and anti-leakage guarantees.

#### `features/indicators/`, `volatility/`, `statistics/`
- **Why do they exist?** High-speed Polars SIMD implementations of Supertrend, EMA, VWAP, ATR, Bollinger Bands, and rolling statistics.
- **What depends on it?** `strategy/alpha/`, `backtest/polars_backend.py`.
- **What does it depend on?** `features/registry.py`, `polars`.
- **Is it core or adapter?** **CORE.**
- **Can they be removed?** Individual indicators can be toggled; the calculation pipeline is essential.

---

### 2.4 `src/arthaai/microstructure/` (Order Flow & Microstructure)

#### `microstructure/orderbook/ladder.py`
- **Why does it exist?** Reconstructs Level 2 (5-depth) and Level 3 order book ladders from raw broker quotes.
- **What depends on it?** `microstructure/ofi/`, `microstructure/imbalance/`.
- **What does it depend on?** `core/market/snapshot.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Required for all order flow signals.

#### `microstructure/ofi/calculator.py`
- **Why does it exist?** Computes Order Flow Imbalance (OFI) metrics from depth level shifts.
- **What depends on it?** `strategy/alpha/`.
- **What does it depend on?** `microstructure/orderbook/ladder.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Key institutional intraday predictive factor.

#### `microstructure/delta/`, `trades/`, `imbalance/`, `absorption/`, `volume_profile/`, `liquidity/`
- **Why do they exist?** Provide specialized trade-by-trade analytics: Cumulative Volume Delta (CVD), POC levels, and absorption detection.
- **What depends on it?** Intraday momentum and mean-reversion alpha models.
- **What does it depend on?** `core/events/market_events.py`.
- **Is it core or adapter?** **CORE.**
- **Can they be removed?** Modular components; individual metrics can be omitted, but the microstructure framework must remain.

---

### 2.5 `src/arthaai/options/` (Derivatives Analytics)

#### `options/chain/builder.py` & `expiry/calendar.py`
- **Why do they exist?** Organizes raw option strikes into structured chains; models weekly vs monthly NSE/BSE expiries.
- **What depends on it?** `options/greeks/`, `options/gamma/`.
- **What does it depend on?** `core/instruments/contracts.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Fundamental to all options trading strategies.

#### `options/iv/solver.py` & `greeks/black76.py`
- **Why do they exist?** Solves implied volatility and analytical Greeks (Delta, Gamma, Theta, Vega, Rho) via Black-76.
- **What depends on it?** `options/gamma/`, `strategy/alpha/`, `strategy/risk/`.
- **What does it depend on?** `scipy` / vectorized Numba math.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Options cannot be traded quantitatively without Greeks.

#### `options/gamma/exposure.py` & `levels.py`
- **Why does it exist?** Computes Market Gamma Exposure (GEX) profiles, Gamma Flip Points, and Call/Put Walls.
- **What depends on it?** Index breakout and reversal strategies.
- **What does it depend on?** `options/greeks/black76.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Essential for dealer gamma hedging analysis.

---

### 2.6 `src/arthaai/strategy/` (INSPIRED_BY_LEAN 5-Stage Pipeline)

#### `strategy/universe/`
- **Why does it exist?** Stage 1: Point-in-time universe selection filtering liquid and eligible instruments.
- **What depends on it?** Strategy runner.
- **What does it depend on?** `core/instruments/contracts.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Prevents survivorship bias.

#### `strategy/alpha/`
- **Why does it exist?** Stage 2: Produces mathematical `Insight` models from features and microstructure signals.
- **What depends on it?** `strategy/portfolio/`.
- **What does it depend on?** `core/signals/insight.py`, `features/`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Core predictive engine.

#### `strategy/portfolio/`
- **Why does it exist?** Stage 3: Converts `Insight` signals into sized `PortfolioTarget` allocations via Equal Risk Contribution.
- **What depends on it?** `strategy/risk/`.
- **What does it depend on?** `core/signals/insight.py`, `core/portfolio/position.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Manages capital allocation.

#### `strategy/risk/`
- **Why does it exist?** Stage 4: Pre-trade risk firewall enforcing circuit breakers, MWPL F&O ban locks, and daily drawdown caps.
- **What depends on it?** `strategy/execution/`.
- **What does it depend on?** `core/orders/order.py`, `control_plane/market_rules/`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Absolute requirement for capital preservation.

#### `strategy/execution/`
- **Why does it exist?** Stage 5: Slices large orders to comply with NSE freeze limits; routes orders via TWAP or aggressive taker models.
- **What depends on it?** Broker execution adapter or backtest matching engine.
- **What does it depend on?** `core/orders/order.py`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Manages physical order dispatch.

---

### 2.7 `src/arthaai/intelligence/` (Asynchronous Slow-Loop AI)

#### `intelligence/schemas/context.py`
- **Why does it exist?** Strict Pydantic contracts (`MarketRegimeContext`, `RiskContext`, `PortfolioContext`) bridging slow AI reasoning to the fast quant loop.
- **What depends on it?** `strategy/`, `intelligence/graph/`.
- **What does it depend on?** `core/clock/timezone.py`.
- **Is it core or adapter?** **CORE CONTRACT.**
- **Can it be removed?** **No.** Ensures the fast loop consumes strongly-typed, validated data.

#### `intelligence/rag/`
- **Why does it exist?** Authoritative RAG ingestion into PostgreSQL + pgvector; semantic chunking and hybrid retrieval.
- **What depends on it?** `intelligence/personas/`.
- **What does it depend on?** `psycopg2` / `asyncpg`, `pgvector`.
- **Is it core or adapter?** **ADAPTER TO PGVECTOR.**
- **Can it be removed?** **No.** Core unstructured research engine.

#### `intelligence/memory/scratchpad.py`
- **Why does it exist?** Optional local SQLite FTS5 working memory for agent episodic scratchpads.
- **What depends on it?** `intelligence/personas/`.
- **What does it depend on?** Standard library `sqlite3`.
- **Is it core or adapter?** **LOCAL CACHE UTILITY.**
- **Can it be removed?** Optional, but recommended for fast zero-cost agent scratchpads.

#### `intelligence/personas/` & `graph/`
- **Why do they exist?** LangGraph multi-agent debate (Macro, Fundamental, Sentiment, Risk Officer) running on slow hourly/daily cycles.
- **What depends on it?** Asynchronous research supervisor.
- **What does it depend on?** `langgraph`, `intelligence/schemas/context.py`.
- **Is it core or adapter?** **ADAPTER TO LLM / LANGGRAPH.**
- **Can they be removed?** Offline research can run without LLMs, but they provide qualitative regime context.

---

### 2.8 `src/arthaai/backtest/` (Simulation Layer)

#### `backtest/base.py`
- **Why does it exist?** Abstract `ResearchBackend` interface decoupling strategy code from simulation backends.
- **What depends on it?** `backtest/*.py`, `strategy/`.
- **What does it depend on?** `core/`.
- **Is it core or adapter?** **CORE INTERFACE.**
- **Can it be removed?** **No.** Ensures multi-engine backtest flexibility.

#### `backtest/polars_backend.py`
- **Why does it exist?** Native vectorized Polars bar simulator for rapid combinatorial parameter sweeps (10,000 combinations in <2s).
- **What depends on it?** Research scripts, optimization runners.
- **What does it depend on?** `backtest/base.py`, `polars`.
- **Is it core or adapter?** **CORE IMPLEMENTATION.**
- **Can it be removed?** **No.** Primary quantitative research engine.

#### `backtest/nautilus_backend.py`
- **Why does it exist?** Institutional event-driven verification backend using NautilusTrader for realistic L2/L3 queue and fill simulation.
- **What depends on it?** Strategy validation before capital promotion.
- **What does it depend on?** `backtest/base.py`, `integrations/nautilus/adapter.py`.
- **Is it core or adapter?** **ADAPTER.**
- **Can it be removed?** Can be omitted if Nautilus is not installed; PolarsBackend remains primary.

#### `backtest/costs.py`
- **Why does it exist?** Models statutory transaction costs (STT, Stamp Duty, Exchange Turnover, SEBI Fee, GST) per historical date.
- **What depends on it?** All backtest backends.
- **What does it depend on?** `control_plane/market_rules/`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Vital for realistic Indian market backtests.

#### `backtest/integrity.py`
- **Why does it exist?** Validates backtest runs against look-ahead bias, purges data leakage, and computes Deflated Sharpe Ratios (DSR).
- **What depends on it?** Strategy promotion gate.
- **What does it depend on?** `core/`.
- **Is it core or adapter?** **CORE.**
- **Can it be removed?** **No.** Enforces quantitative integrity.

---

### 2.9 `src/arthaai/evaluation/` (Performance & Risk Evaluation)

#### `evaluation/performance.py`, `risk.py`, `execution.py`, `statistical.py`, `robustness.py`
- **Why do they exist?** Computes comprehensive tearsheets: CAGR, Sharpe, Sortino, VaR, CVaR, Slippage, DSR, PBO, and regime stress breakdowns.
- **What depends on it?** `control_plane/promotions/`, `gateway/server.py`.
- **What does it depend on?** `core/orders/order.py`, `polars`, `scipy`.
- **Is it core or adapter?** **CORE.**
- **Can they be removed?** **No.** Strategies cannot be promoted without comprehensive evaluation.

---

### 2.10 `src/arthaai/control_plane/` (Governance & Registries)

#### `control_plane/datasets/`, `features/`, `strategies/`, `experiments/`, `market_rules/`, `promotions/`
- **Why do they exist?** The 9-registry governance plane. Tracks dataset hashes, feature definitions, strategy ASTs, and the strict 8-stage promotion gate.
- **What depends on it?** CI/CD pipelines, research notebooks, live execution runner.
- **What does it depend on?** `psycopg2` / PostgreSQL storage.
- **Is it core or adapter?** **CORE GOVERNANCE.**
- **Can they be removed?** **No.** Ensures institutional reproducibility.

---

### 2.11 `src/arthaai/evolution/` (Self-Evolution & Parameter Optimization)

#### `evolution/candidates/`, `optimization/`, `validation/`, `promotion/`
- **Why do they exist?** Genetic algorithm and Bayesian parameter optimizer discovering non-overfitted parameter adaptations.
- **What depends on it?** Offline research jobs.
- **What does it depend on?** `backtest/`, `control_plane/`.
- **Is it core or adapter?** **CORE.**
- **Can they be removed?** Can be run on-demand; does not affect live execution.

---

### 2.12 `src/arthaai/integrations/` (Third-Party Bridges)

#### `integrations/nautilus/`, `openbb/`, `tradingagents/`, `vectorbt/`, `tradingview/`, `llm/`
- **Why do they exist?** Strict isolation boundaries for external third-party libraries. If an external library undergoes API breaking changes, only its adapter in this directory changes.
- **What depends on it?** Specific optional backends or tools.
- **What does it depend on?** External third-party packages.
- **Is it core or adapter?** **ADAPTER.**
- **Can they be removed?** Any specific adapter can be removed or swapped without modifying ArthaAI core code.

---

### 2.13 `src/arthaai/gateway/` & `dashboard/` (Presentation & Realtime Edge)

#### `gateway/server.py`, `webhooks.py`, `websocket.py`
- **Why do they exist?** Exposes FastAPI REST endpoints for dashboard control, WebSockets for live tick/order streaming, and webhooks for TradingView alerts.
- **What depends on it?** `dashboard/`.
- **What does it depend on?** `core/`, `fastapi`, `websockets`.
- **Is it core or adapter?** **ADAPTER / DELIVERY.**
- **Can it be removed?** Can run headless without web gateway for batch research.

#### `dashboard/` (React + Vite + TradingView Lightweight Charts)
- **Why does it exist?** Web dashboard for visualizing charts, order books, agent debate transcripts, and risk gauges.
- **What depends on it?** End users / portfolio managers.
- **What does it depend on?** `gateway/`.
- **Is it core or adapter?** **PRESENTATION.**
- **Can it be removed?** Backend functions fully headless without UI.
