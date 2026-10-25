import zoneinfo
from datetime import UTC, datetime

import pytest

from arthaai.core.errors import PointInTimeError
from arthaai.core.events.point_in_time import PointInTimeDataset, PointInTimeEvent

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

class FinancialReleaseEvent(PointInTimeEvent):
    company: str
    headline: str

def test_point_in_time_event_validation():
    # Valid
    t_event = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_avail = datetime(2026, 9, 9, 10, 0, 5, tzinfo=UTC)
    evt = PointInTimeEvent(
        event_id="PIT_01",
        event_time=t_event,
        availability_time=t_avail,
    )
    assert evt.availability_time == t_avail

    # Invalid: availability before event
    t_impossible = datetime(2026, 9, 9, 9, 59, 59, tzinfo=UTC)
    with pytest.raises(PointInTimeError, match="cannot precede event_time"):
        PointInTimeEvent(
            event_id="PIT_BAD",
            event_time=t_event,
            availability_time=t_impossible,
        )

def test_earnings_1605_invisible_at_1559():
    """Key Test: Earnings released at 16:05 IST must not be visible to a strategy operating at 15:59 IST."""
    dataset = PointInTimeDataset[FinancialReleaseEvent]()

    # Event occurred at 16:00 IST (board meeting closed), published to market at 16:05 IST
    t_event_ist = datetime(2026, 9, 9, 16, 0, 0, tzinfo=IST)
    t_avail_ist = datetime(2026, 9, 9, 16, 5, 0, tzinfo=IST)

    earnings = FinancialReleaseEvent(
        event_id="EARNINGS_INFY_Q2",
        event_time=t_event_ist,
        availability_time=t_avail_ist,
        company="INFY",
        headline="Infosys reports 12% profit rise in Q2",
    )
    dataset.add(earnings)

    # Strategy evaluates market state at 15:59 IST (before market close)
    t_strategy_query = datetime(2026, 9, 9, 15, 59, 0, tzinfo=IST)
    visible_before_close = dataset.as_of(t_strategy_query)

    assert len(visible_before_close) == 0
    assert not dataset.has_future_leakage(t_strategy_query)

    # Post-market strategy evaluation at 16:10 IST
    t_post_market = datetime(2026, 9, 9, 16, 10, 0, tzinfo=IST)
    visible_post_market = dataset.as_of(t_post_market)

    assert len(visible_post_market) == 1
    assert visible_post_market[0].company == "INFY"
    assert not dataset.has_future_leakage(t_post_market)
