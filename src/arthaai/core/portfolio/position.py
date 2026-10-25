from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.instruments.contracts import Instrument


class Position(BaseModel):
    model_config = ConfigDict(frozen=True)

    instrument: Instrument
    quantity: int
    average_entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float

class PortfolioTarget(BaseModel):
    model_config = ConfigDict(frozen=True)

    target_id: str
    timestamp: datetime = Field(..., description="Timestamp of target creation (UTC)")
    instrument: Instrument
    target_weight: float = Field(..., ge=-1.0, le=1.0)
    target_quantity: int | None = None
    allocated_capital: float = Field(..., ge=0.0)

class PortfolioState(BaseModel):
    model_config = ConfigDict(frozen=True)

    as_of_time: datetime
    cash: float
    total_equity: float
    positions: dict[str, Position] = Field(default_factory=dict)
    margin_utilized: float = 0.0
    daily_realized_pnl: float = 0.0
    daily_unrealized_pnl: float = 0.0
