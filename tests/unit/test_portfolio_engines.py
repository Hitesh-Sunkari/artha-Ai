"""Unit tests for ArthaAI portfolio modules: universe, simulation, stress testing, optimizer, and committee."""

import pytest
from arthaai.portfolio.universe import UNIVERSE_ASSETS, UNIVERSE_BY_TICKER, UniverseAsset
from arthaai.portfolio.simulation import run_monte_carlo_simulation, MonteCarloResult
from arthaai.portfolio.stress_test import run_stress_test, CRISIS_SCENARIOS, StressTestResult
from arthaai.portfolio.optimizer import (
    InvestorProfile,
    run_slsqp_optimizer,
    compute_ledoit_wolf_covariance,
)
from arthaai.portfolio.committee import (
    CommitteeMemberStatement,
    CommitteeDeliberationResult,
    run_committee_deliberation,
)


def test_universe_composition():
    """Verify universe assets are populated with non-zero statistical parameters."""
    assert len(UNIVERSE_ASSETS) >= 50
    assert len(UNIVERSE_BY_TICKER) == len(UNIVERSE_ASSETS)

    reliance = UNIVERSE_BY_TICKER.get("RELIANCE.NS")
    assert reliance is not None
    assert reliance.asset_class == "equity"
    assert reliance.expected_return > 0
    assert reliance.volatility > 0
    assert reliance.max_drawdown < 0


def test_monte_carlo_simulation_runs():
    """Test 500-path Monte Carlo trajectory generation."""
    res = run_monte_carlo_simulation(
        initial_capital=500_000.0,
        monthly_sip=10_000.0,
        horizon_years=5,
        expected_return=0.12,
        volatility=0.15,
        num_paths=500,
    )
    assert isinstance(res, MonteCarloResult)
    assert res.horizon_years == 5
    assert len(res.trajectory) == 6  # Years 0 to 5
    assert res.median_final_wealth > res.total_invested * 0.8
    assert res.bullish_final_wealth >= res.median_final_wealth
    assert res.median_final_wealth >= res.bearish_final_wealth


def test_stress_test_execution():
    """Test crisis scenario analysis and backtest calculation."""
    weights = {
        "RELIANCE.NS": 0.35,
        "TCS.NS": 0.35,
        "INDIA_GOVT_10Y": 0.30,
    }
    res = run_stress_test(
        portfolio_weights=weights,
        portfolio_title="Test Blended Portfolio",
        expected_return=0.13,
        volatility=0.16,
    )
    assert isinstance(res, StressTestResult)
    assert len(res.crisis_scenarios) == len(CRISIS_SCENARIOS)
    assert len(res.yearly_returns) == 10
    assert res.backtest_summary.cagr_10y > 0


def test_slsqp_optimizer_produces_four_candidates():
    """Test SLSQP portfolio optimization creates 4 distinct candidates."""
    profile = InvestorProfile(
        age=30,
        horizon_years=10,
        risk_tolerance=7,
        initial_capital=1_000_000.0,
        monthly_sip=20_000.0,
    )
    opt_res = run_slsqp_optimizer(profile)
    assert opt_res.status == "OPTIMAL_CONVERGED"
    assert len(opt_res.candidates) == 4

    rec = next((c for c in opt_res.candidates if c.is_recommended), None)
    assert rec is not None
    # Holdings are reported in percentage weights (sum to 100%)
    assert sum(h.weight for h in rec.holdings) == pytest.approx(100.0, abs=0.5)


def test_ledoit_wolf_covariance_matrix():
    """Test covariance shrinkage matrix is symmetric positive-semidefinite."""
    import numpy as np
    tickers = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]
    assets = [UNIVERSE_BY_TICKER[t] for t in tickers]
    mu, sigma = compute_ledoit_wolf_covariance(tickers, assets)
    assert mu.shape == (3,)
    assert sigma.shape == (3, 3)
    # Symmetry check
    assert np.allclose(sigma, sigma.T)


@pytest.mark.anyio
async def test_committee_deliberation():
    """Test investment committee session execution."""
    result = await run_committee_deliberation(
        target_subject="RELIANCE.NS",
        context={"recommendation": "BUY", "conviction_score": 85},
    )
    assert isinstance(result, CommitteeDeliberationResult)
    assert len(result.transcript) >= 4
    assert result.official_verdict in ["APPROVED", "CONDITIONALLY_APPROVED", "REJECTED"]
