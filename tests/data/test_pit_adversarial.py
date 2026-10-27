"""Adversarial Point-in-Time (PIT) leakage test suite across all 7 supported data schemas.

Proves mathematically and empirically:
For any decision timestamp T_decision, if T_availability > T_decision, the record is
strictly excluded by the research engine, even if T_event <= T_decision.
"""

from datetime import UTC, date, datetime
from pathlib import Path

import pytest

from arthaai.data.research.duckdb_engine import DuckDBEngine
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.economic import EconomicEvent, EconomicEventImpact
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import OptionContract, OptionType
from arthaai.data.schemas.quote import Quote
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide
from arthaai.data.storage.parquet_store import ParquetStore


@pytest.fixture
def pit_env(tmp_path: Path):
    parquet_root = tmp_path / "parquet"
    store = ParquetStore(data_root=parquet_root)
    engine = DuckDBEngine(data_root=parquet_root)
    return {"store": store, "engine": engine, "root": parquet_root}


def test_pit_adversarial_ohlcv(pit_env):
    """Adversarial OHLCV: bar period ends at 10:00 UTC, but vendor EOD feed delivers it at 18:00 UTC.

    Decision time = 12:00 UTC.
    Strict requirement: bar MUST be excluded.
    """
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    bar = OHLCVBar(
        symbol="RELIANCE",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.D1,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),        # 15:30 IST close
        availability_time=datetime(2024, 10, 15, 18, 0, 0, tzinfo=UTC), # 8 hours late
        open=2500.0,
        high=2520.0,
        low=2490.0,
        close=2515.0,
        volume=5000000,
        source="eod_vendor",
        data_mode=DataMode.HISTORICAL,
    )
    store.write_ohlcv([bar])
    engine.refresh_views()

    # 1. Decision at 12:00 UTC (after event close, before vendor delivery) -> EXCLUDED
    t_decision = datetime(2024, 10, 15, 12, 0, 0, tzinfo=UTC)
    res_leakage = engine.query_ohlcv("RELIANCE", as_of_availability=t_decision)
    assert len(res_leakage) == 0, "CRITICAL LEAKAGE: bar was visible before availability_time!"

    # 2. Decision at 18:30 UTC (after vendor delivery) -> INCLUDED
    t_valid = datetime(2024, 10, 15, 18, 30, 0, tzinfo=UTC)
    res_valid = engine.query_ohlcv("RELIANCE", as_of_availability=t_valid)
    assert len(res_valid) == 1
    assert res_valid.to_pylist()[0]["close"] == 2515.0


def test_pit_adversarial_trades(pit_env):
    """Adversarial Trade: execution at 09:30:00 UTC, tick feed delay delivers at 09:30:15 UTC.

    Decision at 09:30:10 UTC must NOT see this trade.
    """
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    trade = Trade(
        trade_id="TR_ADV_1",
        symbol="INFY",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 9, 30, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 9, 30, 15, tzinfo=UTC),
        price=1800.0,
        quantity=200,
        side=TradeSide.BUYER,
        source="slow_tick_feed",
        data_mode=DataMode.HISTORICAL,
    )
    store.write_trades([trade])
    engine.refresh_views()

    # Decision at 09:30:10 UTC -> EXCLUDED
    t_decision = datetime(2024, 10, 15, 9, 30, 10, tzinfo=UTC)
    res = engine.query_trades("INFY", as_of_availability=t_decision)
    assert len(res) == 0

    # Decision at 09:30:16 UTC -> INCLUDED
    t_after = datetime(2024, 10, 15, 9, 30, 16, tzinfo=UTC)
    res_after = engine.query_trades("INFY", as_of_availability=t_after)
    assert len(res_after) == 1


def test_pit_adversarial_quotes(pit_env):
    """Adversarial Quote: L1 quote snapshot with network transit latency."""
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    quote = Quote(
        symbol="HDFCBANK",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 9, 15, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 9, 15, 2, tzinfo=UTC),
        bid_price=1650.0,
        bid_size=100,
        ask_price=1650.5,
        ask_size=150,
        source="l1_feed",
        data_mode=DataMode.HISTORICAL,
    )
    store.write_quotes([quote])
    engine.refresh_views()

    # Query 1s after event time (before availability) -> EXCLUDED
    res_before = engine.query_quotes("HDFCBANK", as_of_availability=datetime(2024, 10, 15, 9, 15, 1, tzinfo=UTC))
    assert len(res_before) == 0

    # Query 3s after event time (after availability) -> INCLUDED
    res_after = engine.query_quotes("HDFCBANK", as_of_availability=datetime(2024, 10, 15, 9, 15, 3, tzinfo=UTC))
    assert len(res_after) == 1
    assert res_after.to_pylist()[0]["bid_price"] == 1650.0


