# ArthaAI — Architecture Freeze & Quantitative Specification
**Document Status:** FROZEN & RATIFIED (Phase 0.75)  
**Date:** September 2026  
**Auditor:** Quantitative Systems Architect & Independent Principal Reviewer  

---

## 1. Verified Repository Statuses & Clean-Room Boundaries

| Repository | Current Architecture | Verified License | Maintenance Status | Operational Role in ArthaAI |
|---|---|---|---|---|
| **TradingAgents** | LangGraph DAG + LLM prompt chains | **Apache 2.0** | Active academic research | **Prompt / Persona Inspiration Only.** Psychological personas (Bull, Bear, Macro, Risk) adapted into Indian market context. Zero runtime code dependency. |
| **OpenBB** | Modular Python platform (v4.x) | **AGPL-3.0-only** *(May 2024)* | Very active | **REJECTED.** Viral AGPL-3.0 copyleft risk. Replaced by clean-room native async broker connectors (`artha_ai.data.providers`). |
| **Paperclip** | Node.js + TypeScript + React/Vite | **MIT** | Active | **Relational Governance Schema Adapted; Node.js Runtime Rejected.** Task/audit metadata schemas ported to PostgreSQL. |
| **Hermes Agent** | Python (asyncio) + SQLite FTS5 | **MIT** | Very active | **Local Cache Pattern Adapted; 12,000-file Repo Rejected.** SQLite FTS5 pattern adapted for optional local agent scratchpad memory. |
| **NautilusTrader** | Rust core + Cython/PyO3 Python SDK | **LGPL-3.0-or-later** | Production grade | **Pluggable Verification Backend.** Isolated behind `ResearchBackend` as `NautilusBackend` for institutional tick-level order book queue matching. |
| **VectorBT** | NumPy + Pandas + Numba (LLVM) | **Apache 2.0 + Commons Clause v1.0** | Community in maintenance | **Optional Plugin.** Isolated behind `VectorBTBackend`. Core research engine is `PolarsBackend`. |
| **QuantConnect LEAN** | C# (.NET 8/9) + Pythonnet | **Apache 2.0** | Institutional production grade | **INSPIRED_BY_LEAN (Not Reimplementation).** 5-Stage pipeline architecture (`Universe → Alpha → Portfolio → Risk → Execution`) implemented purely and natively in Python/Pydantic. Zero C#/.NET runtime. |
| **LangGraph** | Python Pregel state machine | **MIT** | Very active | **Quarantined to Asynchronous Slow Loop.** Cyclical graph execution for macro research and post-market debriefs; forbidden from the live execution hot path. |

---

## 2. Latency Tiers & Performance Benchmark Targets

