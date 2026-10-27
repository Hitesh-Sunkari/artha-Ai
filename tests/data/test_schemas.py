"""Tests for all canonical data schemas in src/arthaai/data/schemas/."""

from datetime import UTC, date, datetime

import pytest
from pydantic import ValidationError

from arthaai.core.instruments.contracts import AssetClass, Exchange
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.economic import EconomicEvent, EconomicEventImpact
from arthaai.data.schemas.instrument_record import DerivativeContractIdentity, InstrumentRecord
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import OptionChainSnapshot, OptionContract, OptionType
from arthaai.data.schemas.orderbook import OrderBookLevel, OrderBookSnapshot, OrderBookUpdate
from arthaai.data.schemas.quote import L1Quote, Quote
from arthaai.data.schemas.raw_record import DataMode, RawDataRecord
from arthaai.data.schemas.trade import Trade, TradeSide


def test_raw_data_record():
    now = datetime.now(UTC)
    rec = RawDataRecord(
        record_id="rec_1",
        provider="openbb",
        source="openbb.equity.price.historical",
        asset_class="EQUITY",
        request_timestamp=now,
        received_timestamp=now,
        endpoint="historical/equity",
        payload={"symbol": "RELIANCE", "close": 2900.0},
        checksum="abcd1234sha256",
        source_timestamp=now,
        data_mode=DataMode.HISTORICAL,
    )
    assert rec.provider == "openbb"
    assert rec.data_mode == DataMode.HISTORICAL
    assert rec.payload["symbol"] == "RELIANCE"
    dumped = rec.model_dump()
    assert dumped["checksum"] == "abcd1234sha256"


def test_instrument_record():
    rec = InstrumentRecord(
        symbol="TCS",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        isin="INE467B01029",
        name="Tata Consultancy Services Ltd",
        lot_size=1,
        tick_size=0.05,
        valid_from=date(2020, 1, 1),
    )
    assert rec.symbol == "TCS"
    assert rec.exchange == Exchange.NSE
    assert rec.tick_size == 0.05

    deriv = DerivativeContractIdentity(
        underlying_symbol="NIFTY",
        underlying_exchange=Exchange.NSE,
        contract_symbol="NIFTY24OCT25000CE",
        expiry=date(2024, 10, 31),
        strike=25000.0,
        option_type=OptionType.CALL,
        lot_size=50,
        tick_size=0.05,
        valid_from=date(2024, 8, 1),
    )
    assert deriv.strike == 25000.0
    assert deriv.is_call()


def test_ohlcv_bar():
    now = datetime.now(UTC)
    bar = OHLCVBar(
        symbol="INFY",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.M1,
        event_time=now,
        availability_time=now,
        open=1500.0,
        high=1510.0,
        low=1495.0,
        close=1505.0,
        volume=10000,
        source="simulated",
        data_mode=DataMode.FIXTURE,
    )
    assert bar.open == 1500.0
    assert bar.high >= bar.low
    assert bar.volume == 10000

    # Test rejection of negative price
    with pytest.raises(ValidationError):
        OHLCVBar(
            symbol="INFY",
            exchange="NSE",
            asset_class="EQUITY",
            frequency=BarFrequency.M1,
            event_time=now,
            availability_time=now,
            open=-10.0,
            high=1510.0,
            low=1495.0,
            close=1505.0,
            volume=100,
            source="test",
            data_mode=DataMode.FIXTURE,
        )


def test_trade_schema():
    now = datetime.now(UTC)
    trade = Trade(
        trade_id="t123",
        symbol="SBIN",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=now,
        availability_time=now,
        price=820.5,
        quantity=50,
        side=TradeSide.BUYER,
        source="test",
        data_mode=DataMode.HISTORICAL,
    )
    assert trade.price == 820.5
    assert trade.side == TradeSide.BUYER


def test_quote_and_l1():
    now = datetime.now(UTC)
    q = Quote(
        symbol="HDFCBANK",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=now,
        availability_time=now,
        bid_price=1600.0,
        bid_size=100,
        ask_price=1600.5,
        ask_size=200,
        source="simulated",
        data_mode=DataMode.FIXTURE,
    )
    assert q.bid_price == 1600.0
    assert q.ask_price == 1600.5

    l1 = L1Quote(
        bid=1600.0,
        bid_size=100,
        ask=1600.5,
        ask_size=200,
        timestamp=now,
    )
    assert l1.bid == 1600.0
    assert l1.mid == 1600.25


