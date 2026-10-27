"""Versioned market calendar architecture.

Each calendar dataset is explicitly versioned with provenance metadata.
Missing year coverage is detectable at query time.
Calendar updates do NOT require modifying core trading logic.
"""

import hashlib
import json
from datetime import date, datetime, timedelta
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.errors import CalendarError
from arthaai.core.instruments.contracts import Exchange, RuleVerificationStatus


class CalendarYearCoverage(BaseModel):
    """Tracks which calendar years are covered by a CalendarDataset."""

    model_config = ConfigDict(frozen=True)

    year: int
    holiday_count: int
    is_verified: bool = Field(
        default=False,
        description="True if the holiday list for this year was verified against an authoritative source"
    )
    source_reference: str | None = Field(
        default=None,
        description="URL or document reference where this year's holidays were sourced"
    )


class CalendarDataset(BaseModel):
    """A versioned snapshot of exchange holidays and trading sessions.

    Metadata fields:
    - calendar_id: unique identifier (e.g. 'NSE_2024_2025_v1')
    - effective_from / effective_to: the date range this calendar covers
    - source: where the holiday data was obtained
    - source_version: version of the source document/API
    - retrieved_at: when the data was retrieved
    - checksum: SHA-256 of the serialized holiday list for integrity

    IMPORTANT: Never silently assume an incomplete holiday list is complete.
    Always check year_coverage before querying.
    """

    model_config = ConfigDict(frozen=True)

    calendar_id: str
    exchange: Exchange
    effective_from: date
    effective_to: date
    source: str = Field(..., description="Source of the holiday data, e.g. 'NSE circular', 'BSE website'")
    source_version: str = Field(..., description="Version/revision of source document")
    retrieved_at: datetime = Field(..., description="UTC timestamp when data was retrieved")
    checksum: str = Field(..., description="SHA-256 of the serialized holidays list")
    year_coverage: list[CalendarYearCoverage] = Field(default_factory=list)
    holidays: frozenset[date] = Field(default_factory=frozenset)

    model_config = ConfigDict(frozen=True, arbitrary_types_allowed=True)

    @classmethod
    def compute_checksum(cls, holidays: frozenset[date]) -> str:
        serialized = json.dumps(
            sorted(d.isoformat() for d in holidays), sort_keys=True
        ).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()

    def verify_checksum(self) -> bool:
        return self.checksum == self.compute_checksum(self.holidays)

    def covers_year(self, year: int) -> bool:
        """Returns True if this calendar dataset claims to cover the given year."""
        return self.effective_from.year <= year <= self.effective_to.year

    def is_year_verified(self, year: int) -> bool:
        """Returns True if the given year's holidays are marked as verified."""
        for cov in self.year_coverage:
            if cov.year == year:
                return cov.is_verified
        return False

    def is_holiday(self, d: date) -> bool:
        return d in self.holidays


class ExpiryCycle(str, Enum):
    MONTHLY = "MONTHLY"
    WEEKLY = "WEEKLY"
    QUARTERLY = "QUARTERLY"


class HolidayRollConvention(str, Enum):
    PREV_TRADING_DAY = "PREV_TRADING_DAY"
    NEXT_TRADING_DAY = "NEXT_TRADING_DAY"


class ExpiryRule(BaseModel):
    """Effective-dated specification of contract expiry day.

    Never assume 'last Thursday' is universal or permanent across Indian markets.
    """

    model_config = ConfigDict(frozen=True)

    rule_id: str
    exchange: Exchange
    symbol: str = "DEFAULT"             # e.g., "NIFTY", "BANKNIFTY", "FINNIFTY", "DEFAULT"
    expiry_cycle: ExpiryCycle = ExpiryCycle.MONTHLY
    target_weekday: int = Field(..., ge=0, le=6, description="0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun")
    week_of_month: str = Field(default="LAST", description="'LAST' for monthly, 'EVERY' for weekly")
    holiday_roll: HolidayRollConvention = HolidayRollConvention.PREV_TRADING_DAY
    effective_from: date
    effective_to: date | None = None
    source_reference: str = Field(..., description="Official circular/notice number")
    source_publication_date: date | None = None
    verification_status: RuleVerificationStatus = RuleVerificationStatus.VERIFIED
    notes: str | None = None

    def is_active_on(self, query_date: date) -> bool:
        if self.effective_from <= query_date:
            if self.effective_to is None or query_date <= self.effective_to:
                return True
        return False