Latency metrics are **benchmark targets to be experimentally measured**, not guaranteed marketing claims. ArthaAI strictly separates latency tiers across operational environments:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               LATENCY TIERS & TARGETS                                   │
├──────────────────────────┬──────────────────────┬────────────────────────────────────────┤
│ Latency Tier             │ Target Latency       │ Architectural Boundaries & Assumptions │
├──────────────────────────┼──────────────────────┼────────────────────────────────────────┤
│ **1. Signal Latency**    │ **Target: < 5 ms**   │ Tick arrival at WebSocket buffer       │
│    *(Fast Quant Loop)*   │                      │ → Polars features → Deterministic Alpha│
│                          │                      │ → In-memory Pre-Trade Risk check.      │
├──────────────────────────┼──────────────────────┼────────────────────────────────────────┤
│ **2. Paper Execution**   │ **Target: 10 - 50 ms**│ Simulated matching engine with local   │
│                          │                      │ queue delay and synthetic slippage.    │
├──────────────────────────┼──────────────────────┼────────────────────────────────────────┤
│ **3. Live Execution**    │ **Target: 50 - 300 ms│ Network RTT to broker servers in India │
│    *(Retail Broker APIs)*│ *(Broker Dependent)* │ (Zerodha, Angel One) + broker OMS      │
│                          │                      │ order routing + exchange ACK.          │
├──────────────────────────┼──────────────────────┼────────────────────────────────────────┤
│ **4. Research Latency**  │ **Target: < 2 sec**  │ Polars vectorized parameter sweep over │
│    *(Offline Sweeps)*    │                      │ 10,000 combinations (1 year, 1-min).   │
├──────────────────────────┼──────────────────────┼────────────────────────────────────────┤
│ **5. Slow Loop (LLM)**   │ **Target: 10 - 45 sec│ Asynchronous multi-agent debate,       │
│    *(Research/Regime)*   │                      │ news ingestion, pgvector RAG queries.  │
└──────────────────────────┴──────────────────────┴────────────────────────────────────────┘
```
*Note: ArthaAI does NOT claim sub-microsecond HFT latency. Retail broker REST/WebSocket APIs operate over standard internet protocols with physical latency bounds.*

---

## 3. Storage Architecture: Multi-Tiered Division of Labor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE ARCHITECTURE                              │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ Technology       │ Assigned Responsibility                                  │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **PostgreSQL 16**│ Authoritative transactional store: user accounts,       │
│                  │ strategy registry, experiment runs, agent execution      │
│                  │ traces, order audit ledgers, and document metadata.      │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **pgvector**     │ Primary RAG knowledge engine: chunked embeddings, hybrid │
│                  │ dense/sparse retrieval, reranking, source citations,     │
│                  │ document versioning, and effective timestamps.           │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **Apache Parquet**│ Immutable, compressed columnar historical market data:  │
│                  │ raw ticks, 1-min bars, daily bars, order book depth.     │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **DuckDB**       │ Embedded OLAP query engine for quant research: multi-    │
│                  │ threaded SQL analysis directly over Parquet files.       │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **Redis 7**      │ Transient state: real-time L1/L2 quotes, active WebSocket│
│                  │ pub/sub, broker rate-limit token buckets, worker queues. │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **SQLite FTS5**  │ Optional local agent scratchpad cache: non-authoritative │
│                  │ working memory, episodic prompt context, offline mode.   │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### RAG Document Knowledge Architecture (PostgreSQL + pgvector)

Authoritative research knowledge (SEBI circulars, RBI monetary policy, earnings call transcripts, broker reports) is managed exclusively in PostgreSQL + pgvector:

```python
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class DocumentMetadata(BaseModel):
    document_id: str
    title: str
    source_type: str             # "SEBI_CIRCULAR", "RBI_POLICY", "EARNINGS_TRANSCRIPT", "NEWS"
    author_publisher: str
    published_timestamp: datetime
    effective_from_timestamp: datetime
    effective_to_timestamp: Optional[datetime] = None
    version: str = "1.0"
    source_url: Optional[str] = None
    checksum_sha256: str

class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    chunk_index: int
    text_content: str
    embedding: List[float]       # pgvector vector(1536) or vector(768)
    token_count: int
    section_heading: Optional[str] = None

class RetrievalResult(BaseModel):
    chunk_id: str
    document_id: str
    text_content: str
    dense_score: float           # Cosine similarity
    sparse_score: float          # BM25 / FTS rank
    hybrid_score: float          # Reciprocal Rank Fusion (RRF)
    rerank_score: Optional[float] = None
    citation: str                # e.g. "SEBI Circular SEBI/HO/MRD/2024/11, Section 3.2"
```

---

## 4. Indian Market Rules: Versioned Regulatory Engine

All market rules are dynamic and version-controlled. **Zero hardcoded values in strategy code.**

### Authoritative Reference Data Verified (Effective Nov 2024 / Finance Act 2024)
1. **Securities Transaction Tax (STT):**
   - Futures: 0.02% on turnover value (sell side)
   - Options: 0.1% on premium value (sell side)
   - Option Exercise: 0.125% on intrinsic value (buyer side)
   - Equity Delivery: 0.1% on buy and sell; Equity Intraday: 0.025% on sell
2. **Stamp Duty:**
   - Equity Delivery: 0.015% (buy); Equity Intraday: 0.003% (buy)
   - Futures: 0.002% (buy); Options: 0.003% (buy)
3. **Statutory & Exchange Turnover Fees:**
   - NSE Exchange Turnover: 0.00297% (equity), 0.00173% (futures), 0.03503% (options premium)
   - SEBI Turnover Fee: ₹10 per crore (0.0001%)
   - GST: 18% levied on (Brokerage + Exchange Turnover Charges + SEBI Charges)
4. **NSE Lot Sizes (Nov 20, 2024 Mandate):**
   - Nifty 50: 75
   - BankNifty: 30
   - FinNifty: 65
   - MidcapNifty: 120
5. **Weekly Expiry Rules (Nov 20, 2024 Mandate):**
   - NSE: Only Nifty 50 has weekly options (Thursday). BankNifty/FinNifty/MidcapNifty weekly options discontinued.
   - BSE: Sensex has weekly options (Friday).
6. **Market-Wide Position Limit (MWPL) F&O Ban:**
   - Entry: Aggregate Open Interest > 95% of MWPL
   - Exit: Aggregate Open Interest < 80% of MWPL
   - Ban Period Penalty: Minimum ₹1,00,000 for creating new positions during ban.
7. **NSE Freeze Quantities:**
   - Nifty 50: 1,800 shares (24 lots)
   - BankNifty: 900 shares (30 lots)
8. **Circuit Breakers & Price Bands:**
   - Index MWCB: 10%, 15%, 20% index movements trigger coordinated market-wide trading halts.
   - Non-F&O Equities: Fixed daily price bands (2%, 5%, 10%, 20%).
   - F&O Equities: Dynamic price bands (initial 10%, flexed by 5% after cooling-off periods).

### Data Contract: `IndianMarketRules`

```python
from datetime import date
from typing import Optional, Any
from pydantic import BaseModel
from enum import Enum

