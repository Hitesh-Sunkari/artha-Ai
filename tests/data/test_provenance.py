"""Tests for the FieldProvenance system and data provenance enforcement."""

from datetime import UTC, date, datetime

import pytest

from arthaai.data.schemas.options import GreeksProvenance, OptionContract, OptionType
from arthaai.data.schemas.provenance import FieldProvenance, ProvenanceMetadata
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide


def test_provenance_enum_values():
    """Verify standard FieldProvenance enum members."""
    assert FieldProvenance.OBSERVED.value == "OBSERVED"
    assert FieldProvenance.DERIVED.value == "DERIVED"
    assert FieldProvenance.INFERRED.value == "INFERRED"
    assert FieldProvenance.MODEL_ASSUMPTION.value == "MODEL_ASSUMPTION"
    assert FieldProvenance.UNAVAILABLE.value == "UNAVAILABLE"


def test_provenance_metadata_inferred_requires_method():
    """Verify that an INFERRED field requires an explicit method name."""
    with pytest.raises(ValueError, match="explicit method must be specified"):
        ProvenanceMetadata(
            field_name="aggressor_side",
            provenance=FieldProvenance.INFERRED,
            method=None,
        )

    with pytest.raises(ValueError, match="explicit method must be specified"):
        ProvenanceMetadata(
            field_name="aggressor_side",
            provenance=FieldProvenance.INFERRED,
            method="   ",
        )

    # Valid metadata
    meta = ProvenanceMetadata(
        field_name="aggressor_side",
        provenance=FieldProvenance.INFERRED,
        method="tick_rule_v1",
        model_version="1.0.0",
    )
    assert meta.method == "tick_rule_v1"


def test_provenance_metadata_observed_rejects_method():
    """Verify that OBSERVED provenance cannot have an inference method set."""
    with pytest.raises(ValueError, match="method must be None"):
        ProvenanceMetadata(
            field_name="close",
            provenance=FieldProvenance.OBSERVED,
            method="some_heuristic",
        )


def test_trade_side_provenance_observed():
    """Verify that when exchange provides the trade side, it is OBSERVED with no method."""
    t = Trade(
        symbol="SBIN",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        price=800.0,
        quantity=50,
        side=TradeSide.BUYER,
        side_provenance=FieldProvenance.OBSERVED,
        source="l2_exchange_feed",
        data_mode=DataMode.LIVE,
    )
    assert t.side_provenance == FieldProvenance.OBSERVED
    assert t.side_inference_method is None
    assert t.aggressor_side_inferred is False


def test_trade_side_provenance_inferred_requires_method_and_direction():
    """Verify that an INFERRED side requires a method and BUYER/SELLER side."""
    with pytest.raises(ValueError, match="side_inference_method must be specified"):
        Trade(
            symbol="SBIN",
            exchange="NSE",
            asset_class="EQUITY",
            event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            price=800.0,
            quantity=50,
            side=TradeSide.BUYER,
            side_provenance=FieldProvenance.INFERRED,
            side_inference_method=None,
            source="tick_feed",
            data_mode=DataMode.HISTORICAL,
        )

    # UNKNOWN side with INFERRED is invalid
    with pytest.raises(ValueError, match="side cannot be UNKNOWN"):
        Trade(
            symbol="SBIN",
            exchange="NSE",
            asset_class="EQUITY",
            event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
            price=800.0,
            quantity=50,
            side=TradeSide.UNKNOWN,
            side_provenance=FieldProvenance.INFERRED,
            side_inference_method="tick_rule_v1",
            source="tick_feed",
            data_mode=DataMode.HISTORICAL,
        )


def test_trade_legacy_aggressor_side_inferred_backward_compatibility():
    """Verify legacy aggressor_side_inferred=True maps to side_provenance=INFERRED."""
    t = Trade(
        symbol="TCS",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        price=3500.0,
        quantity=10,
        side=TradeSide.SELLER,
        aggressor_side_inferred=True,
        aggressor_inference_method="lee_ready_v1",
        source="tick_feed",
        data_mode=DataMode.HISTORICAL,
    )
    assert t.side_provenance == FieldProvenance.INFERRED
    assert t.side_inference_method == "lee_ready_v1"
    assert t.aggressor_side_inferred is True


def test_greeks_provenance_in_options():
    """Verify GreeksProvenance classification on OptionContract."""
    opt = OptionContract(
        underlying_symbol="NIFTY",
        underlying_exchange="NSE",
        contract_symbol="NIFTY24OCT25000CE",
        expiry=date(2024, 10, 31),
        strike=25000.0,
        option_type=OptionType.CALL,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        delta=0.52,
        gamma=0.0015,
        greeks_provenance=GreeksProvenance.DERIVED,
        greeks_source="black_76_v1",
        lot_size=25,
        tick_size=0.05,
        source="model_pipeline",
        data_mode=DataMode.HISTORICAL,
    )
    assert opt.greeks_provenance == GreeksProvenance.DERIVED
    assert opt.greeks_source == "black_76_v1"


def test_derived_order_flow_provenance_not_yet_computed():
    """Verify DerivedOrderFlowRecord defaults to NOT_YET_COMPUTED for microstructure features."""
    from arthaai.core.instruments.contracts import Exchange
    from arthaai.data.schemas.derived_order_flow import DerivedOrderFlowRecord

    rec = DerivedOrderFlowRecord(
        symbol="NIFTY",
        exchange=Exchange.NSE,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
    )
    assert rec.ofi_provenance == FieldProvenance.NOT_YET_COMPUTED
    assert rec.order_flow_imbalance is None
    assert rec.delta_provenance == FieldProvenance.NOT_YET_COMPUTED
    assert rec.delta is None
    assert rec.cvd_provenance == FieldProvenance.NOT_YET_COMPUTED
    assert rec.cumulative_volume_delta is None
    assert rec.vwap_provenance == FieldProvenance.NOT_YET_COMPUTED
    assert rec.vwap is None
