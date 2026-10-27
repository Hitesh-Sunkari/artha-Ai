"""Order book schemas — L1, L2 snapshots and incremental updates."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.raw_record import DataMode


class OrderBookLevel(BaseModel):
    """A single price level in the order book."""

    model_config = ConfigDict(frozen=True)

    price: float = Field(..., gt=0.0)
    size: int = Field(..., ge=0)
    order_count: int | None = Field(default=None, ge=0, description="Number of orders at this level if available")


class OrderBookSnapshot(BaseModel):
    """Full order book snapshot at a point in time (L2 depth).

    bids: sorted descending by price (best bid first)
    asks: sorted ascending by price (best ask first)
    depth: number of levels on each side
    """

    model_config = ConfigDict(frozen=True)

    symbol: str
    exchange: str
    asset_class: str
    depth: int = Field(..., ge=1, description="Number of price levels captured on each side")

    event_time: datetime = Field(..., description="Snapshot timestamp at source (UTC)")
    availability_time: datetime = Field(..., description="When snapshot became available to system (UTC)")
    sequence_number: int | None = Field(default=None, ge=0)

    bids: list[OrderBookLevel] = Field(default_factory=list)
    asks: list[OrderBookLevel] = Field(default_factory=list)

    # Provenance
    source: str
    data_mode: DataMode
    schema_version: str = "1.0.0"
    transform_version: str = "1.0.0"

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
    def validate_book(self) -> "OrderBookSnapshot":
        if self.bids and self.asks:
            best_bid = self.bids[0].price
            best_ask = self.asks[0].price
            if best_bid >= best_ask:
                raise ValueError(
                    f"Crossed order book: best bid ({best_bid}) >= best ask ({best_ask})"
                )
        return self

    @property
    def best_bid(self) -> OrderBookLevel | None:
        return self.bids[0] if self.bids else None

    @property
    def best_ask(self) -> OrderBookLevel | None:
        return self.asks[0] if self.asks else None

    @property
    def mid_price(self) -> float | None:
        if self.best_bid and self.best_ask:
            return (self.best_bid.price + self.best_ask.price) / 2.0
        return None

    @property
    def total_bid_volume(self) -> int:
        return sum(lvl.size for lvl in self.bids)

    @property
    def total_ask_volume(self) -> int:
        return sum(lvl.size for lvl in self.asks)


class OrderBookUpdate(BaseModel):
    """Incremental order book update (L2 delta).

    Used for streaming order book reconstruction.
    side: 'bid' or 'ask'
    action: 'insert', 'update', 'delete'
    """

    model_config = ConfigDict(frozen=True)

    symbol: str
    exchange: str

    event_time: datetime = Field(..., description="Update timestamp (UTC)")
    availability_time: datetime = Field(..., description="When update became available (UTC)")
    sequence_number: int | None = Field(default=None, ge=0)

    side: str = Field(..., pattern="^(bid|ask)$")
    action: str = Field(..., pattern="^(insert|update|delete)$")
    price: float = Field(..., gt=0.0)
    size: int = Field(..., ge=0)

    source: str
    data_mode: DataMode
    schema_version: str = "1.0.0"

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps(cls, data: object) -> object:
        if isinstance(data, dict):
            for ts in ("event_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)
        return data
