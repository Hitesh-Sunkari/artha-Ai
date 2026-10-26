# ArthaAI — Multi-Agent System Registry

This document records the official specification, execution tier, tools, and responsibilities of every agent in the ArthaAI platform.

---

## 1. Google ADK Agents

### 1.1 ADK Research Coordinator (`adk_research_manager`)
- **Framework**: Google Agent Development Kit (ADK)
- **Primary Role**: Chief orchestration executive overseeing the end-to-end investment research lifecycle.
- **Responsibilities**:
  1. Validates incoming requests and establishes point-in-time bounds (`as_of_time`).
  2. Initializes the versioned Blackboard with `REQUEST` and `GOVERNANCE` namespaces.
  3. Executes early RAG retrieval against `ChromaRAGStore` to establish ground truth prior to specialist dispatch.
  4. Dispatches domain analysis tasks to CrewAI specialists across the official A2A protocol.
  5. Computes quantitative metrics and Finance Act 2024 statutory friction drag using FastMCP tools.
  6. Synthesizes multi-agent evidence into a deterministic, rubric-based investment recommendation (`BUY`, `HOLD`, `SELL`, or `INSUFFICIENT_EVIDENCE`).
  7. Computes agent operational telemetry, duration, retries, and token heatmaps.
- **Tools**:
  - `query_market_data` (FastMCP)
  - `retrieve_regulatory_evidence` (FastMCP)
  - `compute_statutory_costs` (FastMCP)
  - `compute_quant_metrics` (FastMCP)
  - `a2a_invoke_specialist` (A2A Client Bridge)
- **Input State**: `BlackboardNamespace.REQUEST`
- **Output State**: `BlackboardNamespace.AGENT_CONTRIBUTIONS`, `QuantitativeResearchReport`

---

## 2. CrewAI Specialist Agents

### 2.1 News & Macroeconomic Specialist (`crewai_news_macro_specialist`)
- **Framework**: CrewAI
- **Interface Protocol**: A2A JSON-RPC 2.0 (`task_name="news_macro_analysis"`)
- **Primary Role**: Macroeconomic and monetary policy evaluation for Indian capital markets.
- **Knowledge Base**: RBI Monetary Policy Corridor (Repo 6.50%, SDF 6.25%, MSF 6.75%), systemic liquidity, inflation CPI targets (4.0% ± 2%).
- **Inputs**: Upstream RAG regulatory evidence and ticker context.
- **Outputs**: Macro regime classification, rate environment impact, and policy risk score.

### 2.2 Corporate Filings Specialist (`crewai_corporate_filing_specialist`)
- **Framework**: CrewAI
- **Interface Protocol**: A2A JSON-RPC 2.0 (`task_name="corporate_filing_analysis"`)
- **Primary Role**: Scrutiny of quarterly financial statements, auditor notes, and board disclosures.
- **Knowledge Base**: SEBI LODR Regulation 30/33, NSE corporate filings, revenue growth, operating margin trends, and contingent liabilities.
- **Inputs**: Corporate filing chunks retrieved from ChromaDB for the target symbol.
- **Outputs**: Fundamental strength evaluation, auditor qualification flags, and financial stability score.

### 2.3 Adversarial Red-Team Skeptic (`crewai_adversarial_skeptic`)
- **Framework**: CrewAI
- **Interface Protocol**: A2A JSON-RPC 2.0 (`task_name="adversarial_critique"`)
- **Primary Role**: Hostile stress-testing of bullish assumptions, fee drag, valuation overextension, and regulatory risks.
- **Responsibilities**:
  1. Identifies hidden tail-risk vulnerabilities in the target asset.
  2. Evaluates ASM/GSM surveillance risks under NSE/BSE criteria.
  3. Identifies statutory and tax friction drag (Finance Act 2024).
  4. Issues formal dissent notes and proposes risk mitigations.
- **Outputs**: Adversarial risk rating, red-team warning count, and formal dissent critique.

---

## 3. Deliberation Personas (Investment Committee)

### 3.1 Chief Macro Strategist (`macro_strategist`)
- **Focus**: Global interest rate regimes, RBI policy corridors, FII/DII liquidity dynamics, INR foreign exchange trends.
- **Stance Range**: `BULLISH` to `CAUTIOUS`
- **Vote Weights**: Evaluates systemic liquidity and monetary suitability.

### 3.2 Quantitative Risk Officer (`quant_risk_officer`)
- **Focus**: Value at Risk (VaR 99%), Ledoit-Wolf shrinkage covariance, peak-to-trough drawdowns, and portfolio volatility budget.
- **Stance Range**: `NEUTRAL` to `SKEPTICAL`
- **Vote Weights**: Enforces mathematical variance and drawdown limits.

### 3.3 Adversarial Skeptic & Red Team (`adversarial_skeptic`)
- **Focus**: Regulatory compliance, SEBI enforcement history, auditor changes, tax drag, and severe crisis scenarios.
- **Stance Range**: `SKEPTICAL`
- **Vote Weights**: Demands mandatory binding constraints and reserves right to veto.

### 3.4 Chief Investment Officer (`cio_chairperson`)
- **Focus**: Final fiduciary synthesis, balancing alpha potential with capital preservation.
- **Role**: Presides over the chamber, resolves dissents, records binding constraints, and issues the official verdict (`APPROVED`, `CONDITIONALLY_APPROVED`, or `REJECTED`).
