"""Tests for Phase E: Derivatives (F&O) Data Bank, Black-Scholes Greeks, and Option Chains."""

from datetime import date
from pathlib import Path

import pytest

from arthaai.core.config import DataConfig
from arthaai.data.derivatives.options_pipeline import (
    DerivativesPipeline,
    calculate_black_scholes_greeks,
)


@pytest.fixture
def temp_data_config(tmp_path: Path) -> DataConfig:
    cfg = DataConfig(root=str(tmp_path))
    cfg.ensure_dirs()
    return cfg


def test_black_scholes_analytical_greeks() -> None:
    spot = 2500.0
    strike = 2500.0  # ATM
    time_to_exp = 30.0 / 365.0
    r = 0.065
    iv = 0.20

    # Call Greeks
    call_g = calculate_black_scholes_greeks(spot, strike, time_to_exp, r, iv, is_call=True)
    assert 0.45 < call_g["delta"] < 0.60
    assert call_g["gamma"] > 0
    assert call_g["vega"] > 0
    assert call_g["theta"] < 0

    # Put Greeks
    put_g = calculate_black_scholes_greeks(spot, strike, time_to_exp, r, iv, is_call=False)
    assert -0.55 < put_g["delta"] < -0.40
    assert put_g["gamma"] > 0
    assert put_g["vega"] > 0
    assert put_g["theta"] < 0

    # Put-Call Parity on Delta: Delta_Call - Delta_Put == 1.0
    assert abs((call_g["delta"] - put_g["delta"]) - 1.0) < 0.01


def test_derivatives_pipeline_seeding_and_retrieval(temp_data_config: DataConfig) -> None:
    pipeline = DerivativesPipeline(temp_data_config)

    # 1. Verify RELIANCE option chain
    rel_chain = pipeline.get_option_chain("RELIANCE")
    assert len(rel_chain) > 0

    # Strikes and types
    strikes = {c["strike"] for c in rel_chain}
    types = {c["option_type"] for c in rel_chain}
    assert len(strikes) >= 5
    assert "CE" in types or "CALL" in types
    assert "PE" in types or "PUT" in types

    # Lot size verification
    assert pipeline.get_lot_size("RELIANCE") == 250
    assert pipeline.get_lot_size("TCS") == 175
    assert pipeline.get_lot_size("NIFTY50") == 25

    # 2. Raw archiving verification
    raw_files = list(temp_data_config.raw_dir.rglob("*.jsonl"))
    assert len(raw_files) >= 1


def test_derivatives_coverage_report_and_limitations(temp_data_config: DataConfig) -> None:
    pipeline = DerivativesPipeline(temp_data_config)

    report = pipeline.get_derivatives_coverage("RELIANCE")
    assert report.is_fno_eligible is True
    assert report.lot_size == 250
    assert report.total_call_oi > 0
    assert report.total_put_oi > 0
    assert report.put_call_ratio_oi is not None
    assert report.put_call_ratio_oi > 0
    assert report.max_pain_strike is not None
    assert 2000.0 < report.max_pain_strike < 3500.0

    # Verify honest statement on expired contracts
    assert "licensed exchange archive" in report.expired_contracts_limitation
    assert "strictly records this boundary" in report.expired_contracts_limitation


def test_max_pain_computation(temp_data_config: DataConfig) -> None:
    pipeline = DerivativesPipeline(temp_data_config)

    dummy_contracts = [
        {"strike": 100.0, "open_interest": 1000, "option_type": "CE"},
        {"strike": 100.0, "open_interest": 200, "option_type": "PE"},
        {"strike": 110.0, "open_interest": 500, "option_type": "CE"},
        {"strike": 110.0, "open_interest": 1200, "option_type": "PE"},
    ]
    max_pain = pipeline.compute_max_pain(dummy_contracts)
    assert max_pain in (100.0, 110.0)

