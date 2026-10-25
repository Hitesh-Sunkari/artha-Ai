# INDIAN MARKET DATA READINESS SPECIFICATION

**System:** ArthaAI Data Ingestion & Storage Subsystems  
**Date:** 2026-09-11  
**Authoritative Source:** `src/arthaai/data/readiness/indian_market.py`  

---

## 1. Capability Taxonomy

To prevent mock or synthetic data from being mistaken for real exchange feeds, ArthaAI classifies all data capabilities into standard capability states:

| Status | Definition |
|--------|------------|
| `IMPLEMENTED` | Production pipeline fully implemented, tested, and operational. |
| `INTERFACE_ONLY` | Schema, interfaces, and validation contracts are defined, but no live adapter is wired. |
| `FIXTURE_ONLY` | Deterministic synthetic or fixture datasets exist for CI/CD and testing only. |
| `REQUIRES_CREDENTIALS` | Adapter exists but requires live broker/vendor API keys. |
| `REQUIRES_PAID_DATA` | Requires commercial exchange feed licenses (e.g. NSE Colocation, TrueData, GlobalDataFeeds). |
| `UNSUPPORTED` | Out of scope for current development step. |

---

## 2. Assessment of 6 Indian Market Areas

### Area 1: Cash Equities & Order Flow
- **Trades (Tick-by-Tick):** `FIXTURE_ONLY`. Canonical `Trade` schema is hardened with `side_provenance` (`OBSERVED` vs `INFERRED`). Live tick-by-tick order execution requires NSE Tick-by-Tick (TBT) colocation feed or high-tier vendor feed.
- **Level 2 Market Depth (5-level / 20-level):** `FIXTURE_ONLY`. `OrderBookSnapshot` schema implemented. Live feed requires commercial broker WebSocket subscription.
- **Derived Microstructure Metrics:** `INTERFACE_ONLY`. `DerivedOrderFlowRecord` schema contract exists with `NOT_YET_COMPUTED` flags; calculation engine scheduled for Step 3.

### Area 2: Index & Stock Options
- **Contract Specifications & Expiry Engine:** `IMPLEMENTED`. Full point-in-time expiry resolution with authoritative overrides.
- **Option Chain Snapshots:** `FIXTURE_ONLY`. Schema supports multi-strike calls/puts, implied volatility, and open interest.
- **Live Option Chain Feed:** `REQUIRES_PAID_DATA`. NSE real-time option chain API requires paid data provider subscription (TrueData / Breeze / Interactive Brokers).
- **Greeks & IV Surface:** `INTERFACE_ONLY`. Schema tracks `greeks_provenance`; calculation engines scheduled for Step 4.

### Area 3: Historical Derivatives
- **NSE Historical Bhavcopy (F&O):** `REQUIRES_PAID_DATA` / `INTERFACE_ONLY`. Historical daily F&O Bhavcopy parser interface defined; large-scale historical archive ingestion scheduled for Step 3.
- **Historical Lot & Tick Sizes:** `IMPLEMENTED`. Full canonical registry covering major index contracts from 2015 to present.

### Area 4: Market News & Sentiment
- **Financial News Stream:** `FIXTURE_ONLY`. Canonical `NewsArticle` schema implemented with source provenance and arrival tracking.
- **Live News Ingestion:** `REQUIRES_CREDENTIALS`. Requires live financial news API credentials (OpenBB / Benzinga / Bloomberg / Reuters).

### Area 5: Fundamentals & Corporate Filings
- **Corporate Actions (Dividends, Splits, Bonuses):** `FIXTURE_ONLY` / `INTERFACE_ONLY`. Canonical `CorporateAction` schema and adjustment lineage implemented.
- **Quarterly Financial Statements & Ratios:** `UNSUPPORTED`. Out of scope for algorithmic and microstructure research steps.

### Area 6: Macroeconomic & RBI Policy Events
- **Macro Indicators (Repo Rate, CPI, GDP, IIP):** `INTERFACE_ONLY`. Canonical `EconomicEvent` schema defined with consensus, actual, and previous metrics. Live RBI/MOSPI automated scraper scheduled for Step 4.

---

## 3. Production Deployment Prerequisites

Before deploying live trading agents or real-capital strategies:
1. **Commercial Data Provider:** Secure an enterprise WebSocket feed for NSE Cash and F&O tick data (e.g. TrueData, GlobalDataFeeds, or Zerodha Kite Connect Publisher).
2. **PostgreSQL Instrument Master:** Migrate in-memory `InstrumentMaster` to persistent PostgreSQL instance with temporal tables.
3. **Historical Bhavcopy Lake:** Populate local Parquet store with 10+ years of clean, adjusted NSE daily Bhavcopy records.
