from datetime import date, datetime
from enum import Enum
from hashlib import sha256
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.control_plane.market_rules.lot_sizes import CANONICAL_LOT_SIZES, LotSizeRule
from arthaai.control_plane.market_rules.tick_sizes import CANONICAL_TICK_SIZES, TickSizeRule
from arthaai.core.clock.timezone import enforce_utc
from arthaai.core.errors import MarketRuleError
from arthaai.core.instruments.contracts import RuleVerificationStatus


class RuleType(str, Enum):
    TAX_STT = "TAX_STT"
    TAX_STAMP_DUTY = "TAX_STAMP_DUTY"
    EXCHANGE_TURNOVER_FEE = "EXCHANGE_TURNOVER_FEE"
    SEBI_TURNOVER_FEE = "SEBI_TURNOVER_FEE"
    GST_RATE = "GST_RATE"
    DERIVATIVE_LOT_SIZE = "DERIVATIVE_LOT_SIZE"
    DERIVATIVE_FREEZE_QTY = "DERIVATIVE_FREEZE_QTY"
    DERIVATIVE_WEEKLY_EXPIRY = "DERIVATIVE_WEEKLY_EXPIRY"
    DERIVATIVE_EXPIRY_CONVENTION = "DERIVATIVE_EXPIRY_CONVENTION"
    MWPL_BAN_THRESHOLD = "MWPL_BAN_THRESHOLD"
    MWPL_EXIT_THRESHOLD = "MWPL_EXIT_THRESHOLD"
    CIRCUIT_BREAKER_INDEX = "CIRCUIT_BREAKER_INDEX"
    PRICE_BAND_EQUITY = "PRICE_BAND_EQUITY"


class IndianMarketRule(BaseModel):
    model_config = ConfigDict(frozen=True)

    rule_id: str
    rule_type: RuleType
    exchange: str                       # "NSE", "BSE", "MCX", "ALL"
    instrument_type: str                # "EQUITY", "FUTURE", "OPTION", "INDEX_DERIVATIVE", "ALL"
    instrument: str = "DEFAULT"         # Specific symbol like "NIFTY" or "DEFAULT"
    value: Any
    unit: str = "PERCENT"               # "PERCENT", "SHARES", "INR", "RATIO", "BOOLEAN"
    effective_from: date
    effective_to: date | None = None
    source: str                         # e.g. "SEBI/HO/MRD/2024/11", "Finance Act 2024"
    version: str
    source_reference: str | None = None
    source_publication_date: date | None = None
    verification_status: RuleVerificationStatus = RuleVerificationStatus.VERIFIED
    notes: str | None = None

    def is_active_on(self, query_date: date) -> bool:
        if self.effective_from <= query_date:
            if self.effective_to is None or query_date <= self.effective_to:
                return True
        return False

class MarketRuleSet(BaseModel):
    model_config = ConfigDict(frozen=True)

    rule_set_id: str
    exchange: str
    instrument_type: str
    effective_from: date
    effective_to: date | None = None
    version: str
    source: str
    rules: dict[str, Any] = Field(default_factory=dict)

    def is_active_on(self, query_date: date) -> bool:
        if self.effective_from <= query_date:
            if self.effective_to is None or query_date <= self.effective_to:
                return True
        return False


class SettlementConventionRule(BaseModel):
    """Authoritative settlement convention specification (cycle and delivery mechanism)."""

    model_config = ConfigDict(frozen=True)

    exchange: str
    instrument_type: str            # "EQUITY", "DERIVATIVE", "ALL"
    settlement_cycle: str           # "T+1", "T+2", "T+0"
    settlement_type: str            # "CASH", "PHYSICAL"
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


class ContractMultiplierRule(BaseModel):
    """Authoritative contract multiplier specification."""

    model_config = ConfigDict(frozen=True)

    exchange: str
    symbol: str = "DEFAULT"
    multiplier: float = 1.0
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


