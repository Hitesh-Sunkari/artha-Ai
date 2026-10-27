# ArthaAI — Operational Boundaries, Fallback Cascades & Known Limitations

In compliance with academic evaluation standards and institutional financial engineering ethics, this document records the operational boundaries, fallback cascades, assumptions, and known limitations of the ArthaAI workstation.

---

## 1. Safety & Execution Boundary (Zero Capital Risk)

- **Live Order Execution Disabled**: `live_trading_enabled = False` is enforced as an immutable governance constraint in `src/arthaai/orchestration/blackboard.py`, `src/arthaai/core/config.py`, and `adk_risk_validator`.
- **Simulation Only**: All trading actions operate strictly in paper-trading simulation mode with realistic statutory friction (STT, GST, stamp duty) calculated under Indian Finance (No. 2) Act 2024 schedules.
- **SEBI Advisory Compliance**: ArthaAI does not provide guaranteed investment returns or SEBI-registered portfolio management advice. Recommendations (`BUY`, `HOLD`, `SELL`, `INSUFFICIENT_EVIDENCE`) represent multi-agent research theses with explicit conviction scores (0–100) and risk factors.

---

## 2. Market Data & Microstructure Granularity

- **Historical Analytical Granularity**: The automated quantitative pipeline operates on verified daily OHLCV bars spanning 5 full calendar years (~1,260 trading sessions per equity).
- **Parametric Microstructure Modeling**: High-frequency order book depth (Level 2/3 queue queues, bid-ask depth ladder) is estimated parametrically using verified empirical estimators (Corwin-Schultz 2012 High-Low spread, Amihud illiquidity) rather than fabricated tick series.
- **IST Market Clock & Session State**: Market hours operate under IST (`Asia/Kolkata`) 09:15–16:15 Mon–Fri. Outside of these market hours, ticker prices are frozen to the last official exchange settlement close, and the UI displays an active session countdown.

---

## 3. LLM Multi-Provider Cascade & Quota Fallback

- **Direct HTTPS REST**: Google Gemini calls use direct HTTPS REST (`https://generativelanguage.googleapis.com/v1beta/models/...`), avoiding heavy SDK/gRPC overhead.
- **Multi-Provider Cascade**:
  1. Primary: **Google Gemini** (`gemini-2.5-flash`, `gemini-flash-latest`)
  2. Secondary: **OpenAI** (`gpt-4o-mini`)
  3. Quota Exhaustion Fallback: **Deterministic Analytical Heuristics**
- **Zero Hallucination Safeguard**: An unavailable or failing LLM call never manufactures artificial citations or fabricated financial figures; findings are marked `MEASURED`, `HEURISTIC_GROUNDED`, or `UNAVAILABLE`.
- **Clean Interface Invariant**: No model names, stars (`✦`), or emojis are displayed in user-facing reports, timelines, or Copilot responses.

---

## 4. Regulatory Knowledge Base Scope

- **ChromaDB Corpus**: Ingests statutory filing chunks covering the *Finance (No. 2) Act 2024*, *SEBI LODR 2015*, *SEBI PIT 2015*, *RBI Monetary Policy Framework*, and Q2 FY25 statutory company filings for major Indian equities (`ICICIBANK`, `RELIANCE`, `TCS`, `HDFCBANK`, `INFY`, `TATAMOTORS`, `SBIN`, `ITC`, `WIPRO`).
- **Temporal Validity**: Tax and regulatory citations reflect Indian statutory law as of the Finance Act 2024 enactment date (July 2024 revisions). Future legislative amendments require re-ingestion into the ChromaDB store.

---

## 5. Orchestration Pattern Comparison Guardrails

- **Strictly User-Triggered**: Orchestration pattern comparisons (Sequential vs Parallel vs Hierarchical) never execute automatically; they require explicit user selection and confirmation.
- **Isolated Blackboard Namespaces**: Child runs receive separate, isolated Blackboard instances (`comp-{id}-seq`, `comp-{id}-par`, `comp-{id}-hie`) to prevent cross-run state pollution.
- **No Synthetic Speedups**: Wall-clock durations are measured monotonically using `time.perf_counter()`; no artificial delays or fabricated benchmarks are generated.
