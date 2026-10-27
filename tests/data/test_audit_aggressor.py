"""Forensic audit tests for Trade aggressor side handling and inference enforcement."""

from datetime import UTC, datetime

import pytest

from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide


def test_default_trade_side_is_unknown_and_not_inferred():
    """Verify that when source does not provide aggressor side, it defaults to UNKNOWN and NOT inferred."""
    t = Trade(
        symbol="SBIN",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        price=800.0,
        quantity=100,
        source="feed_without_aggressor",
        data_mode=DataMode.HISTORICAL,
    )

    assert t.side == TradeSide.UNKNOWN
    assert t.aggressor_side_inferred is False
    assert t.aggressor_inference_method is None


def test_exchange_provided_side_not_marked_as_inferred():
    """Verify that exchange-provided side (e.g. from TrueData/Kite with bid/ask match) is marked as ground truth."""
    t = Trade(
        symbol="SBIN",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        price=800.5,
        quantity=100,
        side=TradeSide.BUYER,
        source="l2_exchange_tick_feed",
        data_mode=DataMode.LIVE,
        aggressor_side_inferred=False,
    )

    assert t.side == TradeSide.BUYER
    assert t.aggressor_side_inferred is False


def test_inferred_side_requires_explicit_method_name():
    """Verify that marking aggressor_side_inferred=True without an inference method raises ValueError."""
    with pytest.raises(ValueError, match="aggressor_inference_method must be specified"):
        Trade(
            symbol="SBIN",
            exchange="NSE",
            asset_class="EQUITY",
            event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            price=800.5,
            quantity=100,
            side=TradeSide.BUYER,
            source="tick_rule_processor",
            data_mode=DataMode.HISTORICAL,
            aggressor_side_inferred=True,
            aggressor_inference_method=None,  # Forbidden: anonymous inference!
        )


def test_inferred_side_cannot_be_unknown():
    """Verify that an inferred trade cannot claim side=UNKNOWN."""
    with pytest.raises(ValueError, match="side cannot be UNKNOWN"):
        Trade(
            symbol="SBIN",
            exchange="NSE",
            asset_class="EQUITY",
            event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            price=800.5,
            quantity=100,
            side=TradeSide.UNKNOWN,
            source="tick_rule_processor",
            data_mode=DataMode.HISTORICAL,
            aggressor_side_inferred=True,
            aggressor_inference_method="tick_rule_v1",
        )


def test_valid_inferred_side_succeeds():
    """Verify that properly attributed inferred side passes validation."""
    t = Trade(
        symbol="SBIN",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        price=800.5,
        quantity=100,
        side=TradeSide.BUYER,
        source="tick_rule_processor",
        data_mode=DataMode.HISTORICAL,
        aggressor_side_inferred=True,
        aggressor_inference_method="tick_rule_v1",
    )

    assert t.side == TradeSide.BUYER
    assert t.aggressor_side_inferred is True
    assert t.aggressor_inference_method == "tick_rule_v1"
