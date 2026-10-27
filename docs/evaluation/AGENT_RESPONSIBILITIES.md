# ArthaAI — Seven-Agent Fleet Architecture & Distinct Responsibilities

This document provides the formal justification, boundaries, framework assignments, permitted tools, Pydantic contracts, and downstream handoffs for all seven primary agents in the ArthaAI multi-agent research fleet.

---

## 1. Architectural Distribution Matrix

| Agent ID | Role | Framework | Core Responsibilities | Permitted Tools | Downstream Consumers |
|---|---|---|---|---|---|
| `adk_research_manager` | Research Manager | Google ADK | Canonical normalization, plan decomposition, supervisory tracking, final report synthesis | `retrieve_regulatory_evidence` | All Specialists, UI Timeline |
| `adk_quant_specialist` | Quantitative Market Agent | Google ADK | 5-Year OHLCV analysis (~1,260 bars), SMA, EMA, RSI, realized volatility | `query_market_data` | Microstructure, Skeptic, Manager |
| `adk_microstructure_specialist` | Microstructure & Liquidity | Google ADK | Quoted spread (Corwin-Schultz 2012), effective slippage, turnover tiering | `query_market_data` | Adversarial Skeptic, Risk Validator |
| `crewai_news_macro_specialist` | News & Macro Agent | CrewAI | RBI repo rate policy, inflation target, monetary stance, macro sentiment | A2A Protocol, RAG Retriever | Adversarial Skeptic, Manager |
| `crewai_corporate_filing_specialist` | Corporate Filings & Governance | CrewAI | SEBI LODR Reg 30/33 audit opinions, quarterly financial disclosures | A2A Protocol, RAG Retriever | Adversarial Skeptic, Manager |
| `crewai_adversarial_specialist` | Adversarial Skeptic | CrewAI | Red-team quantitative assumptions, volatility stress testing, data absence veto | A2A Protocol, LLM Adapter | Risk Validator, Manager |
| `adk_risk_validator` | Risk Validator | Google ADK | Finance Act 2024 statutory friction (STT, GST, stamp duty), live trading gate | `calculate_statutory_costs` | Research Manager |

---

## 2. Detailed Agent Specifications

### Agent 1: Research Manager (`adk_research_manager`)
- **Framework**: Google ADK
- **Inputs**: `ResearchRequest` (`request_id`, `run_id`, `symbol`, `as_of_time`, `timeframe`, `scope`)
- **Outputs**:
  - Initial Stage: `research_plan_and_supervision` with `initial_hypothesis` (provisional and strictly unscored)
  - Post-Validation Stage: `QuantitativeResearchReport` with authoritative conviction score (0–100) and recommendation rubric (`BUY`, `HOLD`, `SELL`, `INSUFFICIENT_EVIDENCE`)
- **Isolation Policy**: Never generates official conviction score before specialist and risk validator gates complete.

### Agent 2: Quantitative Market Agent (`adk_quant_specialist`)
- **Framework**: Google ADK
- **Inputs**: Normalized symbol and point-in-time timestamp
- **Outputs**: `market_data_and_quant_features` containing:
  - `records_retrieved` (verified count from DuckDB Parquet store)
  - `empty_result` (boolean)
  - `finding_category` (`MEASURED` or `UNAVAILABLE`)
  - `calculated_metrics` (`latest_close`, `realized_volatility_annualized`, `latest_sma`, `latest_ema`, `latest_rsi`)
- **Integrity Rule**: If records retrieved is 0, never reports ₹0.00 close or price indicators; sets `finding_category="UNAVAILABLE"` and `empty_result=True`.

### Agent 3: Microstructure and Liquidity Agent (`adk_microstructure_specialist`)
- **Framework**: Google ADK
- **Inputs**: Upstream quantitative bar observations and volume data
- **Outputs**: `microstructure_analysis` containing:
  - `corwin_schultz_spread_bps` (parametric bid-ask spread estimate)
  - `average_daily_turnover_inr_cr` (average turnover in crores)
  - `effective_slippage_bps` (calibrated market impact)
  - `liquidity_tier` (`Tier-1 High Depth` or `UNOBSERVED`)

### Agent 4: News and Macro Agent (`crewai_news_macro_specialist`)
- **Framework**: CrewAI (via official A2A protocol)
- **Inputs**: Canonical symbol, monetary policy context
- **Outputs**: `news_macro_analysis` containing:
  - `policy_rate` (RBI Repo 6.50%)
  - `laf_corridor` (SDF 6.25% - MSF 6.75%)
  - `target_inflation` (4.0% +/- 2.0%)
  - `headline_summary` and `llm_macro_analysis`

### Agent 5: Corporate Filings and Governance Agent (`crewai_corporate_filing_specialist`)
- **Framework**: CrewAI (via official A2A protocol)
- **Inputs**: Canonical symbol, ChromaDB statutory filings
- **Outputs**: `corporate_filing_analysis` containing:
  - `compliance_status` (SEBI LODR Regulation 30 & 33)
  - `governance_rating` (`SATISFACTORY` or `STRONG`)
  - `summary` (Quarterly audited financials and unmodified opinions)

### Agent 6: Adversarial Skeptic (`crewai_adversarial_specialist`)
- **Framework**: CrewAI (via official A2A protocol)
- **Inputs**: Upstream quantitative findings, microstructure profile, macro and filing evidence
- **Outputs**: `adversarial_critique` containing:
  - `skeptic_verdict` (`APPROVED`, `CONDITIONALLY_APPROVED`, or `REJECT_UNOBSERVED`)
  - `stress_tests` (dynamic dictionary of executed stress tests)
  - `adversarial_discount_bps` (statutory friction discount reserve)
- **Integrity Rule**: If upstream observations are 0, emits `REJECT_UNOBSERVED` and vetoes any quantitative claim; blocks static passed checkmarks.

### Agent 7: Risk Validator (`adk_risk_validator`)
- **Framework**: Google ADK
- **Inputs**: Upstream specialist findings, statutory tax schedules under Indian Finance (No. 2) Act 2024
- **Outputs**: `statutory_and_risk_validation` containing:
  - `total_statutory_costs_inr` (STT 0.1%, GST 18%, Stamp Duty 0.015%, SEBI fees)
  - `effective_rate_pct` (~0.1186% per delivery roundtrip)
  - `live_trading_blocked` (`True` — strict paper simulation enforcement)