def test_orderbook_snapshot():
    now = datetime.now(UTC)
    bids = [OrderBookLevel(price=100.0, size=50)]
    asks = [OrderBookLevel(price=100.5, size=70)]
    snap = OrderBookSnapshot(
        symbol="ITC",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=now,
        availability_time=now,
        bids=bids,
        asks=asks,
        depth=1,
        source="test",
        data_mode=DataMode.FIXTURE,
    )
    assert len(snap.bids) == 1
    assert snap.asks[0].price == 100.5

    update = OrderBookUpdate(
        symbol="ITC",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=now,
        availability_time=now,
        side="bid",
        action="update",
        price=100.1,
        size=30,
        sequence_number=101,
        source="test",
        data_mode=DataMode.FIXTURE,
    )
    assert update.sequence_number == 101
    assert update.side == "bid"


def test_options_schema():
    now = datetime.now(UTC)
    opt = OptionContract(
        underlying_symbol="NIFTY",
        underlying_exchange="NSE",
        contract_symbol="NIFTY24OCT25000CE",
        expiry=date(2024, 10, 31),
        strike=25000.0,
        option_type=OptionType.CALL,
        event_time=now,
        availability_time=now,
        bid=150.0,
        ask=152.0,
        last=151.0,
        open_interest=500000,
        implied_volatility=0.145,
        delta=0.52,
        lot_size=50,
        tick_size=0.05,
        source="simulated",
        data_mode=DataMode.FIXTURE,
    )
    assert opt.strike == 25000.0
    assert opt.option_type == OptionType.CALL
    assert opt.delta == 0.52

    chain = OptionChainSnapshot(
        underlying_symbol="NIFTY",
        underlying_exchange="NSE",
        snapshot_time=now,
        availability_time=now,
        expiry=date(2024, 10, 31),
        contracts=[opt],
        source="simulated",
        data_mode=DataMode.FIXTURE,
    )
    assert chain.underlying_symbol == "NIFTY"
    assert len(chain.contracts) == 1
    assert chain.strikes == [25000.0]
    assert len(chain.call_contracts) == 1


def test_corporate_actions_schema():
    now = datetime.now(UTC)
    ca = CorporateAction(
        action_id="ca_001",
        symbol="WIPRO",
        exchange="NSE",
        action_type=CorporateActionType.BONUS,
        announcement_date=date(2024, 10, 15),
        ex_date=date(2024, 10, 28),
        record_date=date(2024, 10, 29),
        ratio="1:1",
        event_time=now,
        availability_time=now,
        source="test",
        data_mode=DataMode.HISTORICAL,
    )
    assert ca.action_type == CorporateActionType.BONUS
    assert ca.ratio == "1:1"


def test_news_article_schema():
    now = datetime.now(UTC)
    news = NewsArticle(
        article_id="news_1",
        source="reuters",
        headline="RBI keeps repo rate unchanged at 6.5%",
        body="The Reserve Bank of India Monetary Policy Committee decided...",
        published_time=now,
        availability_time=now,
        symbols=["BANKNIFTY", "HDFCBANK", "SBIN"],
        tags=["macro", "rbi", "rates"],
        data_mode=DataMode.HISTORICAL,
    )
    assert "BANKNIFTY" in news.symbols
    assert news.language == "en"


def test_economic_event_schema():
    now = datetime.now(UTC)
    event = EconomicEvent(
        event_id="econ_1",
        country="IN",
        category="inflation",
        title="CPI Inflation Rate YoY",
        scheduled_time=now,
        event_time=now,
        availability_time=now,
        actual="3.65%",
        forecast="3.90%",
        previous="3.54%",
        unit="%",
        impact=EconomicEventImpact.HIGH,
        source="mospi",
        data_mode=DataMode.HISTORICAL,
    )
    assert event.actual == "3.65%"
    assert event.impact == EconomicEventImpact.HIGH
