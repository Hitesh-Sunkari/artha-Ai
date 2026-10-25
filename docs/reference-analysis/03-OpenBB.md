# OpenBB — Forensic Analysis
**Source:** https://github.com/OpenBB-finance/OpenBB  
**Version Studied:** v4.7.2 (from pyproject.toml, Sep 2026)  
**License:** ⚠️ AGPL-3.0-only  
**Language:** Python 3.10+  

---

## 1. What Problem Does It Solve?

OpenBB is an **open-source investment research platform** — a unified data terminal that aggregates financial data from 40+ data providers behind a standardized API. It is the "Bloomberg Terminal for developers": a Python library + CLI + web app for equity, crypto, ETF, derivatives, macro, and alternative data.

---

## 2. Architecture Overview

```
OpenBB Platform (v4.x)
  ├── openbb_core         — Router, auth, extensions, caching, settings
  ├── openbb-platform-api — FastAPI HTTP server for remote access
  ├── Provider Extensions (pip packages)
  │     ├── openbb-yfinance     — Yahoo Finance adapter
  │     ├── openbb-fmp          — Financial Modeling Prep
  │     ├── openbb-fred         — FRED macroeconomic data
  │     ├── openbb-sec          — SEC EDGAR filings
  │     ├── openbb-intrinio     — Intrinio premium data
  │     ├── openbb-benzinga     — Benzinga news
  │     ├── openbb-tiingo       — Tiingo price/news
  │     ├── openbb-oecd         — OECD macro
  │     ├── openbb-imf          — IMF data
  │     ├── openbb-cftc         — CFTC commitments of traders
  │     └── 30+ others
  └── Domain Packages (semantic API)
        ├── openbb-equity       — stocks, fundamentals, market data
        ├── openbb-crypto       — digital assets
        ├── openbb-derivatives  — options chains, greeks
        ├── openbb-economy      — macro indicators
        ├── openbb-etf
        ├── openbb-currency
        └── openbb-fixed-income
```

---

## 3. API Design

```python
from openbb import obb

# Standardized result container
result = obb.equity.price.historical("AAPL", start_date="2024-01-01")
result.to_df()          # pandas DataFrame
result.to_polars()      # polars DataFrame (v4+)
result.results          # list of Pydantic models
result.chart.show()     # built-in charting

# Change provider
result = obb.equity.price.historical("AAPL", provider="fmp")
result = obb.equity.price.historical("RELIANCE.NS", provider="yfinance")

# Derivatives
chains = obb.derivatives.options.chains("AAPL")

# Economy
gdp = obb.economy.gdp(country="india")

# News
news = obb.news.company(symbol="RELIANCE.NS")
```

---

## 4. Data Model

All results return `OBBject` with:
- `results`: list of validated Pydantic model instances (provider-specific or standard)
- `provider`: which data source was used
- `warnings`: any data quality warnings
- `chart`: optional Plotly figure
- `extra`: raw metadata

Standard models across providers enforce consistent field names (e.g., `close`, `volume`, `pe_ratio`).

---

## 5. Key Technical Components

### Router System
OpenBB uses a FastAPI-inspired router that auto-discovers extensions and mounts them under namespaced paths (`equity/`, `derivatives/`, etc.). Extensions register themselves via Python entry points.

### Provider Pattern
Each data source implements a standard `Fetcher` interface:
```python
class Provider:
    name: str
    credentials: dict
    fetcher_dict: dict  # route → Fetcher class
```

### Caching
Built-in HTTP response caching to avoid repeated API calls. Configurable TTL per provider.

### Authentication
OpenBB Hub integration for credential management across sessions. API keys stored in user profile.

---

## 6. Performance Characteristics

- **Data fetch latency:** 200ms–5s (HTTP-bound, provider-dependent)
- **Parallel requests:** Yes, providers can be queried concurrently
- **Backtesting capability:** None — OpenBB is a data layer only
- **Streaming:** No — batch HTTP calls only
- **Indian market data:** Partial (yfinance for NSE/BSE via `.NS`/`.BO` suffixes; no native NSE adapter)

---

## 7. Dependencies

```
openbb-core (FastAPI, pydantic, sqlalchemy)
openbb-* (40+ provider packages)
pandas, polars, plotly
httpx, aiohttp
```

---

## 8. What Should ArthaAI Reuse?

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Standardized data model (OBBject) | INSPIRED | Good pattern; ArthaAI needs its own MarketSnapshot |
| Provider extension pattern | INSPIRED | Implement ArthaAI MarketDataProvider with same plug-in concept |
| openbb-sec (SEC filings) | REFERENCE_ONLY | Indian equiv: SEBI EDGAR, BSE filings |
| openbb-fred | DIRECT_DEPENDENCY | FRED data is freely available; no license concern for data |
| Derivatives module (options chains, greeks) | INSPIRED | ArthaAI needs OptionsEngine; model the API shape |
| Multi-provider fallback pattern | INSPIRED | Already adapted from TradingAgents vendor router |

## 9. What Should ArthaAI Avoid?

| Component | Reason |
|-----------|--------|
| **OpenBB as pip dependency** | **⚠️ AGPL-3.0 would force ArthaAI to be open source** |
| OpenBB web terminal | Different use case; ArthaAI has its own dashboard |
| openbb-hub credentials | Adds external service dependency |
| All 40+ provider packages | Brings enormous dependency weight |

## 10. License — CRITICAL WARNING

**AGPL-3.0-only** means:
- If ArthaAI imports OpenBB as a library in a networked service, ArthaAI's source code **must be released under AGPL-3.0**
- This applies even if only accessed over a network (the "S" in AGPL covers network use)
- **Verdict: DO NOT use OpenBB as a pip dependency in ArthaAI**
- Instead: Use OpenBB as inspiration for API design; implement ArthaAI-native data adapters

## 11. What Is Its Best Component?

The **standardized multi-provider data model** — the idea of a single `obb.equity.price.historical("TICKER", provider="any")` call that normalizes results from 40+ sources into one schema is architecturally excellent.

## 12. Maintenance Risks

- Heavily maintained; frequent releases
- Provider extensions break when upstream APIs change
- No Indian-market native adapters; NSE data via yfinance is unreliable
- License is a permanent blocker for commercial products