def test_pit_adversarial_options(pit_env):
    """Adversarial Options: option chain computed at close, published post-market."""
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    opt = OptionContract(
        underlying_symbol="NIFTY",
        underlying_exchange="NSE",
        contract_symbol="NIFTY24OCT25000CE",
        expiry=date(2024, 10, 31),
        strike=25000.0,
        option_type=OptionType.CALL,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 11, 30, 0, tzinfo=UTC),
        bid=120.0,
        ask=122.0,
        last=121.0,
        volume=10000,
        open_interest=50000,
        lot_size=25,
        tick_size=0.05,
        source="nse_bhavcopy",
        data_mode=DataMode.HISTORICAL,
    )
    store.write_options([opt])
    engine.refresh_views()

    # Decision at 10:45 UTC -> EXCLUDED
    res_early = engine.query_option_chain("NIFTY", as_of_availability=datetime(2024, 10, 15, 10, 45, 0, tzinfo=UTC))
    assert len(res_early) == 0

    # Decision at 11:45 UTC -> INCLUDED
    res_late = engine.query_option_chain("NIFTY", as_of_availability=datetime(2024, 10, 15, 11, 45, 0, tzinfo=UTC))
    assert len(res_late) == 1


def test_pit_adversarial_corporate_actions(pit_env):
    """Adversarial CA: Board approval at 08:00 UTC, exchange filing uploaded at 13:00 UTC."""
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    ca = CorporateAction(
        action_id="CA_ADV_DIV",
        symbol="ITC",
        exchange="NSE",
        action_type=CorporateActionType.DIVIDEND,
        announcement_date=date(2024, 10, 15),
        ex_date=date(2024, 10, 25),
        dividend_amount=7.5,
        event_time=datetime(2024, 10, 15, 8, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 13, 0, 0, tzinfo=UTC),
        source="bse_announcements",
        data_mode=DataMode.HISTORICAL,
    )
    store.write_corporate_actions([ca])
    engine.refresh_views()

    # Decision during mid-day trading (11:00 UTC) -> EXCLUDED
    res_midday = engine.query_corporate_actions("ITC", as_of_availability=datetime(2024, 10, 15, 11, 0, 0, tzinfo=UTC))
    assert len(res_midday) == 0

    # Decision post-filing (14:00 UTC) -> INCLUDED
    res_post = engine.query_corporate_actions("ITC", as_of_availability=datetime(2024, 10, 15, 14, 0, 0, tzinfo=UTC))
    assert len(res_post) == 1


def test_pit_adversarial_news(pit_env):
    """Adversarial News: Article published at 08:30 UTC, crawler ingested at 09:30 UTC."""
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    article = NewsArticle(
        article_id="NEWS_ADV_1",
        source="reuters",
        headline="RBI keeps repo rate unchanged",
        published_time=datetime(2024, 10, 15, 8, 30, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 9, 30, 0, tzinfo=UTC),
        symbols=["BANKNIFTY"],
        data_mode=DataMode.HISTORICAL,
    )
    store.write_news([article])
    engine.refresh_views()

    # Decision at market open (09:15 UTC) -> EXCLUDED
    res_open = engine.query_news("BANKNIFTY", as_of_availability=datetime(2024, 10, 15, 9, 15, 0, tzinfo=UTC))
    assert len(res_open) == 0

    # Decision after ingestion (09:35 UTC) -> INCLUDED
    res_ingested = engine.query_news("BANKNIFTY", as_of_availability=datetime(2024, 10, 15, 9, 35, 0, tzinfo=UTC))
    assert len(res_ingested) == 1


def test_pit_adversarial_economic_events(pit_env):
    """Adversarial Macro: Release event at 04:30 UTC, wire embargo buffer delivered at 04:35 UTC."""
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    event = EconomicEvent(
        event_id="ECO_ADV_1",
        country="IN",
        category="interest_rate",
        title="RBI Repo Rate",
        source="RBI",
        event_time=datetime(2024, 10, 9, 4, 30, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 9, 4, 35, 0, tzinfo=UTC),
        actual="6.50%",
        forecast="6.50%",
        previous="6.50%",
        impact=EconomicEventImpact.HIGH,
        data_mode=DataMode.HISTORICAL,
    )
    store.write_economic_events([event])
    engine.refresh_views()

    # Decision at 04:32 UTC -> EXCLUDED
    res_early = engine.query_economic_events("IN", as_of_availability=datetime(2024, 10, 9, 4, 32, 0, tzinfo=UTC))
    assert len(res_early) == 0

    # Decision at 04:36 UTC -> INCLUDED
    res_after = engine.query_economic_events("IN", as_of_availability=datetime(2024, 10, 9, 4, 36, 0, tzinfo=UTC))
    assert len(res_after) == 1
    assert res_after.to_pylist()[0]["actual"] == "6.50%"


def test_pit_unfiltered_mode_includes_all_records(pit_env):
    """API Contract: as_of_availability=None includes all records without filtering.

    This ensures full dataset retrieval for model training or unconstrained analysis.
    """
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    delayed_bar = OHLCVBar(
        symbol="SBIN",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.D1,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 20, 0, 0, 0, tzinfo=UTC),  # 5 days later
        open=800.0,
        high=810.0,
        low=795.0,
        close=805.0,
        volume=1000000,
        source="slow_vendor",
        data_mode=DataMode.HISTORICAL,
    )
    store.write_ohlcv([delayed_bar])
    engine.refresh_views()

    # Query with as_of_availability=None -> includes delayed bar unconditionally
    res = engine.query_ohlcv("SBIN", as_of_availability=None)
    assert len(res) == 1
    assert res.to_pylist()[0]["close"] == 805.0
