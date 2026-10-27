"""Authoritative Data Readiness status for Indian Market data capabilities."""

from arthaai.data.readiness.registry import DataCapability, DataReadinessRecord, DataReadinessRegistry
from arthaai.data.schemas.raw_record import DataMode

INDIAN_MARKET_CAPABILITIES: list[DataReadinessRecord] = [
    # 1. Order Flow / Trades & L2
    DataReadinessRecord(
        capability_id="order_flow.trades",
        domain="Microstructure",
        description="L1 trade tick normalization, storage, and PIT replay",
        status=DataCapability.FIXTURE_ONLY,
        available_modes=[DataMode.HISTORICAL],
        notes="Synthetic trade fixtures supported; live broker WebSocket adapter unconfigured",
        blocker="Requires broker WebSocket adapter (Kite / TrueData)",
    ),
    DataReadinessRecord(
        capability_id="order_flow.level2",
        domain="Microstructure",
        description="L2 order book snapshot and differential updates (5-depth / 20-depth)",
        status=DataCapability.UNSUPPORTED,
        available_modes=[],
        notes="L2 book building is currently out of architectural scope for Step 2",
        blocker="Full order book engine postponed to subsequent steps",
    ),

    # 2. Options Chain
    DataReadinessRecord(
        capability_id="derivatives.options_chain",
        domain="Options",
        description="Option chain snapshots across strikes and expiries",
        status=DataCapability.FIXTURE_ONLY,
        available_modes=[DataMode.HISTORICAL],
        notes="OptionContract schema and snapshot models implemented with fixture validation",
        blocker="Live options chain streaming requires paid broker/vendor feed",
    ),

    # 3. Historical Derivatives
    DataReadinessRecord(
        capability_id="derivatives.historical_contracts",
        domain="Options & Futures",
        description="Long-horizon tick-by-tick and minute-level historical derivative database",
        status=DataCapability.REQUIRES_PAID_DATA,
        available_modes=[DataMode.HISTORICAL],
        notes="Free sources do not distribute tick/minute historical option bars for NSE/BSE",
        blocker="Requires commercial historical tick subscription (TrueData/GlobalDataFeeds)",
    ),

    # 4. News Feed
    DataReadinessRecord(
        capability_id="sentiment.news",
        domain="Alternative Data",
        description="Financial news article ingestion, instrument tagging, and deduplication",
        status=DataCapability.FIXTURE_ONLY,
        available_modes=[DataMode.HISTORICAL],
        notes="Canonical news schema and Parquet store implemented; live RSS/feed crawler unconfigured",
        blocker="Requires live news aggregator API credentials",
    ),

    # 5. Fundamentals
    DataReadinessRecord(
        capability_id="fundamental.financials",
        domain="Fundamental",
        description="Balance sheet, quarterly earnings, cash flow statements",
        status=DataCapability.UNSUPPORTED,
        available_modes=[],
        notes="Fundamental accounting data is out of scope for high-frequency/microstructure focus",
        blocker="Out of scope for Phase 1-3 core trading systems",
    ),

    # 6. Macro Data
    DataReadinessRecord(
        capability_id="macro.economic_events",
        domain="Macroeconomic",
        description="Macroeconomic release schedule (RBI MPC, CPI, GDP)",
        status=DataCapability.INTERFACE_ONLY,
        available_modes=[DataMode.HISTORICAL],
        notes="Canonical EconomicEvent schema and DuckDB query engine implemented",
        blocker="Automated scraping/ingestion pipeline for MOSPI/RBI releases not yet integrated",
    ),
]


def build_indian_market_readiness_registry() -> DataReadinessRegistry:
    """Builds and populates the canonical Indian market DataReadinessRegistry."""
    return DataReadinessRegistry(records=INDIAN_MARKET_CAPABILITIES)
