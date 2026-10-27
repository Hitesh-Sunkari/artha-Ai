# ArthaAI — Agentic Flow Audit & Defect Resolution Report

## Executive Summary

This document records the comprehensive audit, root cause analysis, code corrections, and regression verification for all defects identified in the ArthaAI multi-agent quantitative financial research platform.

Audit Timestamp: 2026-10-27 (IST Market Clock Enforced)  
System Target: Indian Capital Markets (NSE/BSE), SEBI LODR 2015, Finance (No. 2) Act 2024  
Frameworks: Google ADK (Manager, Quant, Microstructure, Risk Validator) & CrewAI (News/Macro, Corporate Filings, Adversarial Skeptic) over official A2A and FastMCP protocols.

---

## 1. Confirmed Anomalies & Root Cause Analysis

### Defect 1: ICICIBANK.NS vs Apple Cross-Run Contamination
- **Reported Symptom**: A research request for Indian bank `ICICIBANK.NS` displayed references to Apple in manager synthesis and corporate compliance.
- **Root Cause**:
  1. ChromaDB statutory filing corpus originally only contained chunks for RELIANCE, TCS, INFY, and HDFCBANK. Queries for ICICIBANK returned 0 company chunks, causing open-domain LLM completions to drift into foreign equity references.
  2. RAG prompt templates in `a2a_bridge.py` lacked strict canonical symbol normalization (`clean_symbol`) and anti-contamination boundaries.
- **Fix Applied**:
  - Ingested authentic Q2 FY25 statutory filing chunks for `ICICIBANK` (Consolidated Net Profit ₹11,746 Cr, Net NPA 0.42%, CRAR 16.63%), `TATAMOTORS`, `SBIN`, `ITC`, and `WIPRO` into `src/arthaai/rag/documents.py`.
  - Enforced strict canonical symbol extraction and anti-contamination prompts in `src/arthaai/orchestration/a2a_bridge.py` (`_execute_news_macro` and `_execute_corporate_filing`).
  - Added regression test `test_canonical_instrument_identity_icicibank_isolation()` verifying zero references to Apple, AAPL, iPhone, or MacBook.
- **Verification Result**: PASSED.

### Defect 2: Quant Specialist Zero Bars / ₹0 Close vs Displayed 100 Bars
- **Reported Symptom**: In data-absence scenarios, the Quant Specialist reported 0 historical bars and ₹0.00 close, while the UI card displayed 100 bars and positive metrics.
- **Root Cause**:
  - In `frontend/src/components/LiveTimeline.tsx`:
    - Line 403 had `{findings.records_retrieved || 100} Bars`. When `records_retrieved === 0`, JavaScript falsy evaluation resulted in `100`.
    - Line 385 had `₹{Number(findings.calculated_metrics?.latest_close || 0).toFixed(2)}`. When `latest_close` was null or missing, it evaluated to `0.00`, displaying `₹0.00`.
- **Fix Applied**:
  - Replaced `{findings.records_retrieved || 100}` with `{findings.records_retrieved != null ? `${findings.records_retrieved} Bars` : '0 Bars'}`.
  - Replaced `{Number(findings.calculated_metrics?.latest_close || 0).toFixed(2)}` with conditional check displaying `'Unavailable'` when null.
  - Handled microstructure and indicator metrics similarly (`'Unavailable'` / `'N/A'`).
- **Verification Result**: PASSED.

### Defect 3: Manager Premature Conviction Stance (ACCUMULATE 82/100)
- **Reported Symptom**: Initial Manager stage displayed `ACCUMULATE (82/100)` while the final report displayed `INSUFFICIENT_EVIDENCE (25/100)`.
- **Root Cause**:
  - In `frontend/src/components/LiveTimeline.tsx`, lines 357 and 363 hardcoded `{findings.consensus_stance || 'ACCUMULATE'}` and `{findings.multi_agent_conviction_score || 82}`.
  - In `src/arthaai/orchestration/adk_coordinator.py`, the initial Manager stage did not produce an explicit typed research plan, allowing default fallbacks to render.
- **Fix Applied**:
  - Added initial Manager supervisory stage: publishes typed `research_plan_and_supervision` with `initial_hypothesis="PROVISIONAL_EVALUATION_PENDING_SPECIALIST_EVIDENCE"` and `conviction_score=None` (strictly unscored).
  - Updated `LiveTimeline.tsx` to display `{findings.consensus_stance || 'EVALUATING'}` and `{findings.multi_agent_conviction_score != null ? ... : 'Pending'}`.
  - Harmonized final manager contribution in `_synthesize_report` so its `consensus_stance` and `multi_agent_conviction_score` strictly match the gated `QuantitativeResearchReport`.
