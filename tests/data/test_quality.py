"""Tests for data quality rules and QualityRunner."""

from datetime import UTC, datetime, timedelta

import pytest

from arthaai.core.errors import DataQualityError
from arthaai.data.quality.corporate_action_rules import PriceDiscontinuityRule
from arthaai.data.quality.ohlcv_rules import (
    DuplicateRecordRule,
    MissingBarRule,
    NegativePriceRule,
    OHLCConsistencyRule,
    SessionGapRule,
    StaleQuoteRule,
    TimestampOrderRule,
    ZeroVolumeRule,
)
from arthaai.data.quality.orderbook_rules import CrossedMarketRule, SequenceGapRule
from arthaai.data.quality.rules import QualitySeverity
from arthaai.data.quality.runner import QualityRunner


def test_ohlc_consistency_rule():
    rule = OHLCConsistencyRule()

    # Valid bar
    valid = [{"symbol": "INFY", "open": 100.0, "high": 105.0, "low": 98.0, "close": 102.0}]
    res = rule.evaluate(valid)
    assert len(res) == 0

    # Inconsistent bar: High < Open, Low > Close
    invalid = [{"symbol": "INFY", "open": 100.0, "high": 95.0, "low": 103.0, "close": 99.0}]
    res = rule.evaluate(invalid)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.ERROR
    assert not res[0].passed


def test_negative_price_rule():
    rule = NegativePriceRule()
    invalid = [{"symbol": "INFY", "open": -5.0, "high": 10.0, "low": -10.0, "close": 0.0}]
    res = rule.evaluate(invalid)
    assert len(res) == 3  # open, low, close all <= 0
    assert all(r.severity == QualitySeverity.ERROR for r in res)


def test_zero_volume_rule():
    rule = ZeroVolumeRule()
    recs = [{"symbol": "INFY", "volume": 0}, {"symbol": "INFY", "volume": 500}]
    res = rule.evaluate(recs)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.WARNING


def test_timestamp_order_rule():
    rule = TimestampOrderRule()
    t1 = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    t2 = datetime(2024, 10, 15, 9, 31, tzinfo=UTC)
    t3 = datetime(2024, 10, 15, 9, 29, tzinfo=UTC)  # out of order

    recs = [
        {"symbol": "INFY", "event_time": t1},
        {"symbol": "INFY", "event_time": t2},
        {"symbol": "INFY", "event_time": t3},
    ]
    res = rule.evaluate(recs)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.ERROR


def test_duplicate_record_rule():
    rule = DuplicateRecordRule()
    t1 = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    recs = [
        {"symbol": "INFY", "event_time": t1},
        {"symbol": "INFY", "event_time": t1},
    ]
    res = rule.evaluate(recs)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.ERROR


def test_stale_quote_rule():
    rule = StaleQuoteRule(max_stale_bars=3)
    recs = [
        {"symbol": "INFY", "open": 100.0, "high": 100.0, "low": 100.0, "close": 100.0, "volume": 0},
        {"symbol": "INFY", "open": 100.0, "high": 100.0, "low": 100.0, "close": 100.0, "volume": 0},
        {"symbol": "INFY", "open": 100.0, "high": 100.0, "low": 100.0, "close": 100.0, "volume": 0},
        {"symbol": "INFY", "open": 100.0, "high": 100.0, "low": 100.0, "close": 100.0, "volume": 0},
    ]
    res = rule.evaluate(recs)
    assert len(res) >= 1
    assert res[0].severity == QualitySeverity.WARNING


def test_missing_bar_rule():
    rule = MissingBarRule(expected_interval_seconds=60)
    t1 = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    t2 = t1 + timedelta(seconds=300)  # 5 min gap
    recs = [{"symbol": "INFY", "event_time": t1}, {"symbol": "INFY", "event_time": t2}]
    res = rule.evaluate(recs)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.WARNING


def test_session_gap_rule():
    rule = SessionGapRule()
    # 03:00 UTC is 08:30 IST (before 09:15)
    t_early = datetime(2024, 10, 15, 3, 0, tzinfo=UTC)
    recs = [{"symbol": "INFY", "event_time": t_early}]
    res = rule.evaluate(recs)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.WARNING


def test_crossed_market_rule():
    rule = CrossedMarketRule()
    # Crossed quote: bid >= ask
    quotes = [{"symbol": "INFY", "bid_price": 102.0, "ask_price": 101.0}]
    res = rule.evaluate(quotes)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.ERROR


def test_sequence_gap_rule():
    rule = SequenceGapRule()
    recs = [
        {"symbol": "INFY", "sequence_number": 1},
        {"symbol": "INFY", "sequence_number": 2},
        {"symbol": "INFY", "sequence_number": 5},  # Gap!
    ]
    res = rule.evaluate(recs)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.ERROR


def test_price_discontinuity_rule():
    rule = PriceDiscontinuityRule(max_pct_change=0.20)
    recs = [
        {"symbol": "INFY", "close": 100.0},
        {"symbol": "INFY", "close": 150.0},  # 50% jump!
    ]
    res = rule.evaluate(recs)
    assert len(res) == 1
    assert res[0].severity == QualitySeverity.WARNING


def test_quality_runner():
    runner = QualityRunner()
    valid_bars = [
        {
            "symbol": "TCS",
            "open": 3500.0,
            "high": 3520.0,
            "low": 3490.0,
            "close": 3510.0,
            "volume": 1000,
            "event_time": datetime(2024, 10, 15, 4, 0, tzinfo=UTC),  # 09:30 IST
        }
    ]
    report = runner.run(valid_bars, dataset_name="tcs_test")
    assert report.is_valid
    assert report.total_records == 1
    assert report.error_count == 0

    # Strict mode test
    strict_runner = QualityRunner(strict=True)
    bad_bars = [
        {"symbol": "TCS", "open": -10.0, "high": 5.0, "low": -15.0, "close": 0.0, "volume": 10}
    ]
    with pytest.raises(DataQualityError):
        strict_runner.run(bad_bars, dataset_name="bad_test")
