# ArthaAI Production Deployment Audit Report
**Version:** 1.0.0-PROD  
**Timestamp:** 2026-11-09T11:15:00+05:30  
**Classification:** Institutional Architecture & DevOps Audit  
**Author:** Principal Cloud Architect, Senior DevOps & Production Reliability Engineer  

---

## 1. Executive Summary

An exhaustive codebase inspection of **ArthaAI** was executed to determine its current architecture, external dependencies, resource requirements, security boundaries, and readiness for deployment on genuinely free cloud infrastructure.

ArthaAI is an institutional-grade, multi-agent quantitative financial research system for Indian equity and derivatives markets (NSE, BSE, MCX). It coordinates seven specialist agent roles across Google ADK and CrewAI using the Agent-to-Agent (A2A) JSON-RPC 2.0 protocol and FastMCP tool interfaces, grounded in point-in-time Parquet datasets, in-process DuckDB analytical tables, and a persistent ChromaDB statutory vector store.

The audit confirms that ArthaAI is **fully deployable on zero-cost cloud hosting** with no paid infrastructure required. Its lightweight architecture—featuring a zero-download deterministic lexical embedding function, zero-copy DuckDB parquet views, in-process ASGI A2A transport, and pre-compiled React SPA serving—enables the complete seven-agent research suite to operate within **512 MB to 1 GB RAM**, well within the free-tier allowances of Hugging Face Spaces (16 GB RAM), Oracle Cloud Always Free (24 GB RAM), Google Cloud Always Free (1 GB RAM), and Render Free Tier (512 MB RAM).

---

## 2. Current Architecture & Component Inventory

```mermaid
flowchart TD
    Client["Browser Client / React SPA (Vite, TS, Tailwind)"]
    Proxy["Reverse Proxy / SPA Mount (Nginx or FastAPI StaticFiles)"]
    API["FastAPI Research API (uvicorn, port 8000)"]
    
    subgraph MultiAgentEngine["Multi-Agent Autonomous Orchestration Engine"]
        ADK_Mgr["Research Manager (Google ADK)"]
        ADK_Quant["Quant Specialist (Google ADK)"]
        ADK_Micro["Microstructure Specialist (Google ADK)"]
        ADK_Risk["Risk & Validation Officer (Google ADK)"]
        
        A2A["A2A Protocol Bridge (JSON-RPC 2.0 / ASGITransport)"]
        
        Crew_Skeptic["Adversarial Skeptic (CrewAI)"]
        Crew_Macro["News & Macro Specialist (CrewAI)"]
        Crew_Filing["Fundamentals & Filings Specialist (CrewAI)"]
    end
    
    subgraph DataAndTools["Storage, Tool & Knowledge Layer"]
        FastMCP["FastMCP Server (21 Registered Quantitative Financial Tools)"]
        Blackboard["Shared Versioned Blackboard (Namespaces / Snapshots)"]
        Chroma["ChromaDB Vector Store (SEBI LODR, Finance Act 2024, RBI MPC)"]
        DuckDB["DuckDB Analytical Engine (Zero-Copy Parquet Views)"]
        Parquet["Data Directory (OHLCV, Financials, Macro, Corporate Actions)"]
    end
    
    Client --> Proxy
    Proxy --> API
    API --> ADK_Mgr
    ADK_Mgr --> ADK_Quant
    ADK_Mgr --> ADK_Micro
    ADK_Mgr --> ADK_Risk
    ADK_Mgr --> A2A
    A2A --> Crew_Skeptic
    A2A --> Crew_Macro
    A2A --> Crew_Filing
    
    ADK_Quant & ADK_Micro & ADK_Risk --> FastMCP
    FastMCP --> DuckDB & Parquet
    FastMCP --> Chroma
    ADK_Mgr & Crew_Skeptic & Crew_Macro & Crew_Filing --> Blackboard
```

