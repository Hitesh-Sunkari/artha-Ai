"""Tests for the Data Readiness Registry and Indian market capability boundaries."""

import pytest

from arthaai.data.readiness.indian_market import (
    INDIAN_MARKET_CAPABILITIES,
    build_indian_market_readiness_registry,
)
from arthaai.data.readiness.registry import (
    DataCapability,
    DataReadinessRecord,
)
from arthaai.data.schemas.raw_record import DataMode


def test_readiness_taxonomy_values():
    """Verify all DataCapability enum members exist as defined."""
    assert DataCapability.IMPLEMENTED.value == "IMPLEMENTED"
    assert DataCapability.INTERFACE_ONLY.value == "INTERFACE_ONLY"
    assert DataCapability.FIXTURE_ONLY.value == "FIXTURE_ONLY"
    assert DataCapability.REQUIRES_CREDENTIALS.value == "REQUIRES_CREDENTIALS"
    assert DataCapability.REQUIRES_PAID_DATA.value == "REQUIRES_PAID_DATA"
    assert DataCapability.UNKNOWN.value == "UNKNOWN"
    assert DataCapability.UNSUPPORTED.value == "UNSUPPORTED"


def test_all_6_indian_market_capabilities_registered():
    """Verify all required Indian market capabilities are cataloged with explicit blockers."""
    reg = build_indian_market_readiness_registry()
    assert len(reg.all_records()) >= 6

    trades_rec = reg.get("order_flow.trades")
    assert trades_rec.status == DataCapability.FIXTURE_ONLY
    assert trades_rec.blocker is not None

    l2_rec = reg.get("order_flow.level2")
    assert l2_rec.status == DataCapability.UNSUPPORTED

    options_rec = reg.get("derivatives.options_chain")
    assert options_rec.status == DataCapability.FIXTURE_ONLY

    hist_deriv_rec = reg.get("derivatives.historical_contracts")
    assert hist_deriv_rec.status == DataCapability.REQUIRES_PAID_DATA

    news_rec = reg.get("sentiment.news")
    assert news_rec.status == DataCapability.FIXTURE_ONLY

    macro_rec = reg.get("macro.economic_events")
    assert macro_rec.status == DataCapability.INTERFACE_ONLY


def test_fixture_only_cannot_operate_in_live_mode():
    """Safety invariant: FIXTURE_ONLY or INTERFACE_ONLY data capabilities cannot claim LIVE mode."""
    reg = build_indian_market_readiness_registry()
    assert reg.can_run_live("order_flow.trades") is False
    assert reg.can_run_live("derivatives.options_chain") is False
    assert reg.can_run_live("macro.economic_events") is False


def test_unsupported_cannot_operate_in_any_mode():
    """Safety invariant: UNSUPPORTED capabilities cannot operate in HISTORICAL or LIVE modes."""
    l2_record = DataReadinessRecord(
        capability_id="order_flow.level2",
        domain="Microstructure",
        description="L2 order book",
        status=DataCapability.UNSUPPORTED,
        available_modes=[],
    )
    assert l2_record.can_operate_in(DataMode.HISTORICAL) is False
    assert l2_record.can_operate_in(DataMode.LIVE) is False


def test_readiness_report_deterministic():
    """Verify that generate_report produces a structured, deterministic summary."""
    reg = build_indian_market_readiness_registry()
    report = reg.generate_report()

    assert "total_capabilities" in report
    assert "status_counts" in report
    assert "capabilities" in report

    assert report["total_capabilities"] == len(INDIAN_MARKET_CAPABILITIES)
    assert report["status_counts"]["FIXTURE_ONLY"] >= 3
    assert report["status_counts"]["UNSUPPORTED"] >= 2


def test_unknown_capability_lookup_raises():
    """Verify looking up an unregistered capability raises KeyError."""
    reg = build_indian_market_readiness_registry()
    with pytest.raises(KeyError, match="not registered"):
        reg.get("nonexistent.stream")
