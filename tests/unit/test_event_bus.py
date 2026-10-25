import asyncio
from datetime import UTC, datetime

import pytest

from arthaai.core.errors import EventError
from arthaai.core.events.bus import InMemoryEventBus
from arthaai.core.events.market_events import BarEvent, MarketEvent, TradeEvent
from arthaai.core.instruments.contracts import AssetClass, Exchange, Instrument


@pytest.fixture
def test_instrument():
    return Instrument(
        symbol="INFY",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
    )

def test_event_bus_delivery_and_filtering(test_instrument):
    async def run_scenario():
        bus = InMemoryEventBus()

        received_trades = []
        received_bars = []
        received_all = []

        async def trade_handler(event: MarketEvent):
            received_trades.append(event)

        def bar_handler(event: MarketEvent):
            received_bars.append(event)

        async def global_handler(event: MarketEvent):
            received_all.append(event)

        bus.subscribe(TradeEvent, trade_handler)
        bus.subscribe(BarEvent, bar_handler)
        bus.subscribe(MarketEvent, global_handler)

        t1 = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
        trade = TradeEvent(
            event_id="TRD_100",
            event_time=t1,
            received_time=t1,
            source="TEST",
            instrument=test_instrument,
            payload={"price": 1900.0, "qty": 50},
        )

        bar = BarEvent(
            event_id="BAR_100",
            event_time=t1,
            received_time=t1,
            source="TEST",
            instrument=test_instrument,
            payload={"close": 1905.0},
        )

        await bus.publish(trade)
        await bus.publish(bar)

        assert len(received_trades) == 1
        assert received_trades[0].event_id == "TRD_100"

        assert len(received_bars) == 1
        assert received_bars[0].event_id == "BAR_100"

        # Global handler subscribed to MarketEvent received both TradeEvent and BarEvent
        assert len(received_all) == 2

    asyncio.run(run_scenario())

def test_event_bus_unsubscribe(test_instrument):
    async def run_scenario():
        bus = InMemoryEventBus()
        received = []

        def handler(event: MarketEvent):
            received.append(event)

        bus.subscribe(TradeEvent, handler)

        t1 = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
        evt = TradeEvent(
            event_id="T1",
            event_time=t1,
            received_time=t1,
            source="TEST",
            instrument=test_instrument,
            payload={},
        )

        await bus.publish(evt)
        assert len(received) == 1

        bus.unsubscribe(TradeEvent, handler)
        await bus.publish(evt)
        assert len(received) == 1  # No second event delivered

    asyncio.run(run_scenario())

def test_event_bus_invalid_publication():
    async def run_scenario():
        bus = InMemoryEventBus()
        with pytest.raises(EventError, match="must be a MarketEvent instance"):
            await bus.publish("NOT_AN_EVENT")  # type: ignore

    asyncio.run(run_scenario())

def test_event_bus_invalid_subscription():
    bus = InMemoryEventBus()
    with pytest.raises(EventError, match="must inherit from MarketEvent"):
        bus.subscribe(dict, lambda x: None)  # type: ignore