class RuleType(str, Enum):
    TAX_STT = "TAX_STT"
    TAX_STAMP_DUTY = "TAX_STAMP_DUTY"
    EXCHANGE_TURNOVER_FEE = "EXCHANGE_TURNOVER_FEE"
    SEBI_TURNOVER_FEE = "SEBI_TURNOVER_FEE"
    GST_RATE = "GST_RATE"
    DERIVATIVE_LOT_SIZE = "DERIVATIVE_LOT_SIZE"
    DERIVATIVE_FREEZE_QTY = "DERIVATIVE_FREEZE_QTY"
    DERIVATIVE_WEEKLY_EXPIRY = "DERIVATIVE_WEEKLY_EXPIRY"
    MWPL_BAN_THRESHOLD = "MWPL_BAN_THRESHOLD"
    MWPL_EXIT_THRESHOLD = "MWPL_EXIT_THRESHOLD"
    CIRCUIT_BREAKER_INDEX = "CIRCUIT_BREAKER_INDEX"
    PRICE_BAND_EQUITY = "PRICE_BAND_EQUITY"

class IndianMarketRule(BaseModel):
    rule_id: str
    rule_type: RuleType
    instrument: str                     # "NIFTY", "BANKNIFTY", "EQUITY_DEFAULT", "ALL"
    exchange: str                       # "NSE", "BSE", "MCX"
    value: Any                          # Numeric rate, lot count, or boolean flag
    effective_from: date
    effective_to: Optional[date] = None # None means currently active
    statutory_source: str               # "SEBI/HO/MRD/2024/11", "Finance Act 2024"
    version: str
```

---

## 5. Event Time & Timezone Semantics

All market events, ticks, bars, order requests, and fills must strictly use **UTC internally**.
- **Rule:** Never use naive `datetime.datetime` instances anywhere in the codebase.
- **Conversion:** Conversion to `Asia/Kolkata` (IST, UTC+5:30) is performed strictly at the broker ingestion edge and UI display layer.

```python
from datetime import datetime, timezone
import zoneinfo

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        raise ValueError("Naive datetime rejected: explicit timezone required")
    return dt.astimezone(timezone.utc)

def to_ist(dt: datetime) -> datetime:
    return to_utc(dt).astimezone(IST)
```

---

## 6. Microstructure & Order Flow Subsystem

Market microstructure is expanded into formal, mathematically specified components:

```
artha_ai/microstructure/
├── trades.py              — Tick classification (Lee-Ready algorithm), buy/sell aggressor tags
├── delta.py               — Volume Delta per bar: V_buyer_initiated - V_seller_initiated
├── cumulative_delta.py    — Session Cumulative Volume Delta (CVD) & delta divergence detection
├── imbalance.py           — Stacked Bid/Ask volume imbalance (e.g. 300% bid over ask at level)
├── absorption.py          — Absorption detection: high volume at level with zero price progress
├── volume_profile.py      — Session Volume Profile: POC (Point of Control), VAH, VAL
├── vwap.py                — Anchored VWAP with 1st, 2nd, and 3rd standard deviation bands
├── liquidity.py           — Market depth liquidity metrics, sweep cost estimation
├── orderbook.py           — Level 2 / Level 3 ladder reconstruction and depth updates
├── ofi.py                 — Order Flow Imbalance (Cont, Kukanov, Stoikov equation)
└── regime.py              — Microstructure state: Aggressive, Passive, Absorbing, Exhausting
```

### Microstructure Feature Contract

Every microstructure feature must satisfy the rigorous `FeatureDefinition`:
```python
class MicrostructureFeature(BaseModel):
    feature_id: str                # e.g. "CVD_DIVERGENCE_5M"
    version: str = "1.0.0"
    formula: str                   # "CVD_t - CVD_{t-k} where sign(P_t - P_{t-k}) != sign(CVD_t - CVD_{t-k})"
    inputs: List[str]              # ["tick_trade_price", "tick_trade_qty", "tick_trade_side"]
    timeframe: str                 # "1m", "5m", "tick"
    lookback_bars: int             # 20
    point_in_time_safe: bool = True
    missing_data_policy: str       # "FORWARD_FILL", "ZERO", "RAISE"
    normalization: str             # "Z_SCORE", "MIN_MAX", "NONE"
    dataset_lineage: str           # "NSE_NIFTY_TICKS_2024_Q4"
