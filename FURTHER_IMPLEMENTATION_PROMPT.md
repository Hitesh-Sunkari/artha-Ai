# ArthaAI — Next Steps & Further Implementation Guide

> **Target Benchmark**: Exceed [Tangent Institutional Suite](https://tangent-livid.vercel.app/) in UI aesthetic, portfolio mathematics, multi-agent AI deliberation, and Indian financial market rigor.

---

## 1. Executive Summary & Current State

The foundation of ArthaAI has been upgraded with institutional-grade quantitative modules, direct Google Gemini REST orchestration, and a complete portfolio construction engine.

### ✅ What Has Been Implemented & Verified:
1. **Live LLM REST Engine (`src/arthaai/orchestration/llm_adapter.py`)**:
   - Replaced gRPC calls with direct HTTPS REST calls via `httpx` to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.
   - Configured `gemini-3.5-flash` with automatic fallback to `gemini-3.7-flash` and quota exhaustion handling.
   - Verified real AI completions generating thousands of tokens per agent.

2. **Multi-Agent Fleet & A2A Bridge (`src/arthaai/orchestration/adk_coordinator.py`)**:
   - In-process ASGI routing for `A2AClientBridge`, allowing CrewAI specialists to execute alongside Google ADK coordinator.
   - Fixed upstream context passing so the Skeptic agent analyzes actual findings and calculated metrics.

3. **Strict Run History Persistence (`src/arthaai/api/research_api.py`)**:
   - `RunStore._persist()` and `GET /runs` strictly store and return only runs with `status == COMPLETED` and non-null reports.

4. **Institutional Portfolio Construction Engine (`src/arthaai/portfolio/`)**:
   - **`universe.py`**: 74-asset universe across 6 asset classes (Indian Equities, Sovereign Debt/Bonds, Bank FDs, REITs, Commodities/Gold, Global ETFs, Digital Assets) with historical returns, volatilities, and concentration limits.
   - **`optimizer.py`**: Deterministic SciPy SLSQP solver with Ledoit-Wolf covariance shrinkage ($\delta=0.20$), concentration caps, and post-tax friction calculations generating 4 candidate allocations (Target-Risk, Maximum Sharpe, Capital Preservation, Growth Max).
   - **`simulation.py`**: 5,000-path Monte Carlo wealth trajectory simulator using geometric Brownian motion with monthly SIP inflows and percentile bands ($p10, p50, p90$).
   - **`stress_test.py`**: Historical crisis scenario testing (2008 GFC, 2020 COVID, 2022 Inflation Spike, 2013 Taper Tantrum) and 10-year walk-forward backtest (2016–2025) with yearly return attribution.

5. **REST API Endpoints (`src/arthaai/api/research_api.py`)**:
   - `GET /portfolio/universe` — Returns universe assets, filters, and 1-click presets.
   - `POST /portfolio/optimize` — Executes deterministic SLSQP optimization.
   - `POST /portfolio/simulate` — Executes 5,000-path Monte Carlo simulation.
   - `POST /portfolio/stress-test` — Runs crisis stress tests and 10-year backtests.
   - `GET /portfolio/telemetry` — Reports LLM inference telemetry and fleet metrics.

6. **Frontend Portfolio Page (`frontend/src/pages/PortfolioPage.tsx`)**:
   - Complete 7-step institutional workflow:
     1. **Profile**: Demographics, horizon slider, risk tolerance calibration, capital & SIP settings.
     2. **Universe**: 74-asset filterable pool with search, asset class tabs, and 1-click presets.
     3. **Solver**: SLSQP optimizer execution with Ledoit-Wolf shrinkage.
     4. **Suitability**: 4 candidate allocation cards with match score breakdown and holdings.
     5. **Projections**: 5,000-path Monte Carlo wealth fan chart and year-by-year projections.
     6. **Stress Test**: 10-year backtest vs Nifty 50 and 60/40 benchmark + crisis scenarios.
     7. **Decision Studio**: Institutional allocation audit, statutory tax disclosures, CSV and JSON export.

---

## 2. Next Implementation Steps (To Surpass Tangent)

To complete the full transformation and fully surpass `https://tangent-livid.vercel.app/`, follow this roadmap:

### Step 1: Frontend Navigation & Route Integration
- **Files**: `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`
- **Action**:
  - Add navigation item for **"Portfolio Engine"** (route `/portfolio` or active tab) pointing to `PortfolioPage.tsx`.
  - Ensure the sidebar features clear institutional tabs:
    - 📊 **Dashboard** (`/`)
    - 💼 **Portfolio Engine** (`/portfolio`) — 7-step construction journey.
    - 🏛️ **Investment Committee** (`/committee`) — Multi-agent deliberation room.
    - 🔬 **New Research** (`/research`) — Single-ticker deep-dive workflow.
    - 📡 **Telemetry Observatory** (`/telemetry`) — LLM tokens, latency, fleet health.
    - 📜 **Audit History** (`/history`) — Verified completed runs.
    - ⚙️ **System Status** (`/system-status`) — Microservices & MCP health.

### Step 2: Investment Committee Deliberation UI
- **Files**: `frontend/src/pages/CommitteePage.tsx`, `src/arthaai/portfolio/committee.py`
- **Features to implement**:
  - Deliberation room with 4 distinct AI personas:
    1. **Chief Macro Strategist**: Evaluates RBI repo rate (6.50%), inflation CPI, yield curve.
    2. **Quantitative Risk Officer**: Scrutinizes VaR 99%, max drawdown, asset class limits.
    3. **Adversarial Skeptic**: Challenges bullish assumptions, fee drag, liquidity traps.
    4. **Chief Investment Officer (CIO)**: Synthesizes debate into an official Committee Verdict.
  - Interactive transcript with live streaming deliberation bubbles, vote tallies (Approve / Conditional / Reject), and dissent notes.

### Step 3: Telemetry Observatory Page
- **Files**: `frontend/src/pages/TelemetryPage.tsx`
- **Features to implement**:
  - Connect to `GET /portfolio/telemetry`.
  - Visual displays for:
    - Real-time token consumption (prompt tokens, completion tokens, cost estimate).
    - Provider latency gauges (Gemini REST latency, fallback status).
    - Agent fleet activity monitor showing active CrewAI and Google ADK processes.

### Step 4: ArthaAI Copilot Drawer / Modal
- **Files**: `frontend/src/components/CopilotDrawer.tsx`
- **Features to implement**:
  - Omnipresent floating button (`✦ Ask ArthaAI Copilot`).
  - Context-aware chat drawer: knows current portfolio weights, selected stock, or backtest results.
  - Streaming responses using backend `/llm/chat` endpoint powered by `gemini-3.5-flash`.

---

## 3. How to Run & Validate the Workspace

### Starting Backend:
```bash
# In e:\ArthAI
python -m uvicorn arthaai.api.research_api:create_research_api --factory --host 127.0.0.1 --port 8000 --reload
```

### Starting Frontend:
```bash
# In e:\ArthAI\frontend
npm run dev
```

### Running Automated Test Suite:
```bash
# In e:\ArthAI
pytest tests/unit/ -k "not test_all_modules_import" -q
```

### Building Production Bundle:
```bash
# In e:\ArthAI\frontend
npm run build
```

---

## 4. Key Architectural Constraints & Rules
- **Live Trading Guardrail**: `live_trading_enabled = False` must remain strictly enforced across all components.
- **Strict History Persistence**: Only store completed runs where `report is not None` to prevent cluttering history with empty or failed runs.
- **Real Market Grounding**: Do not fabricate synthetic quotes or ticker data when live provider keys are configured.
- **Finance Act 2024 Compliance**: Retain 12.5% LTCG (>₹1.25L exemption), 20% STCG, and 0.1% STT statutory calculations in all portfolio friction summaries.
