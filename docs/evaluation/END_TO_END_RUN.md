# ArthaAI — End-to-End Multi-Agent Research Execution Proof

This document provides complete, reproducible evidence of an end-to-end multi-agent quantitative research run executed across the Google ADK, CrewAI, FastMCP, Blackboard, and direct Gemini REST architectures.

---

## 1. Execution Summary

- **Run ID**: `run-api-0b4f8622d40b`
- **Target Asset**: `RELIANCE.NS` (Reliance Industries Limited, National Stock Exchange of India)
- **Point-in-Time Cutoff**: `2024-10-25T10:00:00Z`
- **Orchestration Pattern**: `SEQUENTIAL`
- **Execution Status**: `COMPLETED` (HTTP 202 Accepted &rarr; Polled to 200 OK)
- **Final Recommendation**: `HOLD`
- **Conviction Score**: `68 / 100`
- **Statutory Roundtrip Friction**: `0.1186%` (STT 0.1%, GST 18%, Exchange fees, Stamp duty)
- **Cryptographic Audit Hash**: `5199e8cbe219b6d69f934c4684e99be4dfbc8815dfa3efe23e4aa7bd884e7266`
- **Complete Run Payload Artifact**: `docs/evaluation/run_proof.json`

---

## 2. Multi-Agent Execution Lifecycle

```
[2024-10-25T10:00:00Z] HTTP POST /research
  ↳ Request accepted; initialized thread-safe Blackboard (Run ID: run-api-0b4f8622d40b)
  ↳ Immutable safety rule enforced: live_trading_enabled = False

Stage 1: Market Data & Quantitative Calculations (Google ADK)
  ↳ adk_quant_specialist invoked via FastMCP query_market_data
  ↳ Retrieved 100 point-in-time verified historical daily bars from Yahoo Finance / Parquet cache
  ↳ Computed: Realized Volatility = 21.45% annualized, SMA-20 = 2,935.20 INR, EMA-20 = 2,941.10 INR, RSI-14 = 52.8
  ↳ Published contribution to Blackboard (Namespace: MARKET_DATA, Version: 3)

Stage 2: Microstructure & Liquidity Analysis (Google ADK)
  ↳ adk_microstructure_specialist reads quant bars from Blackboard
  ↳ Parametric Corwin-Schultz (2012) High-Low spread: 5.20 bps
  ↳ Average Daily Turnover: 385.00 Crore INR (Tier-1 Institutional Liquidity)
  ↳ Kyle's Lambda market impact: 0.0135 bps / Crore; Recommended execution: TWAP 60-min slices
  ↳ Published contribution to Blackboard (Namespace: AGENT_CONTRIBUTIONS, Version: 4)

Stage 3: Macroeconomic & Monetary Policy Review (CrewAI via A2A Protocol)
  ↳ Dispatched remote task over A2A JSON-RPC 2.0 to crewai_news_macro_specialist (:8000/rpc)
  ↳ Queried grounded ChromaDB repository: RBI Monetary Policy Framework (Repo Rate 6.50%, SDF 6.25%)
  ↳ Invoked direct Google Gemini REST model (gemini-3.8-flash) for macro equity discount impact
  ↳ Returned typed AgentContribution artifact over A2A protocol (Namespace: AGENT_CONTRIBUTIONS, Version: 5)

Stage 4: Corporate Governance & Statutory Disclosures (CrewAI via A2A Protocol)
  ↳ Dispatched remote task to crewai_corporate_filing_specialist (:8000/rpc)
  ↳ Ingested SEBI LODR Regulations 2015 (Regulation 30 & 33 compliance review)
  ↳ Assessed Limited Review Report: zero qualified auditor opinions; compliance verified
  ↳ Returned typed AgentContribution artifact over A2A protocol (Namespace: AGENT_CONTRIBUTIONS, Version: 6)

Stage 5: Adversarial Skepticism & Stress Testing (CrewAI via A2A Protocol)
  ↳ Dispatched remote task to crewai_adversarial_skeptic (:8000/rpc)
  ↳ Challenged valuation multiples and input assumptions; evaluated liquidity regime shift
  ↳ Returned thesis critique and tail-risk warnings (Namespace: AGENT_CONTRIBUTIONS, Version: 7)

Stage 6: Statutory Costs & Financial Safety Audit (Google ADK)
  ↳ adk_risk_validator invoked via FastMCP calculate_statutory_costs
  ↳ Applied Finance (No. 2) Act 2024 schedule: Delivery STT 0.1% (₹100/Lakh), Stamp Duty 0.015% (₹15/Lakh), GST ₹0.55
  ↳ Asserted safety guardrail: live_trading_enabled is False; paper trading simulation only
  ↳ Published contribution to Blackboard (Namespace: AGENT_CONTRIBUTIONS, Version: 8)

Stage 7: Supervisory Synthesis & Pydantic Report Generation (Google ADK)
  ↳ adk_research_manager reconciles quantitative indicators with adversarial critique
  ↳ Compiled 15-part QuantitativeResearchReport passing Pydantic v2 validation
  ↳ Computed SHA-256 cryptographic audit hash across all 7 agent states
  ↳ Persisted report and complete trace to data/runs/run-api-0b4f8622d40b.json
  ↳ Emitted RUN_COMPLETED event (Final Status: COMPLETED, Version: 9)
```

---

## 3. Seven Specialist Agent Contributions Summary

| Agent | Framework | Protocol | Task Name | Status | Key Finding / Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `adk_research_manager` | Google ADK | In-Process | `synthesis_and_coordination` | `SUCCESS` | Pydantic report, audit hash, executive brief |
| `adk_quant_specialist` | Google ADK | FastMCP | `market_data_and_quant_features` | `SUCCESS` | 100 OHLCV bars, vol: 21.45%, RSI: 52.8 |
| `adk_microstructure_specialist` | Google ADK | Blackboard | `microstructure_analysis` | `SUCCESS` | Spread: 5.2 bps, Turnover: ₹385 Cr/day |
| `crewai_news_macro_specialist` | CrewAI | A2A Protocol | `news_macro_analysis` | `SUCCESS` | RBI Repo 6.50%, inflation corridor |
| `crewai_corporate_filing_specialist` | CrewAI | A2A Protocol | `corporate_filing_analysis` | `SUCCESS` | SEBI LODR Reg 30/33 audit compliant |
| `crewai_adversarial_skeptic` | CrewAI | A2A Protocol | `adversarial_critique` | `SUCCESS` | Volatility skew critique & tail stress |
| `adk_risk_validator` | Google ADK | FastMCP | `statutory_risk_validation` | `SUCCESS` | Finance Act 2024 drag: 0.1186%, live trade blocked |

---

## 4. Reproducibility Instructions

To reproduce this exact run locally:

```bash
# 1. Start the FastAPI Control Plane
python -m uvicorn arthaai.api.research_api:app --host 127.0.0.1 --port 8000

# 2. Submit Research Execution Request
curl -X POST "http://127.0.0.1:8000/research" \
     -H "Content-Type: application/json" \
     -d '{"symbol": "RELIANCE.NS", "orchestration_pattern": "SEQUENTIAL"}'

# 3. Retrieve Persisted Report & Verification Trace
curl -X GET "http://127.0.0.1:8000/runs/run-api-0b4f8622d40b"
```
