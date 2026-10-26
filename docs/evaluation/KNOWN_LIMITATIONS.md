# ArthaAI — Operational Boundaries & Known Limitations

In compliance with academic evaluation standards and institutional financial engineering ethics, this document transparently records the operational boundaries, assumptions, and known limitations of the ArthaAI platform.

---

## 1. Safety & Execution Boundary (Zero Capital Risk)
- **Live Order Execution Disabled**: `live_trading_enabled = False` is enforced as an immutable governance constraint in `src/arthaai/orchestration/blackboard.py` and `src/arthaai/core/config.py`.
- **Simulation Only**: All trading actions operate strictly in paper-trading simulation mode with realistic statutory friction (STT, GST, stamp duty) calculated under Finance Act 2024 schedules.
- **SEBI Advisory Compliance**: ArthaAI does not provide guaranteed investment returns or SEBI-registered portfolio management advice. Recommendations (`BUY`, `HOLD`, `SELL`, `INSUFFICIENT_EVIDENCE`) represent multi-agent research theses with explicit conviction scores and risk factors.

---

## 2. Market Data & Microstructure Granularity
- **EOD vs Intraday**: The primary automated pipeline retrieves daily OHLCV bars via Yahoo Finance and local Parquet storage. Real-time intraday tick streaming requires licensed NSE NOW/NEAT feeds, which are out of scope for offline academic evaluation.
- **Parametric Microstructure Modeling**: High-frequency order book depth (Level 2/3 queue queues, bid-ask depth ladder) is estimated parametrically using verified empirical estimators (Corwin-Schultz 2012 High-Low spread, Amihud illiquidity, Kyle's lambda) rather than fabricated tick series.
- **Corporate Action Adjustments**: Daily bars account for stock splits and dividend adjustments as provided by Yahoo Finance and local Parquet manifests.

---

## 3. LLM Provider Quotas & Degradation Paths
- **Direct HTTPS REST**: Google Gemini calls use direct HTTPS REST (`https://generativelanguage.googleapis.com/v1beta/models/...`), bypassing gRPC networking overhead.
- **Quota & Rate-Limit Backoff**: When provider quotas are exhausted (HTTP 429), the platform safely degrades to deterministic mathematical indicators and rule-based synthesis without crashing.
- **Zero Hallucination Safeguard**: An unavailable or failing LLM call never manufactures artificial citations or fabricated financial figures; findings are marked `UNAVAILABLE` or `PARTIAL`.

---

## 4. Regulatory Knowledge Base Scope
- **ChromaDB Corpus**: Ingests 13 core regulatory chunks covering the *Finance (No. 2) Act 2024*, *SEBI LODR 2015*, *SEBI PIT 2015*, and *RBI Monetary Policy Framework*.
- **Temporal Validity**: Tax and regulatory citations reflect Indian statutory law as of the Finance Act 2024 enactment date (July 2024 revisions). Future legislative amendments require re-ingestion into the ChromaDB store.