```

---

## 7. Options & Derivatives Subsystem

```
artha_ai/options/
├── chain.py               — Live & historical strike ladder builder with Open Interest
├── iv.py                  — Implied Volatility solver (Brent-Dekker / Letourneau algorithm)
├── greeks.py              — Analytical Black-76 & Bjerksund-Stensland Greeks (Delta, Gamma, Theta, Vega, Rho)
├── volatility_surface.py  — Strike-by-expiry IV smile/skew interpolation (SVI model)
├── gamma_exposure.py      — Market Gamma Exposure (GEX) profile across strikes
├── gamma_levels.py        — Gamma Flip Point, Absolute Gamma Peak, Call/Put Walls
├── expiry.py              — Weekly vs Monthly contract resolution & auto-roll logic
└── dealer_position_proxy.py — Derived proxy of market-maker hedging pressure
```

### Data Categorization Standard
To preserve scientific integrity, every options feature must be explicitly classified:
1. **Observed Data:** Exchange-disseminated facts (Last Traded Price, Bid/Ask, Traded Volume, Open Interest).
2. **Derived Proxy:** Mathematical transformations of observed data without speculative assumptions (Option Greeks, Implied Volatility, Gamma Exposure profile, Max Pain strike).
3. **Model Assumption:** Speculative estimates requiring explicit disclosure (Dealer net positioning proxy, assumption of dealer long/short gamma inventory based on open interest).

---

## 8. Feature Lineage & Governance Contract

Every quantitative feature consumed by any strategy, model, or agent must carry an immutable lineage descriptor:

```python
class FeatureDefinition(BaseModel):
    feature_id: str                # e.g. "FEAT_SUPERTREND_10_3"
    version: str                   # Semantic version: "1.2.0"
    formula: str                   # "Upper: (H+L)/2 + 3*ATR(10); Lower: (H+L)/2 - 3*ATR(10)"
    inputs: List[str]              # ["high", "low", "close"]
    timeframe: str                 # "5m"
    lookback: int                  # 10
    point_in_time_safe: bool       # True (cannot look into future bars)
    missing_data_policy: str       # "DROP", "INTERPOLATE", "FORWARD_FILL"
    normalization: str             # "Z_SCORE", "ROBUST_SCALER", "NONE"
    dataset_version: str           # "NSE_EQ_5M:v2.4"
    code_version: str              # Git SHA: "e4d2f8a"
```

---

## 9. Comprehensive Evaluation Engine

The `EvaluationEngine` computes multidimensional tear sheets across five distinct domains:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EVALUATION METRICS SUITE                           │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ Category         │ Metrics Computed                                         │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **Performance**  │ CAGR, Sharpe Ratio, Sortino Ratio, Calmar Ratio,         │
│                  │ Max Drawdown, Win Rate, Profit Factor, Expectancy,        │
│                  │ Portfolio Turnover, Capital Exposure, Average Leverage.  │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **Risk & Tails** │ Historical Value-at-Risk (VaR 95%, 99%), Conditional VaR │
│                  │ (CVaR/Expected Shortfall), Tail Loss, Drawdown Duration, │
│                  │ Time-to-Recovery, Ulcer Index.                           │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **Execution**    │ Average Slippage (bps), Implementation Shortfall,        │
│                  │ Order Fill Rate, Order ACK Latency, Order Reject Rate,   │
│                  │ Partial Fill Frequency.                                  │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **Statistical    │ Deflated Sharpe Ratio (DSR), Probability of Backtest     │
│   Validity**     │ Overfitting (PBO), Purged Cross-Validation, Combinatorial│
│                  │ Purged CV (CPCV), Walk-Forward Efficiency, Bootstrap CIs.│
├──────────────────┼──────────────────────────────────────────────────────────┤
│ **Robustness &   │ Performance partitioned across market regimes:           │
│   Stress**       │ Bull Market, Bear Market, Sideways/Chop, High Volatility,│
│                  │ Low Volatility, Flash Crash, Opening Gap, Weekly Expiry, │
│                  │ Major Economic Events (Union Budget, RBI MPC Decisions). │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 10. Environments & Strict Promotion Governance

ArthaAI operates three strictly isolated environments:
1. **`RESEARCH`:** Sandboxed exploration, feature engineering, and vectorized sweeps.
2. **`PAPER`:** Live WebSocket feeds connected to a realistic simulated execution engine.
3. **`LIVE`:** Real capital broker dispatch. **DISABLED BY DEFAULT via configuration and environment variables.**

### Strict Strategy Promotion Gate

No strategy may skip any step in the promotion lifecycle:

```
[ 1. IDEA ]
     │
     ▼
