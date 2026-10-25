# Indian Market Order Flow & Microstructure Data Requirements

## 1. Scope & Market Microstructure Context

Order flow quantitative research requires understanding the distinct tiers of market data fidelity available in the Indian equity and derivative ecosystem:

### 1.1 Data Fidelity Tiers

1. **Tier 1: Top of Book (L1 Quotes)**
   - Best bid, best ask, last traded price, last traded quantity.
   - Available via free or standard broker WebSockets.
   - Frequency: ~1-3 ticks per second per instrument (throttled).
   - Inadequate for microstructure order book models, but sufficient for EOD / swing execution.

2. **Tier 2: Market By Price (L2 - 5-Depth & 20-Depth)**
   - Top 5 or 20 bid/ask levels with cumulative size and order counts.
   - Standard broker API feed (e.g. Zerodha Kite, Upstox, Angel One).
   - Suitable for:
     - Order Book Imbalance (OBI): $\text{OBI} = \frac{V_{\text{bid}} - V_{\text{ask}}}{V_{\text{bid}} + V_{\text{ask}}}$
     - Weighted Microprice: $P_{\text{micro}} = \frac{P_{\text{bid}} V_{\text{ask}} + P_{\text{ask}} V_{\text{bid}}}{V_{\text{bid}} + V_{\text{ask}}}$
     - Bid-Ask Spread dynamics and queue estimation.

3. **Tier 3: Market By Order / Tick-By-Tick (L3 / TBT)**
   - Every individual order entry, modification, cancellation, and trade execution.
   - NSE Multicast TBT architecture over high-speed networks.
   - Features: Sequence numbers, microsecond exchange timestamps, trade flags.
   - Prerequisite for: True Cumulative Volume Delta (CVD), toxic order flow detection (VPIN), queue position tracking.

---

## 2. Retail Broker Limitations & Caveats

Quantitative practitioners must be aware of retail broker API constraints:
- **WebSocket Throttling**: Brokers coalesce updates into fixed time buckets (typically 200ms–1000ms). Intermediate price swings and cancel bursts within the coalescing window are lost.
- **Aggregated Ticks**: A single WebSocket message may report a change in volume of 500 shares without disclosing whether it was 1 trade of 500 shares or 10 trades of 50 shares.
- **Packet Loss & Ordering**: TCP WebSockets may experience head-of-line blocking under internet volatility. ArthaAI's `SequenceGapRule` and `TimestampOrderRule` guard against dropped or reordered packets.

---

## 3. Canonical ArthaAI Order Flow Schemas

ArthaAI defines standard, provider-neutral models in `arthaai.data.schemas.orderbook`:
- `OrderBookLevel`: `(price, quantity, orders_count)`
- `OrderBookSnapshot`: Full L2 book snapshot with explicit `depth`, `event_time`, and `availability_time`.
- `OrderBookUpdate`: Incremental delta update with mandatory `sequence_number`.
- `Trade`: Execution records with `TradeSide` (BUY / SELL / UNKNOWN) inferred via tick rule or provider flag.

---

## 4. Microstructure Feature Readiness

With canonical schemas and DuckDB research engine:
- **Order Book Imbalance**: Vectorized calculation across depth levels.
- **Flow Toxicity (VPIN)**: Volume-based binning using `Trade` records.
- **Effective Spread**: Difference between execution price and prevailing midpoint.
