"""Analytical query benchmarks for DuckDB over partitioned Parquet data.

Records:
  - Execution time (ms)
  - Rows returned / scanned
  - Peak memory allocated (KB)
"""

import time
import tracemalloc
from datetime import UTC, date, datetime, timedelta

import pytest

from arthaai.data.research.duckdb_engine import DuckDBEngine
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import OptionContract, OptionType
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide
from arthaai.data.storage.parquet_store import ParquetStore


@pytest.fixture(scope="module")
def benchmark_data_env(tmp_path_factory):
    data_dir = tmp_path_factory.mktemp("benchmark_data")
    store = ParquetStore(data_root=data_dir)

    # 1. Generate 1 year of daily bars for 5 instruments
    symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"]
    start_date = date(2024, 1, 1)
    bars: list[OHLCVBar] = []

    for sym in symbols:
        price = 1000.0
        for day_offset in range(250):  # ~250 trading days
            d = start_date + timedelta(days=day_offset)
            bar_dt = datetime(d.year, d.month, d.day, 15, 30, tzinfo=UTC)
            bars.append(
                OHLCVBar(
                    symbol=sym,
                    exchange="NSE",
                    asset_class="EQUITY",
                    frequency=BarFrequency.D1,
                    event_time=bar_dt,
                    availability_time=bar_dt + timedelta(seconds=1),
                    open=price,
                    high=price + 10.0,
                    low=price - 5.0,
                    close=price + 2.0,
                    volume=100_000,
                    source="benchmark_gen",
                    data_mode=DataMode.FIXTURE,
                )
            )
            price += 1.5

    store.write_ohlcv(bars)

    # 2. Generate Option chain snapshot (100 strikes x 2 types = 200 contracts)
    options: list[OptionContract] = []
    opt_time = datetime(2024, 10, 15, 10, 0, tzinfo=UTC)
    expiry = date(2024, 10, 31)
    for strike in range(24000, 25000, 10):
        for otype in (OptionType.CALL, OptionType.PUT):
            options.append(
                OptionContract(
                    underlying_symbol="NIFTY",
                    underlying_exchange="NSE",
                    contract_symbol=f"NIFTY24OCT{strike}{otype.value}",
                    expiry=expiry,
                    strike=float(strike),
                    option_type=otype,
                    event_time=opt_time,
                    availability_time=opt_time + timedelta(seconds=1),
                    bid=100.0,
                    ask=101.0,
                    last=100.5,
                    volume=500,
                    open_interest=25000,
                    lot_size=25,
                    tick_size=0.05,
                    source="benchmark_gen",
                    data_mode=DataMode.FIXTURE,
                )
            )
    store.write_options(options)

    # 3. Generate Trades (2,000 tick trades across 1 morning)
    trades: list[Trade] = []
    t_base = datetime(2024, 10, 15, 9, 15, tzinfo=UTC)
    for i in range(2000):
        trades.append(
            Trade(
                trade_id=f"TR_{i:05d}",
                symbol="RELIANCE",
                exchange="NSE",
                asset_class="EQUITY",
                event_time=t_base + timedelta(milliseconds=i * 200),
                availability_time=t_base + timedelta(milliseconds=i * 200 + 50),
                price=2500.0 + (i % 20) * 0.25,
                quantity=10 + (i % 50),
                side=TradeSide.BUYER if i % 2 == 0 else TradeSide.SELLER,
                source="benchmark_gen",
                data_mode=DataMode.FIXTURE,
            )
        )
    store.write_trades(trades)

    engine = DuckDBEngine(data_root=data_dir)
    return {"engine": engine, "total_bars": len(bars), "total_options": len(options), "total_trades": len(trades)}


def _measure(func):
    tracemalloc.start()
    t0 = time.perf_counter()
    result = func()
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return result, elapsed_ms, peak_bytes / 1024.0  # peak in KB


def test_benchmark_one_instrument_one_day(benchmark_data_env):
    """Benchmark: Single instrument, single day query."""
    engine: DuckDBEngine = benchmark_data_env["engine"]
    target_date = datetime(2024, 3, 15, 0, 0, tzinfo=UTC)
    target_end = datetime(2024, 3, 15, 23, 59, tzinfo=UTC)

    res, elapsed_ms, peak_kb = _measure(
        lambda: engine.query_ohlcv("RELIANCE", start=target_date, end=target_end)
    )

    print(f"\n[BENCHMARK] 1 Instrument, 1 Day: {elapsed_ms:.2f} ms | Rows: {len(res)} | Memory: {peak_kb:.1f} KB")
    assert len(res) == 1
    assert elapsed_ms < 500.0  # sub-second analytical response


def test_benchmark_one_instrument_one_month(benchmark_data_env):
    """Benchmark: Single instrument, one month query."""
    engine: DuckDBEngine = benchmark_data_env["engine"]
    start = datetime(2024, 3, 1, 0, 0, tzinfo=UTC)
    end = datetime(2024, 3, 31, 23, 59, tzinfo=UTC)

    res, elapsed_ms, peak_kb = _measure(
        lambda: engine.query_ohlcv("RELIANCE", start=start, end=end)
    )

    print(f"\n[BENCHMARK] 1 Instrument, 1 Month: {elapsed_ms:.2f} ms | Rows: {len(res)} | Memory: {peak_kb:.1f} KB")
    assert len(res) > 0
    assert elapsed_ms < 500.0


def test_benchmark_one_instrument_one_year(benchmark_data_env):
    """Benchmark: Single instrument, full year query."""
    engine: DuckDBEngine = benchmark_data_env["engine"]
    start = datetime(2024, 1, 1, 0, 0, tzinfo=UTC)
    end = datetime(2024, 12, 31, 23, 59, tzinfo=UTC)

    res, elapsed_ms, peak_kb = _measure(
        lambda: engine.query_ohlcv("RELIANCE", start=start, end=end)
    )

    print(f"\n[BENCHMARK] 1 Instrument, 1 Year: {elapsed_ms:.2f} ms | Rows: {len(res)} | Memory: {peak_kb:.1f} KB")
    assert len(res) == 250
    assert elapsed_ms < 500.0


def test_benchmark_options_by_expiry(benchmark_data_env):
    """Benchmark: Option chain query across 200 strikes by expiry."""
    engine: DuckDBEngine = benchmark_data_env["engine"]
    expiry = date(2024, 10, 31)

    res, elapsed_ms, peak_kb = _measure(
        lambda: engine.query_option_chain("NIFTY", expiry=expiry)
    )

    print(f"\n[BENCHMARK] Option Chain (200 contracts): {elapsed_ms:.2f} ms | Rows: {len(res)} | Memory: {peak_kb:.1f} KB")
    assert len(res) == 200
    assert elapsed_ms < 500.0


def test_benchmark_trades_by_time_range(benchmark_data_env):
    """Benchmark: 2,000 tick trade prints query across time range."""
    engine: DuckDBEngine = benchmark_data_env["engine"]
    start = datetime(2024, 10, 15, 9, 15, tzinfo=UTC)
    end = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)

    res, elapsed_ms, peak_kb = _measure(
        lambda: engine.query_trades("RELIANCE", start=start, end=end)
    )

    print(f"\n[BENCHMARK] Trades (2,000 ticks): {elapsed_ms:.2f} ms | Rows: {len(res)} | Memory: {peak_kb:.1f} KB")
    assert len(res) > 0
    assert elapsed_ms < 500.0
