"""OHLCVBar — canonical OHLCV (candlestick) bar schema."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.raw_record import DataMode


class BarFrequency(str, Enum):
    """Supported bar aggregation frequencies."""

    TICK = "TICK"
    S1 = "1S"
    M1 = "1M"
    M3 = "3M"
    M5 = "5M"
    M15 = "15M"
    M30 = "30M"
    H1 = "1H"
    D1 = "1D"
    W1 = "1W"
    MN1 = "1MN"


class OHLCVBar(BaseModel):
    """Canonical OHLCV bar record.

    event_time: timestamp of the bar's close (end of period) in UTC
    availability_time: when this bar became available to the system (>= event_time)

    The availability_time is critical for point-in-time correctness:
    EOD bars from a data vendor may be published hours after market close.
    """

    model_config = ConfigDict(frozen=True)

    # Identity
    symbol: str
    exchange: str
    asset_class: str
    frequency: BarFrequency

    # Time semantics — all UTC
    event_time: datetime = Field(..., description="Bar period close timestamp (UTC)")
    availability_time: datetime = Field(..., description="When data was available to the system (UTC)")

    # OHLCV
    open: float = Field(..., gt=0.0)
    high: float = Field(..., gt=0.0)
    low: float = Field(..., gt=0.0)
    close: float = Field(..., gt=0.0)
    volume: int = Field(..., ge=0)

    # Optional
    open_interest: int | None = Field(default=None, ge=0)
    vwap: float | None = Field(default=None, gt=0.0)
    num_trades: int | None = Field(default=None, ge=0)
    turnover: float | None = Field(default=None, ge=0.0)

    # Provenance
    source: str = Field(..., description="Provider and feed identifier")
    data_mode: DataMode
    schema_version: str = "1.0.0"
    transform_version: str = "1.0.0"

    # Adjustment flags
    is_adjusted: bool = Field(default=False, description="True if prices are adjusted for corporate actions")
    adjustment_method: str | None = Field(
        default=None,
        description="Adjustment methodology applied, e.g. 'back-adjusted-ratio', 'forward-fill'"
    )
    adjustment_lineage: list[str] = Field(
        default_factory=list,
        description="List of corporate action IDs applied to produce this adjusted bar"
    )
    availability_time_inferred: bool = Field(
        default=False,
        description="True if availability_time was inferred rather than explicitly observed from data feed"
    )

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps_and_ohlc(cls, data: object) -> object:
        if isinstance(data, dict):
            for ts in ("event_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)

            # Validate OHLC consistency if all four are present
            o = data.get("open")
            h = data.get("high")
            lo = data.get("low")
            c = data.get("close")
            if o is not None and h is not None and lo is not None and c is not None:
                if h < max(o, c):
                    raise ValueError(f"OHLC violation: high ({h}) < max(open, close) ({max(o, c)})")
                if lo > min(o, c):
                    raise ValueError(f"OHLC violation: low ({lo}) > min(open, close) ({min(o, c)})")
                if h < lo:
                    raise ValueError(f"OHLC violation: high ({h}) < low ({lo})")
        return data