CANONICAL_SETTLEMENT_RULES: list[SettlementConventionRule] = [
    SettlementConventionRule(
        exchange="NSE",
        instrument_type="EQUITY",
        settlement_cycle="T+1",
        settlement_type="PHYSICAL",
        effective_from=date(2023, 1, 27),
        effective_to=None,
        source_document="SEBI Circular SEBI/HO/MRD2/DCAP/P/CIR/2021/628",
        source_publication_date=date(2021, 9, 7),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Full implementation of T+1 settlement cycle across all Indian equities",
    ),
    SettlementConventionRule(
        exchange="NSE",
        instrument_type="EQUITY",
        settlement_cycle="T+2",
        settlement_type="PHYSICAL",
        effective_from=date(2003, 4, 1),
        effective_to=date(2023, 1, 26),
        source_document="SEBI Circular MRD/DoP/SE/Cir-19/2003",
        source_publication_date=date(2003, 3, 20),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="T+2 rolling settlement standard for Indian equities",
    ),
    SettlementConventionRule(
        exchange="BSE",
        instrument_type="EQUITY",
        settlement_cycle="T+1",
        settlement_type="PHYSICAL",
        effective_from=date(2023, 1, 27),
        effective_to=None,
        source_document="SEBI Circular SEBI/HO/MRD2/DCAP/P/CIR/2021/628",
        source_publication_date=date(2021, 9, 7),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Full implementation of T+1 settlement cycle on BSE",
    ),
    SettlementConventionRule(
        exchange="BSE",
        instrument_type="EQUITY",
        settlement_cycle="T+2",
        settlement_type="PHYSICAL",
        effective_from=date(2003, 4, 1),
        effective_to=date(2023, 1, 26),
        source_document="SEBI Circular MRD/DoP/SE/Cir-19/2003",
        source_publication_date=date(2003, 3, 20),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="T+2 rolling settlement standard on BSE",
    ),
    SettlementConventionRule(
        exchange="NSE",
        instrument_type="DERIVATIVE",
        settlement_cycle="T+1",
        settlement_type="CASH",
        effective_from=date(2000, 6, 12),
        effective_to=None,
        source_document="NSE Derivatives Clearing and Settlement Guidelines",
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Index derivatives cash-settled on T+1 MTM and final expiry settlement",
    ),
]