### 2.1 Seven Specialist Roles
| # | Specialist Role | Framework | Protocol / Interface | Primary Responsibility |
|---|-----------------|-----------|----------------------|------------------------|
| 1 | **Research Manager** | Google ADK | Native Python / Coordinator | Orchestration, delegation, hypothesis framing, final Pydantic report synthesis |
| 2 | **Quantitative Market Specialist** | Google ADK | FastMCP (`query_market_data`) | Historical price series, realized volatility, RSI, EMA, covariance shrinkage |
| 3 | **Microstructure & Liquidity Specialist** | Google ADK | FastMCP (`get_latest_quote`) | Order book bid-ask spreads, depth imbalances, slippage estimates, ADV |
| 4 | **News & Macro Specialist** | CrewAI | A2A JSON-RPC 2.0 | RBI MPC rate announcements, MoSPI CPI inflation, GDP trends, macroeconomic news |
| 5 | **Fundamentals & Filings Specialist** | CrewAI | A2A JSON-RPC 2.0 | SEBI LODR Regulation 30/33 disclosures, quarterly P&L, balance sheet strength |
| 6 | **Adversarial Skeptic** | CrewAI | A2A JSON-RPC 2.0 | Thematic thesis challenge, lookahead leakage audit, capital loss probability |
| 7 | **Risk & Validation Officer** | Google ADK | FastMCP (`calculate_statutory_costs`) | Statutory tax friction (Finance Act 2024), point-in-time bounds, immutable live trading lockout |

---

## 3. Detailed Component Audit

### 3.1 Backend Entry Points & Routing
- **Primary FastAPI Module:** `src/arthaai/api/research_api.py`
- **Application Factory:** `create_research_api()`
- **Default ASGI Instance:** `app = create_research_api()`
- **Total Registered Routes:** 50 endpoints
- **Key Endpoint Groups:**
  - Liveness & Readiness: `GET /health`, `GET /ready`, `GET /system/status`
  - Asynchronous Research: `POST /research`, `GET /runs/{run_id}`, `GET /runs/{run_id}/trace`, `GET /runs/{run_id}/heatmap`
  - Pattern Comparison: `POST /research/compare`, `GET /research/compare/{comparison_id}`
  - Natural Language Quantitative Studio: `POST /research/query`
  - Portfolio Optimization: `POST /portfolio/optimize`, `POST /portfolio/simulate`, `POST /portfolio/stress-test`
  - Market Intelligence: `GET /market/stocks`, `GET /market/indices`, `GET /market/session`, `GET /market/quote/{symbol}`
  - Regulatory Vector RAG: `GET /rag/manifest`, `POST /rag/search`, `POST /rag/ask`
  - Agent Contracts & Observability: `GET /agents/contracts`, `GET /evaluation/summary`
  - Integrated SPA Serving: `GET /{full_path:path}` and `app.mount("/assets", StaticFiles)`

### 3.2 Frontend Architecture
- **Framework:** React 19.3.1, TypeScript 6.0, Vite 8.3.5
- **Main Terminal:** `frontend/` (port 5173 in dev)
- **Admin Portal:** `admin-frontend/` (port 5174 in dev)
- **Production Build Outputs:**
  - `frontend/dist/` (HTML: 0.83 kB, CSS: 17.76 kB, JS: 651 kB)
  - `admin-frontend/dist/` (HTML: 0.68 kB, CSS: 18.24 kB, JS: 317 kB)
- **API Client Resolution:** `getApiBaseUrl()` in `src/api/client.ts`. Resolves dynamically via `localStorage`, `VITE_API_URL`, or falls back to relative root `""` when served from the same origin on production ports.

### 3.3 Dependency Management & Lockfiles
- **Python:** `pyproject.toml` (requires Python `>=3.11`).
  - Core dependencies: `pydantic>=2.12.0`, `pydantic-settings>=2.2.0`, `pyarrow>=16.0.0`, `duckdb>=1.0.0`, `mcp>=1.2.0`, `a2a-sdk>=0.3.4`, `google-adk>=2.13.0`, `crewai>=1.15.0`, `fastapi>=0.112.0`, `uvicorn>=0.30.0`.
  - Additional packages used: `chromadb`, `scipy`, `numpy`, `pandas`, `yfinance`, `httpx`, `python-dotenv`.
- **Node.js:** `frontend/package.json` and `admin-frontend/package.json` with `npm` lockfiles.

