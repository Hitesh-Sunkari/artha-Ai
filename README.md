# ArthaAI — Institutional-Grade Quantitative Algorithmic Trading Framework

[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![License: Proprietary](https://img.shields.io/badge/license-Proprietary-red.svg)](#)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![Type Checked: mypy](https://img.shields.io/badge/type_checked-mypy-blue.svg)](https://mypy-lang.org/)
[![Test Coverage: 87%+](https://img.shields.io/badge/coverage-87%25%2B-brightgreen.svg)](#)

ArthaAI is a production-quality, research-grade quantitative trading framework engineered specifically for the Indian financial markets (NSE, BSE, MCX). It strictly isolates deterministic financial contracts, market mechanics, and data normalization from outer external dependencies, predictive alpha models, and execution gateways.

---

## Architectural Principles

1. **Strict Dependency Direction**: Outer layers depend on inner layers; inner layers never depend on outer layers or external frameworks.
   $$\text{Core} \longrightarrow \text{Data / Features} \longrightarrow \text{Strategy} \longrightarrow \text{Execution / Backtest} \longrightarrow \text{Control Plane}$$
2. **Provider Isolation**: No strategy, alpha model, or backtest ever consumes raw provider-specific data directly. All data passes through:
   $$\text{Provider} \to \text{Ingestion} \to \text{Raw Storage (JSONL + SHA-256)} \to \text{Normalization} \to \text{Quality Engine} \to \text{Canonical Schema} \to \text{Parquet Store} \to \text{DuckDB Analytics}$$
3. **Point-in-Time Correctness**: Rigorous invariant:
   $$\text{event\_time} \le \text{available\_time} \le \text{decision\_time}$$
   All timestamps are stored in UTC with explicit timezone awareness. Indian Standard Time (IST, `Asia/Kolkata`) is strictly used for exchange session and calendar arithmetic.
4. **Zero-Lookahead Guarantee**: Corporate actions (splits, bonuses, dividends) and instrument identifier renames are versioned point-in-time. Backward adjustment factors are never applied retroactively to unadjusted historical views without explicit point-in-time timestamping.
5. **Deterministic Foundation**: Built from first principles in modern Python 3.11+ using PyArrow, DuckDB, Pydantic v2, and standard numerical constructs.

---

## Repository Structure

```
ArthAI/
├── src/arthaai/
│   ├── core/                        # Deterministic core contracts & mechanics
│   │   ├── clock/                   # Market clock, session states, UTC/IST timezone handling
│   │   ├── config.py                # System configuration & live trading guardrails
│   │   ├── errors.py                # Canonical domain exception hierarchy
│   │   ├── events/                  # Point-in-time market events, serialization, event bus
│   │   ├── instruments/             # Instrument definitions (Equity, Index, F&O, Commodity)
│   │   ├── logging.py               # Structured JSON logging
│   │   ├── market/                  # Market snapshot contracts
│   │   ├── orders/                  # Order models, execution reports, lifecycle states
│   │   ├── portfolio/               # Position and portfolio state contracts
│   │   └── signals/                 # Framework-neutral alpha insights
│   ├── control_plane/               # Governance, audit & datasets
│   │   ├── datasets/                # Dataset manifest & JSONL catalog registry
│   │   └── market_rules/            # Statutory Indian tax (STT, Stamp Duty, GST) & exchange fee rules
│   ├── data/                        # Indian Market Data Platform
│   │   ├── cache/                   # Thread-safe LRU cache with TTL expiration
│   │   ├── calendar/                # Versioned market calendar, NSE holidays, F&O expiry rules
│   │   ├── instrument_master/       # Point-in-time safe instrument master (symbol/ISIN resolution)
│   │   ├── normalization/           # Provider-neutral normalizers (OHLCV, Trade, Quote, Options, News)
│   │   ├── pipeline/                # DatasetBuilder ETL pipeline orchestrator
│   │   ├── providers/               # Protocol definitions (OHLCV, Trades, Quotes, L2/L3, Options, News)
│   │   ├── quality/                 # 14-rule data quality validation engine & QualityRunner
│   │   ├── raw/                     # Append-only JSONL raw store with SHA-256 verification
│   │   ├── research/                # In-process DuckDB analytical research engine (zero-copy PyArrow)
│   │   ├── schemas/                 # Pydantic v2 canonical schemas (OHLCVBar, Trade, Quote, etc.)
│   │   └── storage/                 # Partitioned Parquet storage engine (PyArrow, Snappy)
│   ├── features/                    # Feature lineage and computation contracts
│   ├── integrations/                # External provider adapters (boundary layer)
│   │   ├── openbb_adapter.py        # Contract-complete OpenBB adapter with live credential guards
│   │   └── simulated_adapter.py     # Deterministic fixture/mock provider generator
│   └── strategy/                    # Framework-neutral strategy, risk, and execution interfaces
├── docs/                            # Institutional architectural documentation
│   ├── DATA_ARCHITECTURE.md         # End-to-end data platform architecture & storage specification
│   ├── INDIAN_DATA_CAPABILITY_MATRIX.md # Provider capability assessment (OpenBB, TrueData, Zerodha, etc.)
│   ├── ORDER_FLOW_DATA_REQUIREMENTS.md  # Microstructure, L2/L3, tick-level order flow requirements
│   ├── DATA_QUALITY.md              # Quality engine specification & 14 validation rules
│   ├── DATA_LINEAGE.md              # Provenance, SHA-256 audit, and reproducibility standards
│   ├── STEP0_PRINCIPAL_ENGINEER_REVIEW.md # Adversarial architecture & quantitative audit
│   └── STEP0.5_QUANT_ARCHITECTURE_AUDIT.md # Indian market microstructure & statutory audit
├── tests/
│   ├── architecture/                # Layer boundary and cyclic dependency tests
│   ├── data/                        # 14 data platform test suites (all passing)
│   └── unit/                        # Core unit test suites (all passing)
└── pyproject.toml                   # Project metadata, dependencies & tool configs
```

---

## Step 2 Data Platform Features

### 1. Canonical Schemas (`data/schemas/`)
- `OHLCVBar`: Multi-frequency candlestick bars (`TICK`, `M1`, `M5`, `M15`, `H1`, `D1`), strict $O \le H, L \le H, L \le C$ invariant, optional VWAP, trade count, volume.
- `Trade`: High-frequency trade print with aggressor side classification (`BUYER`, `SELLER`, `UNKNOWN`), sequence numbers.
- `Quote` & `L1Quote`: Best bid/ask quote with depth validation ($ask \ge bid$).
- `OrderBookSnapshot` & `OrderBookUpdate`: Full L2 (top 5/20) and L3 market depth snapshots with crossed book detection.
- `OptionContract` & `OptionChainSnapshot`: Indian index and equity F&O chains with strike price, option type (`CE`/`PE`), expiry date, Greeks, open interest.
- `CorporateAction`: Ex-date, record date, ratio, and dividend amounts for point-in-time adjustments.
- `NewsArticle` & `EconomicEvent`: Sentiment, source, headlines, and economic impact metrics.

### 2. Provider Abstraction & Adapters (`data/providers/`, `integrations/`)
- 9 distinct abstract protocols: `OHLCVProvider`, `TickTradeProvider`, `QuoteProvider`, `OrderBookProvider`, `OptionChainProvider`, `CorporateActionProvider`, `NewsProvider`, `EconomicCalendarProvider`, `InstrumentProvider`.
- `OpenBBAdapter`: Contract-complete adapter with clean distinction across `LIVE`, `MOCK`, `FIXTURE`, and `UNAVAILABLE` modes. Fails gracefully when credentials or packages are missing.
- `SimulatedAdapter`: Fully deterministic synthetic fixture generator seeded for reproducible CI/CD testing.

### 3. Raw Storage Layer (`data/raw/`)
- Append-only JSONL format organized by provider, domain, and date.
- SHA-256 checksums computed at write time and validated on read.
- Tamper detection ensures historical data immutability.

### 4. Data Quality Engine (`data/quality/`)
14 deterministic quality validation rules:
- `OHLCVHighLowRule`: Verifies $H \ge \max(O, C)$ and $L \le \min(O, C)$.
- `OHLCVPositivePriceRule`: Strictly rejects negative or zero prices.
- `OHLCVZeroVolumeRule`: Flags zero-volume bars during active trading sessions.
- `TimestampMonotonicityRule`: Guarantees sequential order of timestamps.
- `DuplicateTimestampRule`: Identifies and flags conflicting duplicate bars.
- `StalePriceRule`: Catches flat, unmoving quotes across consecutive bars.
- `SessionCoverageRule`: Verifies complete coverage during NSE trading hours (09:15–15:30 IST).
- `CrossedBookRule`: Flags inverted books where best bid exceeds best ask.
- `TradeSequenceMonotonicityRule`: Detects dropped or out-of-order execution prints.
- `CorporateActionPriceDiscontinuityRule`: Flags unadjusted price drops on ex-dates without matching corporate action records.

### 5. Parquet Storage & DuckDB Analytics (`data/storage/`, `data/research/`)
- Storage partitioned by `exchange / asset_class / year / month` using PyArrow and Snappy compression.
- Embedded metadata preserving schema version, data mode, and write timestamp.
- In-process DuckDB engine executing analytical queries directly over Parquet files, returning zero-copy PyArrow tables.

### 6. Versioned Market Calendar & Instrument Master (`data/calendar/`, `data/instrument_master/`)
- Provenance-backed NSE holiday list for 2024–2025 sourced directly from official NSE circulars.
- Accurate calculation of NSE monthly F&O expiry (last Thursday of each month, shifting to Wednesday if Thursday is a holiday).
- Point-in-time safe instrument master resolving symbols, ISINs, and lot sizes at any arbitrary historical timestamp.

---

## Installation & Setup

### Requirements
- Python 3.11 or Python 3.12
- Virtual environment recommended

### Install in Editable Mode
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install package with development dependencies
python -m pip install -e ".[dev]"
```

---

## Verification & Testing

The repository maintains an institutional-grade test suite with strict architecture boundary enforcement and over 87% line coverage:

```bash
# Run full pytest suite with branch coverage enforcement
python -m pytest

# Run fast linting and formatting check
python -m ruff check src/ tests/

# Run static type checking
python -m mypy src/arthaai
```

---

## Architecture Boundaries

The architecture enforces strict acyclic layer dependencies verified by automated tests:
1. `core` must never import from `data`, `features`, `strategy`, `execution`, `control_plane`, or `integrations`.
2. `data` must never import from `strategy`, `features`, `execution`, or `integrations`.
3. `strategy` must never import from external broker SDKs, FastAPI, LangGraph, or database implementations.
4. Provider adapters (`integrations/`) reside exclusively at the external boundary and translate into canonical `arthaai` schemas.

---

## License

Copyright © 2024–2026 ArthaAI Engineering Team. Proprietary and confidential. All rights reserved.
