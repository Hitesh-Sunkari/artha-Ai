from datetime import UTC, datetime

import pytest

from arthaai.core.errors import EventError
from arthaai.core.events.market_events import (
    BarEvent,
    NewsEvent,
    TradeEvent,
)
from arthaai.core.events.serialization import (
    deserialize_event_from_json,
    serialize_event_to_json,
)
from arthaai.core.instruments.contracts import AssetClass, Exchange, Instrument


@pytest.fixture
def sample_instrument():
    return Instrument(
        symbol="NIFTY",
        exchange=Exchange.NSE,
        asset_class=AssetClass.INDEX,
        lot_size=75,
        tick_size=0.05,
    )

def test_trade_event_lossless_roundtrip(sample_instrument):
    t_event = datetime(2026, 9, 9, 10, 15, 30, 123456, tzinfo=UTC)
    t_rcvd = datetime(2026, 9, 9, 10, 15, 30, 200000, tzinfo=UTC)

    original = TradeEvent(
        event_id="TRD_SERIALIZE_01",
        event_time=t_event,
        received_time=t_rcvd,
        source="NSE_FEED",
        instrument=sample_instrument,
        payload={"price": 25050.25, "quantity": 150, "aggressor": "BUY"},
        schema_version="1.0.0",
    )

    json_str = serialize_event_to_json(original)
    reconstructed = deserialize_event_from_json(json_str)

    assert isinstance(reconstructed, TradeEvent)
    assert reconstructed.event_id == original.event_id
    assert reconstructed.event_time == original.event_time
    assert reconstructed.received_time == original.received_time
    assert reconstructed.source == original.source
    assert reconstructed.schema_version == original.schema_version
    assert reconstructed.instrument == original.instrument
    assert reconstructed.payload == original.payload

def test_bar_and_news_event_roundtrip(sample_instrument):
    t1 = datetime(2026, 9, 9, 9, 15, 0, tzinfo=UTC)

    bar = BarEvent(
        event_id="BAR_001",
        event_time=t1,
        received_time=t1,
        source="NSE_1M",
        instrument=sample_instrument,
        payload={"open": 24900.0, "high": 25000.0, "low": 24890.0, "close": 24980.0, "volume": 50000},
    )
    reconstructed_bar = deserialize_event_from_json(serialize_event_to_json(bar))
    assert isinstance(reconstructed_bar, BarEvent)
    assert reconstructed_bar.payload["close"] == 24980.0

    news = NewsEvent(
        event_id="NEWS_001",
        event_time=t1,
        received_time=t1,
        source="LIVE_MINT",
        payload={"headline": "RBI keeps repo rate unchanged at 6.5%"},
    )
    reconstructed_news = deserialize_event_from_json(serialize_event_to_json(news))
    assert isinstance(reconstructed_news, NewsEvent)
    assert reconstructed_news.payload["headline"] == "RBI keeps repo rate unchanged at 6.5%"

def test_serialization_error_handling():
    with pytest.raises(EventError, match="Expected MarketEvent instance"):
        serialize_event_to_json("NOT_AN_EVENT") # type: ignore

    with pytest.raises(EventError, match="Failed to parse event JSON"):
        deserialize_event_from_json("INVALID_JSON{")

    with pytest.raises(EventError, match="Malformed event JSON payload"):
        deserialize_event_from_json("[]")
