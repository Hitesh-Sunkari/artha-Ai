import zoneinfo
from datetime import date, datetime, time
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import enforce_utc
from arthaai.core.errors import MarketClockError
from arthaai.core.instruments.contracts import Exchange


class SessionType(str, Enum):
    PRE_OPEN = "PRE_OPEN"          # 09:00 - 09:08 IST
    REGULAR = "REGULAR"            # 09:15 - 15:30 IST
    POST_CLOSE = "POST_CLOSE"      # 15:40 - 16:00 IST
    CLOSED = "CLOSED"              # Nights, weekends, exchange holidays

class ExchangeCalendar(BaseModel):
    model_config = ConfigDict(frozen=True)

    exchange: Exchange
    timezone_str: str = "Asia/Kolkata"
    holidays: set[date] = Field(default_factory=set)
    pre_open_start: time = time(9, 0, 0)
    pre_open_end: time = time(9, 8, 0)
    regular_open: time = time(9, 15, 0)
    regular_close: time = time(15, 30, 0)
    post_close_start: time = time(15, 40, 0)
    post_close_end: time = time(16, 0, 0)

    @property
    def tz(self) -> zoneinfo.ZoneInfo:
        return zoneinfo.ZoneInfo(self.timezone_str)

class MarketClock:
    """Manages trading sessions, exchange calendars, and timestamp normalization."""

    def __init__(self, calendar: ExchangeCalendar | None = None):
        self.calendar = calendar or ExchangeCalendar(exchange=Exchange.NSE)

    def normalize_timestamp(self, dt: datetime) -> datetime:
        """Enforces UTC timezone-awareness."""
        return enforce_utc(dt)

    def is_trading_day(self, query_date: date) -> bool:
        """Returns True if the date is a weekday and not an exchange holiday."""
        # 5 = Saturday, 6 = Sunday
        if query_date.weekday() >= 5:
            return False
        if query_date in self.calendar.holidays:
            return False
        return True

    def get_session(self, query_time: datetime) -> SessionType:
        """Identifies active trading session for a given UTC timestamp."""
        utc_dt = self.normalize_timestamp(query_time)
        exchange_dt = utc_dt.astimezone(self.calendar.tz)
        local_date = exchange_dt.date()

        if not self.is_trading_day(local_date):
            return SessionType.CLOSED

        t = exchange_dt.time()
        cal = self.calendar

        if cal.pre_open_start <= t <= cal.pre_open_end:
            return SessionType.PRE_OPEN
        elif cal.regular_open <= t <= cal.regular_close:
            return SessionType.REGULAR
        elif cal.post_close_start <= t <= cal.post_close_end:
            return SessionType.POST_CLOSE
        else:
            return SessionType.CLOSED

    def is_market_open(self, query_time: datetime) -> bool:
        """Returns True if the market is in REGULAR continuous trading."""
        return self.get_session(query_time) == SessionType.REGULAR

    def get_market_open(self, query_date: date) -> datetime:
        """Returns market open time in UTC for a given calendar date."""
        if not self.is_trading_day(query_date):
            raise MarketClockError(f"{query_date} is not an active trading day for {self.calendar.exchange}.")
        local_dt = datetime.combine(query_date, self.calendar.regular_open, tzinfo=self.calendar.tz)
        return enforce_utc(local_dt)

    def get_market_close(self, query_date: date) -> datetime:
        """Returns market close time in UTC for a given calendar date."""
        if not self.is_trading_day(query_date):
            raise MarketClockError(f"{query_date} is not an active trading day for {self.calendar.exchange}.")
        local_dt = datetime.combine(query_date, self.calendar.regular_close, tzinfo=self.calendar.tz)
        return enforce_utc(local_dt)
