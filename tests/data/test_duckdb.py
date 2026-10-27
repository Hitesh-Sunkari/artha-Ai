"""Tests for DuckDB analytical query engine in src/arthaai/data/research/."""

from datetime import UTC, date, datetime
from pathlib import Path

import pyarrow as pa

from arthaai.data.research.duckdb_engine import DuckDBEngine
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import OptionContract, OptionType
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.storage.parquet_store import ParquetStore


def test_duckdb_raw_query():
    engine = DuckDBEngine()
    table = engine.execute_query("SELECT 42 as answer, 'NSE' as exchange")
    assert isinstance(table, pa.Table)
    assert table.column("answer").to_pylist() == [42]
    assert table.column("exchange").to_pylist() == ["NSE"]


def test_duckdb_query_ohlcv(tmp_path: Path):
    store = ParquetStore(root_dir=tmp_path)
    now = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    bars = [
        OHLCVBar(
            symbol="RELIANCE",
            exchange="NSE",
            asset_class="EQUITY",
            frequency=BarFrequency.M1,
            event_time=now,
            availability_time=now,
            open=2900.0,
            high=2910.0,
            low=2895.0,
            close=2905.0,
            volume=5000,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        ),
        OHLCVBar(
            symbol="TCS",
            exchange="NSE",
            asset_class="EQUITY",
            frequency=BarFrequency.M1,
            event_time=now,
            availability_time=now,
            open=3500.0,
            high=3510.0,
            low=3495.0,
            close=3505.0,
            volume=3000,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        ),
    ]
    store.write_records(bars, dataset_type="ohlcv")

    engine = DuckDBEngine(data_root=tmp_path)
    res = engine.query_ohlcv(symbol="RELIANCE")
    assert len(res) == 1
    assert res.column("symbol").to_pylist() == ["RELIANCE"]
    assert res.column("close").to_pylist() == [2905.0]


def test_duckdb_query_option_chain(tmp_path: Path):
    store = ParquetStore(root_dir=tmp_path)
    now = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    options = [
        OptionContract(
            underlying_symbol="NIFTY",
            underlying_exchange="NSE",
            contract_symbol="NIFTY24OCT25000CE",
            expiry=date(2024, 10, 31),
            strike=25000.0,
            option_type=OptionType.CALL,
            event_time=now,
            availability_time=now,
            bid=100.0,
            ask=102.0,
            delta=0.5,
            lot_size=50,
            tick_size=0.05,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        ),
        OptionContract(
            underlying_symbol="NIFTY",
            underlying_exchange="NSE",
            contract_symbol="NIFTY24OCT25500CE",
            expiry=date(2024, 10, 31),
            strike=25500.0,
            option_type=OptionType.CALL,
            event_time=now,
            availability_time=now,
            bid=30.0,
            ask=31.0,
            delta=0.2,
            lot_size=50,
            tick_size=0.05,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        ),
    ]
    store.write_records(options, dataset_type="options")

    engine = DuckDBEngine(data_root=tmp_path)
    res = engine.query_option_chain(underlying_symbol="NIFTY", expiry=date(2024, 10, 31))
    assert len(res) == 2
    strikes = res.column("strike").to_pylist()
    assert strikes == [25000.0, 25500.0]


def test_duckdb_query_corporate_actions(tmp_path: Path):
    store = ParquetStore(root_dir=tmp_path)
    now = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    cas = [
        CorporateAction(
            action_id="ca_1",
            symbol="INFY",
            exchange="NSE",
            action_type=CorporateActionType.DIVIDEND,
            ex_date=date(2024, 10, 25),
            dividend_amount=21.0,
            event_time=now,
            availability_time=now,
            source="test",
            data_mode=DataMode.HISTORICAL,
        )
    ]
    store.write_records(cas, dataset_type="corporate_actions")

    engine = DuckDBEngine(data_root=tmp_path)
    res = engine.query_corporate_actions(symbol="INFY")
    assert len(res) == 1
    assert res.column("symbol").to_pylist() == ["INFY"]
    assert res.column("dividend_amount").to_pylist() == [21.0]


def test_duckdb_query_news(tmp_path: Path):
    store = ParquetStore(root_dir=tmp_path)
    now = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    articles = [
        NewsArticle(
            article_id="art_1",
            source="reuters",
            headline="Tech sector rallies",
            published_time=now,
            availability_time=now,
            symbols=["INFY", "TCS"],
            data_mode=DataMode.HISTORICAL,
        )
    ]
    store.write_records(articles, dataset_type="news")

    engine = DuckDBEngine(data_root=tmp_path)
    res = engine.query_news()
    assert len(res) == 1
    assert res.column("headline").to_pylist() == ["Tech sector rallies"]
