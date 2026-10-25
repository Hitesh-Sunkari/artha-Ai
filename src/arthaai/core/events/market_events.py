from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.core.instruments.contracts import Instrument


class MarketEvent(BaseModel):
    model_config = ConfigDict(frozen=True)

    event_id: str
    event_time: datetime = Field(..., description="Timestamp when event occurred at source (UTC)")
    received_time: datetime = Field(..., description="Timestamp when event was received/available in system (UTC)")
    source: str = Field(..., description="Origin of event, e.g. 'NSE_TICK', 'REUTERS', 'KITE'")
    instrument: Instrument | None = None
    payload: dict[str, Any]
    schema_version: str = "1.0.0"

    @property
    def availability_time(self) -> datetime:
        """Alias for received_time, explicitly representing point-in-time availability."""
        return self.received_time

    @model_validator(mode="before")
    @classmethod
    def validate_timestamps(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "event_time" in data and isinstance(data["event_time"], datetime):
                data["event_time"] = enforce_utc(data["event_time"])
            if "received_time" in data and isinstance(data["received_time"], datetime):
                data["received_time"] = enforce_utc(data["received_time"])
            if "event_time" in data and "received_time" in data:
                if data["received_time"] < data["event_time"]:
                    raise ValueError(
                        f"Point-in-time violation: received_time ({data['received_time']}) "
                        f"cannot be earlier than event_time ({data['event_time']})."
                    )
        return data

class TradeEvent(MarketEvent):
    """Canonical trade tick event."""
    pass

class QuoteEvent(MarketEvent):
    """Canonical best bid/ask quote event."""
    pass

class OrderBookEvent(MarketEvent):
    """Canonical Level 2 / Level 3 order book depth update event."""
    pass

class BarEvent(MarketEvent):
    """Canonical OHLCV aggregated candle event."""
    pass

class NewsEvent(MarketEvent):
    """Canonical unstructured news and announcement event."""
    pass

class CorporateActionEvent(MarketEvent):
    """Canonical corporate action event (splits, dividends, bonus issues)."""
    pass

class OptionChainEvent(MarketEvent):
    """Canonical options chain snapshot event."""
    pass

class EconomicEvent(MarketEvent):
    """Canonical macroeconomic release event (RBI MPC rate, CPI, GDP)."""
    pass
