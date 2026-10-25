# Options Data Readiness

**Status:** SCHEMA-READY — infrastructure exists; live production feeds NOT yet connected

---

## What Is Built

ArthaAI has a complete canonical schema and storage layer for options data.

| Schema | Location | Status |
|--------|----------|--------|
| OptionContract | data/schemas/options.py | COMPLETE |
| OptionChainSnapshot | data/schemas/options.py | COMPLETE |

Key fields on OptionContract:

| Field | Type | Purpose |
|-------|------|---------|
| underlying_symbol | str | E.g. NIFTY, BANKNIFTY, RELIANCE |
| expiry | date | Expiry date (resolved via MarketRuleRegistry) |
| strike | float | Strike price |
| option_type | OptionType (CE/PE) | Call or Put |
| lot_size | int | Resolved via MarketRuleRegistry at as_of date |
| 	ick_size | float | Minimum price movement |
| contract_multiplier | int | Contracts-per-lot multiplier |
| iv | float | Implied volatility (if provided by feed) |
| delta, gamma, 	heta, ega, ho | float | Greeks (if provided by feed) |
| event_time | datetime | UTC timestamp of the snapshot |
| vailability_time | datetime | PIT-correct availability timestamp |

## Contract Identity and PIT Safety

Lot sizes and tick sizes are resolved via MarketRuleRegistry.resolve_as_of(as_of).
This guarantees that a backtest running on 2014-01-01 uses NIFTY lot_size=50,
not the current lot_size=75.

A VERIFIED registry of historical lot-size changes is maintained in
control_plane/market_rules/registry.py.

## What Is NOT Yet Built

| Capability | Gap | Notes |
|------------|-----|-------|
| NSE FO segment live feed adapter | NOT BUILT | Requires NSE data subscription |
| OpenBB options chain adapter (live) | CONTRACT-COMPLETE shell only | Credentials + live endpoint |
| IV surface construction | NOT BUILT | Post-Step 3 (research feature) |
| Greeks computation (model-based) | NOT BUILT | Post-Step 4 (ML features) |
| GEX / DEX / charm surfaces | NOT BUILT | Post-Step 4 (ML features) |
| Volatility regime detection | NOT BUILT | Post-Step 5 (strategy features) |
| OI-weighted analytics | NOT BUILT | Post-Step 3 |

## Provider Adapter Status

| Provider | OptionChain |
|----------|-------------|
| SimulatedAdapter | FIXTURE data (deterministic) |
| OpenBBAdapter | CONTRACT-COMPLETE (shell) |
| NSE FO live feed | NOT CONNECTED |

## Adding a Live Options Feed

1. Implement IOptionChainProvider from data/providers/base.py
2. Register with ProviderRegistry
3. Normalize to OptionContract / OptionChainSnapshot via data/normalization/options.py
4. Store via ParquetStore.write_options()
5. Query via DuckDBEngine.query_option_chain(as_of_availability=...)

The schema, storage, and PIT query layers require zero modification.

## Historical Data Coverage Caveat

Historical options data in Indian markets is sparsely available from free providers.
Paid sources (NSE data products, Refinitiv, Bloomberg) are required for
comprehensive backtesting on FO data. This is flagged as a research dependency
for Step 3 and beyond.
