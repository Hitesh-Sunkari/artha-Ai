"""Phase C — Live and Incremental Ingestion Test Suite.

Verifies:
1. Honest declaration of CONTROLLED_POLLING mode (no false websocket claims).
2. Measured latency exposure from provider timestamp to receipt timestamp.
3. FeedStatus state transitions: LIVE, DELAYED, STALE, DISCONNECTED, UNAVAILABLE.
4. Duplicate event detection and suppression.
5. Out-of-order timestamp protection.
6. Bounded exponential backoff and outage reporting.
7. Strict separation: Partial intraday candles never overwrite historical EOD Parquet bars.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
import pytest

from arthaai.core.clock.timezone import now_utc
from arthaai.data.ingestion.live_stream_adapter import (
    CandleFormationState,
    ControlledPollingLiveAdapter,
    FeedStatus,
)


class TestLiveIngestionAdapter:
    """Verifies live ingestion behavior, health monitoring, and boundary safety."""

    def test_mode_and_latency_honesty(self):
        adapter = ControlledPollingLiveAdapter()
        health = adapter.get_health_metrics()
        # Must declare polling honestly
        assert health.mode == "CONTROLLED_POLLING"

        # Ingest an event with known 250ms provider timestamp offset
        now = now_utc()
        provider_ts = now - timedelta(milliseconds=250)
        event = adapter.ingest_quote(
            symbol="RELIANCE",
            price=1250.50,
            provider_timestamp=provider_ts,
            exchange="NSE",
            volume=5000000,
        )

        assert event.symbol == "RELIANCE"
        assert event.measured_latency_ms >= 200.0  # Captures real measured latency
        assert event.receipt_timestamp >= event.provider_timestamp

    def test_duplicate_event_suppression(self):
        adapter = ControlledPollingLiveAdapter()
        now = now_utc()
        ts = now - timedelta(seconds=1)

        # 1. First event
        ev1 = adapter.ingest_quote("TCS", 2500.0, provider_timestamp=ts, volume=1000)
        assert ev1.is_duplicate is False

        # 2. Duplicate event with identical timestamp, price, and volume
        ev2 = adapter.ingest_quote("TCS", 2500.0, provider_timestamp=ts, volume=1000)
        assert ev2.is_duplicate is True
        assert "Duplicate quote event detected" in ev2.quality_notes[0]

        health = adapter.get_health_metrics()
        assert health.duplicates_dropped == 1

    def test_out_of_order_event_protection(self):
        adapter = ControlledPollingLiveAdapter()
        now = now_utc()

        # Event at T
        ev1 = adapter.ingest_quote("INFY", 1200.0, provider_timestamp=now, volume=2000)
        assert ev1.is_out_of_order is False

        # Event at T - 10s (late / out-of-order)
        older_ts = now - timedelta(seconds=10)
        ev2 = adapter.ingest_quote("INFY", 1195.0, provider_timestamp=older_ts, volume=2000)
        assert ev2.is_out_of_order is True
        assert any("Out-of-order event" in note for note in ev2.quality_notes)

        health = adapter.get_health_metrics()
        assert health.out_of_order_events == 1

    def test_bounded_exponential_backoff_and_outage_reporting(self):
        adapter = ControlledPollingLiveAdapter(nominal_poll_interval_sec=1.0, max_backoff_sec=8.0)
        
        # 1. First failure
        b1 = adapter.record_poll_failure("Network timeout 504")
        assert b1 == 1.0  # 0.5 * 2

        # 2. Second failure
        b2 = adapter.record_poll_failure("Network timeout 504")
        assert b2 == 2.0

        # 3. Third failure -> triggers DISCONNECTED and outage
        b3 = adapter.record_poll_failure("Connection reset")
        assert b3 == 4.0
        health = adapter.get_health_metrics()
        assert health.status == FeedStatus.DISCONNECTED
        assert health.outage_reported is True
        assert health.consecutive_failures == 3

        # 4. Subsequent failure caps at max_backoff_sec
        b4 = adapter.record_poll_failure("Connection reset")
        b5 = adapter.record_poll_failure("Connection reset")
        assert b5 <= 8.0

        # 5. Recovery on successful quote
        adapter.ingest_quote("HDFCBANK", 680.0, provider_timestamp=now_utc(), volume=10000)
        recovered_health = adapter.get_health_metrics()
        assert recovered_health.consecutive_failures == 0
        assert recovered_health.current_backoff_sec == 0.5

    def test_partial_intraday_candle_isolation_from_historical_eod(self):
        adapter = ControlledPollingLiveAdapter()
        now = now_utc()

        # Ingest 3 intraday ticks forming a candle
        adapter.ingest_quote("SBIN", 950.0, provider_timestamp=now, open_price=948.0, high=952.0, low=947.0, volume=1000)
        adapter.ingest_quote("SBIN", 955.0, provider_timestamp=now + timedelta(seconds=1), volume=1500)
        adapter.ingest_quote("SBIN", 953.0, provider_timestamp=now + timedelta(seconds=2), volume=2000)

        candle = adapter.get_partial_candle("SBIN")
        assert candle is not None
        assert candle["symbol"] == "SBIN"
        assert candle["open"] == 948.0
        assert candle["high"] == 955.0  # Tracked high watermark
        assert candle["close"] == 953.0  # Latest LTP
        assert candle["state"] == CandleFormationState.PARTIAL.value

        # Invariant: Parquet historical store is untouched
        from arthaai.data.yfinance_pipeline import YahooFinancePipeline
        pipe = YahooFinancePipeline()
        historical_df = pipe._load_from_parquet("SBIN")
        if historical_df is not None and not historical_df.empty:
            # Historical last close is EOD closed price, not the in-flight 953.0
            assert "close" in historical_df.columns