class ExpiryDateOverride(BaseModel):
    """Explicit per-contract-month expiry override for special exchange situations.

    An override always takes precedence over algorithmic weekday rules.
    """

    model_config = ConfigDict(frozen=True)

    override_id: str
    exchange: Exchange
    symbol: str
    year: int
    month: int
    cycle: ExpiryCycle = ExpiryCycle.MONTHLY
    actual_expiry_date: date
    source_reference: str = Field(..., description="Official circular or exchange notice number")
    source_publication_date: date | None = None
    verification_status: RuleVerificationStatus = RuleVerificationStatus.VERIFIED
    notes: str | None = None


class CalendarRegistry:
    """Registry of versioned CalendarDatasets and ExpiryRules.

    Queries are served from the most recent dataset that covers the requested date.
    Raises CalendarError for dates outside any known coverage.
    """

    def __init__(self) -> None:
        self._datasets: dict[Exchange, list[CalendarDataset]] = {}
        self._expiry_rules: list[ExpiryRule] = []
        self._expiry_overrides: list[ExpiryDateOverride] = []

    def register(self, dataset: CalendarDataset) -> None:
        ex = dataset.exchange
        if ex not in self._datasets:
            self._datasets[ex] = []
        self._datasets[ex].append(dataset)
        # Keep sorted by effective_from descending (most recent first)
        self._datasets[ex].sort(key=lambda d: d.effective_from, reverse=True)

    def register_expiry_rule(self, rule: ExpiryRule) -> None:
        """Registers a versioned, effective-dated derivative expiry rule."""
        self._expiry_rules.append(rule)

    def register_expiry_override(self, override: ExpiryDateOverride) -> None:
        """Registers an explicit contract-month expiry override."""
        self._expiry_overrides.append(override)

    def get_expiry_override(
        self,
        exchange: Exchange,
        symbol: str,
        year: int,
        month: int,
        cycle: ExpiryCycle = ExpiryCycle.MONTHLY,
        require_verified: bool = True,
    ) -> ExpiryDateOverride | None:
        """Returns active expiry override if one exists for the contract month."""
        for override in self._expiry_overrides:
            if (
                override.exchange == exchange
                and override.symbol in (symbol, "DEFAULT")
                and override.year == year
                and override.month == month
                and override.cycle == cycle
            ):
                if require_verified and override.verification_status != RuleVerificationStatus.VERIFIED:
                    raise CalendarError(
                        f"Expiry override for {exchange.value}:{symbol} ({year}-{month:02d}) is "
                        f"{override.verification_status.value}. Unverified overrides cannot participate in production."
                    )
                return override
        return None

    def is_year_covered(self, exchange: Exchange, year: int) -> bool:
        """Returns True if at least one registered dataset covers the requested calendar year."""
        datasets = self._datasets.get(exchange, [])
        for d in datasets:
            if d.covers_year(year):
                return True
        return False

    def missing_coverage_years(self, exchange: Exchange, start_year: int, end_year: int) -> list[int]:
        """Returns all years in [start_year, end_year] inclusive that have NO calendar coverage."""
        return [y for y in range(start_year, end_year + 1) if not self.is_year_covered(exchange, y)]

    def get_dataset(self, exchange: Exchange, as_of: date) -> CalendarDataset:
        """Returns the best CalendarDataset for the given exchange and date."""
        datasets = self._datasets.get(exchange, [])
        for dataset in datasets:
            if dataset.effective_from <= as_of <= dataset.effective_to:
                return dataset
        raise CalendarError(
            f"No calendar dataset covers {exchange.value} on {as_of}. "
            f"Available datasets: {[d.calendar_id for d in datasets]}. "
            "Register a CalendarDataset covering this date range."
        )

    def check_coverage_gap(self, exchange: Exchange, start: date, end: date) -> list[date]:
        """Returns a list of dates in [start, end] that are NOT covered by any dataset.

        Use this to detect calendar gaps before running backtests.
        """
        uncovered = []
        current = start
        while current <= end:
            try:
                self.get_dataset(exchange, current)
            except CalendarError:
                uncovered.append(current)
            current += timedelta(days=1)
        return uncovered

    def is_holiday(self, exchange: Exchange, d: date) -> bool:
        dataset = self.get_dataset(exchange, d)
        return dataset.is_holiday(d)

    def is_trading_day(self, exchange: Exchange, d: date) -> bool:
        """Returns True if d is a weekday and not a holiday in the registered calendar."""
        if d.weekday() >= 5:  # Saturday=5, Sunday=6
            return False
        return not self.is_holiday(exchange, d)

    def next_trading_day(self, exchange: Exchange, after: date) -> date:
        candidate = after + timedelta(days=1)
        for _ in range(30):  # guard against infinite loops
            if self.is_trading_day(exchange, candidate):
                return candidate
            candidate += timedelta(days=1)
        raise CalendarError(f"Could not find next trading day after {after} within 30 days.")

    def prev_trading_day(self, exchange: Exchange, before: date) -> date:
        candidate = before - timedelta(days=1)
        for _ in range(30):
            if self.is_trading_day(exchange, candidate):
                return candidate
            candidate -= timedelta(days=1)
        raise CalendarError(f"Could not find previous trading day before {before} within 30 days.")

    def trading_days_between(self, exchange: Exchange, start: date, end: date) -> list[date]:
        """Returns all trading days in [start, end] inclusive."""
        result = []
        current = start
        while current <= end:
            if self.is_trading_day(exchange, current):
                result.append(current)
            current += timedelta(days=1)
        return result

    def get_active_expiry_rule(
        self,
        exchange: Exchange,
        symbol: str,
        as_of: date,
        cycle: ExpiryCycle = ExpiryCycle.MONTHLY,
    ) -> ExpiryRule:
        """Resolves the authoritative VERIFIED ExpiryRule for symbol and date."""
        matched_specific = None
        matched_default = None

        for rule in self._expiry_rules:
            if rule.exchange != exchange or rule.expiry_cycle != cycle:
                continue
            if not rule.is_active_on(as_of):
                continue

            if rule.symbol == symbol:
                if rule.verification_status != RuleVerificationStatus.VERIFIED:
                    raise CalendarError(
                        f"No active VERIFIED expiry rule found for symbol={symbol} on exchange={exchange.value} at {as_of}: "
                        f"rule is {rule.verification_status.value}. Unverified rules cannot participate in production."
                    )
                matched_specific = rule
            elif rule.symbol == "DEFAULT" and rule.verification_status == RuleVerificationStatus.VERIFIED:
                matched_default = rule

        active = matched_specific or matched_default
        if active is None:
            raise CalendarError(
                f"No active VERIFIED expiry rule found for symbol={symbol} on exchange={exchange.value} at {as_of}. "
                "Register an effective-dated ExpiryRule."
            )
        return active

    def calculate_expiry(
        self,
        exchange: Exchange,
        symbol: str,
        year: int,
        month: int,
        as_of: date | None = None,
        cycle: ExpiryCycle = ExpiryCycle.MONTHLY,
    ) -> date:
        """Calculates derivative contract expiry date using versioned rules and holiday roll conventions."""
        # 0. Check explicit per-contract-month override first
        override = self.get_expiry_override(exchange, symbol, year, month, cycle=cycle)
        if override is not None:
            # Check calendar coverage for override date
            try:
                self.is_trading_day(exchange, override.actual_expiry_date)
            except CalendarError as exc:
                raise CalendarError(
                    f"Cannot calculate expiry for {symbol} ({year}-{month:02d}): "
                    f"override candidate {override.actual_expiry_date} is outside registered calendar coverage for {exchange.value}. "
                    f"Original error: {exc}"
                ) from exc
            return override.actual_expiry_date

        ref_date = as_of or date(year, month, 1)
        rule = self.get_active_expiry_rule(exchange, symbol, ref_date, cycle=cycle)

        # 1. Find the target date
        if rule.week_of_month == "LAST":
            if month == 12:
                last_day = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                last_day = date(year, month + 1, 1) - timedelta(days=1)

            candidate = last_day
            while candidate.weekday() != rule.target_weekday:
                candidate -= timedelta(days=1)
        else:
            raise CalendarError(f"Unsupported week_of_month: {rule.week_of_month}")

        # 2. Check calendar coverage explicitly — DO NOT SILENTLY PASS!
        try:
            is_trading = self.is_trading_day(exchange, candidate)
        except CalendarError as exc:
            raise CalendarError(
                f"Cannot calculate expiry for {symbol} ({year}-{month:02d}): "
                f"target candidate {candidate} is outside registered calendar coverage for {exchange.value}. "
                f"Original error: {exc}"
            ) from exc

        # 3. Apply holiday roll
        if not is_trading:
            if rule.holiday_roll == HolidayRollConvention.PREV_TRADING_DAY:
                candidate = self.prev_trading_day(exchange, candidate)
            elif rule.holiday_roll == HolidayRollConvention.NEXT_TRADING_DAY:
                candidate = self.next_trading_day(exchange, candidate)

        return candidate

    def monthly_expiry_thursday(self, exchange: Exchange, year: int, month: int) -> date:
        """Legacy helper for monthly expiry (defaults to NIFTY monthly rule)."""
        return self.calculate_expiry(exchange, "NIFTY", year, month, as_of=date(year, month, 1))