[ 2. RESEARCH ] ──► Formulate hypothesis & define feature lineage
     │
     ▼
[ 3. BACKTEST ] ──► Vectorized & event simulation over historical datasets
     │
     ▼
[ 4. WALK_FORWARD ] ──► Rolling in-sample optimization & out-of-sample testing
     │
     ▼
[ 5. OUT_OF_SAMPLE ] ──► Blind evaluation on strictly quarantined out-of-sample data
     │
     ▼
[ 6. STRESS_TEST ] ──► Regime robustness (crash, budget day, high volatility) + DSR/PBO check
     │
     ▼
[ 7. PAPER ] ──► Minimum 30 calendar days of live paper trading with realistic slippage
     │
     ▼
[ 8. PROMOTION ] ──► Human Risk Officer sign-off in PostgreSQL control plane
     │
     ▼
[ LIVE EXECUTION ] (Strict position size caps enforced by Pre-Trade Risk Engine)
```

---

## 11. TradingView Architecture: Clean Demarcation

ArthaAI distinguishes between two completely different TradingView integrations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRADINGVIEW INTEGRATIONS                            │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ Integration A: Internal UI    │ Integration B: External Platform            │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ **TradingView Lightweight     │ **TradingView Platform & Webhooks**         │
│ Charts (v4.x)**               │                                             │
│ • Client-side Canvas/WebGL    │ • Pine Script strategy alerts               │
│ • Embedded in ArthaAI React   │ • Inbound webhook endpoint in FastAPI       │
│ • Visualizes 100,000+ ticks   │ • Consumes alert payloads to trigger        │
│ • Displays order fills, stop  │   ArthaAI risk-vetted orders                │
│   losses, and agent reasoning │ • Optional export of ArthaAI indicator data │
│ • Zero license fee (Apache 2) │ • Does NOT rely on TV for execution/data    │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 12. Data Quality Engine

Every dataset, historical file, and live market feed must pass through the **`DataQualityEngine`** before entering the feature calculation pipeline:

```python
class DataQualityReport(BaseModel):
    dataset_id: str
    total_records_checked: int
    missing_bars_detected: int
    duplicate_ticks_detected: int
    out_of_order_timestamps: int
    bad_ohlc_anomalies: int         # e.g. High < Low, Close > High, Negative Price
    zero_volume_bars: int
    corporate_action_splits_adjusted: bool
    contract_roll_discontinuities: int
    timezone_inconsistencies: int
    stale_quotes_dropped: int
    cross_source_divergence_pct: float
    passed_quality_gate: bool
