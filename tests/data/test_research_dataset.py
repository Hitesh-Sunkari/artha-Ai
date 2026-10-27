"""Unit tests for ResearchDataset boundary and verify_research_eligibility gate."""

from datetime import UTC, date, datetime

import pytest

from arthaai.core.errors import ResearchEligibilityError
from arthaai.data.research.dataset import ResearchDataset, verify_research_eligibility
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import GreeksProvenance, OptionContract, OptionType
from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide


def test_empty_dataset_fails_eligibility():
    ds = ResearchDataset(dataset_id="empty_ds", records=[])
    with pytest.raises(ResearchEligibilityError, match="zero records"):
        verify_research_eligibility(ds)


def test_datamode_rejection():
    bar_fixture = OHLCVBar(
        symbol="RELIANCE",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.D1,
        event_time=datetime(2024, 10, 15, 15, 30, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 15, 35, 0, tzinfo=UTC),
        open=2500.0,
        high=2520.0,
        low=2490.0,
        close=2515.0,
        volume=100000,
        data_mode=DataMode.FIXTURE,  # Synthetic/mock fixture
        source="fixture_generator",
    )
    ds = ResearchDataset(dataset_id="fixture_ds", records=[bar_fixture])
    # Default allowed_data_modes is {DataMode.HISTORICAL}
    with pytest.raises(ResearchEligibilityError, match="not permitted for research"):
        ds.verify_eligibility()

    # Allowed when explicitly declared
    ds_allowed = ResearchDataset(
        dataset_id="fixture_ds_allowed",
        records=[bar_fixture],
        allowed_data_modes={DataMode.HISTORICAL, DataMode.FIXTURE},
    )
    # Should not raise
    ds_allowed.verify_eligibility()


def test_lookahead_leakage_detection():
    decision_dt = datetime(2024, 10, 15, 15, 30, 0, tzinfo=UTC)
    # Event happened at 15:30, but data was not available until 15:35
    leaked_bar = OHLCVBar(
        symbol="RELIANCE",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.D1,
        event_time=datetime(2024, 10, 15, 15, 30, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 15, 35, 0, tzinfo=UTC),
        open=2500.0,
        high=2520.0,
        low=2490.0,
        close=2515.0,
        volume=100000,
        data_mode=DataMode.HISTORICAL,
        source="feed",
    )
    ds = ResearchDataset(
        dataset_id="leaked_ds",
        records=[leaked_bar],
        decision_time=decision_dt,
    )
    with pytest.raises(ResearchEligibilityError, match="Lookahead leakage"):
        ds.verify_eligibility()


def test_inferred_availability_gate():
    bar = OHLCVBar(
        symbol="RELIANCE",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.D1,
        event_time=datetime(2024, 10, 15, 15, 30, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 15, 30, 0, tzinfo=UTC),
        open=2500.0,
        high=2520.0,
        low=2490.0,
        close=2515.0,
        volume=100000,
        data_mode=DataMode.HISTORICAL,
        source="feed",
        availability_time_inferred=True,
    )
    ds = ResearchDataset(
        dataset_id="inferred_avail_ds",
        records=[bar],
        allow_inferred_availability=False,
    )
    with pytest.raises(ResearchEligibilityError, match="Inferred availability time"):
        ds.verify_eligibility()

    # Allowed when explicitly enabled
    ds_opt_in = ResearchDataset(
        dataset_id="inferred_avail_ds",
        records=[bar],
        allow_inferred_availability=True,
    )
    ds_opt_in.verify_eligibility()


def test_inferred_trade_provenance_gate():
    trade = Trade(
        symbol="INFY",
        exchange="NSE",
        asset_class="EQUITY",
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 1, tzinfo=UTC),
        price=1850.0,
        quantity=100,
        side=TradeSide.BUYER,
        side_provenance=FieldProvenance.INFERRED,
        side_inference_method="tick_rule_v1",
        data_mode=DataMode.HISTORICAL,
        source="tick_feed",
    )
    ds = ResearchDataset(
        dataset_id="inferred_trade_ds",
        records=[trade],
        allow_inferred_fields=False,
    )
    with pytest.raises(ResearchEligibilityError, match="Unapproved inferred field"):
        ds.verify_eligibility()

    # Permitted when opt-in
    ds_opt_in = ResearchDataset(
        dataset_id="inferred_trade_ds",
        records=[trade],
        allow_inferred_fields=True,
    )
    ds_opt_in.verify_eligibility()


def test_options_model_assumption_provenance_gate():
    opt = OptionContract(
        underlying_symbol="NIFTY",
        underlying_exchange="NSE",
        contract_symbol="NIFTY24OCT25000CE",
        expiry=date(2024, 10, 31),
        strike=25000.0,
        option_type=OptionType.CALL,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        delta=0.5,
        greeks_provenance=GreeksProvenance.MODEL_ASSUMPTION,
        lot_size=25,
        tick_size=0.05,
        source="assumed_feed",
        data_mode=DataMode.HISTORICAL,
    )
    ds = ResearchDataset(
        dataset_id="assumed_opt_ds",
        records=[opt],
        allow_inferred_fields=False,
    )
    with pytest.raises(ResearchEligibilityError, match="Unapproved model assumption"):
        ds.verify_eligibility()


def test_valid_dataset_passes():
    bar = OHLCVBar(
        symbol="TCS",
        exchange="NSE",
        asset_class="EQUITY",
        frequency=BarFrequency.D1,
        event_time=datetime(2024, 10, 15, 15, 30, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 15, 35, 0, tzinfo=UTC),
        open=3500.0,
        high=3550.0,
        low=3490.0,
        close=3540.0,
        volume=500000,
        data_mode=DataMode.HISTORICAL,
        source="verified_feed",
        availability_time_inferred=False,
    )
    decision_dt = datetime(2024, 10, 15, 16, 0, 0, tzinfo=UTC)
    ds = ResearchDataset(
        dataset_id="valid_ds",
        records=[bar],
        decision_time=decision_dt,
    )
    ds.verify_eligibility()
    assert len(ds) == 1
    assert ds[0] == bar
    assert list(ds) == [bar]