class MarketRuleRegistry:
    """Registry maintaining versioned historical market rules and resolving point-in-time rates."""

    def __init__(
        self,
        rules: list[IndianMarketRule] | None = None,
        lot_size_rules: list[LotSizeRule] | None = None,
        tick_size_rules: list[TickSizeRule] | None = None,
        settlement_rules: list[SettlementConventionRule] | None = None,
        multiplier_rules: list[ContractMultiplierRule] | None = None,
    ):
        self._rules: list[IndianMarketRule] = rules or []
        self._lot_size_rules: list[LotSizeRule] = lot_size_rules or []
        self._tick_size_rules: list[TickSizeRule] = tick_size_rules or []
        self._settlement_rules: list[SettlementConventionRule] = settlement_rules or []
        self._multiplier_rules: list[ContractMultiplierRule] = multiplier_rules or []

    def register_rule(self, rule: IndianMarketRule) -> None:
        self._rules.append(rule)

    def register_lot_size_rule(self, rule: LotSizeRule) -> None:
        self._lot_size_rules.append(rule)

    def register_tick_size_rule(self, rule: TickSizeRule) -> None:
        self._tick_size_rules.append(rule)

    def register_settlement_rule(self, rule: SettlementConventionRule) -> None:
        self._settlement_rules.append(rule)

    def register_multiplier_rule(self, rule: ContractMultiplierRule) -> None:
        self._multiplier_rules.append(rule)

    def get_rules(
        self,
        exchange: str,
        instrument: str,
        timestamp: datetime,
        instrument_type: str | None = None,
        require_verified: bool = True,
    ) -> dict[RuleType, IndianMarketRule]:
        """Resolves all active market rules applicable for an instrument at a given historical timestamp.

        By default, require_verified=True guarantees only VERIFIED rules are returned.
        UNVERIFIED or UNKNOWN rules will never silently become production truth.
        """
        utc_dt = enforce_utc(timestamp)
        query_date = utc_dt.date()

        matched_rules: dict[RuleType, IndianMarketRule] = {}

        for rule in self._rules:
            # Verification status check
            if require_verified and rule.verification_status != RuleVerificationStatus.VERIFIED:
                continue

            # Exchange match
            if rule.exchange not in (exchange, "ALL"):
                continue

            # Instrument match (exact match takes precedence over "DEFAULT")
            if rule.instrument not in (instrument, "DEFAULT"):
                continue

            # Instrument type match
            if instrument_type and rule.instrument_type not in (instrument_type, "ALL"):
                continue

            # Date validity
            if rule.is_active_on(query_date):
                current_match = matched_rules.get(rule.rule_type)
                if current_match is None:
                    matched_rules[rule.rule_type] = rule
                elif current_match.instrument == "DEFAULT" and rule.instrument == instrument:
                    # Specific instrument overrides DEFAULT
                    matched_rules[rule.rule_type] = rule

        if not matched_rules:
            raise MarketRuleError(
                f"No active market rules resolved for exchange={exchange}, "
                f"instrument={instrument} at {query_date}."
            )

        return matched_rules

    def get_lot_size(
        self,
        exchange: str,
        symbol: str,
        as_of: date | datetime,
        require_verified: bool = True,
    ) -> int:
        """Resolves active lot size for an instrument at an exact point in time.

        Raises MarketRuleError if no rule covers the date, or if matched rule is not VERIFIED.
        """
        query_date = as_of.date() if isinstance(as_of, datetime) else as_of

        # First check explicit lot size rules
        for lot_rule in self._lot_size_rules:
            if lot_rule.exchange == exchange and lot_rule.symbol == symbol and lot_rule.is_active_on(query_date):
                if require_verified and lot_rule.verification_status != RuleVerificationStatus.VERIFIED:
                    raise MarketRuleError(
                        f"Lot size rule for {exchange}:{symbol} on {query_date} is "
                        f"{lot_rule.verification_status.value} (source: {lot_rule.source_document}). "
                        "Unverified lot sizes must not silently participate in calculations."
                    )
                return lot_rule.lot_size

        # Also check general rules for DERIVATIVE_LOT_SIZE
        for gen_rule in self._rules:
            if (
                gen_rule.rule_type == RuleType.DERIVATIVE_LOT_SIZE
                and gen_rule.exchange in (exchange, "ALL")
                and gen_rule.instrument in (symbol, "DEFAULT")
                and gen_rule.is_active_on(query_date)
            ):
                if require_verified and gen_rule.verification_status != RuleVerificationStatus.VERIFIED:
                    raise MarketRuleError(
                        f"Lot size rule for {exchange}:{symbol} on {query_date} is "
                        f"{gen_rule.verification_status.value}."
                    )
                return int(gen_rule.value)

        raise MarketRuleError(
            f"No active lot size rule found for {exchange}:{symbol} on {query_date}. "
            "Never assume default lot size without authoritative rule."
        )

    def get_tick_size(
        self,
        exchange: str,
        symbol: str = "DEFAULT",
        price: float = 100.0,
        asset_class: str = "EQUITY",
        as_of: date | datetime | None = None,
        require_verified: bool = True,
    ) -> float:
        """Resolves active tick size for an instrument, asset class, and price level at a given point in time."""
        query_date = (as_of.date() if isinstance(as_of, datetime) else as_of) if as_of else date.today()

        # Check explicit tick size rules
        for rule in self._tick_size_rules:
            if (
                rule.exchange in (exchange, "ALL")
                and rule.symbol in (symbol, "DEFAULT")
                and rule.asset_class in (asset_class, "ALL")
                and rule.is_active_on(query_date)
                and rule.matches_price(price)
            ):
                if require_verified and rule.verification_status != RuleVerificationStatus.VERIFIED:
                    raise MarketRuleError(
                        f"Tick size rule for {exchange}:{symbol} on {query_date} is "
                        f"{rule.verification_status.value}."
                    )
                return rule.tick_size

        raise MarketRuleError(
            f"No active tick size rule found for {exchange}:{symbol} (asset_class={asset_class}, "
            f"price={price}) on {query_date}."
        )

    def get_settlement_convention(
        self,
        exchange: str,
        instrument_type: str,
        as_of: date | datetime,
        require_verified: bool = True,
    ) -> SettlementConventionRule:
        """Resolves active settlement convention rule at an exact point in time."""
        query_date = as_of.date() if isinstance(as_of, datetime) else as_of

        for rule in self._settlement_rules:
            if (
                rule.exchange in (exchange, "ALL")
                and rule.instrument_type in (instrument_type, "ALL")
                and rule.is_active_on(query_date)
            ):
                if require_verified and rule.verification_status != RuleVerificationStatus.VERIFIED:
                    raise MarketRuleError(
                        f"Settlement convention for {exchange}:{instrument_type} on {query_date} is "
                        f"{rule.verification_status.value}."
                    )
                return rule

        raise MarketRuleError(
            f"No active settlement convention rule found for {exchange}:{instrument_type} on {query_date}."
        )

    def compute_registry_hash(self) -> str:
        """Computes a deterministic SHA-256 fingerprint of all registered market rules.

        Essential for experiment reproducibility: ensuring two runs used the exact same rule state.
        """
        hasher = sha256()

        for r in sorted(self._rules, key=lambda x: (x.rule_id, str(x.effective_from))):
            hasher.update(f"{r.rule_id}:{r.value}:{r.effective_from}:{r.verification_status.value}".encode())

        for ls in sorted(self._lot_size_rules, key=lambda x: (x.exchange, x.symbol, str(x.effective_from))):
            hasher.update(f"{ls.exchange}:{ls.symbol}:{ls.lot_size}:{ls.effective_from}:{ls.verification_status.value}".encode())

        for ts in sorted(self._tick_size_rules, key=lambda x: (x.exchange, x.symbol, str(x.effective_from), x.min_price)):
            hasher.update(f"{ts.exchange}:{ts.symbol}:{ts.tick_size}:{ts.effective_from}:{ts.min_price}:{ts.verification_status.value}".encode())

        for sc in sorted(self._settlement_rules, key=lambda x: (x.exchange, x.instrument_type, str(x.effective_from))):
            hasher.update(f"{sc.exchange}:{sc.instrument_type}:{sc.settlement_cycle}:{sc.effective_from}:{sc.verification_status.value}".encode())

        return hasher.hexdigest()

    @classmethod
    def get_canonical_registry(cls) -> "MarketRuleRegistry":
        """Factory creating a registry pre-populated with all authoritative Indian market rules."""
        return cls(
            lot_size_rules=list(CANONICAL_LOT_SIZES),
            tick_size_rules=list(CANONICAL_TICK_SIZES),
            settlement_rules=list(CANONICAL_SETTLEMENT_RULES),
        )