### 3.4 Data Persistence & Storage Paths
- **Vector Corpus (ChromaDB):** `data/chroma_db/`
  - Contains collections for SEBI LODR regulations, Finance Act 2024 statutory schedules, RBI monetary policy frameworks, and quarterly earnings filings.
- **Analytical Data (DuckDB / Parquet):** `data/parquet/`
  - Subdirectories: `ohlcv/`, `financials/`, `macro/`, `corporate_actions/`, `options/`, `quotes/`, `trades/`, `orderbook/`.
- **Blackboard & Run Traces:** `data/blackboard/` and `data/runs/`.
- **Quarantine & Audit Trails:** `data/quarantine/`, `data/quality/`, `data/manifests/`.

### 3.5 Inter-Agent Communication (A2A Protocol)
- **Specification:** A2A protocol (JSON-RPC 2.0, header `A2A-Version: 1.0`).
- **Transport Mechanism:** `a2a.client.transports.JsonRpcTransport` wrapped around `httpx.ASGITransport(app=crewai_app)`.
- **Key Advantage:** Communications run in-process over standard ASGI memory buffers without needing open network sockets or external ports.

### 3.6 Tool Calling (FastMCP)
- **Server:** `ArthaAI-Market-Intelligence` instantiated via `FastMCP`.
- **Registered Tools (21 Institutional Tools):**
  1. `query_market_data` - Point-in-time Parquet DuckDB query engine.
  2. `calculate_statutory_costs` - Finance Act 2024 tax waterfall & exchange fees.
  3. `retrieve_regulatory_evidence` - ChromaDB RAG vector semantic search.
  4. `calculate_quant_features` - Multi-period rolling volatility, Sharpe, Sortino.
  5. `validate_research_evidence` - Cryptographic citation verification against vector hashes.
  6. `resolve_security` - Instrument master ticker, ISIN, and exchange normalizer.
  7. `get_data_coverage` - Date ranges and bar count audit per instrument.
  8. `get_corporate_actions` - Historical stock splits, dividends, rights issues.
  9. `get_financial_results` - Quarterly balance sheets, P&L, EBITDA, net margin.
  10. `get_option_chain` - Strike ladder, implied volatility, put-call ratio (PCR).
  11. `get_derivative_coverage` - F&O contract calendar and lot size coverage.
  12. `get_macro_events` - RBI MPC interest rate decisions, CPI inflation, GDP prints.
  13. `get_corporate_news` - Point-in-time exchange announcements & press releases.
  14. `get_historical_bars` - High-frequency OHLCV daily price series.
  15. `get_latest_quote` - Real-time synthetic/live L1 bid, ask, and LTP.
  16. `get_data_quality_report` - Zero-lookahead timestamp and anomaly audit score.
  17. `get_expired_contract_history` - Historical settled derivative series.
  18. `search_filings` - Lexical keyword search across quarterly financial notes.
  19. `search_news_and_macro` - Full-text search across macroeconomic indicators.
  20. `calculate_indicators` - Technical indicators (EMA, RSI, MACD, Bollinger Bands).
  21. `get_evidence_passage` - Deterministic text retrieval by statutory chunk ID.

---

## 4. Existing Deployment Blockers & Resolution