- **Verification Result**: PASSED.

### Defect 4: Adversarial Skeptic REJECT_UNOBSERVED vs Displayed Passed Stress Tests
- **Reported Symptom**: The Adversarial Skeptic reported `REJECT_UNOBSERVED`, but the UI displayed 4 hardcoded `PASSED` stress tests with green checkmarks.
- **Root Cause**:
  - `LiveTimeline.tsx` lines 556-573 rendered a static HTML list of 4 hardcoded PASSED tests (Volatility Shock, Liquidity Contraction, Statutory Friction Drag, Lookahead Audit) instead of inspecting `findings.stress_tests`.
- **Fix Applied**:
  - Updated `LiveTimeline.tsx` to conditionally inspect `findings.skeptic_verdict`:
    - If `REJECT_UNOBSERVED`: renders a red warning card indicating that stress tests were blocked due to insufficient market observations.
    - If `findings.stress_tests`: dynamically maps over `Object.entries(findings.stress_tests)` with appropriate pass/fail badges.
- **Verification Result**: PASSED.

### Defect 5: Trace Lifecycle Event Duplication & Hardcoded Fake Durations
- **Reported Symptom**: Duplicate `AGENT_START` and `AGENT_COMPLETE` events appeared in the event stream, with artificial durations (800ms, 450ms, 350ms, 500ms).
- **Root Cause**:
  - Coordinator execution loops in `_execute_sequential`, `_execute_parallel`, and `_execute_hierarchical` called `tracer.record_event(AGENT_START)` and `tracer.record_event(AGENT_COMPLETE, duration_ms=800)` around specialist calls, while the specialists themselves also recorded start and complete events.
- **Fix Applied**:
  - Removed duplicate outer coordinator lifecycle event emissions.
  - Measured actual wall-clock durations monotonically using `time.perf_counter()` across all agent invocations.
- **Verification Result**: PASSED.

### Defect 6: User-Facing Model Names, Stars, and Emojis
- **Reported Symptom**: Decorative symbols (`✦`), emojis (`🛡️`, `🏛️`, `🤖`), and model provider names (`[AI SYNTHESIS via Google Gemini (gemini-3.1-flash-lite)]`) appeared in user-facing views.
- **Root Cause**:
  - In `LiveTimeline.tsx`, badge headers used `✦ Google Gemini Flash` and `✦ AI Synthesis by Google Gemini`.
  - In `copilot_guardrails.py`, refusal messages used `🛡️` and `🏛️`.
  - In `adk_coordinator.py`, synthesis thesis was prefixed with `[AI SYNTHESIS via {llm_provider}]`.
- **Fix Applied**:
  - Removed all `✦` stars and emojis across `LiveTimeline.tsx`, `copilot_guardrails.py`, and `adk_coordinator.py`.
  - Replaced provider branding with institutional terminology (`Multi-Specialist Quantitative Synthesis`, `Institutional Response Verified`).
  - Added automated sanitizer in `copilot_chat` and `adk_coordinator.py` to strip any provider names from user outputs.
- **Verification Result**: PASSED.

---

## 2. Regression Test Coverage

| Test File | Tests Run | Result | Notes |
|---|---|---|---|
| `tests/orchestration/test_final_verification.py` | 4 | **PASSED** | Validates ICICI isolation, Copilot contract, guardrails, and comparison endpoint |
| `tests/orchestration/test_end_to_end_slice.py` | 5 | **PASSED** | Validates 7-agent sequential, parallel, hierarchical, and honest missing data |
| `tests/orchestration/test_llm_adapter.py` | 4 | **PASSED** | Validates token costing, budget limits, credential masking, and unconfigured fallback |
| `tests/orchestration/test_research_api.py` | 25 | **PASSED** | Validates health, readiness, submit, trace, heatmap, and summary endpoints |
| `tests/orchestration/test_blackboard_handoff.py` | 5 | **PASSED** | Validates thread safety, monotonic versioning, and cross-agent transfers |
| `tests/orchestration/test_a2a_exchange.py` | 5 | **PASSED** | Validates official A2A protocol and CrewAI specialist invocations |
