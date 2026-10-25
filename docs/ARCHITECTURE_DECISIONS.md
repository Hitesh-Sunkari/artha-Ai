# ArthaAI — Architecture Decision Records (ADRs)
**Document Status:** RATIFIED (Phase 0.75)  
**Date:** September 2026  
**Standards:** Michael Nygard ADR Format  

---

## ADR-001: Separation of Latency Tiers & Realistic Benchmark Targets

### Status
Accepted

### Context
In quantitative trading, conflating research throughput with live execution latency or claiming unsubstantiated "sub-microsecond" or "sub-millisecond" performance across the entire stack creates unrealistic engineering assumptions. Live order dispatch over retail broker APIs (Zerodha Kite, Angel One) involves internet networking, broker OMS processing, and exchange acknowledgments that cannot operate at HFT speeds.

### Decision
ArthaAI explicitly decouples latency tiers and defines measurable benchmark targets rather than marketing claims:
1. **Signal Latency (Target: <5 ms):** In-memory tick arrival → feature computation → alpha signal → pre-trade risk evaluation.
2. **Paper Execution Latency (Target: 10 - 50 ms):** Local simulated matching engine with synthetic queue delays and slippage models.
3. **Live Execution Latency (Target: 50 - 300 ms):** Retail broker REST/WebSocket RTT dependent on physical infrastructure in India.
4. **Research Latency (Target: <2 sec):** Vectorized parameter sweep over 10,000 combinations.
5. **Slow Loop / LLM Latency (Target: 10 - 45 sec):** Multi-agent asynchronous research and macro reasoning.

### Consequences
The system architecture will not be distorted by impossible HFT assumptions while preserving high-throughput computational discipline in the fast loop.

---

## ADR-002: Primary RAG Knowledge Store on PostgreSQL + pgvector

### Status
Accepted

### Context
A previous iteration considered relying exclusively on SQLite FTS5 for all agent memory and research retrieval. While SQLite FTS5 is exceptional for local keyword search, an institutional research platform requires dense semantic vector embeddings, document versioning, chunk-level citations, multi-user concurrent ingestion, and transaction-safe metadata indexing for SEBI circulars, RBI policies, and company earnings transcripts.

### Decision
1. **Primary RAG Store:** PostgreSQL 16 with the `pgvector` extension is designated as the authoritative research knowledge repository. It handles chunked text, dense vector embeddings, hybrid retrieval (dense cosine + sparse BM25), reranking, source citations, document versioning, and effective statutory timestamps.
2. **Local Cache Only:** SQLite FTS5 is retained strictly as an optional, non-authoritative local agent scratchpad cache for ephemeral prompt context and offline testing.

### Consequences
Authoritative financial research knowledge remains centralized, durable, and semantically searchable, while agent execution nodes can still maintain fast local scratchpads.

---

## ADR-003: Algorithmic Strategy Pipeline — INSPIRED_BY_LEAN

### Status
Accepted

### Context
QuantConnect LEAN's 5-stage algorithm framework (`Universe Selection → Alpha Creation → Portfolio Construction → Risk Management → Execution`) is an industry-standard quantitative abstraction. However, LEAN itself is written in C# (.NET CLR). Importing LEAN or maintaining a C# runtime with `pythonnet` in a Python machine-learning shop introduces severe operational complexity, memory leaks, and debugging nightmares.

### Decision
ArthaAI will NOT implement or wrap LEAN. Instead, ArthaAI implements an independent, native Python 3.11+ Pydantic v2 strategy engine directly adopting the 5-stage conceptual pipeline.
This relationship is formally designated as **`INSPIRED_BY_LEAN`**, not `LEAN_REIMPLEMENTATION`.

### Consequences
ArthaAI gains 100% of the architectural separation of concerns without importing any C# runtime or Pythonnet dependencies.

---

## ADR-004: Microstructure & Order Flow Subsystem Expansion

### Status
Accepted

### Context
Order book dynamics and trade flow contain vital alpha in Indian equity and derivative markets. A simplistic "order flow indicator" fails to capture the true mechanics of order books, aggression, and liquidity absorption.

