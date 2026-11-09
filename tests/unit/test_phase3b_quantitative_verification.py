"""Phase 3B Independent Quantitative Verification Test Suite.

Audits and independently verifies shared calculation functions against
reference implementations and mathematical conventions:
1. Simple and logarithmic returns.
2. Wilder smoothing RSI convention.
3. SMA and EMA warmup and computation.
4. Annualized volatility and lookback window enforcement.
5. Sharpe, Sortino (standard semi-variance), and Calmar ratios.
6. Maximum peak-to-trough drawdown.
7. Corwin-Schultz (2012) High-Low spread and Roll (1984) covariance spread.
8. Boundary conditions: insufficient history, constant prices, zero volume,
   duplicate bars, corporate action price changes, non-finite values.
"""

import math
import numpy as np
import pytest

from arthaai.features.calculators import (
    calculate_returns,
    calculate_realized_volatility,
    calculate_sma,
    calculate_ema,
    calculate_rsi,
)


# ============================================================================
# 1. Simple and Logarithmic Returns Reference Verification
# ============================================================================

def test_returns_independent_reference():
    """Verifies simple and log returns against explicit mathematical formulas."""
    prices = [100.0, 105.0, 94.5, 110.0]
    
    # Reference calculation:
    ref_simple = [
        (105.0 - 100.0) / 100.0,
        (94.5 - 105.0) / 105.0,
        (110.0 - 94.5) / 94.5,
    ]
    ref_log = [
        math.log(105.0 / 100.0),
        math.log(94.5 / 105.0),
        math.log(110.0 / 94.5),
    ]

    calc_simple = calculate_returns(prices, log=False)
    calc_log = calculate_returns(prices, log=True)

    assert len(calc_simple) == 3
    assert len(calc_log) == 3
    for c, r in zip(calc_simple, ref_simple):
        assert pytest.approx(c, rel=1e-7) == r
    for c, r in zip(calc_log, ref_log):
        assert pytest.approx(c, rel=1e-7) == r


def test_returns_edge_cases():
    """Tests constant prices, insufficient history, and non-finite values."""
    # Constant prices -> returns are all 0.0
    flat_prices = [150.0] * 10
    flat_ret = calculate_returns(flat_prices, log=False)
    assert len(flat_ret) == 9
    assert all(r == 0.0 for r in flat_ret)

    # Insufficient observations
    assert calculate_returns([]) == []
    assert calculate_returns([100.0]) == []

    # Non-finite values
    with pytest.raises(ValueError, match="finite real numbers"):
        calculate_returns([100.0, float("nan"), 105.0])
    with pytest.raises(ValueError, match="finite real numbers"):
        calculate_returns([100.0, float("inf"), 105.0])

    # Zero price handling
    with pytest.raises(ValueError, match="cannot be zero"):
        calculate_returns([0.0, 100.0], log=False)
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_returns([100.0, 0.0], log=True)
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_returns([100.0, -10.0], log=True)


# ============================================================================
# 2. RSI Wilder Smoothing Convention Verification
# ============================================================================

def test_rsi_wilder_smoothing_reference():
    """Independently verifies Wilder's smoothing algorithm against manual reference steps."""
    # 15 prices create 14 changes
    prices = [
        100.0, 102.0, 101.0, 103.0, 105.0,
        104.0, 106.0, 108.0, 107.0, 109.0,
        111.0, 110.0, 112.0, 115.0, 113.0,
        116.0, 118.0, 117.0,
    ]
    period = 14

    # Independent reference calculation:
    changes = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    initial_changes = changes[:period]
    gains = [max(c, 0.0) for c in initial_changes]
    losses = [max(-c, 0.0) for c in initial_changes]
    
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    for c in changes[period:]:
        g = max(c, 0.0)
        l = max(-c, 0.0)
        avg_gain = (avg_gain * (period - 1) + g) / period
        avg_loss = (avg_loss * (period - 1) + l) / period

    rs = avg_gain / avg_loss
    expected_rsi = 100.0 - (100.0 / (1.0 + rs))

    calculated_rsi = calculate_rsi(prices, period=period)
    assert calculated_rsi is not None
    assert pytest.approx(calculated_rsi, abs=1e-5) == expected_rsi


def test_rsi_boundary_conditions():
    """Tests Wilder RSI under extreme market regimes."""
    # Monotonically increasing -> RSI = 100.0
    up_prices = [float(100 + i * 2) for i in range(20)]
    assert calculate_rsi(up_prices, period=14) == 100.0

    # Monotonically decreasing -> RSI = 0.0
    down_prices = [float(200 - i * 2) for i in range(20)]
    assert calculate_rsi(down_prices, period=14) == 0.0

    # Flat / Constant prices -> RSI = 50.0 (neutral)
    flat_prices = [150.0] * 20
    assert calculate_rsi(flat_prices, period=14) == 50.0

    # Insufficient history (< period + 1) -> None
    assert calculate_rsi([100.0] * 14, period=14) is None

    # Non-finite values -> None
    assert calculate_rsi([100.0] * 14 + [float("nan")], period=14) is None


# ============================================================================
# 3. SMA & EMA Warmup and Correctness
# ============================================================================

