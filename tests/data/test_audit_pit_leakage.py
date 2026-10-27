"""Forensic audit tests for Point-in-Time (PIT) leakage prevention and availability filtering."""

from datetime import UTC, date, datetime
from pathlib import Path

import pytest

from arthaai.data.research.duckdb_engine import DuckDBEngine
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide
from arthaai.data.storage.parquet_store import ParquetStore


@pytest.fixture
def pit_env(tmp_path: Path):
    parquet_root = tmp_path / "parquet"
    store = ParquetStore(data_root=parquet_root)
    engine = DuckDBEngine(data_root=parquet_root)
    return {"store": store, "engine": engine, "root": parquet_root}


def test_ohlcv_pit_availability_leakage_prevented(pit_env):
    """Verify that bars whose availability_time is AFTER decision time are strictly excluded,

    even if their event_time is before or equal to decision time.
    """
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    # Bar 1: closed at 15:30:00, available at 15:30:05
    bar1 = OHLCVBar(
        symbol="RELIANCE",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.M1,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 5, tzinfo=UTC),
        open=2500.0,
        high=2505.0,
        low=2498.0,
        close=2502.0,
        volume=1000,
        source="feed",
        data_mode=DataMode.HISTORICAL,
    )

    # Bar 2: delayed publication — closed at 10:01:00, but only available at 10:15:00
    bar2 = OHLCVBar(
        symbol="RELIANCE",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.M1,
        event_time=datetime(2024, 10, 15, 10, 1, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 15, 0, tzinfo=UTC),
        open=2502.0,
        high=2510.0,
        low=2501.0,
        close=2508.0,
        volume=1500,
        source="feed",
        data_mode=DataMode.HISTORICAL,
    )

    store.write_ohlcv([bar1, bar2])
    engine.refresh_views()

    # Query 1: As of 10:05:00 UTC (before Bar 2 became available)
    table_at_1005 = engine.query_ohlcv(
        "RELIANCE",
        as_of_availability=datetime(2024, 10, 15, 10, 5, 0, tzinfo=UTC),
    )
    # Only Bar 1 was available at 10:05:00! Bar 2 MUST NOT LEAK!
    assert len(table_at_1005) == 1
    assert table_at_1005.to_pylist()[0]["close"] == 2502.0

    # Query 2: As of 10:20:00 UTC (after Bar 2 became available)
    table_at_1020 = engine.query_ohlcv(
        "RELIANCE",
        as_of_availability=datetime(2024, 10, 15, 10, 20, 0, tzinfo=UTC),
    )
    # Both bars are now available
    assert len(table_at_1020) == 2


def test_corporate_action_announcement_leakage_prevented(pit_env):
    """Verify that corporate actions cannot leak into backtests before their announcement/availability date,

    even if ex_date is in the future.
    """
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    # Dividend announced on 2024-10-10, with ex_date on 2024-10-25
    ca = CorporateAction(
        action_id="CA_INFY_2024_DIV",
        symbol="INFY",
        exchange="NSE",
        action_type=CorporateActionType.DIVIDEND,
        ex_date=date(2024, 10, 25),
        record_date=date(2024, 10, 26),
        dividend_amount=20.0,
        announcement_date=date(2024, 10, 10),
        event_time=datetime(2024, 10, 10, 12, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 10, 12, 0, 0, tzinfo=UTC),
        source="bse_announcements",
        data_mode=DataMode.HISTORICAL,
    )

    store.write_corporate_actions([ca])
    engine.refresh_views()

    # Query before announcement: as of 2024-10-05
    ca_before = engine.query_corporate_actions(
        "INFY",
        as_of_availability=datetime(2024, 10, 5, 0, 0, 0, tzinfo=UTC),
    )
    # Must be 0! A model running on Oct 5 cannot know about Oct 10 announcement!
    assert len(ca_before) == 0

    # Query after announcement: as of 2024-10-12
    ca_after = engine.query_corporate_actions(
        "INFY",
        as_of_availability=datetime(2024, 10, 12, 0, 0, 0, tzinfo=UTC),
    )
    assert len(ca_after) == 1
    assert ca_after.to_pylist()[0]["dividend_amount"] == 20.0


def test_trades_query_pit_availability(pit_env):
    """Verify query_trades filters by as_of_availability correctly."""
    store: ParquetStore = pit_env["store"]
    engine: DuckDBEngine = pit_env["engine"]

    t1 = Trade(
        trade_id="TR_1",
        symbol="TCS",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 9, 15, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 9, 15, 0, 500000, tzinfo=UTC),
        price=3500.0,
        quantity=50,
        side=TradeSide.BUYER,
        source="tick_feed",
        data_mode=DataMode.HISTORICAL,
    )

    t2 = Trade(
        trade_id="TR_2",
        symbol="TCS",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 9, 15, 1, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 9, 15, 5, tzinfo=UTC),  # 4-sec dissemination delay
        price=3501.0,
        quantity=25,
        side=TradeSide.SELLER,
        source="tick_feed",
        data_mode=DataMode.HISTORICAL,
    )

    store.write_trades([t1, t2])
    engine.refresh_views()

    # Query as of 09:15:02 UTC
    res = engine.query_trades(
        "TCS",
        as_of_availability=datetime(2024, 10, 15, 9, 15, 2, tzinfo=UTC),
    )
    assert len(res) == 1
    assert res.to_pylist()[0]["trade_id"] == "TR_1"
