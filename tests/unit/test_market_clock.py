import zoneinfo
from datetime import UTC, date, datetime

import pytest

from arthaai.core.clock.market_clock import ExchangeCalendar, MarketClock, SessionType
from arthaai.core.errors import MarketClockError
from arthaai.core.instruments.contracts import Exchange

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

@pytest.fixture
def nse_clock():
    # Wednesday, 2026-09-09 is a trading day; 2026-10-02 (Gandhi Jayanti) is a holiday
    calendar = ExchangeCalendar(
        exchange=Exchange.NSE,
        holidays={date(2026, 10, 2)},
    )
    return MarketClock(calendar)

def test_regular_trading_session(nse_clock):
    # 2026-09-09 11:30:00 IST (Wednesday) -> REGULAR session
    dt_ist = datetime(2026, 9, 9, 11, 30, 0, tzinfo=IST)
    assert nse_clock.get_session(dt_ist) == SessionType.REGULAR
    assert nse_clock.is_market_open(dt_ist)

def test_pre_open_session(nse_clock):
    # 09:05:00 IST -> PRE_OPEN
    dt_ist = datetime(2026, 9, 9, 9, 5, 0, tzinfo=IST)
    assert nse_clock.get_session(dt_ist) == SessionType.PRE_OPEN
    assert not nse_clock.is_market_open(dt_ist)

def test_post_close_session(nse_clock):
    # 15:45:00 IST -> POST_CLOSE
    dt_ist = datetime(2026, 9, 9, 15, 45, 0, tzinfo=IST)
    assert nse_clock.get_session(dt_ist) == SessionType.POST_CLOSE
    assert not nse_clock.is_market_open(dt_ist)

def test_night_and_weekend_closed(nse_clock):
    # Night time: 20:00:00 IST -> CLOSED
    dt_night = datetime(2026, 9, 9, 20, 0, 0, tzinfo=IST)
    assert nse_clock.get_session(dt_night) == SessionType.CLOSED

    # Saturday: 2026-09-12 11:30:00 IST -> CLOSED
    dt_sat = datetime(2026, 9, 12, 11, 30, 0, tzinfo=IST)
    assert nse_clock.get_session(dt_sat) == SessionType.CLOSED
    assert not nse_clock.is_trading_day(dt_sat.date())

def test_holiday_closed(nse_clock):
    # 2026-10-02 (Gandhi Jayanti) -> CLOSED
    dt_holiday = datetime(2026, 10, 2, 11, 30, 0, tzinfo=IST)
    assert nse_clock.get_session(dt_holiday) == SessionType.CLOSED
    assert not nse_clock.is_trading_day(dt_holiday.date())

def test_market_open_and_close_utc(nse_clock):
    trading_date = date(2026, 9, 9)
    open_utc = nse_clock.get_market_open(trading_date)
    close_utc = nse_clock.get_market_close(trading_date)

    # 09:15 IST is 03:45 UTC
    assert open_utc.hour == 3
    assert open_utc.minute == 45
    assert open_utc.tzinfo == UTC

    # 15:30 IST is 10:00 UTC
    assert close_utc.hour == 10
    assert close_utc.minute == 0
    assert close_utc.tzinfo == UTC

def test_holiday_raises_error_on_open_query(nse_clock):
    holiday_date = date(2026, 10, 2)
    with pytest.raises(MarketClockError, match="not an active trading day"):
        nse_clock.get_market_open(holiday_date)