```

---

## 13. Signal vs. Reasoning Separation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LLM RESEARCH REASONING                             │
│ • Operates asynchronously in the Slow Loop (15 min - 24 hours)          │
│ • Synthesizes unstructured news, SEBI circulars, earnings transcripts   │
│ • Produces: MarketRegimeContext, RiskContext, PortfolioContext          │
│ • Nature: Exploratory, probabilistic, contextual                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Validated via Pydantic Schema
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   DETERMINISTIC QUANTITATIVE ENGINE                     │
│ • Operates in the Fast Loop (Tick-to-Trade: <50µs to 5ms)               │
│ • Processes L1/L2 ticks, Order Flow OFI, Options Greeks                 │
│ • Generates: Insight, PortfolioTarget, OrderRequest                     │
│ • Enforces: Hard Pre-Trade Risk limits, MWPL ban, Price bands, Margin   │
│ • Nature: 100% Mathematical, deterministic, zero hallucination          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Final Repository Structure

```
e:\ArthAI/
├── docs/                                 — Architecture & governance specifications
│   ├── ARCHITECTURE_FREEZE.md            — This ratified specification
│   ├── ARCHITECTURE_DECISIONS.md         — Architecture Decision Records (ADRs)
│   ├── LICENSE_AUDIT.md                  — Third-party legal & license audit
│   ├── PERFORMANCE_AUDIT.md              — Benchmark specifications & targets
│   └── REFERENCE_REUSE_MATRIX.md         — Reference project evaluation
├── reference/                            — 8 reference repos (read-only research)
├── artha_ai/                             — Application Source Code
│   ├── core/                             — Pure Pydantic domain models
│   │   ├── rules.py                      — Versioned IndianMarketRules engine
│   │   ├── instruments.py                — Equity, Futures, Options contracts
│   │   ├── events.py                     — Ticks, Bars, Depth, Orders, Fills, Positions
│   │   ├── context.py                    — MarketRegimeContext, RiskContext, PortfolioContext
│   │   └── time.py                       — UTC timezone enforcement & IST conversion
│   ├── data/                             — Ingestion, quality & storage
│   │   ├── quality.py                    — DataQualityEngine
│   │   ├── providers/                    — Native async connectors: Kite, SmartAPI, Upstox, NSE
│   │   ├── parquet_store.py              — Historical tick & bar storage
│   │   └── orderbook.py                  — L2/L3 ladder reconstructor
│   ├── microstructure/                   — Order flow & microstructure features
│   │   ├── trades.py, delta.py, cumulative_delta.py, imbalance.py
│   │   ├── absorption.py, volume_profile.py, vwap.py, liquidity.py, ofi.py
│   ├── options/                          — Derivatives & Greek analytics
│   │   ├── chain.py, iv.py, greeks.py, volatility_surface.py
│   │   ├── gamma_exposure.py, gamma_levels.py, expiry.py, dealer_position_proxy.py
│   ├── quant/                            — High-performance quantitative indicators
│   │   ├── lineage.py                    — FeatureDefinition contract
│   │   ├── indicators.py                 — SIMD Supertrend, EMA, ATR, RSI
│   │   └── screener.py                   — Vectorized combinatorial parameter screener
│   ├── strategy/                         — INSPIRED_BY_LEAN 5-Stage Pipeline
│   │   ├── base.py                       — Strategy, Insight, Target interfaces
│   │   ├── universe.py                   — Point-in-time universe selection
│   │   ├── alpha.py                      — Deterministic alpha models
│   │   ├── portfolio.py                  — Capital allocation & Equal Risk Contribution
│   │   ├── risk.py                       — Pre-trade risk, MWPL ban, price bands
│   │   └── execution.py                  — Smart order routing & lot-slicing
│   ├── intelligence/                     — Slow-Loop Asynchronous AI Subsystem
│   │   ├── rag/                          — PostgreSQL + pgvector RAG engine
│   │   ├── memory/                       — Optional SQLite FTS5 local cache
│   │   ├── personas/                     — Macro, Fundamental, Sentiment, Risk agents
│   │   └── graph/                        — LangGraph research debate workflow
│   ├── backtest/                         — Multi-Backend Simulation Layer
│   │   ├── base.py                       — ResearchBackend interface
│   │   ├── polars_backend.py             — Fast vectorized bar simulator
│   │   ├── nautilus_backend.py           — Institutional tick-matching plugin
│   │   └── integrity.py                  — Anti-bias checks, DSR, PBO, Purged CV
│   ├── evaluation/                       — Comprehensive Performance & Risk Suite
│   │   ├── performance.py, risk.py, execution.py, statistical.py, robustness.py
│   ├── control_plane/                    — 9-Registry Governance System
│   │   ├── dataset_registry.py, feature_registry.py, strategy_registry.py
│   │   ├── experiment_registry.py, market_rule_registry.py, promotion_registry.py
│   └── gateway/                          — API & Dashboard
│       ├── server.py                     — FastAPI REST & WebSocket server
│       ├── webhooks.py                   — Inbound TradingView alert handler
│       └── dashboard/                    — React + TradingView Lightweight Charts
├── tests/                                — Unit, integration, and benchmark tests
├── pyproject.toml                        — Dependencies & tool configs
└── README.md
```
