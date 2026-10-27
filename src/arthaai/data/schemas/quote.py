"""Quote and L1Quote — canonical best bid/ask schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.raw_record import DataMode


class Quote(BaseModel):
    """Canonical best bid/ask quote (Level 1) record."""

    model_config = ConfigDict(frozen=True)

    symbol: str
    exchange: str
    asset_class: str

    # Time semantics — all UTC
    event_time: datetime = Field(..., description="Quote timestamp at source (UTC)")
    availability_time: datetime = Field(..., description="When quote was available to system (UTC)")

    bid_price: float | None = Field(default=None, gt=0.0)
    bid_size: int | None = Field(default=None, ge=0)
    ask_price: float | None = Field(default=None, gt=0.0)
    ask_size: int | None = Field(default=None, ge=0)
    last_price: float | None = Field(default=None, gt=0.0)
    last_size: int | None = Field(default=None, ge=0)

    sequence_number: int | None = Field(default=None, ge=0)

    # Provenance
    source: str
    data_mode: DataMode
    schema_version: str = "1.0.0"
    transform_version: str = "1.0.0"
    availability_time_inferred: bool = Field(
        default=False,
        description="True if availability_time was inferred rather than explicitly observed from data feed"
    )

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps(cls, data: object) -> object:
        if isinstance(data, dict):
            for ts in ("event_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)
        return data

    @model_validator(mode="after")
    def validate_spread(self) -> "Quote":
        """Detects crossed markets (bid >= ask) — does NOT auto-repair."""
        if self.bid_price is not None and self.ask_price is not None:
            if self.bid_price >= self.ask_price:
                raise ValueError(
                    f"Crossed market detected: bid ({self.bid_price}) >= ask ({self.ask_price}). "
                    "This is a data quality issue that must be resolved explicitly."
                )
        return self


class L1Quote(BaseModel):
    """Lightweight Level-1 quote snapshot — used for fast in-memory operations."""

    model_config = ConfigDict(frozen=True)

    bid: float = Field(..., gt=0.0)
    ask: float = Field(..., gt=0.0)
    bid_size: int = Field(..., ge=0)
    ask_size: int = Field(..., ge=0)
    timestamp: datetime

    @property
    def mid(self) -> float:
        return (self.bid + self.ask) / 2.0

    @property
    def spread(self) -> float:
        return self.ask - self.bid

    @property
    def spread_bps(self) -> float:
        """Spread in basis points relative to mid."""
        return (self.spread / self.mid) * 10_000 if self.mid > 0 else float("inf")
