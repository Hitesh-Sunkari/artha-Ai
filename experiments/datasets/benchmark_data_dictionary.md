# ArthaAI Canonical Benchmark Dataset — Data Dictionary

**Dataset Version:** 1.0.0  
**Snapshot Cutoff:** 2026-10-29T15:30:00+05:30  
**Jurisdiction:** Indian Capital Markets (NSE, BSE, MCX)  
**Total Scenarios:** 12 (6 Query-Based, 6 Stock-Selection)  
**Repetitions:** 4 per scenario across 2 systems = 96 experimental runs  

---

## 1. Field Schema

| Field Name | Type | Description | Mandatory |
|---|---|---|:---:|
| `scenario_id` | String | Unique identifier: `Q01`–`Q06` for query workflows, `S01`–`S06` for stock selection | Yes |
| `name` | String | Standard human-readable title of the benchmark scenario | Yes |
| `workflow_type` | Enum | `QUERY_BASED` or `STOCK_SELECTION` | Yes |
| `difficulty` | Enum | `INTERMEDIATE`, `ADVANCED`, `HARD` | Yes |
| `target_symbols` | Array[String] | NSE/BSE security identifiers under test | Yes |
| `question` | String | Primary analytical prompt dispatched to systems | Yes |
| `query_variations` | Array[String] | Parameterized and syntactic prompt variations mapping to identical reference targets | Yes |
| `input_parameters` | Object | Standardized execution parameters passed to tools and models | Yes |
| `required_subtasks` | Array[String] | Atomic steps systems must execute to achieve complete coverage | Yes |
| `expected_tools` | Array[String] | Approved deterministic FastMCP tools required for task | Yes |
| `reference_answer_id`| String | Foreign key pointing to independent ground-truth JSON in `experiments/reference_answers/` | Yes |
| `numerical_invariants`| Object | Frozen point-in-time reference quantities (prices, ratios, percentages) | Yes |
| `numerical_tolerances`| Object | Permitted relative error thresholds for automated scoring | Yes |
| `acceptable_conclusions`| Array[String]| Authorized analytical stances (e.g. `BUY`, `ACCUMULATE_BASKET`, `HOLD`) | Yes |
| `unsupported_conclusions`| Array[String]| Disallowed assertions indicating model hallucination or calculation failure | Yes |
| `critical_error_conditions`| Array[String]| High-severity flags triggering automatic task failure | Yes |
| `data_availability_status`| Enum | `VERIFIED`, `PARTIALLY_VERIFIED`, `BLOCKED`, `NOT_APPLICABLE` | Yes |

---

## 2. Canonical Scenarios Overview

### Query-Based Scenarios (Workflow A)
- **Q01**: Comprehensive Single-Stock 5Y Research (`RELIANCE.NS`)
- **Q02**: Momentum and Volume Confirmation (`TATSILV`, `SILVERBEES`)
- **Q03**: Downside Risk and Volatility Stress Test (`TATAMOTORS.NS`)
- **Q04**: Intra-Sector Stock Comparison (`TCS.NS` vs. `INFY.NS`)
- **Q05**: Incomplete or Conflicting Evidence Handling (`SWIGGY.NS`)
- **Q06**: Macro and Regulatory Impact on Banking (`HDFCBANK.NS`)

### Stock-Selection Scenarios (Workflow B)
- **S01**: Growth and Profitability Screening (`NIFTY_50_UNIVERSE`)
- **S02**: Momentum and Liquidity Screening (`NIFTY_100_LIQUID`)
- **S03**: Conservative Risk-Oriented Selection (`RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `ITC.NS`)
- **S04**: Balanced Risk-Return Selection with SIMD Monte-Carlo (`TATAMOTORS.NS`, `MARUTI.NS`)
- **S05**: Multi-Dimensional Cross-Asset Stock Ranking (`TATAMOTORS.NS`, `INFY.NS`, `RELIANCE.NS`, `SILVERBEES`)
- **S06**: Constraint-Based Stock Selection (`NIFTY_UNIVERSE_BASKET`)
