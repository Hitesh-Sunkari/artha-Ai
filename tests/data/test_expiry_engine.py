"""Comprehensive test suite for the Indian derivative expiry engine."""

from datetime import date

import pytest

from arthaai.core.errors import CalendarError
from arthaai.core.instruments.contracts import Exchange, RuleVerificationStatus
from arthaai.data.calendar.base import (
    ExpiryCycle,
    ExpiryDateOverride,
    ExpiryRule,
)
from arthaai.data.calendar.nse_calendar import build_default_calendar_registry


def test_nifty_normal_monthly_expiry():
    """Verify normal NIFTY monthly expiry resolves to last Thursday."""
    cal = build_default_calendar_registry()
    # October 2024: last Thursday is Oct 31, 2024 (trading day, Diwali Laxmi Puja was Nov 1)
    expiry = cal.calculate_expiry(Exchange.NSE, "NIFTY", 2024, 10)
    assert expiry == date(2024, 10, 31)
    assert expiry.weekday() == 3  # Thursday


def test_nifty_expiry_rolls_to_previous_trading_day_on_holiday():
    """Verify when last Thursday is a holiday, expiry rolls to previous trading day.

    Register a calendar where Oct 31, 2024 (Thursday) is an exchange holiday.
    Expiry must roll to Wednesday, Oct 30, 2024.
    """
    from datetime import UTC, datetime

    from arthaai.data.calendar.base import CalendarDataset, CalendarYearCoverage

    cal = build_default_calendar_registry()
    # Add a dataset with Oct 31, 2024 as holiday
    cal.register(CalendarDataset(
        calendar_id="NSE_2024_OCT_HOLIDAY",
        exchange=Exchange.NSE,
        year_coverage=[CalendarYearCoverage(year=2024, is_verified=True, holiday_count=1)],
        holidays=frozenset([date(2024, 10, 31)]),
        effective_from=date(2024, 10, 1),
        effective_to=date(2024, 12, 31),
        source="NSE",
        retrieved_at=datetime(2024, 1, 1, tzinfo=UTC),
        checksum="test_checksum_1",
        source_version="TEST_2024",
        source_reference="Special circular",
    ))

    expiry = cal.calculate_expiry(Exchange.NSE, "NIFTY", 2024, 10)
    assert expiry == date(2024, 10, 30)
    assert expiry.weekday() == 2  # Wednesday


def test_banknifty_thursday_to_wednesday_shift_pit():
    """Verify BANKNIFTY monthly expiry shifted from Thursday to Wednesday effective March 1, 2024.

    January 2024: Last Thursday was Jan 25, 2024 (pre-shift).
    April 2024: Last Wednesday was April 24, 2024 (post-shift).
    """
    cal = build_default_calendar_registry()

    # Pre-shift: Jan 2024
    jan_expiry = cal.calculate_expiry(Exchange.NSE, "BANKNIFTY", 2024, 1, as_of=date(2024, 1, 1))
    assert jan_expiry == date(2024, 1, 25)
    assert jan_expiry.weekday() == 3  # Thursday

    # Post-shift: April 2024
    apr_expiry = cal.calculate_expiry(Exchange.NSE, "BANKNIFTY", 2024, 4, as_of=date(2024, 4, 1))
    assert apr_expiry == date(2024, 4, 24)
    assert apr_expiry.weekday() == 2  # Wednesday


def test_finnifty_tuesday_expiry():
    """Verify FINNIFTY expires on last Tuesday of the month."""
    cal = build_default_calendar_registry()
    # July 2024: last Tuesday is July 30, 2024
    expiry = cal.calculate_expiry(Exchange.NSE, "FINNIFTY", 2024, 7)
    assert expiry == date(2024, 7, 30)
    assert expiry.weekday() == 1  # Tuesday


def test_midcpnifty_monday_expiry():
    """Verify MIDCPNIFTY expires on last Monday of the month."""
    cal = build_default_calendar_registry()
    # September 2024: last Monday is Sept 30, 2024
    expiry = cal.calculate_expiry(Exchange.NSE, "MIDCPNIFTY", 2024, 9)
    assert expiry == date(2024, 9, 30)
    assert expiry.weekday() == 0  # Monday


