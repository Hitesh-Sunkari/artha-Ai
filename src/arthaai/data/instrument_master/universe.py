"""Point-in-Time Universe and Survivorship Bias Prevention system."""

from datetime import date

from pydantic import BaseModel, ConfigDict

from arthaai.core.errors import InstrumentError
from arthaai.core.instruments.contracts import RuleVerificationStatus


class UniverseSnapshot(BaseModel):
    """Point-in-Time index or strategy investment universe constituent snapshot.

    Eliminates survivorship bias by pinning the exact constituents active on a given date,
    including securities that were subsequently delisted, suspended, or excluded in rebalances.
    """

    model_config = ConfigDict(frozen=True)

    index_name: str
    as_of_date: date
    effective_from: date
    effective_to: date | None = None
    constituent_symbols: frozenset[str]
    source: str
    source_publication_date: date | None = None
    verification_status: RuleVerificationStatus = RuleVerificationStatus.VERIFIED
    notes: str | None = None

    def is_active_on(self, query_date: date) -> bool:
        if self.effective_from <= query_date:
            if self.effective_to is None or query_date <= self.effective_to:
                return True
        return False


CANONICAL_UNIVERSE_SNAPSHOTS: list[UniverseSnapshot] = [
    # NIFTY 50: Post September 2024 Rebalance (effective Sept 27, 2024)
    # BEL and TRENT included; DIVISLAB and LTIM excluded
    UniverseSnapshot(
        index_name="NIFTY50",
        as_of_date=date(2024, 9, 27),
        effective_from=date(2024, 9, 27),
        effective_to=None,
        constituent_symbols=frozenset([
            "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO",
            "BAJFINANCE", "BAJAJFINSV", "BEL", "BPCL", "BHARTIARTL", "BRITANNIA",
            "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "GRASIM", "HCLTECH",
            "HDFCBANK", "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK",
            "INDUSINDBK", "INFY", "ITC", "JSWSTEEL", "KOTAKBANK", "LT",
            "M&M", "MARUTI", "NESTLEIND", "NTPC", "ONGC", "POWERGRID",
            "RELIANCE", "SBILIFE", "SHRIRAMFIN", "SBIN", "SUNPHARMA", "TATACONSUM",
            "TATAMOTORS", "TATASTEEL", "TCS", "TECHM", "TITAN", "TRENT",
            "ULTRACEMCO", "WIPRO",
        ]),
        source="NSE Indices Circular Ref: Ref: 2024/08/23",
        source_publication_date=date(2024, 8, 23),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Semi-annual rebalance: BEL & TRENT replaced DIVISLAB & LTIM",
    ),

    # NIFTY 50: March 2024 to September 2024 (effective March 28, 2024)
    # SHRIRAMFIN included; UPL excluded
    UniverseSnapshot(
        index_name="NIFTY50",
        as_of_date=date(2024, 3, 28),
        effective_from=date(2024, 3, 28),
        effective_to=date(2024, 9, 26),
        constituent_symbols=frozenset([
            "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO",
            "BAJFINANCE", "BAJAJFINSV", "BPCL", "BHARTIARTL", "BRITANNIA", "CIPLA",
            "COALINDIA", "DIVISLAB", "DRREDDY", "EICHERMOT", "GRASIM", "HCLTECH",
            "HDFCBANK", "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK",
            "INDUSINDBK", "INFY", "ITC", "JSWSTEEL", "KOTAKBANK", "LT",
            "LTIM", "M&M", "MARUTI", "NESTLEIND", "NTPC", "ONGC",
            "POWERGRID", "RELIANCE", "SBILIFE", "SHRIRAMFIN", "SBIN", "SUNPHARMA",
            "TATACONSUM", "TATAMOTORS", "TATASTEEL", "TCS", "TECHM", "TITAN",
            "ULTRACEMCO", "WIPRO",
        ]),
        source="NSE Indices Circular Ref: 2024/02/28",
        source_publication_date=date(2024, 2, 28),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Semi-annual rebalance: SHRIRAMFIN replaced UPL",
    ),

    # NIFTY 50: Prior to March 28, 2024 (included UPL)
    UniverseSnapshot(
        index_name="NIFTY50",
        as_of_date=date(2023, 9, 29),
        effective_from=date(2023, 9, 29),
        effective_to=date(2024, 3, 27),
        constituent_symbols=frozenset([
            "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO",
            "BAJFINANCE", "BAJAJFINSV", "BPCL", "BHARTIARTL", "BRITANNIA", "CIPLA",
            "COALINDIA", "DIVISLAB", "DRREDDY", "EICHERMOT", "GRASIM", "HCLTECH",
            "HDFCBANK", "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK",
            "INDUSINDBK", "INFY", "ITC", "JSWSTEEL", "KOTAKBANK", "LT",
            "LTIM", "M&M", "MARUTI", "NESTLEIND", "NTPC", "ONGC",
            "POWERGRID", "RELIANCE", "SBILIFE", "SBIN", "SUNPHARMA", "TATACONSUM",
            "TATAMOTORS", "TATASTEEL", "TCS", "TECHM", "TITAN", "ULTRACEMCO",
            "UPL", "WIPRO",
        ]),
        source="NSE Indices Circular Ref: 2023/08/21",
        source_publication_date=date(2023, 8, 21),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Includes UPL; pre-dates SHRIRAMFIN inclusion",
    ),
]


class UniverseRegistry:
    """Registry maintaining point-in-time universe constituent snapshots."""

    def __init__(self, snapshots: list[UniverseSnapshot] | None = None) -> None:
        self._snapshots: list[UniverseSnapshot] = snapshots or []

    def register(self, snapshot: UniverseSnapshot) -> None:
        self._snapshots.append(snapshot)

    def get_universe_at(
        self,
        index_name: str,
        as_of: date,
        require_verified: bool = True,
    ) -> UniverseSnapshot:
        """Resolves the point-in-time universe snapshot for index_name active on as_of.

        Guarantees that survivorship-biased 'today's constituents' cannot be used for historical research.
        """
        for snap in self._snapshots:
            if snap.index_name == index_name and snap.is_active_on(as_of):
                if require_verified and snap.verification_status != RuleVerificationStatus.VERIFIED:
                    raise InstrumentError(
                        f"Universe snapshot for {index_name} on {as_of} is "
                        f"{snap.verification_status.value}. Unverified constituent lists are blocked."
                    )
                return snap

        raise InstrumentError(
            f"No active universe snapshot found for index='{index_name}' on {as_of}. "
            "Historical research requires explicit point-in-time constituent definitions."
        )

    def is_constituent_at(
        self,
        index_name: str,
        symbol: str,
        as_of: date,
        require_verified: bool = True,
    ) -> bool:
        """Returns True if symbol was an active constituent of index_name on as_of date."""
        snap = self.get_universe_at(index_name, as_of, require_verified=require_verified)
        return symbol in snap.constituent_symbols

    @classmethod
    def get_canonical_registry(cls) -> "UniverseRegistry":
        return cls(snapshots=list(CANONICAL_UNIVERSE_SNAPSHOTS))