### Decision
ArthaAI expands market microstructure into a dedicated mathematical subsystem (`artha_ai/microstructure/`):
- `trades.py`: Tick classification using the Lee-Ready algorithm.
- `delta.py` & `cumulative_delta.py`: Volume Delta and Cumulative Volume Delta (CVD).
- `imbalance.py`: Stacked bid/ask volume imbalances.
- `absorption.py`: High-volume price level absorption detection.
- `volume_profile.py`: Session Volume Profile (POC, VAH, VAL).
- `vwap.py`: Anchored VWAP with standard deviation bands.
- `liquidity.py`: Depth sweep cost estimation.
- `orderbook.py`: L2/L3 ladder reconstruction.
- `ofi.py`: Order Flow Imbalance (Cont-Kukanov-Stoikov equation).
Every feature must carry a formal `FeatureDefinition` specifying mathematical formula, inputs, lookback, and dataset lineage.

### Consequences
Provides institutional-grade order flow analytics tailored for tick-level NSE/BSE market data.

---

## ADR-005: Options Subsystem with Data Categorization Standards

### Status
Accepted

### Context
Derivatives models often blur the line between raw market facts (observed data) and speculative model outputs (e.g. dealer inventory positions). Making unverified claims about "smart money / dealer positions" invalidates quantitative rigor.

### Decision
ArthaAI expands the options subsystem (`artha_ai/options/`) and enforces a strict three-tier classification standard:
1. **Observed Data:** Exchange-disseminated facts (LTP, bid/ask, volume, open interest).
2. **Derived Proxy:** Mathematical transformations without speculative assumptions (Black-76 Greeks, IV surface, Max Pain strike, Gamma Exposure profile).
3. **Model Assumption:** Speculative estimates requiring explicit disclosure (dealer positioning proxies based on open interest distribution).

### Consequences
Preserves academic and regulatory integrity; prevents strategies from treating speculative dealer models as observed truth.

---

## ADR-006: Feature Lineage & Traceability (FeatureDefinition)

### Status
Accepted

### Context
Backtest overfitting and silent data drift occur when trading strategies consume features without knowing the exact mathematical formula, historical version, or data lineage.

### Decision
Every quantitative feature must be registered through an immutable `FeatureDefinition` contract:
- `feature_id`, `version`, `formula`, `inputs`, `timeframe`, `lookback`, `point_in_time_safe`, `missing_data_policy`, `normalization`, `dataset_version`, `code_version`.
No strategy in ArthaAI may consume an unregistered or unversioned feature.

### Consequences
Enforces 100% reproducibility and prevents look-ahead bias at the feature layer.

---

## ADR-007: Comprehensive Evaluation Engine

### Status
Accepted

### Context
Judging an algorithmic strategy solely by its Sharpe ratio or total return is a known path to ruin. Strategies must be evaluated across risk tails, execution friction, statistical significance, and stress regimes.

### Decision
ArthaAI expands `EvaluationEngine` into five distinct metric domains:
1. **Performance:** CAGR, Sharpe, Sortino, Calmar, Max Drawdown, Win Rate, Profit Factor, Expectancy, Turnover, Exposure, Leverage.
2. **Risk:** Historical VaR (95%, 99%), CVaR (Expected Shortfall), Tail Loss, Drawdown Duration, Ulcer Index.
3. **Execution:** Average Slippage (bps), Implementation Shortfall, Order Fill Rate, Reject Rate, Partial Fill Frequency.
4. **Statistical Validity:** Deflated Sharpe Ratio (DSR), Probability of Backtest Overfitting (PBO), Purged Cross-Validation, Combinatorial Purged CV (CPCV), Walk-Forward Efficiency.
5. **Robustness:** Performance broken down across regimes: Bull, Bear, Sideways, High Vol, Low Vol, Flash Crash, Opening Gap, Expiry Day, and Major Economic Events (Union Budget, RBI MPC).

### Consequences
Provides institutional allocators with full transparency regarding strategy resilience.

---

## ADR-008: Explicit Environments & Strict 8-Stage Promotion Lifecycle

### Status
Accepted

### Context
Deploying untested or lightly tested quantitative strategies to live broker accounts creates severe financial risk.

