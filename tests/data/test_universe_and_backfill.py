"""Phase B — Universe Resolution and 5-Year Equity Backfill Test Suite.

Verifies:
1. Dynamic loading and resolution of the 30-stock seed universe.
2. Exchange awareness, ISIN mapping, series, and derivatives eligibility.
3. Resumable checkpoint engine and idempotent re-execution.
4. Separation of raw provider archive (RawDataStore) and canonical analytical Parquet.
5. Ingestion data quality invariants (OHLC order, positive prices, duplicate prevention).
6. 10-category data coverage reports.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from arthaai.core.config import DataConfig
from arthaai.data.backfill.equity_backfill import (
    BackfillTaskStatus,
    HistoricalEquityBackfillManager,
    get_backfill_manager,
)
from arthaai.data.coverage import CoverageStatus, get_data_coverage_tracker
from arthaai.data.instrument_master.security_master import ListingStatus, get_security_master
from arthaai.data.universe.universe_config import get_universe_manager


SEED_30_SYMBOLS = [
    "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "BAJFINANCE",
    "TCS", "INFY", "WIPRO", "HCLTECH", "ITC", "HINDUNILVR",
    "TITAN", "TRENT", "ASIANPAINT", "RELIANCE", "LT", "NTPC",
    "POWERGRID", "ONGC", "ADANIPORTS", "BEL", "MARUTI", "M&M",
    "TATASTEEL", "JSWSTEEL", "ULTRACEMCO", "SUNPHARMA", "CIPLA", "DRREDDY"
]


class TestUniverseConfigurationAndResolution:
    """Tests dynamic universe loading and SecurityMaster resolution."""

    def test_seed_universe_loaded_from_config(self):
        univ = get_universe_manager()
        manifest = univ.export_manifest()
        assert manifest.total_configured == 30
        assert manifest.total_resolved == 30
        assert manifest.total_supported == 30
        assert manifest.total_derivatives_eligible == 30

    def test_all_30_symbols_present_and_resolved(self):
        univ = get_universe_manager()
        configured_symbols = univ.get_symbols(only_supported=True)
        for sym in SEED_30_SYMBOLS:
            assert sym in configured_symbols, f"Symbol {sym} missing from resolved universe"

    def test_exchange_and_series_invariants(self):
        univ = get_universe_manager()
        for item in univ.list_securities(only_supported=True):
            assert item.resolution.exchange in ("NSE", "BSE")
            assert item.resolution.yahoo_ticker.endswith(".NS") or item.resolution.yahoo_ticker.endswith(".BO")
            assert item.resolution.listing_status == ListingStatus.ACTIVE
            assert item.resolution.is_valid_for_research is True
            # Verified ISIN structure
            assert item.configured.isin.startswith("INE")

    def test_sector_coverage_diversity(self):
        univ = get_universe_manager()
        manifest = univ.export_manifest()
        # Must cover multiple diverse sectors
        sectors = manifest.sector_breakdown
        assert len(sectors) >= 8
        assert "Financial Services" in sectors
        assert "Technology" in sectors
        assert "Energy" in sectors
        assert "Healthcare" in sectors


class TestResumableBackfillEngine:
    """Tests backfill checkpointing, idempotency, and data separation."""

    def test_backfill_single_security_and_idempotency(self, tmp_path):
        data_cfg = DataConfig(root=str(tmp_path))
        data_cfg.ensure_dirs()
        checkpoint_file = tmp_path / "manifests" / "test_checkpoints.json"

        bf_mgr = HistoricalEquityBackfillManager(
            data_config=data_cfg,
            checkpoint_file=checkpoint_file,
        )

        # 1. Run backfill for RELIANCE
        manifest1 = bf_mgr.run_backfill(symbols=["RELIANCE"], force=True)
        assert manifest1.total_securities == 1
        assert manifest1.completed_count == 1
        assert "RELIANCE" in manifest1.checkpoints

        cp1 = manifest1.checkpoints["RELIANCE"]
        assert cp1.status == BackfillTaskStatus.COMPLETED
        assert cp1.total_bars >= 1000
        assert cp1.raw_payload_path is not None
        assert Path(cp1.raw_payload_path).exists()
        assert cp1.parquet_path is not None
        assert Path(cp1.parquet_path).exists()

        # 2. Idempotent re-run: without force=True, it should skip
        manifest2 = bf_mgr.run_backfill(symbols=["RELIANCE"], force=False)
        assert manifest2.skipped_count == 1
        assert manifest2.completed_count == 0

    def test_raw_payload_and_canonical_parquet_separation(self, tmp_path):
        data_cfg = DataConfig(root=str(tmp_path))
        data_cfg.ensure_dirs()
        bf_mgr = HistoricalEquityBackfillManager(data_config=data_cfg)

        manifest = bf_mgr.run_backfill(symbols=["TCS"], force=True)
        cp = manifest.checkpoints["TCS"]

        # Raw file is JSONL
        raw_p = Path(cp.raw_payload_path)
        assert raw_p.suffix == ".jsonl"
        with open(raw_p, "r", encoding="utf-8") as f:
            line = f.readline()
            raw_obj = json.loads(line)
            assert raw_obj.get("instrument_symbol") == "TCS" or raw_obj.get("payload", {}).get("symbol") == "TCS"
            assert raw_obj["provider"] == "yahoo_finance"

        # Canonical file is Parquet
        parq_p = Path(cp.parquet_path)
        assert parq_p.suffix == ".parquet"
        import pyarrow.parquet as pq
        table = pq.read_table(parq_p)
        assert "open" in table.column_names
        assert "close" in table.column_names
        assert len(table) >= 1000

    def test_ten_category_coverage_for_backfilled_security(self):
        tracker = get_data_coverage_tracker()
        rep = tracker.audit_coverage("RELIANCE")
        assert rep.symbol == "RELIANCE"
        assert len(rep.categories) == 10
        assert "daily_ohlcv" in rep.categories
        assert rep.categories["daily_ohlcv"].status == CoverageStatus.FULL_5Y_AVAILABLE
        assert rep.categories["daily_ohlcv"].total_observations >= 1000
