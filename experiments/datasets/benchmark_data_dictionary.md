# ArthaAI Benchmark v1 Data Dictionary & Ground-Truth Reference Guide

## 1. Overview
The **ArthaAI Benchmark v1** is a scientifically constructed, reproducible evaluation suite designed specifically for Indian capital markets (NSE, BSE, MCX).
It encompasses 12 empirical scenarios across two institutional workflows:
- **Workflow A (Q01 – Q06):** Single-stock deep quantitative research, technical momentum validation, tail risk stress testing, intra-sector pairs comparison, sparse/conflicting data disclosures, and macro policy integration.
- **Workflow B (S01 – S06):** Growth/compounding screening, liquidity-adjusted momentum filtering, minimum-variance Ledoit-Wolf shrinkage, 5-year Monte Carlo compounding envelopes, cross-asset taxonomy, and hard-constraint capital preservation.

## 2. Experimental Design Matrix
* **Scenarios ($N_S$):** 12
* **Repetitions per Scenario ($N_R$):** 4
* **Systems Compared:**
  1. `ARTHAAI_MULTI_AGENT`: 7-Agent Fleet (ADK Research Manager, Quant Specialist, Microstructure Specialist, CrewAI News/Macro Specialist, Fundamentals Specialist, Adversarial Skeptic, Risk & Validation Officer).
  2. `SINGLE_AGENT_BASELINE`: Direct single-agent LLM prompted with the same data snapshot and FastMCP tools, isolated from multi-agent coordination, debate, and independent skepticism.
* **Total Executions:** 96 runs (48 ArthaAI + 48 Baseline).

## 3. Seven Canonical Evaluation Metrics (0 – 100 Scale)
1. **Analytical Accuracy ($A_{acc}$, 25%):** Normalized numerical error against reference closing marks, Moving Averages, and Volatilities within tolerance.
2. **Evidence Grounding ($E_{grd}$, 20%):** Proportion of material financial claims backed by verifiable citations.
3. **Task Completion ($T_{cmp}$, 15%):** Completion percentage of mandatory research subtasks.
4. **Consistency ($C_{stb}$, 10%):** Stability and consensus agreement across the 4 repetitions.
5. **Operational Reliability ($R_{ops}$, 15%):** First-attempt success rate + retry recovery rate.
6. **Trace Lineage ($T_{rc}$, 15%):** Proportion of conclusions provably traceable to Blackboard events and FastMCP tool outputs.
7. **Latency Decomposition ($L_{tot}$, Efficiency Metric):** Measured in seconds, decomposed by Manager, Agent, FastMCP, and RAG retrieval stages.

## 4. Point-In-Time Anchor
- As-of timestamp: `2026-10-29T15:30:00+05:30`
- Zero lookahead bias strictly enforced across all analytical partitions.

