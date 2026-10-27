"""Tests for versioned market calendar architecture in src/arthaai/data/calendar/."""

from datetime import date

import pytest

from arthaai.core.errors import CalendarError
from arthaai.core.instruments.contracts import Exchange
from arthaai.data.calendar.nse_calendar import build_default_calendar_registry, build_nse_calendar_2024_2025


def test_nse_calendar_provenance_and_checksum():
    cal = build_nse_calendar_2024_2025()
    assert cal.calendar_id == "NSE_2024_2025_v1"
    assert cal.exchange == Exchange.NSE
    assert cal.effective_from == date(2024, 1, 1)
    assert cal.effective_to == date(2025, 12, 31)
    assert cal.verify_checksum()
    assert cal.covers_year(2024)
    assert cal.covers_year(2025)
    assert not cal.covers_year(2023)
    assert cal.is_year_verified(2024)


def test_known_nse_holidays():
    registry = build_default_calendar_registry()

    # Republic Day 2024 (Jan 26) is a known holiday
    assert registry.is_holiday(Exchange.NSE, date(2024, 1, 26))
    assert not registry.is_trading_day(Exchange.NSE, date(2024, 1, 26))

    # Independence Day 2024 (Aug 15) is a known holiday
    assert registry.is_holiday(Exchange.NSE, date(2024, 8, 15))

    # Regular trading day (Jan 15, 2024)
    assert registry.is_trading_day(Exchange.NSE, date(2024, 1, 15))


def test_weekend_handling():
    registry = build_default_calendar_registry()
    # 2024-01-20 is Saturday, 2024-01-21 is Sunday
    assert not registry.is_trading_day(Exchange.NSE, date(2024, 1, 20))
    assert not registry.is_trading_day(Exchange.NSE, date(2024, 1, 21))


def test_trading_day_arithmetic():
    registry = build_default_calendar_registry()

    # Friday Jan 26, 2024 is Republic Day holiday
    # Prev trading day before Jan 26 should be Thursday Jan 25
    prev_day = registry.prev_trading_day(Exchange.NSE, date(2024, 1, 26))
    assert prev_day == date(2024, 1, 25)

    # Next trading day after Friday Jan 26 should be Monday Jan 29
    next_day = registry.next_trading_day(Exchange.NSE, date(2024, 1, 26))
    assert next_day == date(2024, 1, 29)

    # Trading days between Jan 22 and Jan 26 (Jan 22 and Jan 26 both holidays in 2024) -> 3 days: 23, 24, 25
    days = registry.trading_days_between(Exchange.NSE, date(2024, 1, 22), date(2024, 1, 26))
    assert len(days) == 3
    assert date(2024, 1, 22) not in days
    assert date(2024, 1, 26) not in days


def test_monthly_fno_expiry():
    registry = build_default_calendar_registry()

    # October 2024: last Thursday is Oct 31, 2024
    expiry_oct = registry.monthly_expiry_thursday(Exchange.NSE, 2024, 10)
    assert expiry_oct == date(2024, 10, 31)
    assert expiry_oct.weekday() == 3  # Thursday


def test_coverage_gap_detection():
    registry = build_default_calendar_registry()

    # Year 2023 is not covered
    gaps = registry.check_coverage_gap(Exchange.NSE, date(2023, 12, 28), date(2024, 1, 2))
    assert date(2023, 12, 28) in gaps
    assert date(2024, 1, 1) not in gaps

    with pytest.raises(CalendarError):
        registry.get_dataset(Exchange.NSE, date(2023, 6, 1))