def test_sensex_friday_expiry():
    """Verify BSE SENSEX expires on last Friday of the month with registered BSE calendar."""
    from datetime import UTC, datetime

    from arthaai.data.calendar.base import CalendarDataset, CalendarYearCoverage

    cal = build_default_calendar_registry()
    # Register BSE calendar
    cal.register(CalendarDataset(
        calendar_id="BSE_2024",
        exchange=Exchange.BSE,
        year_coverage=[CalendarYearCoverage(year=2024, is_verified=True, holiday_count=0)],
        holidays=frozenset(),
        effective_from=date(2024, 1, 1),
        effective_to=date(2024, 12, 31),
        source="BSE",
        retrieved_at=datetime(2024, 1, 1, tzinfo=UTC),
        checksum="bse_test_checksum",
        source_version="BSE_2024",
        source_reference="BSE Trading Calendar Notice",
    ))

    # May 2024: last Friday is May 31, 2024
    expiry = cal.calculate_expiry(Exchange.BSE, "SENSEX", 2024, 5)
    assert expiry == date(2024, 5, 31)
    assert expiry.weekday() == 4  # Friday


def test_missing_calendar_coverage_raises_error():
    """Verify calculating expiry for unseeded year (e.g. 2026) raises CalendarError."""
    cal = build_default_calendar_registry()
    with pytest.raises(CalendarError, match="outside registered calendar coverage"):
        cal.calculate_expiry(Exchange.NSE, "NIFTY", 2026, 6)


def test_expiry_date_override_takes_precedence():
    """Verify that an explicit ExpiryDateOverride takes precedence over weekday calculations."""
    cal = build_default_calendar_registry()

    # Register an override for NIFTY in December 2024
    override = ExpiryDateOverride(
        override_id="OVR_TEST_DEC_2024",
        exchange=Exchange.NSE,
        symbol="NIFTY",
        year=2024,
        month=12,
        actual_expiry_date=date(2024, 12, 24),  # Tuesday instead of Thursday
        source_reference="Special Test Notice 999",
        verification_status=RuleVerificationStatus.VERIFIED,
    )
    cal.register_expiry_override(override)

    expiry = cal.calculate_expiry(Exchange.NSE, "NIFTY", 2024, 12)
    assert expiry == date(2024, 12, 24)


def test_unverified_expiry_override_raises_error():
    """Verify that an UNVERIFIED ExpiryDateOverride is blocked and raises CalendarError."""
    cal = build_default_calendar_registry()

    override = ExpiryDateOverride(
        override_id="OVR_UNVERIFIED",
        exchange=Exchange.NSE,
        symbol="NIFTY",
        year=2024,
        month=11,
        actual_expiry_date=date(2024, 11, 26),
        source_reference="Unverified Forum Post",
        verification_status=RuleVerificationStatus.UNVERIFIED,
    )
    cal.register_expiry_override(override)

    with pytest.raises(CalendarError, match="UNVERIFIED"):
        cal.calculate_expiry(Exchange.NSE, "NIFTY", 2024, 11)


def test_unverified_expiry_rule_rejected():
    """Verify that an UNVERIFIED ExpiryRule is never used in production resolution."""
    cal = build_default_calendar_registry()

    unverified_rule = ExpiryRule(
        rule_id="EXP_TEST_UNVERIFIED",
        exchange=Exchange.NSE,
        symbol="SPECIAL_IND",
        expiry_cycle=ExpiryCycle.MONTHLY,
        target_weekday=0,
        effective_from=date(2024, 1, 1),
        source_reference="Unverified Circular",
        verification_status=RuleVerificationStatus.UNVERIFIED,
    )
    cal.register_expiry_rule(unverified_rule)

    with pytest.raises(CalendarError, match="UNVERIFIED"):
        cal.calculate_expiry(Exchange.NSE, "SPECIAL_IND", 2024, 5)


def test_unsupported_week_of_month_raises():
    """Verify unsupported week_of_month convention raises CalendarError."""
    cal = build_default_calendar_registry()

    weird_rule = ExpiryRule(
        rule_id="EXP_TEST_SECOND",
        exchange=Exchange.NSE,
        symbol="WEIRD_IND",
        expiry_cycle=ExpiryCycle.MONTHLY,
        target_weekday=3,
        week_of_month="SECOND",
        effective_from=date(2024, 1, 1),
        source_reference="Circular 1",
        verification_status=RuleVerificationStatus.VERIFIED,
    )
    cal.register_expiry_rule(weird_rule)

    with pytest.raises(CalendarError, match="Unsupported week_of_month"):
        cal.calculate_expiry(Exchange.NSE, "WEIRD_IND", 2024, 5)


def test_weekly_expiry_unverified_raises():
    """Verify weekly expiry query raises CalendarError when no verified weekly rule exists."""
    cal = build_default_calendar_registry()
    with pytest.raises(CalendarError, match="No active VERIFIED expiry rule"):
        cal.calculate_expiry(Exchange.NSE, "NIFTY", 2024, 5, cycle=ExpiryCycle.WEEKLY)
