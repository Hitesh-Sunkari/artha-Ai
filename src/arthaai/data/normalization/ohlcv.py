"""OHLCV normalizer — raw dict → OHLCVBar.

Handles the generic canonical format used by SimulatedAdapter and
any provider that maps to {open, high, low, close, volume, date/datetime}.
"""

from datetime import datetime
from typing import Any

from arthaai.core.clock.timezone import enforce_utc, ist_to_utc
from arthaai.data.normalization.base import CURRENT_TRANSFORM_VERSION, DataNormalizer
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.raw_record import DataMode


def _parse_frequency(val: Any) -> BarFrequency:
    if isinstance(val, BarFrequency):
        return val
    s = str(val).upper()
    mapping = {
        "1M": BarFrequency.M1,
        "3M": BarFrequency.M3,
        "5M": BarFrequency.M5,
        "15M": BarFrequency.M15,
        "30M": BarFrequency.M30,
        "1H": BarFrequency.H1,
        "1D": BarFrequency.D1,
        "1W": BarFrequency.W1,
        "1MN": BarFrequency.MN1,
        "TICK": BarFrequency.TICK,
    }
    return mapping.get(s, BarFrequency.D1)


class OHLCVNormalizer(DataNormalizer):
    """Normalizes generic OHLCV dicts into OHLCVBar.

    Supports optional default values passed at construction time.
    """

    def __init__(
        self,
        symbol: str | None = None,
        exchange: str | None = None,
        frequency: BarFrequency | str | None = None,
        interval: str | None = None,
        asset_class: str | None = None,
    ) -> None:
        self.default_symbol = symbol
        self.default_exchange = exchange
        self.default_frequency = _parse_frequency(frequency or interval) if (frequency or interval) else None
        self.default_asset_class = asset_class or "EQUITY"

    @property
    def transform_version(self) -> str:
        return CURRENT_TRANSFORM_VERSION

    @property
    def source_schema(self) -> str:
        return "generic.ohlcv.v1"

    def normalize(self, raw: dict[str, Any]) -> OHLCVBar:
        symbol = str(raw.get("symbol") or self.default_symbol)
        exchange = str(raw.get("exchange") or self.default_exchange or "NSE")
        asset_class = str(raw.get("asset_class") or self.default_asset_class)

        raw_freq = raw.get("frequency") or raw.get("interval")
        freq = _parse_frequency(raw_freq) if raw_freq else (self.default_frequency or BarFrequency.D1)

        # Resolve event timestamp
        event_time = self._resolve_event_time(raw)
        avail_raw = raw.get("availability_time")
        availability_time_inferred = (avail_raw is None)
        if avail_raw is None:
            availability_time = event_time
        elif isinstance(avail_raw, datetime):
            availability_time = enforce_utc(avail_raw)
        else:
            availability_time = enforce_utc(avail_raw)

        # Resolve DataMode
        data_mode_raw = raw.get("data_mode", DataMode.HISTORICAL)
        if isinstance(data_mode_raw, str):
            data_mode = DataMode(data_mode_raw)
        else:
            data_mode = data_mode_raw

        return OHLCVBar(
            symbol=symbol,
            exchange=exchange,
            asset_class=asset_class,
            frequency=freq,
            event_time=event_time,
            availability_time=availability_time,
            availability_time_inferred=availability_time_inferred,
            open=float(raw["open"]),
            high=float(raw["high"]),
            low=float(raw["low"]),
            close=float(raw["close"]),
            volume=int(raw["volume"]),
            open_interest=int(raw["open_interest"]) if raw.get("open_interest") is not None else None,
            vwap=float(raw["vwap"]) if raw.get("vwap") is not None else None,
            num_trades=int(raw["num_trades"]) if raw.get("num_trades") is not None else None,
            turnover=float(raw["turnover"]) if raw.get("turnover") is not None else None,
            source=str(raw.get("source", "unknown")),
            data_mode=data_mode,
            schema_version="1.0.0",
            transform_version=self.transform_version,
            is_adjusted=bool(raw.get("is_adjusted", False)),
            adjustment_method=raw.get("adjustment_method"),
            adjustment_lineage=list(raw.get("adjustment_lineage", [])),
        )

    @staticmethod
    def _resolve_event_time(raw: dict[str, Any]) -> datetime:
        """Resolves event_time from raw dict, handling date strings and datetimes."""
        if "event_time" in raw:
            val = raw["event_time"]
            if isinstance(val, datetime):
                return enforce_utc(val)
            if isinstance(val, str):
                dt = datetime.fromisoformat(val)
                if dt.tzinfo is None:
                    return ist_to_utc(dt)
                return enforce_utc(dt)

        if "datetime" in raw:
            val = raw["datetime"]
            if isinstance(val, datetime):
                return enforce_utc(val) if val.tzinfo else ist_to_utc(val)
            if isinstance(val, str):
                dt = datetime.fromisoformat(val)
                return enforce_utc(dt) if dt.tzinfo else ist_to_utc(dt)

        if "date" in raw:
            from datetime import date as date_type
            d = raw["date"]
            if isinstance(d, str):
                d = date_type.fromisoformat(d)
            # For EOD bars: treat NSE close time (15:30 IST) as event_time
            naive_close = datetime(d.year, d.month, d.day, 15, 30, 0)
            return ist_to_utc(naive_close)

        raise ValueError(f"Cannot resolve event_time from raw dict keys: {list(raw.keys())}")
