import zoneinfo
from datetime import UTC, date, datetime

IST = zoneinfo.ZoneInfo("Asia/Kolkata")
UTC = UTC


def now_utc() -> datetime:
    """Returns current UTC timestamp with explicit timezone."""
    return datetime.now(UTC)


def enforce_utc(dt: datetime) -> datetime:
    """Ensures datetime is timezone-aware and converted to UTC."""
    if dt.tzinfo is None:
        raise ValueError(f"Naive datetime rejected: {dt}. All timestamps must have explicit timezone.")
    return dt.astimezone(UTC)


def to_ist(dt: datetime) -> datetime:
    """Converts a timezone-aware datetime to Indian Standard Time (IST)."""
    return enforce_utc(dt).astimezone(IST)


def ist_to_utc(dt: datetime) -> datetime:
    """Interprets a naive datetime as IST and converts to UTC.

    Use only when the source is known to be in Asia/Kolkata and the datetime
    is provided without timezone info (e.g. from NSE CSV exports).
    Raises ValueError if dt is already timezone-aware to prevent double-conversion.
    """
    if dt.tzinfo is not None:
        raise ValueError(
            f"ist_to_utc received a timezone-aware datetime: {dt}. "
            "Use enforce_utc() for already-aware datetimes."
        )
    return dt.replace(tzinfo=IST).astimezone(UTC)


def to_date_ist(dt: datetime) -> date:
    """Converts a UTC datetime to its calendar date in IST (Asia/Kolkata)."""
    return to_ist(dt).date()
