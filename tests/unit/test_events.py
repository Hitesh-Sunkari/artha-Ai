from datetime import UTC, datetime

import pytest

from arthaai.core.events.market_events import (
    BarEvent,
    CorporateActionEvent,
    EconomicEvent,
    MarketEvent,
    QuoteEvent,
    TradeEvent,
)
from arthaai.core.instruments.contracts import AssetClass, Exchange, Instrument


@pytest.fixture
def sample_instrument():
    return Instrument(
        symbol="TCS",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
    )

def test_canonical_event_instantiation(sample_instrument):
    t1 = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t2 = datetime(2026, 9, 9, 10, 0, 1, tzinfo=UTC)

    trade = TradeEvent(
        event_id="TRD_001",
        event_time=t1,
        received_time=t2,
        source="NSE_TICK",
        instrument=sample_instrument,
        payload={"price": 4200.0, "qty": 100, "aggressor": "BUY"},
    )
    assert trade.event_id == "TRD_001"
    assert trade.payload["price"] == 4200.0
    assert trade.schema_version == "1.0.0"

    quote = QuoteEvent(
        event_id="QTE_001",
        event_time=t1,
        received_time=t2,
        source="NSE_QUOTE",
        instrument=sample_instrument,
        payload={"bid": 4199.5, "ask": 4200.5},
    )
    assert isinstance(quote, MarketEvent)

    bar = BarEvent(
        event_id="BAR_001",
        event_time=t1,
        received_time=t2,
        source="NSE_1M",
        instrument=sample_instrument,
        payload={"open": 4190.0, "high": 4205.0, "low": 4188.0, "close": 4202.0, "volume": 15000},
    )
    assert bar.payload["close"] == 4202.0

def test_corporate_action_and_economic_events(sample_instrument):
    t1 = datetime(2026, 9, 9, 8, 0, 0, tzinfo=UTC)
    t2 = datetime(2026, 9, 9, 8, 0, 0, tzinfo=UTC)

    corp = CorporateActionEvent(
        event_id="CORP_001",
        event_time=t1,
        received_time=t2,
        source="NSE_ANNOUNCEMENT",
        instrument=sample_instrument,
        payload={"action_type": "DIVIDEND", "amount": 28.0, "ex_date": "2026-09-15"},
    )
    assert corp.payload["amount"] == 28.0

    econ = EconomicEvent(
        event_id="ECON_001",
        event_time=t1,
        received_time=t2,
        source="RBI_PRESS_RELEASE",
        payload={"indicator": "REPO_RATE", "value": 6.50, "unit": "PERCENT"},
    )
    assert econ.instrument is None
    assert econ.payload["indicator"] == "REPO_RATE"

def test_naive_datetime_is_rejected(sample_instrument):
    naive_dt = datetime(2026, 9, 9, 10, 0, 0) # No tzinfo!
    valid_utc = datetime(2026, 9, 9, 10, 0, 1, tzinfo=UTC)

    with pytest.raises(ValueError, match="Naive datetime rejected"):
        TradeEvent(
            event_id="ERR_01",
            event_time=naive_dt,
            received_time=valid_utc,
            source="TEST",
            instrument=sample_instrument,
            payload={},
        )
