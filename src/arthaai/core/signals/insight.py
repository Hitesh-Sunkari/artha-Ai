from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.instruments.contracts import Instrument


class SignalDirection(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"

class AlphaSignal(BaseModel):
    model_config = ConfigDict(frozen=True)

    signal_id: str
    timestamp: datetime = Field(..., description="Timestamp of signal generation (UTC)")
    source: str = Field(..., min_length=1, description="Originating model or alpha component name")
    instrument: Instrument
    direction: SignalDirection
    confidence: float = Field(..., ge=0.0, le=1.0)
    horizon_seconds: int = Field(default=3600, gt=0)
    expected_magnitude_pct: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
