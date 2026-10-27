"""Tests for point-in-time time semantics, availability times, and timezone conversions."""

from datetime import UTC, date, datetime

import pytest

from arthaai.core.clock.timezone import IST, enforce_utc, ist_to_utc, to_date_ist, to_ist
from arthaai.core.events.point_in_time import PointInTimeDataset


def test_timezone_conversion_utc_ist():
    # 2024-10-15 09:15 IST is 2024-10-15 03:45 UTC
    ist_dt = datetime(2024, 10, 15, 9, 15, 0, tzinfo=IST)
    utc_dt = enforce_utc(ist_dt)
    assert utc_dt.hour == 3
    assert utc_dt.minute == 45
    assert utc_dt.tzinfo == UTC

    # Convert back to IST
    back_to_ist = to_ist(utc_dt)
    assert back_to_ist.hour == 9
    assert back_to_ist.minute == 15


def test_ist_to_utc_naive_conversion():
    naive_ist = datetime(2024, 10, 15, 15, 30, 0)
    utc_dt = ist_to_utc(naive_ist)
    assert utc_dt.hour == 10  # 15:30 IST is 10:00 UTC
    assert utc_dt.tzinfo == UTC

    # Rejection of already-aware datetime
    aware_dt = datetime(2024, 10, 15, 15, 30, 0, tzinfo=UTC)
    with pytest.raises(ValueError, match="timezone-aware"):
        ist_to_utc(aware_dt)


def test_to_date_ist_across_midnight():
    # 2024-10-14 20:00 UTC is 2024-10-15 01:30 IST (+5:30)
    utc_dt = datetime(2024, 10, 14, 20, 0, 0, tzinfo=UTC)
    assert utc_dt.date() == date(2024, 10, 14)
    assert to_date_ist(utc_dt) == date(2024, 10, 15)


def test_naive_datetime_rejected():
    naive = datetime(2024, 10, 15, 9, 30, 0)
    with pytest.raises(ValueError, match="Naive datetime rejected"):
        enforce_utc(naive)


def test_point_in_time_availability_filtering():
    from arthaai.core.events.point_in_time import PointInTimeEvent
    # Event happened at 09:30, but available at 09:35 (e.g. publication lag)
    event_time = datetime(2024, 10, 15, 4, 0, tzinfo=UTC)
    avail_time = datetime(2024, 10, 15, 4, 5, tzinfo=UTC)

    event = PointInTimeEvent(
        event_id="nifty_earnings_release",
        event_time=event_time,
        availability_time=avail_time,
    )

    pit = PointInTimeDataset[PointInTimeEvent]()
    pit.add(event)

    # At 04:02 UTC (before availability_time 04:05), event must NOT be visible
    as_of_early = datetime(2024, 10, 15, 4, 2, tzinfo=UTC)
    assert len(pit.as_of(as_of_early)) == 0

    # At 04:05 UTC (at or after availability_time), event must be visible
    as_of_ready = datetime(2024, 10, 15, 4, 5, tzinfo=UTC)
    visible = pit.as_of(as_of_ready)
    assert len(visible) == 1
    assert visible[0].event_id == "nifty_earnings_release"
