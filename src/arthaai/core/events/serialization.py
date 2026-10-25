import json

from arthaai.core.errors import EventError
from arthaai.core.events.market_events import (
    BarEvent,
    CorporateActionEvent,
    EconomicEvent,
    MarketEvent,
    NewsEvent,
    OptionChainEvent,
    OrderBookEvent,
    QuoteEvent,
    TradeEvent,
)

EVENT_TYPE_REGISTRY: dict[str, type[MarketEvent]] = {
    "MarketEvent": MarketEvent,
    "TradeEvent": TradeEvent,
    "QuoteEvent": QuoteEvent,
    "OrderBookEvent": OrderBookEvent,
    "BarEvent": BarEvent,
    "NewsEvent": NewsEvent,
    "CorporateActionEvent": CorporateActionEvent,
    "OptionChainEvent": OptionChainEvent,
    "EconomicEvent": EconomicEvent,
}

def serialize_event_to_json(event: MarketEvent) -> str:
    """Deterministically serializes a MarketEvent (or subclass) to a JSON string.

    Preserves exact microsecond timestamps, schema version, event ID, and instrument identity.
    Embeds '_event_class' to enable lossless polymorphic reconstruction.
    """
    if not isinstance(event, MarketEvent):
        raise EventError(f"Expected MarketEvent instance, got: {type(event)}")

    event_dict = event.model_dump(mode="json")
    event_dict["_event_class"] = type(event).__name__
    return json.dumps(event_dict, sort_keys=True)

def deserialize_event_from_json(json_str: str) -> MarketEvent:
    """Losslessly reconstructs a typed MarketEvent instance from JSON."""
    try:
        data = json.loads(json_str)
    except Exception as e:
        raise EventError(f"Failed to parse event JSON: {e}") from e

    if not isinstance(data, dict):
        raise EventError(f"Malformed event JSON payload: expected object, got {type(data)}")

    event_class_name = data.pop("_event_class", "MarketEvent")
    event_cls = EVENT_TYPE_REGISTRY.get(event_class_name, MarketEvent)

    try:
        return event_cls.model_validate(data)
    except Exception as e:
        raise EventError(f"Failed to reconstruct {event_class_name}: {e}") from e
