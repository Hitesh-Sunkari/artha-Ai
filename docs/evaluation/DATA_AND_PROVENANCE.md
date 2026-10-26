# ArthaAI — Data Integrity, Quantitative Correctness & Provenance

## 1. Market Data Pipeline & Point-in-Time Integrity

ArthaAI enforces strict point-in-time (PIT) information boundaries to prevent lookahead leakage in quantitative research:

- **Primary Analytical Pipeline**: `src/arthaai/data/yfinance_pipeline.py` integrates Yahoo Finance with local Parquet partitioned caching under `data/parquet/ohlcv/`.
- **DuckDB Analytical Engine**: `src/arthaai/data/research/duckdb_engine.py` executes SQL queries over partitioned Parquet datasets with `WHERE available_at <= as_of_time` filters.
- **Zero-Fabrication Invariant**: When historical observations for a requested window do not exist, the pipeline returns `records_count: 0`, sets `finding_category: "UNAVAILABLE"`, and provides an empty citation list. It never generates synthetic prices or fills missing bars with imaginary numbers.

---

## 2. Mathematical Indicators & Quantitative Formulas

All quantitative features in `src/arthaai/features/calculators.py` and FastMCP tools follow standard financial mathematics:

| Metric | Mathematical Formula | Lookback / Parameters | Annualization Factor |
| :--- | :--- | :--- | :--- |
| **Simple Returns** | $R_t = \frac{P_t - P_{t-1}}{P_{t-1}}$ | 1-day bar intervals | N/A |
| **Log Returns** | $r_t = \ln(P_t / P_{t-1})$ | 1-day bar intervals | N/A |
| **Realized Volatility** | $\sigma_{\text{ann}} = \sqrt{252} \times \sqrt{\frac{1}{N-1} \sum_{i=1}^N (R_i - \bar{R})^2}$ | $N = 20$ trading days | $\sqrt{252} \approx 15.8745$ |
| **Simple Moving Average (SMA)** | $\text{SMA}_t = \frac{1}{k} \sum_{i=0}^{k-1} P_{t-i}$ | $k = 20$ trading days | N/A |
| **Exponential Moving Average (EMA)** | $\text{EMA}_t = \alpha P_t + (1 - \alpha) \text{EMA}_{t-1}, \quad \alpha = \frac{2}{k+1}$ | $k = 20$ trading days | N/A |
| **Relative Strength Index (RSI)** | $\text{RSI} = 100 - \frac{100}{1 + \text{RS}}, \quad \text{RS} = \frac{\text{EMA}(\text{Gain}, 14)}{\text{EMA}(\text{Loss}, 14)}$ | 14-period Wilder smoothing | N/A |
| **Bid-Ask Spread (Corwin-Schultz 2012)** | Uses 2-day high-low price ratios: $\alpha = \frac{\sqrt{2\beta} - \sqrt{\beta}}{3 - 2\sqrt{2}} - \sqrt{\frac{\gamma}{3 - 2\sqrt{2}}}$; $S = \frac{2(e^\alpha - 1)}{1 + e^\alpha}$ | 20-30 historical daily bars | In basis points (bps) |
| **Kyle's Lambda (Market Impact)** | $\lambda = \frac{\text{Spread}_{\text{bps}}}{\max(10, \text{Turnover}_{\text{Cr}})}$ | 20-day average daily turnover | In bps per Crore INR |

---

## 3. Persistent ChromaDB Regulatory Knowledge Base

The grounded regulatory repository (`src/arthaai/rag/chroma_store.py`) indexes official statutory documents on local disk (`data/chroma_db`):

- **Chunk Count**: 13 verified authoritative chunks.
- **Embedding Model**: 384-dimensional deterministic lexical/semantic embeddings, ensuring zero runtime download dependencies.
- **Statutory Corpus Ingested**:
  1. *Finance (No. 2) Act 2024 (Act No. 15 of 2024)*: Capital gains tax restructuring (LTCG flat 12.5%, STCG 20%, Section 112A threshold ₹1.25 Lakh).
  2. *SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015*: Regulation 30 material event disclosures within 30 minutes / 24 hours.
  3. *SEBI Prohibition of Insider Trading (PIT) Regulations, 2015*: Unpublished Price Sensitive Information (UPSI) handling.
  4. *RBI Monetary Policy Framework & Liquidity Adjustment Facility (LAF)*: Repo rate adjustments, standing deposit facility, systemic liquidity bounds.
  5. *Indian Stamp (Collection of Stamp-Duty) Rules, 2019*: State and national delivery/intraday stamp duty rates.

---

## 4. Cryptographic Provenance & Audit Hash

Every finalized `QuantitativeResearchReport` produced by ArthaAI computes a deterministic **SHA-256 state provenance hash** stored in `report.audit_hash`.

### Provenance Hash Construction
$$\text{AuditHash} = \text{SHA-256}\Big(\text{RunID} \parallel \text{Symbol} \parallel \text{Timestamp} \parallel \text{BlackboardVersion} \parallel \bigoplus_{i=1}^M \text{SHA-256}(\text{Contribution}_i) \parallel \bigoplus_{j=1}^K \text{Citation}_j\Big)$$

Any modification to intermediate specialist findings, quantitative calculations, or cited sources alters the audit hash, guaranteeing immutable auditability for institutional compliance.
