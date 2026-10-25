# Order-Flow Data Readiness

**Status:** SCHEMA-READY — infrastructure exists; live production feeds NOT yet connected

---

## What Is Built

ArthaAI has a complete canonical schema and storage layer for order-flow data.
The following schemas are implemented and tested:

| Schema | Location | Status |
|--------|----------|--------|
| Trade | data/schemas/trade.py | COMPLETE |
| Quote / L1Quote | data/schemas/quote.py | COMPLETE |
| OrderBookSnapshot | data/schemas/orderbook.py | COMPLETE |
| OrderBookUpdate | data/schemas/orderbook.py | COMPLETE |

All schemas carry event_time, eceived_time, vailability_time, DataMode,
and full provenance. The PIT pipeline correctly handles tick-level data.

## Trade Aggressor Side

Exchange-reported aggressor side is stored in Trade.side (TradeSide.BUYER / SELLER / UNKNOWN).

When a downstream processor infers the aggressor via tick-rule:
- Trade.side_is_inferred = True
- Trade.inference_method must be set (e.g. "tick_rule_lee_ready")
- Trade.side = UNKNOWN with side_is_inferred = True is a schema validation error

## Order Book Depth

OrderBookSnapshot supports variable-depth order book with bid/ask levels
as list[BookLevel]. Each level carries price, quantity, 
um_orders.

## What Is NOT Yet Built

| Capability | Gap | Notes |
|------------|-----|-------|
| NSE Colocation feed adapter | NOT BUILT | Requires vendor NNI/CTCL integration |
| SEBI TBT (tick-by-tick) adapter | NOT BUILT | Requires NSE data subscription |
| Implied order detection | NOT BUILT | Post-Step 3 feature |
| Order flow imbalance indicator | NOT BUILT | Post-Step 3 feature |
| VPIN / toxicity metrics | NOT BUILT | Post-Step 4 (ML features) |
| Market impact modeling | NOT BUILT | Post-Step 5 (execution) |

## Provider Adapter Status

| Provider | Trade | Quote | OrderBook |
|----------|-------|-------|-----------|
| SimulatedAdapter | FIXTURE data | FIXTURE data | NOT IMPLEMENTED |
| OpenBBAdapter | CONTRACT-COMPLETE | CONTRACT-COMPLETE | NOT IMPLEMENTED |
| NSE TBT (live) | NOT CONNECTED | NOT CONNECTED | NOT CONNECTED |

## Adding a Live Feed

To connect a live order-flow provider:
1. Implement ITradeProvider from data/providers/base.py
2. Register in ProviderRegistry
3. The normalization layer in data/normalization/trade.py will
   handle conversion to canonical Trade schema automatically

The schema, storage, and PIT query layers require zero modification.
