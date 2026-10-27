"""Forensic audit tests for versioned market calendar and effective-dated expiry rules."""

from datetime import date

import pytest

from arthaai.core.errors import CalendarError
from arthaai.core.instruments.contracts import Exchange, RuleVerificationStatus
from arthaai.data.calendar.base import (
    CalendarDataset,
    CalendarRegistry,
    ExpiryCycle,
    ExpiryRule,
)
from arthaai.data.calendar.nse_calendar import (
    build_default_calendar_registry,
    build_nse_calendar_2024_2025,
)


def test_calendar_provenance_and_checksum():
    """Verify that calendar provenance, source, and checksum are recorded and verified."""
    ds = build_nse_calendar_2024_2025()
    assert ds.calendar_id == "NSE_2024_2025_v1"
    assert ds.source == "NSE India Exchange Holidays Circular"
    assert ds.source_version == "NSE_CIRCULAR_2024_2025"
    assert ds.verify_checksum() is True
    assert ds.is_year_verified(2024) is True
    assert ds.is_year_verified(2025) is True
    assert ds.is_year_verified(2026) is False


def test_calendar_coverage_gap_and_missing_years():
    """Verify that the system identifies missing coverage years explicitly."""
    registry = build_default_calendar_registry()

    # 2024 and 2025 are covered
    assert registry.is_year_covered(Exchange.NSE, 2024) is True
    assert registry.is_year_covered(Exchange.NSE, 2025) is True

    # 2023 and 2026 are not covered
    assert registry.is_year_covered(Exchange.NSE, 2023) is False
    assert registry.is_year_covered(Exchange.NSE, 2026) is False

    missing = registry.missing_coverage_years(Exchange.NSE, 2023, 2026)
    assert missing == [2023, 2026]


def test_missing_coverage_raises_explicitly_no_silent_fallback():
    """Verify that querying outside registered coverage raises CalendarError with clear diagnostics."""
    registry = build_default_calendar_registry()

    # Date in 2026 has no coverage
    with pytest.raises(CalendarError, match="No calendar dataset covers NSE on 2026-06-15"):
        registry.is_holiday(Exchange.NSE, date(2026, 6, 15))

    with pytest.raises(CalendarError, match="No calendar dataset covers NSE on 2026-06-15"):
        registry.is_trading_day(Exchange.NSE, date(2026, 6, 15))

    # Expiry calculation outside calendar coverage must raise CalendarError, not silently return raw date
    with pytest.raises(CalendarError, match="outside registered calendar coverage"):
        registry.calculate_expiry(Exchange.NSE, "NIFTY", 2026, 6, as_of=date(2024, 1, 1))


def test_effective_dated_expiry_rules_banknifty_shift():
    """Verify effective-dated expiry rule resolution:

    Bank Nifty shifted monthly expiry from Thursday to Wednesday effective March 1, 2024.
    """
    registry = build_default_calendar_registry()

    # In Jan 2024 (pre-shift): Bank Nifty monthly expiry was last Thursday
    # Jan 2024: Jan 25, 2024 was Thursday (Jan 26 was Republic Day holiday)
    exp_jan = registry.calculate_expiry(Exchange.NSE, "BANKNIFTY", 2024, 1, as_of=date(2024, 1, 1))
    assert exp_jan.weekday() == 3  # Thursday
    assert exp_jan == date(2024, 1, 25)

    # In Oct 2024 (post-shift): Bank Nifty monthly expiry is last Wednesday
    # Oct 2024: Oct 30, 2024 was Wednesday
    exp_oct = registry.calculate_expiry(Exchange.NSE, "BANKNIFTY", 2024, 10, as_of=date(2024, 10, 1))
    assert exp_oct.weekday() == 2  # Wednesday
    assert exp_oct == date(2024, 10, 30)

    # Meanwhile, Nifty monthly expiry stayed Thursday
    exp_nifty_oct = registry.calculate_expiry(Exchange.NSE, "NIFTY", 2024, 10, as_of=date(2024, 10, 1))
    assert exp_nifty_oct.weekday() == 3  # Thursday
    assert exp_nifty_oct == date(2024, 10, 31)


def test_other_index_expiry_conventions():
    """Verify FinNifty (Tuesday), Midcap Nifty (Monday), and BSE Sensex (Friday) rules."""
    registry = build_default_calendar_registry()

    # FINNIFTY: Tuesday (weekday 1)
    # Oct 2024: last Tuesday is Oct 29, 2024
    exp_fin = registry.calculate_expiry(Exchange.NSE, "FINNIFTY", 2024, 10, as_of=date(2024, 10, 1))
    assert exp_fin.weekday() == 1
    assert exp_fin == date(2024, 10, 29)

    # MIDCPNIFTY: Monday (weekday 0)
    # Oct 2024: last Monday is Oct 28, 2024
    exp_mid = registry.calculate_expiry(Exchange.NSE, "MIDCPNIFTY", 2024, 10, as_of=date(2024, 10, 1))
    assert exp_mid.weekday() == 0
    assert exp_mid == date(2024, 10, 28)

    # BSE SENSEX: Friday (weekday 4)
    # Note: Requires BSE calendar dataset
    bse_ds = CalendarDataset(
        calendar_id="BSE_2024_v1",
        exchange=Exchange.BSE,
        effective_from=date(2024, 1, 1),
        effective_to=date(2024, 12, 31),
        source="BSE Notice",
        source_version="BSE_2024",
        retrieved_at=build_nse_calendar_2024_2025().retrieved_at,
        checksum=CalendarDataset.compute_checksum(frozenset()),
        holidays=frozenset(),
    )
    registry.register(bse_ds)
    # Oct 2024: last Friday is Oct 25, 2024
    exp_sensex = registry.calculate_expiry(Exchange.BSE, "SENSEX", 2024, 10, as_of=date(2024, 10, 1))
    assert exp_sensex.weekday() == 4
    assert exp_sensex == date(2024, 10, 25)


def test_unverified_expiry_rules_rejected():
    """Verify that UNVERIFIED rules are strictly rejected from production expiry resolution."""
    registry = CalendarRegistry()
    registry.register(build_nse_calendar_2024_2025())

    # Register an UNVERIFIED rule
    unverified_rule = ExpiryRule(
        rule_id="EXP_HYPOTHETICAL_UNVERIFIED",
        exchange=Exchange.NSE,
        symbol="EXPERIMENTAL_INDEX",
        expiry_cycle=ExpiryCycle.MONTHLY,
        target_weekday=4,  # Friday
        effective_from=date(2024, 1, 1),
        source_reference="Unverified Forum Post",
        verification_status=RuleVerificationStatus.UNVERIFIED,
        notes="Proposed rule not verified by exchange circular.",
    )
    registry.register_expiry_rule(unverified_rule)

    # Attempting to resolve it must raise CalendarError
    with pytest.raises(CalendarError, match="No active VERIFIED expiry rule"):
        registry.calculate_expiry(Exchange.NSE, "EXPERIMENTAL_INDEX", 2024, 10, as_of=date(2024, 10, 1))