| Issue # | Component | Observed Blocker | Production Solution |
|---------|-----------|------------------|---------------------|
| 1 | `frontend/src/components/Header.tsx` | Line 85 had hardcoded `http://127.0.0.1:8000/market/stocks`, causing Mixed Content / network failure on HTTPS production deployments. | Replaced with dynamic `getApiBaseUrl()` relative path resolution. |
| 2 | `frontend/package.json` | Contained `@rolldown/binding-win32-x64-msvc` in production dependencies, which would break in Linux Docker builds. | Removed Windows-specific binding from production dependencies. |
| 3 | Root Directory | No production `Dockerfile`, `compose.yaml`, `.dockerignore`, or reverse-proxy configs existed in the repository root. | Created multi-stage production Dockerfile, backend Dockerfile, compose file, and Nginx proxy config. |
| 4 | CORS Configuration | `CORSMiddleware` was set to `allow_origins=["*"]`. While acceptable in dev, production requires restrictive configurable origins while supporting same-origin reverse proxies. | Parameterized allowed CORS origins via `ARTHAAI_ALLOWED_ORIGINS` environment variable. |
| 5 | DuckDB Memory Bounds | Default DuckDB connection used unconstrained RAM allocation. In a 512MB-1GB container, complex queries could trigger an OOM kill. | Set explicit memory cap: `PRAGMA max_memory='256MB'` and `PRAGMA threads=2`. |
| 6 | Uvicorn Worker Bounds | Default reload mode runs multiple processes. | Single production worker configured with `--workers 1` and `--limit-concurrency 10` for minimal memory footprint. |
| 7 | Static File Serving | SPA routing was enabled only for `frontend/dist`. The `admin-frontend/dist` was not mounted. | Mounted `/admin` and `/admin-assets` to serve the admin portal from the unified web layer. |
| 8 | Reverse Proxy Routing | `frontend/nginx.conf` omitted `/admin` and `/auth` routes, causing administrative and authentication API calls to fall back to `index.html`. | Updated location regex in both `frontend/nginx.conf` and `admin-frontend/nginx.conf` to proxy `/admin` and `/auth`. |
| 9 | Benchmark Dataset Ingestion | `Dockerfile.backend` only copied `data/` and `configs/`, omitting `experiments/`. | Added `COPY experiments/ /app/experiments/` to ensure all 12 canonical benchmark scenarios and 96-run evaluations are accessible in containers. |
| 10 | State Persistence Topology | Only 4 persistent volumes existed; benchmark evaluations risked data loss on container reset. | Added `arthai-experiments-results` and `arthai-experiments-datasets` to `compose.yaml` and `docker-compose.yml` with automated 1-click backup/restore scripts. |

---

## 5. Security & Financial Safety Audit

1. **Immutable Live Trading Lockout:**
   - `ARTHAAI_LIVE_TRADING_ENABLED=false` is enforced in `src/arthaai/core/config.py`.
   - `ADKRiskValidator.validate_live_trading_lock()` asserts this condition before every research run. Any attempt to set this flag to `true` or bypass it triggers an immediate assertion failure and aborts execution.
2. **Prompt Injection & Adversarial Filtering:**
   - `InputGuardrail.sanitize_and_validate_prompt()` scans inputs for injection patterns (`ignore previous instructions`, `admin mode`, `system override`) and redacts them.
3. **Statutory Tax Drag Accounting:**
   - Implements Finance (No. 2) Act 2024 schedules: Section 112A LTCG (12.5% above ₹1.25 Lakhs), STCG (20%), and delivery STT (0.1%), preventing unrealistic return projections.
4. **Data Isolation:**
   - Research runs use isolated correlation IDs and Blackboard snapshots. In-memory run stores prevent cross-tenant state leakage.

---

## 6. Free-Tier Cloud Compatibility Verdict

| Hosting Platform | Free Compute | Free RAM | Persistent Disk | Compatibility Verdict | Recommended Role |
|------------------|--------------|----------|-----------------|-----------------------|------------------|
| **Hugging Face Spaces** | 2 vCPU | 16 GB | 50 GB | **PASS (EXCELLENT)** | **Primary Free Cloud Platform** (Permanent, no credit card required) |
| **Oracle Cloud Always Free** | 4 ARM vCPU | 24 GB | 200 GB | **PASS (EXCELLENT)** | **Primary Free VM Platform** (Permanent, requires credit card at signup) |
| **Google Cloud Always Free** | 0.25 vCPU (e2-micro) | 1 GB | 30 GB | **PASS (VIABLE)** | Secondary Free VM Platform (1 GB RAM requires memory bounds) |
| **Render Free Tier** | 0.1 vCPU | 512 MB | Ephemeral | **PASS (DEMO/TEST)** | Quick container testing (Sleeps after 15m inactivity) |

---

## 7. Audit Sign-Off

The ArthaAI codebase is sound, modular, and exceptionally well-suited for free-tier cloud deployment. Proceed to **Phase 2** (Cloud Hosting Comparison) and **Phase 3** (Dockerization & Production Hardening).