### Decision
1. **Environments:** ArthaAI explicitly partitions code execution into three isolated environments: `RESEARCH`, `PAPER`, and `LIVE`. The `LIVE` environment is disabled by default via code and configuration.
2. **8-Stage Promotion Gate:** Strategies must progress sequentially through:
   `IDEA → RESEARCH → BACKTEST → WALK_FORWARD → OUT_OF_SAMPLE → STRESS_TEST → PAPER → PROMOTION`.
   No strategy may skip any stage. Promotion to live trading requires human Risk Officer sign-off in the PostgreSQL control plane.

### Consequences
Eliminates rogue deployments and guarantees every live strategy has passed rigorous out-of-sample and paper trading hurdles.

---

## ADR-009: TradingView Dual Integration Demarcation

### Status
Accepted

### Context
Conflating TradingView's open-source frontend charting library with TradingView's proprietary cloud platform causes architectural confusion regarding data licensing and order execution.

### Decision
ArthaAI cleanly demarcates the two integrations:
- **Integration A (ArthaAI Internal Dashboard):** Uses **TradingView Lightweight Charts (v4.x)**, an open-source (Apache 2.0) client-side HTML5 canvas library embedded in ArthaAI's React UI to render fast candlesticks, order fills, and stop-loss markers.
- **Integration B (External Platform Alerts):** Provides an optional FastAPI webhook endpoint to receive inbound alert signals from external TradingView Pine Script alerts, routing them through ArthaAI's Pre-Trade Risk Engine.
ArthaAI does not assume TradingView provides market data feeds or broker execution APIs.

### Consequences
Zero dependency on external TradingView cloud infrastructure for core trading operations while allowing users to visualize charts cleanly.

---

## ADR-010: Data Quality Engine & Cleanliness Gate

### Status
Accepted

### Context
"Garbage in, garbage out" is the primary cause of quantitative strategy failure. Bad ticks, negative prices, missing bars, and improper split adjustments corrupt both backtesting and live trading.

### Decision
ArthaAI introduces the **`DataQualityEngine`**. All market data feeds (historical Parquet files and real-time WebSocket ticks) must pass through validation gates detecting:
- Missing bars, duplicate ticks, out-of-order timestamps, bad OHLC bounds (High < Low, Close > High), zero/negative prices, volume anomalies, corporate action inconsistencies, contract roll discontinuities, timezone discrepancies, and stale quotes.
Data failing these checks is flagged and quarantined before reaching feature calculators.

### Consequences
Guarantees clean, sanitized inputs for all alpha models and backtesting engines.

---

## ADR-011: Strict UTC Event Time Semantics

### Status
Accepted

### Context
Naive datetime objects and implicit timezone assumptions cause subtle bugs when handling exchange trading hours, daylight saving transitions across global macro assets, and historical ticks.

### Decision
All internal timestamps across ArthaAI (market ticks, bar records, order requests, fills, audit logs) must strictly use **UTC timezone-aware datetimes** (`datetime.timezone.utc`).
Conversion to `Asia/Kolkata` (IST, UTC+5:30) is performed exclusively at the broker ingestion edge and presentation UI layer. Naive datetimes are strictly rejected by Pydantic models.

### Consequences
Eliminates all timezone drift, contract expiry confusion, and bar alignment errors.

---

## ADR-012: Two-Speed Architecture: Strict Signal vs. Reasoning Separation

### Status
Accepted

### Context
Placing LLMs inside the sub-millisecond execution loop is an anti-pattern. LLM inference takes 800ms to 3,000ms, is non-deterministic, and hallucinates mathematical calculations.

### Decision
ArthaAI strictly bifurcates execution into two clock speeds:
- **Fast Quant Loop (Sub-millisecond to 5ms):** Deterministic mathematical execution: Ticks → Polars Features → Microstructure OFI → Deterministic Alpha → Pre-Trade Risk → Smart Execution Router. Zero LLMs.
- **Slow Research Loop (15 minutes to 24 hours):** LLM multi-agent research: Unstructured news, earnings calls, and SEBI filings → PostgreSQL + pgvector RAG → LangGraph multi-agent debate → Validated `MarketRegimeContext`, `RiskContext`, and `PortfolioContext`.
The Fast Loop reads the cached context from Redis in microseconds without waiting for LLM generation.

### Consequences
Guarantees sub-millisecond live execution safety while harnessing the qualitative reasoning power of LLMs for macro research.
