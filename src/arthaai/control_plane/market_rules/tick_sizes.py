"""Canonical historical tick size specifications for Indian markets with authoritative provenance."""

from datetime import date

from pydantic import BaseModel, ConfigDict

from arthaai.core.instruments.contracts import RuleVerificationStatus


class TickSizeRule(BaseModel):
    """Authoritative tick size specification for an exchange, instrument, and price band."""

    model_config = ConfigDict(frozen=True)

    exchange: str                       # "NSE", "BSE", "MCX", "ALL"
    symbol: str = "DEFAULT"             # Specific symbol or "DEFAULT"
    asset_class: str = "ALL"            # "EQUITY", "DERIVATIVE", "CURRENCY", "ALL"
    min_price: float = 0.0
    max_price: float | None = None
    tick_size: float
    effective_from: date
    effective_to: date | None = None
    source_document: str
    source_publication_date: date | None = None
    verification_status: RuleVerificationStatus = RuleVerificationStatus.VERIFIED
    notes: str | None = None

    def is_active_on(self, query_date: date) -> bool:
        if self.effective_from <= query_date:
            if self.effective_to is None or query_date <= self.effective_to:
                return True
        return False

    def matches_price(self, price: float) -> bool:
        if price < self.min_price:
            return False
        if self.max_price is not None and price >= self.max_price:
            return False
        return True


CANONICAL_TICK_SIZES: list[TickSizeRule] = [
    # NSE Equity standard tick size: 0.05 across all price levels
    TickSizeRule(
        exchange="NSE",
        symbol="DEFAULT",
        asset_class="EQUITY",
        min_price=0.0,
        max_price=None,
        tick_size=0.05,
        effective_from=date(1994, 11, 3),
        effective_to=None,
        source_document="NSE Trading Regulations & Master Circular 2024",
        source_publication_date=date(2024, 7, 1),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Standard NSE equity tick size of 5 paise across all securities",
    ),

    # BSE Equity sub-100 tick size: 0.01 introduced effective March 5, 2023 for securities < Rs 100
    TickSizeRule(
        exchange="BSE",
        symbol="DEFAULT",
        asset_class="EQUITY",
        min_price=0.0,
        max_price=100.0,
        tick_size=0.01,
        effective_from=date(2023, 3, 5),
        effective_to=None,
        source_document="BSE Notice No: 20230302-39, Introduction of 1 paisa tick size",
        source_publication_date=date(2023, 3, 2),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Tick size reduced to 1 paisa for equity securities priced below Rs 100",
    ),
    # BSE Equity above-100 tick size: 0.05
    TickSizeRule(
        exchange="BSE",
        symbol="DEFAULT",
        asset_class="EQUITY",
        min_price=100.0,
        max_price=None,
        tick_size=0.05,
        effective_from=date(2023, 3, 5),
        effective_to=None,
        source_document="BSE Notice No: 20230302-39",
        source_publication_date=date(2023, 3, 2),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Tick size remains 5 paise for securities priced at or above Rs 100",
    ),
    # BSE Equity pre-March 2023: 0.05 across all price levels
    TickSizeRule(
        exchange="BSE",
        symbol="DEFAULT",
        asset_class="EQUITY",
        min_price=0.0,
        max_price=None,
        tick_size=0.05,
        effective_from=date(1995, 3, 14),
        effective_to=date(2023, 3, 4),
        source_document="BSE Trading Rules Archive",
        source_publication_date=None,
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Historical 5 paise tick size for all equities on BSE prior to March 2023",
    ),

    # NSE Derivatives (F&O) standard tick size: 0.05
    TickSizeRule(
        exchange="NSE",
        symbol="DEFAULT",
        asset_class="DERIVATIVE",
        min_price=0.0,
        max_price=None,
        tick_size=0.05,
        effective_from=date(2000, 6, 12),
        effective_to=None,
        source_document="NSE F&O Operating Guidelines",
        source_publication_date=date(2024, 1, 1),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Standard 0.05 tick size across all index and equity derivatives",
    ),

    # BSE Derivatives standard tick size: 0.05
    TickSizeRule(
        exchange="BSE",
        symbol="DEFAULT",
        asset_class="DERIVATIVE",
        min_price=0.0,
        max_price=None,
        tick_size=0.05,
        effective_from=date(2000, 6, 9),
        effective_to=None,
        source_document="BSE Derivatives Trading Regulations",
        source_publication_date=date(2023, 5, 10),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Standard 0.05 tick size across BSE derivatives",
    ),

    # Currency Derivatives: 0.0025 (0.25 paisa)
    TickSizeRule(
        exchange="NSE",
        symbol="DEFAULT",
        asset_class="CURRENCY",
        min_price=0.0,
        max_price=None,
        tick_size=0.0025,
        effective_from=date(2008, 8, 29),
        effective_to=None,
        source_document="NSE Currency Derivatives Circular 2008/01",
        source_publication_date=date(2008, 8, 20),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Quarter-paisa tick size (0.0025) for currency futures/options",
    ),
]
