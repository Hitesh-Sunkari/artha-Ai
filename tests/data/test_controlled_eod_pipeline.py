"""Tests for Controlled EOD Ingestion Pipeline.

Implements Phase B Workstream 3 & 4:
- IST Timezone and NSEHolidayCalendar awareness (weekend & holiday skipping).
- State machine: PENDING -> LIVE_DELAYED -> FINAL (and FAILED).
- Strict OHLC mathematical invariant enforcement.
- Quarantine isolation of corrupt payloads with SHA-256 hashes.
- Idempotent Parquet update (in-place replacement without duplicate rows).
- Rolling indicator recalculation (20d vol, 14d RSI, 50d SMA) with computation cutoff.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
import pandas as pd
import pytest

from arthaai.core.config import DataConfig
from arthaai.data.ingestion.eod_pipeline import (
    ControlledEODPipeline,
    EODState,
    get_eod_pipeline,
)


@pytest.fixture
def temp_eod_pipeline(tmp_path: Path) -> ControlledEODPipeline:
    cfg = DataConfig(root=str(tmp_path))
    cfg.ensure_dirs()
    return ControlledEODPipeline(cfg)


def test_eod_holiday_and_weekend_skipping(temp_eod_pipeline: ControlledEODPipeline):
    """Verifies that non-trading sessions (weekends and official NSE holidays) are cleanly skipped."""
    # 1. Official NSE Holiday (Diwali Laxmi Puja 2024-11-01)
    res_holiday = temp_eod_pipeline.run_eod_cycle(trade_date=date(2024, 11, 1))
    assert res_holiday.status == "SKIPPED"
    assert len(res_holiday.transitions) == 1
    assert res_holiday.transitions[0].to_state == EODState.SKIPPED_HOLIDAY
    assert res_holiday.symbols_failed == 0

    # 2. Weekend (Sunday 2024-11-03)
    res_weekend = temp_eod_pipeline.run_eod_cycle(trade_date=date(2024, 11, 3))
    assert res_weekend.status == "SKIPPED"
    assert res_weekend.transitions[0].to_state == EODState.SKIPPED_WEEKEND
    assert res_weekend.symbols_failed == 0


def test_eod_state_machine_provisional_to_final(temp_eod_pipeline: ControlledEODPipeline):
    """Verifies that provisional unconfirmed close stays LIVE_DELAYED while confirmed Bhavcopy transitions to FINAL."""
    valid_bar = {
        "open": 2800.0,
        "high": 2850.0,
        "low": 2790.0,
        "close": 2840.0,
        "volume": 2500000.0,
        "provider": "nse_bhavcopy",
    }
    trade_date = date(2024, 10, 28)

    # 1. Provisional poll before Bhavcopy confirmation -> LIVE_DELAYED
    state1, msg1 = temp_eod_pipeline.ingest_single_security_eod(
        symbol="RELIANCE",
        bar_data=valid_bar,
        trade_date=trade_date,
        is_bhavcopy_confirmed=False,
    )
    assert state1 == EODState.LIVE_DELAYED

    # 2. Confirmed Bhavcopy -> FINAL
    state2, msg2 = temp_eod_pipeline.ingest_single_security_eod(
        symbol="RELIANCE",
        bar_data=valid_bar,
        trade_date=trade_date,
        is_bhavcopy_confirmed=True,
    )
    assert state2 == EODState.FINAL


def test_eod_ohlc_invariants_and_quarantine(temp_eod_pipeline: ControlledEODPipeline):
    """Verifies that invalid OHLC (High < max(Open, Close) or Low <= 0) gets quarantined."""
    corrupt_bar = {
        "open": 1000.0,
        "high": 950.0,  # Corrupt: High < Open!
        "low": 900.0,
        "close": 980.0,
        "volume": 10000.0,
        "provider": "corrupted_test_feed",
    }
    state, msg = temp_eod_pipeline.ingest_single_security_eod(
        symbol="TCS",
        bar_data=corrupt_bar,
        trade_date=date(2024, 10, 28),
    )
    assert state == EODState.FAILED
    assert "Quarantined" in msg

    # Verify quarantine file was written
    q_files = list(temp_eod_pipeline.quarantine_mgr.quarantine_dir.rglob("*.jsonl"))
    assert len(q_files) >= 1


def test_eod_idempotent_parquet_update(temp_eod_pipeline: ControlledEODPipeline):
    """Verifies that repeated EOD updates on the same trade date update in-place without duplicating rows."""
    sym = "INFY"
    trade_date = date(2024, 10, 28)

    bar1 = {"open": 1800.0, "high": 1820.0, "low": 1790.0, "close": 1810.0, "volume": 1000000.0, "provider": "nse"}
    bar2 = {"open": 1800.0, "high": 1825.0, "low": 1790.0, "close": 1815.0, "volume": 1050000.0, "provider": "nse"}

    # Ingest bar 1
    temp_eod_pipeline.ingest_single_security_eod(symbol=sym, bar_data=bar1, trade_date=trade_date, is_bhavcopy_confirmed=True)
    parq_path = temp_eod_pipeline.ohlcv_dir / f"bars_{sym.lower()}.parquet"
    df1 = pd.read_parquet(parq_path)
    count1 = len(df1)
    assert df1.iloc[-1]["close"] == 1810.0

    # Ingest corrected bar 2 for same trade date -> Must update in-place without increasing row count!
    temp_eod_pipeline.ingest_single_security_eod(symbol=sym, bar_data=bar2, trade_date=trade_date, is_bhavcopy_confirmed=True)
    df2 = pd.read_parquet(parq_path)
    assert len(df2) == count1  # Exactly identical count
    assert df2.iloc[-1]["close"] == 1815.0  # In-place updated