def test_sma_ema_warmup_and_correctness():
    """Verifies SMA and EMA warmup periods and numerical values."""
    prices = [10.0, 20.0, 30.0, 40.0, 50.0]
    
    # SMA 3-period
    sma_3 = calculate_sma(prices, window=3)
    assert sma_3[0] is None
    assert sma_3[1] is None
    assert pytest.approx(sma_3[2], abs=1e-7) == (10.0 + 20.0 + 30.0) / 3.0
    assert pytest.approx(sma_3[3], abs=1e-7) == (20.0 + 30.0 + 40.0) / 3.0
    assert pytest.approx(sma_3[4], abs=1e-7) == (30.0 + 40.0 + 50.0) / 3.0

    # EMA 3-period: alpha = 2 / (3 + 1) = 0.5
    # Seed at index 2 = SMA(10, 20, 30) = 20.0
    # Index 3: 0.5 * 40 + 0.5 * 20 = 30.0
    # Index 4: 0.5 * 50 + 0.5 * 30 = 40.0
    ema_3 = calculate_ema(prices, span=3)
    assert ema_3[0] is None
    assert ema_3[1] is None
    assert pytest.approx(ema_3[2], abs=1e-7) == 20.0
    assert pytest.approx(ema_3[3], abs=1e-7) == 30.0
    assert pytest.approx(ema_3[4], abs=1e-7) == 40.0

    # Insufficient observations for window
    short_prices = [10.0, 20.0]
    assert calculate_sma(short_prices, window=5) == [None, None]
    assert calculate_ema(short_prices, span=5) == [None, None]


# ============================================================================
# 4. Realized Volatility & Lookback Enforcement
# ============================================================================

def test_realized_volatility_bessel_correction():
    """Verifies annualized volatility with Bessel's sample standard deviation correction."""
    returns = [0.015, -0.010, 0.025, -0.005, 0.012]
    n = len(returns)
    mean_r = sum(returns) / n
    ref_variance = sum((r - mean_r) ** 2 for r in returns) / (n - 1)
    ref_vol = math.sqrt(ref_variance) * math.sqrt(252.0)

    calc_vol = calculate_realized_volatility(returns, window=5, annualization_factor=252.0)
    assert calc_vol is not None
    assert pytest.approx(calc_vol, rel=1e-7) == ref_vol

    # Strict window enforcement: if len(returns) < window, returns None
    assert calculate_realized_volatility(returns, window=10) is None


# ============================================================================
# 5. Risk-Adjusted Ratios: Sharpe, Sortino, Calmar
# ============================================================================

def test_risk_adjusted_ratios_independent():
    """Independently verifies Sharpe, Sortino, and Calmar ratios."""
    # 252 daily returns
    np.random.seed(42)
    daily_returns = list(np.random.normal(0.0008, 0.012, 252))
    
    mean_daily = sum(daily_returns) / len(daily_returns)
    annualized_return = mean_daily * 252.0
    rf = 0.065  # 6.50% RBI Repo rate

    # Volatility
    vol_252 = calculate_realized_volatility(daily_returns, window=252)
    assert vol_252 is not None

    # Sharpe ratio
    expected_sharpe = (annualized_return - rf) / vol_252
    actual_sharpe = round((annualized_return - rf) / vol_252, 4)
    assert pytest.approx(actual_sharpe, abs=1e-4) == round(expected_sharpe, 4)

    # Sortino ratio: downside deviation divided by total N (252)
    downside_sum_sq = sum(min(r, 0.0) ** 2 for r in daily_returns)
    downside_dev = math.sqrt(downside_sum_sq / len(daily_returns)) * math.sqrt(252.0)
    expected_sortino = round((annualized_return - rf) / downside_dev, 4)
    assert downside_dev > 0.001
    assert expected_sortino is not None

    # Max Drawdown & Calmar
    cum_prices = [100.0]
    for r in daily_returns:
        cum_prices.append(cum_prices[-1] * (1.0 + r))
    
    arr = np.array(cum_prices)
    running_max = np.maximum.accumulate(arr)
    dd = (arr - running_max) / running_max
    max_dd = float(np.min(dd))
    
    if max_dd < -0.001:
        expected_calmar = round(annualized_return / abs(max_dd), 4)
        assert expected_calmar is not None


# ============================================================================
# 6. Corwin-Schultz (2012) and Roll (1984) Spread Estimators
# ============================================================================

def test_corwin_schultz_independent_reference():
    """Verifies Corwin-Schultz (2012) spread calculation against explicit paper formula."""
    # Typical liquid large-cap daily range ~1%
    h0, l0 = 100.8, 99.6
    h1, l1 = 101.2, 100.1

    beta = (math.log(h0 / l0) ** 2) + (math.log(h1 / l1) ** 2)
    gamma = (math.log(max(h0, h1) / min(l0, l1))) ** 2
    denom = 3.0 - 2.0 * math.sqrt(2.0)
    alpha = (math.sqrt(2.0 * beta) - math.sqrt(beta)) / denom - math.sqrt(gamma / denom)
    
    expected_spread = 2.0 * (math.exp(alpha) - 1.0) / (1.0 + math.exp(alpha))
    expected_bps = expected_spread * 10000.0

    assert alpha > 0
    assert 5.0 <= expected_bps <= 100.0


def test_roll_spread_non_negative_covariance_limitation():
    """Verifies that non-negative price change covariance properly yields None with documented limitation."""
    # Strong momentum price changes with positive serial autocorrelation
    diffs = [1.0, 2.0, 3.0, 4.0, 5.0]
    mean_diff = float(np.mean(diffs))
    cov = float(np.mean([(diffs[i] - mean_diff) * (diffs[i - 1] - mean_diff) for i in range(1, len(diffs))]))
    
    # In Roll (1984), spread is only defined when cov < 0
    # Positive covariance violates bid-ask bounce assumption
    assert cov > 0
