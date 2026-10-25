from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.instruments.contracts import Instrument


class MarketState(BaseModel):
    model_config = ConfigDict(frozen=True)

    instrument: Instrument
    as_of_time: datetime = Field(..., description="Timestamp of current market state (UTC)")
    last_price: float = Field(..., gt=0.0)
    open: float
    high: float
    low: float
    close: float
    volume: int = Field(default=0, ge=0)
    open_interest: int | None = Field(default=None, ge=0)
    vwap: float | None = None
    bid_price: float | None = None
    bid_qty: int | None = None
    ask_price: float | None = None
    ask_qty: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
