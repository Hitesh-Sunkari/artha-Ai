from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.instruments.contracts import Instrument


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"
    STOP_LOSS_MARKET = "STOP_LOSS_MARKET"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class OrderIntent(BaseModel):
    model_config = ConfigDict(frozen=True)

    order_intent_id: str
    originating_decision_id: str = Field(..., description="ID of originating RiskDecision")
    timestamp: datetime = Field(..., description="Timestamp of order intent generation (UTC)")
    instrument: Instrument
    side: OrderSide
    order_type: OrderType
    quantity: int = Field(..., gt=0)
    price: float | None = None
    stop_price: float | None = None
    tag: str = "ArthaAI"

class ExecutionReport(BaseModel):
    model_config = ConfigDict(frozen=True)

    execution_report_id: str
    order_intent_id: str = Field(..., description="ID of originating OrderIntent")
    timestamp: datetime = Field(..., description="Timestamp of execution fill/report (UTC)")
    instrument: Instrument
    side: OrderSide
    status: OrderStatus
    filled_quantity: int = Field(default=0, ge=0)
    average_price: float = Field(default=0.0, ge=0.0)
    transaction_fees: float = 0.0
    stt_tax: float = 0.0
    stamp_duty: float = 0.0
    exchange_fees: float = 0.0
    sebi_charges: float = 0.0
    gst: float = 0.0
    broker_order_id: str | None = None
