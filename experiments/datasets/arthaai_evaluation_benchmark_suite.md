# ArthaAI Empirical Benchmark Evaluation Suite (v2.5)

## 1. Overview & Scientific Design

The **ArthaAI Empirical Benchmark Evaluation Suite** is a standardized, production-grade test collection engineered specifically for evaluating multi-agent institutional financial AI systems (Sequential, Parallel, Hierarchical) against solitary ReAct and single-agent baselines.

The dataset contains **38 empirical scenarios** balanced across:
1. **Multi-Domain Sector Variance**: Energy, Automotive/EV, Banking, IT Services, Commodities/Bullion, Infrastructure, FMCG, Pharmaceuticals, Telecommunications, Defense/PSU, Metals, and New-Age Quick Commerce.
2. **Analytical Task Variance**: Fundamental DCF, Options Chain Microstructure (PCR Max Pain, Greeks), Statutory Tax Drag (STT Finance Act 2024, SEBI LODR 2015, RBI MPC policy corridors), Vectorized Monte Carlo Stress Testing (VaR 95/99), and Intra-Sector Paired Arbitrage.
3. **Structured Repetition Variance**:
   - **`EXACT_REPEAT`**: Identical queries placed across non-adjacent rows to evaluate **Deterministic Consistency** and **Test-Retest Reliability** (measuring variance in conviction scores, tool calls, and output stability).
   - **`PARAPHRASE_VARIANT`**: Semantically identical inquiries with altered tone, phrasing, or syntax to evaluate **Semantic Invariance** and **Prompt Robustness**.
   - **`POLARITY_CONTRAST`**: Adversarially negative/bearish questions paired with neutral/objective questions to evaluate **Bias Neutrality** and **Hallucination Resistance** (verifying that the agent remains anchored to empirical SEC/BSE data rather than conforming to user confirmation bias).
   - **`HORIZON_CONTRAST`**: 1-Year Tactical vs 5-Year Structural evaluations to test temporal horizon adaptability.

---

## 2. Statistical Composition

| Dimension | Count | Share (%) | Purpose |
| :--- | :---: | :---: | :--- |
| **Total Scenarios** | **38** | 100.0% | Complete institutional coverage |
| **Core Benchmark** (`CORE_BENCHMARK`) | **15** | 39.5% | Baseline domain-specific inquiries |
| **Exact Repeats** (`EXACT_REPEAT`) | **5** | 13.2% | Test-retest reliability & Conviction stability |
| **Paraphrase Variants** (`PARAPHRASE_VARIANT`) | **12** | 31.6% | Semantic invariance & Prompt robustness |
| **Adversarial / Bearish** (`POLARITY_CONTRAST`) | **5** | 13.2% | Neutrality & Anti-hallucination verification |
| **Horizon Contrast** (`HORIZON_CONTRAST`) | **1** | 2.6% | Tactical (1Y) vs Structural (5Y) horizon |

---

## 3. Repetition & Variance Group Catalog

### Group 1: Reliance Industries 5-Year Capital Allocation (`GROUP_RELIANCE_5Y`)
- **Q01 (`CORE_BENCHMARK`)**: *"Evaluate Reliance Industries 5-year capital allocation, O2C margin outlook, and retail cash conversion."*
- **Q02 (`EXACT_REPEAT`)**: *"Evaluate Reliance Industries 5-year capital allocation, O2C margin outlook, and retail cash conversion."* &rarr; *Tests if the system yields identical verdict and conviction score.*
- **Q03 (`PARAPHRASE_VARIANT`)**: *"What is the 5-year investment thesis for Reliance Industries across its oil-to-chemicals refining cycle, Jio telecom capex, and retail free cash flow?"* &rarr; *Tests conversational semantic understanding.*
- **Q04 (`POLARITY_CONTRAST`)**: *"Examine the downside risks, net debt leverage, and capital misallocation vulnerabilities in Reliance Industries over the next 5 years."* &rarr; *Tests resistance to bearish confirmation bias.*

### Group 2: Tata Motors EV & JLR Cash Flows (`GROUP_TATAMOTORS_EV`)
- **Q05 (`CORE_BENCHMARK`)**: *"Evaluate Tata Motors EV margin cannibalization, JLR cash flow, and 5-year outlook."*
- **Q06 (`EXACT_REPEAT`)**: *"Evaluate Tata Motors EV margin cannibalization, JLR cash flow, and 5-year outlook."* &rarr; *Tests consistency of Monte Carlo downside paths.*
- **Q07 (`PARAPHRASE_VARIANT`)**: *"Assess Tata Motors long-term profitability considering domestic electric vehicle adoption, JLR debt deleveraging, and commercial vehicle cycle."*
- **Q08 (`POLARITY_CONTRAST`)**: *"Stress-test Tata Motors valuation against European EV demand contraction, JLR capex commitments, and margin cannibalization."* &rarr; *Verifies multi-factor risk auditor behavior.*

