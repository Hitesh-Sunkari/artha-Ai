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

## Multi-Agent Architecture & Orchestration

ArthaAI integrates a seven-specialist multi-agent intelligence pipeline engineered on **Google ADK** and **CrewAI**, interoperating over **FastMCP** (Model Context Protocol) and the official **A2A Protocol** (JSON-RPC 2.0):

```
                   ┌──────────────────────────────────────────────┐
                   │    Client Web Terminal / Research REST API   │
                   └───────────────────────┬──────────────────────┘
                                           │
                                           ▼
                   ┌──────────────────────────────────────────────┐
                   │  Google ADK Central Research Manager (Coord) │
                   └──────┬──────────────────────┬─────────┬──────┘
                          │                      │         │
             ┌────────────▼──────────┐           │         └───────────┐
             │ FastMCP Server Engine │           │                     │
             │  • query_market_data  │           ▼                     ▼
             │  • calculate_statutory│   ┌───────────────┐     ┌───────────────┐
             └────────────┬──────────┘   │   Thread-Safe │     │  A2A Protocol │
                          │              │   Blackboard  │     │ Client Bridge │
                          ▼              │  Shared State │     └───────┬───────┘
             ┌───────────────────────┐   └───────────────┘             │
             │   Google ADK Fleet    │                                 ▼
             │ • Quant Specialist    │                         ┌───────────────┐
             │ • Microstructure Spec │                         │ CrewAI Suite  │
             │ • Risk Validator Gate │                         │ • News/Macro  │
             └───────────────────────┘                         │ • Filings Spec│
                                                               │ • Adversarial │
                                                               └───────────────┘
```

### Seven Specialist Agents
1. **Research Manager (`adk_research_manager` - Google ADK)**: Supervisory coordinator managing request intake, Blackboard initialization, pattern dispatch, and Pydantic v2 final report synthesis.
2. **Quant Specialist (`adk_quant_specialist` - Google ADK)**: Invokes FastMCP `query_market_data` over DuckDB/Parquet storage; calculates returns, realized volatility, SMA, EMA, and RSI.
3. **Microstructure Specialist (`adk_microstructure_specialist` - Google ADK)**: Analyzes orderbook depth, bid-ask spread, and Kyle's lambda price impact bounds.
4. **News & Macro Specialist (`crewai_news_macro_specialist` - CrewAI via A2A)**: Evaluates RBI monetary policy circulars, macro inflation indicators, and news sentiment.
5. **Corporate Filing Specialist (`crewai_corporate_filing_specialist` - CrewAI via A2A)**: Parses quarterly earnings, corporate governance disclosures, and BSE/NSE filings.
6. **Adversarial Skeptic (`crewai_adversarial_specialist` - CrewAI via A2A)**: Veto reviewer challenging small-sample findings, identifying overfitting, and flagging zero-data statistical fragility.
7. **Risk Validator (`adk_risk_validator` - Google ADK)**: Mandatory gating agent enforcing the deterministic live-trading prohibition and calculating exact Indian statutory friction (STT, GST, Stamp Duty, Exchange/SEBI fees).

### Supported Orchestration Patterns
- **`SEQUENTIAL`**: Deterministic linear pipeline with step-by-step Blackboard handoffs.
- **`PARALLEL`**: Concurrent branch execution (`asyncio.gather`) across independent specialists, reducing latency.
- **`HIERARCHICAL`**: Two-tier supervisory pattern where the Manager directs the Skeptic challenge gate based on intermediate data density.

---

## Institutional Research Terminal (Web Interface)

ArthaAI includes a dark-first institutional research terminal inspired by professional quantitative workstations (Bloomberg Terminal, FactSet):

- **Research Dashboard**: Live session runs, average execution latency, schema validation rate, fleet status, and quick links.
- **New Research Submission**: Point-in-time analysis form with instrument presets (`RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `ICICIBANK`, `NIFTY50`), pattern selector, UTC timestamping, and scope options.
- **Live Execution Monitor**: Real-time multi-agent execution timeline with distinct branch rendering for Parallel and Hierarchical runs, elapsed timer, and live lifecycle event tracing.
- **Final Research Report (`QuantitativeResearchReport`)**: Pydantic-validated executive thesis, quantitative indicators, itemized Indian statutory transaction cost schedule, citations, provenance, and Markdown/JSON export.
- **System Topology**: Interactive visual architecture diagram showing ADK, CrewAI, FastMCP, and A2A inter-agent connections.
- **Evaluation & Benchmarks**: Summary statistics, versioned 44-case evaluation dataset explorer, saved experiment reports, and deterministic statutory test runner.
- **Execution History & Traces**: Searchable, filterable table of session executions with trace logs and report inspection.
- **System Status & Settings**: Real-time probes (`/health`, `/ready`), live trading guardrail status, and configurable API base URL.

---

## Local Development & Startup

### Prerequisites
- Python 3.11 or 3.12
- Node.js 20+ or 22+ and npm

### 1. Unified Process Runner (Recommended)
Run both backend and frontend together with a single command:

```bash
# Build frontend and launch unified production server at http://127.0.0.1:8000/
python scripts/start.py

# Or launch development mode (uvicorn port 8000 + Vite port 5173 with HMR):
python scripts/start.py --dev
```

### 2. Manual Startup

**Backend Server:**
```bash
python -m uvicorn arthaai.api.research_api:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend Dev Server:**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open `http://localhost:5173` in your browser.

**Build Frontend Production Bundle:**
```bash
cd frontend
npm run build
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness probe returning process status |
| `GET` | `/ready` | Readiness probe checking FastMCP, A2A, and safety guardrails |
| `POST` | `/research` | Submit an asynchronous multi-agent quantitative research run |
| `GET` | `/runs` | List all session research runs, statuses, and latencies |
| `GET` | `/runs/{run_id}` | Retrieve run status and completed `QuantitativeResearchReport` |
| `GET` | `/runs/{run_id}/trace` | Retrieve real-time lifecycle event trace for a run |
| `GET` | `/evaluation/summary` | Aggregate session research evaluation metrics |
| `GET` | `/evaluation/dataset` | Versioned 44-case evaluation dataset and category distribution |
| `GET` | `/evaluation/experiments` | List persisted experiment benchmark reports |
| `POST` | `/evaluation/run` | Execute deterministic statutory evaluation suite |
| `GET` | `/system/status` | Comprehensive subsystem diagnostics and fleet configuration |

---

## Verification & Testing

The repository maintains an institutional-grade test suite with 341 passing tests:

```bash
# Run complete pytest test suite
python -m pytest

# Run specific API integration tests
python -m pytest tests/orchestration/test_research_api.py tests/orchestration/test_api_extensions.py -v

# Run multi-agent orchestration tests
python -m pytest tests/orchestration/test_seven_agents_and_observability.py -v
```

---

## Safety Guardrails & Evidence Integrity

1. **Strict Live Trading Prohibition**: `live_trading_enabled` defaults to `False` and cannot be activated without explicit multi-stage authorization. Order execution APIs are blocked.
2. **Point-In-Time Invariant**: Enforced UTC timestamp cutoff ensures no historical leakage or lookahead bias during backtests and indicator calculation.
3. **Zero Citation Fabrication**: If 0 historical records exist for an instrument, `records_retrieved` is set to `0`, `finding_category` is labeled `UNAVAILABLE`, and zero numerical claims or Parquet bar citations are fabricated.

---

## License

Copyright © 2024–2026 ArthaAI Engineering Team. Proprietary and confidential. All rights reserved.
