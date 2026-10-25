# Indian Financial Market Data Capability Matrix

## 1. Overview & Provider Ecosystem

Developing quantitative strategies in the Indian financial market (NSE & BSE) presents specific structural realities:
1. **Exchange Licensing**: NSE data is strictly commercialized. Redistribution is regulated by NSE Data & Infotech (DotEx).
2. **Derivative Dominance**: Over 90% of NSE traded turnover resides in Equity Derivatives (NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY options and stock futures).
3. **Session Timings**: Normal trading is 09:15 to 15:30 IST (03:45 to 10:00 UTC). Pre-open session runs from 09:00 to 09:08 IST.

---

## 2. Comprehensive Provider Capability Comparison

| Capability | OpenBB Platform (Community) | Indian Broker APIs (Zerodha, Angel, Dhan) | Authorized Data Vendors (TruData, GDF) | NSE Direct (DotEx Feed / Colo) |
|---|---|---|---|---|
| **Equities EOD** | Full (Yahoo backend) | Full | Full | Full |
| **Equities Intraday Bars** | Not free / Unsupported for NSE | Full (1m, 5m, 15m, 60m) | Full (1m, tick) | Full (tick, custom) |
| **Index Options Chain** | Unsupported | Full (Live snapshots) | Full (Tick + Greeks) | Full (Tick-By-Tick) |
| **Stock Futures** | Unsupported | Full (Near, Next, Far) | Full | Full |
| **Order Book Depth** | None | 5-depth (L2) / 20-depth (select) | 5-depth (L2) | Full Depth (TBT / MBO) |
| **Tick-by-Tick Trades** | None | Websocket L1 ticks | Real-time tick stream | Multicast Raw TBT |
| **Corporate Actions** | Incomplete / US-centric | Basic (manual dividends/splits) | Standard | Authoritative exchange circulars |
| **Historical Depth** | ~10 years (EOD only) | 1-2 years intraday, 10+ yrs EOD | 5-10 years intraday | Historical archives (commercial) |
| **Rate Limits** | Provider dependent (FMP/Yahoo) | 3-10 req/s, 200-500 orders/min | Dedicated TCP/WebSocket | Hardware limited (10 Gbps) |
| **Authentication** | API Token / Environment | Daily TOTP/OAuth morning ritual | Fixed API user/token | Leased line / cross-connect |
| **Licensing Class** | MIT / Community | Broker End-User Agreement | Commercial redistributor | Exchange Member / Vendor License |
| **Estimated Cost** | Free / Open Source | Free to ₹2,000 / month | ₹2,500 – ₹10,000 / month | ₹50,000 – ₹5,00,000+ / month |

---

## 3. Provider Architectural Notes for ArthaAI

### 3.1 OpenBB (`arthaai.integrations.openbb_adapter`)
- **Status**: Implemented with contract completeness.
- **Strengths**: Global coverage, macro data, foreign equities.
- **Indian Market Reality**: Limited to EOD equity history via free backends. Cannot be used as primary Indian intraday or options data provider.

### 3.2 Simulated Data Adapter (`arthaai.integrations.simulated_adapter`)
- **Status**: Production-ready for CI/CD and unit testing.
- **Contract**: Tagged strictly as `DataMode.FIXTURE`.
- **Strengths**: 100% deterministic (seeded), satisfies all schema constraints, generates complete option chains and L2 books without external network calls or credentials.

### 3.3 Target Production Stack for Live / Research
- **Research & Deep Backtesting**: TruData or DotEx historical 1-min & tick archives.
- **Paper & Live Execution**: WebSocket feeds from SEBI-registered broker APIs with strict local validation.