### Group 3: Physical Silver Bullion & ETF Volumes (`GROUP_SILVER_TREND`)
- **Q09 (`CORE_BENCHMARK`)**: *"What is the physical silver trend, ETF volumes, and delivery outlook for next 10 years?"*
- **Q10 (`EXACT_REPEAT`)**: *"What is the physical silver trend, ETF volumes, and delivery outlook for next 10 years?"* &rarr; *Verifies cross-asset tool consistency.*
- **Q11 (`PARAPHRASE_VARIANT`)**: *"Analyze long-term physical silver supply-demand deficit, industrial solar consumption, and Indian silver ETF delivery dynamics over a 10-year horizon."*
- **Q12 (`POLARITY_CONTRAST`)**: *"Why could silver ETFs and physical bullion underperform over the next decade given industrial substitution and monetary tightening?"* &rarr; *Checks factual grounding against macro bearish framing.*

### Group 4: HDFC Bank Post-Merger NIM & Mortgages (`GROUP_HDFCBANK_NIM`)
- **Q13 (`CORE_BENCHMARK`)**: *"Audit HDFC Bank post-merger mortgage integration, NIM compression, and deposit competition."*
- **Q14 (`EXACT_REPEAT`)**: *"Audit HDFC Bank post-merger mortgage integration, NIM compression, and deposit competition."* &rarr; *Tests banking ratio reproducibility.*
- **Q15 (`PARAPHRASE_VARIANT`)**: *"Examine HDFC Bank Net Interest Margin trajectory, CASA ratio stabilization, and branch deposit mobilization costs post-merger."*
- **Q16 (`POLARITY_CONTRAST`)**: *"What are the structural credit risks, loan-to-deposit ratio strains, and ROA compression headwinds facing HDFC Bank following the mortgage merger?"*

### Group 5: TCS vs Infosys Paired Trade (`GROUP_TCS_INFY_PAIR`)
- **Q17 (`CORE_BENCHMARK`)**: *"Comparative operational analysis of TCS vs Infosys across EBIT margins, attrition, and GenAI capex."*
- **Q18 (`EXACT_REPEAT`)**: *"Comparative operational analysis of TCS vs Infosys across EBIT margins, attrition, and GenAI capex."* &rarr; *Tests paired trade recommendation consistency.*
- **Q19 (`PARAPHRASE_VARIANT`)**: *"Conduct a relative valuation and margin defensibility comparison between TCS and Infosys under AI-driven IT services transformation."*
- **Q20 (`HORIZON_CONTRAST`)**: *"1-Year paired long/short trade recommendation: TCS vs Infosys based on Q3 discretionary spending pipeline and voluntary attrition trends."* &rarr; *Tests 1-year tactical vs 5-year structural adaptability.*

### Sector Specialists Coverage (Groups 6 - 14)
- **State Bank of India (SBIN)**: Q21 (Core Repo Rate Sensitivity) & Q22 (Paraphrase 50 bps cut)
- **Tata Power Renewables**: Q23 (Core Solar & Debt Coverage) & Q24 (Paraphrase Utility Storage)
- **ITC Hotels Demerger**: Q25 (Core 1:10 Demerger Ratio) & Q26 (Paraphrase Shareholder Unlock)
- **Larsen & Toubro (LT)**: Q27 (Core Order Book Execution) & Q28 (Adversarial Geopolitical Risk)
- **Sun Pharma (SUNPHARMA)**: Q29 (Core USFDA Compliance Audit) & Q30 (Paraphrase Remediation)
- **Bharti Airtel (BHARTIARTL)**: Q31 (Core 5G ARPU Inflection) & Q32 (Paraphrase FCF Conversion)
- **Hindustan Aeronautics (HAL)**: Q33 (Core Tejas Delivery Timelines) & Q34 (Paraphrase Export Pipeline)
- **Tata Steel (TATASTEEL)**: Q35 (Core Decarbonization Capex) & Q36 (Adversarial UK Blast Furnace)
- **Zomato / Blinkit (ZOMATO)**: Q37 (Core Quick-Commerce Take-Rate) & Q38 (Adversarial Dark Store Burn)

---

## 4. How to Use the Dataset in ArthaAI

### Via Admin Benchmark Studio UI:
1. Open **Institutional Control Plane &rarr; 3. Benchmark & Eval Studio**.
2. Select **Dataset Suite & Live Monitor** (Tab 2).
3. Click the **Upload Dataset (.JSON / .CSV)** button.
4. Select `experiments/datasets/arthaai_evaluation_benchmark_suite.csv`.
5. The studio will parse all 38 scenarios, automatically map sectors, and configure all 5 comparison architectures (`SEQ`, `PAR`, `HIE`, `REACT`, `SINGLE`).
6. Click **Run All Scenarios** to execute the multi-agent comparative benchmark with live per-row telemetry.

