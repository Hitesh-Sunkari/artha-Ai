# ArthaAI — Operational Boundaries, Fallback Cascades & Known Limitations

In compliance with academic evaluation standards and institutional financial engineering ethics, this document transparently records the operational boundaries, fallback cascades, assumptions, and known limitations of the ArthaAI workstation.

---

## 1. Safety & Execution Boundary (Zero Capital Risk)

- **Live Order Execution Disabled**: `live_trading_enabled = False` is enforced as an immutable governance constraint in `src/arthaai/orchestration/blackboard.py`, `src/arthaai/core/config.py`, and `adk_risk_validator`.
- **Simulation Only**: All trading actions operate strictly in paper-trading simulation mode with realistic statutory friction (STT, GST, stamp duty) calculated under Indian Finance (No. 2) Act 2024 schedules.
- **SEBI Advisory Compliance**: ArthaAI does not provide guaranteed investment returns or SEBI-registered portfolio management advice. Recommendations (`BUY`, `HOLD`, `SELL`, `INSUFFICIENT_EVIDENCE`) represent multi-agent research theses with explicit conviction scores (0–100) and risk factors.

---

## 2. Market Data & Microstructure Granularity

- **Historical Analytical Granularity**: The automated quantitative pipeline operates on verified daily OHLCV bars spanning 5 full calendar years (~1,260 trading sessions). Intraday sub-second tick feeds require proprietary licensed NSE NOW/NEAT broker interfaces, which are outside the scope of offline academic evaluation.
- **Parametric Microstructure Modeling**: High-frequency order book depth (Level 2/3 queue queues, bid-ask depth ladder) is estimated parametrically using verified empirical estimators (Corwin-Schultz 2012 High-Low spread, Amihud illiquidity, Kyle's lambda) rather than fabricated tick series.
- **Benchmark Index Coverage**: Benchmark indices (`NIFTY50`, `SENSEX`, `BANKNIFTY`, `INDIAVIX`) are served via `GET /market/indices` using genuine Parquet analytical stores with real-time provenance tracking.

---

## 3. LLM Multi-Provider Cascade & Quota Fallback

- **Direct HTTPS REST**: Google Gemini calls use direct HTTPS REST (`https://generativelanguage.googleapis.com/v1beta/models/...`), avoiding heavy SDK/gRPC overhead.
- **Multi-Provider Cascade**:
  1. Primary: **Google Gemini** (`gemini-2.5-flash` / `gemini-1.5-flash`)
  2. Secondary: **OpenAI** (`gpt-4o-mini`)
  3. Tertiary: **Anthropic** (`claude-3-5-haiku`)
  4. Quota Exhaustion Fallback: **Deterministic Analytical Heuristics**
- **Quota & Rate-Limit Backoff**: When provider quotas are exhausted (HTTP 429), the platform safely degrades to deterministic mathematical indicators and grounded report synthesis without crashing.
- **Zero Hallucination Safeguard**: An unavailable or failing LLM call never manufactures artificial citations or fabricated financial figures; findings are marked `MEASURED`, `HEURISTIC_GROUNDED`, or `UNAVAILABLE`.

---

## 4. Regulatory Knowledge Base Scope

- **ChromaDB Corpus**: Ingests 13 core regulatory chunks covering the *Finance (No. 2) Act 2024*, *SEBI LODR 2015*, *SEBI PIT 2015*, and *RBI Monetary Policy Framework*.
- **Temporal Validity**: Tax and regulatory citations reflect Indian statutory law as of the Finance Act 2024 enactment date (July 2024 revisions). Future legislative amendments require re-ingestion into the ChromaDB store.

---

## 5. Frontend Workspaces & Paper Trading Persistence

- **Four Primary Workspaces**:
  1. **Command Center**: Macro terminal overview, live market indices, active research runs, and paper portfolio summary.
  2. **Research Workspace**: 5-Year quantitative depth, interactive 90-day SVG chart, 7-agent contribution breakdown, and cryptographic audit hash.
  3. **Portfolio & Trading**: Paper order execution, realistic Finance Act 2024 friction reserves, zero-mock position tracking, and transaction history.
  4. **Operations & Observability**: System diagnostics, MCP tool health, A2A endpoint status, and real latency metrics.
- **State Storage Mechanics**: Paper trading positions, orders, and cash balances (defaulting to ₹10,00,000 INR) are managed in browser `localStorage` (`arthai_paper_cash`, `arthai_paper_positions`, `arthai_paper_orders`) with zero mock fallbacks.
