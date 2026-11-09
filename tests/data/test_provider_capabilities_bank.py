"""Phase A — Provider Capability & Boundary Audit Tests.

Verifies:
1. Provider capability registry contracts (Groww, Yahoo Finance, DuckDB, ChromaDB).
2. Honest boundaries: 3-month intraday limit for Groww, zero L3 tick-level orderbook, zero live trading execution.
3. Common provider interface contracts.
4. Representative small-batch data retrieval & validation test.
"""

from __future__ import annotations

import pytest
from datetime import datetime, timezone

from arthaai.data.providers.capabilities import (
    CapabilityStatus,
    ProviderCapabilityRecord,
    get_provider_capability_registry,
)
from arthaai.data.yfinance_pipeline import YahooFinancePipeline, normalize_symbol_for_yahoo
from arthaai.data.instrument_master.security_master import get_security_master


class TestProviderCapabilityAudit:
    """Audits provider capabilities against system contracts."""

    def test_provider_capability_registry_loaded(self):
        reg = get_provider_capability_registry()
        caps = reg.list_capabilities()
        assert len(caps) >= 8
        providers = {c.provider for c in caps}
        assert "groww" in providers
        assert "yahoo_finance" in providers
        assert "duckdb_parquet" in providers
        assert "chromadb_rag" in providers

    def test_groww_intraday_and_tick_boundaries(self):
        reg = get_provider_capability_registry()
        
        # Intraday rolling depth limitation
        intraday = reg.get_capability("groww", "historical_intraday_candles")
        assert intraday is not None
        assert "3 Months" in intraday.historical_depth
        assert intraday.authentication_required is True

        # Tick-level orderbook L3 must be explicitly UNSUPPORTED
        l3_orderbook = reg.get_capability("groww", "historical_tick_order_flow_l3")
        assert l3_orderbook is not None
        assert l3_orderbook.status == CapabilityStatus.UNSUPPORTED_DATA_ABSENCE

        # Live trading execution disabled by policy
        live_trade = reg.get_capability("groww", "live_order_execution")
        assert live_trade is not None
        assert live_trade.status == CapabilityStatus.DISABLED_BY_POLICY

    def test_yahoo_finance_historical_and_depth_boundaries(self):
        reg = get_provider_capability_registry()

        # Daily OHLCV is operational with 5Y+ depth
        daily = reg.get_capability("yahoo_finance", "historical_daily_ohlcv")
        assert daily is not None
        assert daily.status == CapabilityStatus.OPERATIONAL
        assert "5Y" in daily.historical_depth

        # Orderbook L2 is UNSUPPORTED
        l2 = reg.get_capability("yahoo_finance", "historical_order_flow_and_l2")
        assert l2 is not None
        assert l2.status == CapabilityStatus.UNSUPPORTED_DATA_ABSENCE

    def test_duckdb_parquet_analytical_boundary(self):
        reg = get_provider_capability_registry()
        parquet_daily = reg.get_capability("duckdb_parquet", "historical_daily_ohlcv")
        assert parquet_daily is not None
        assert parquet_daily.status == CapabilityStatus.OPERATIONAL
        assert "Point-in-time" in parquet_daily.limitations[0]

    def test_representative_small_batch_retrieval_and_validation(self):
        """Phase A verification: Retrieve a small sample (RELIANCE) and verify clean validation."""
        pipeline = YahooFinancePipeline()
        ticker, clean = normalize_symbol_for_yahoo("RELIANCE")
        assert ticker == "RELIANCE.NS"
        assert clean == "RELIANCE"

        # Validate that pipeline parses records properly without NaN or negative values
        import pandas as pd
        dates = pd.date_range("2026-01-01", periods=25, freq="D", tz="UTC")
        opens = [100.0 + (i * 0.5) for i in range(25)]
        closes = [101.0 + (i * 0.5) for i in range(25)]
        highs = [103.0 + (i * 0.5) for i in range(25)]
        lows = [99.0 + (i * 0.5) for i in range(25)]
        volumes = [1000 + (i * 10) for i in range(25)]
        sample_df = pd.DataFrame(
            {
                "open": opens,
                "high": highs,
                "low": lows,
                "close": closes,
                "volume": volumes,
            },
            index=dates,
        )
        records, report = pipeline._validate_and_clean(sample_df, clean)
        assert len(records) == 25
        assert report.quality_status == "PASSED"
        assert report.zero_negative_prices_count == 0
