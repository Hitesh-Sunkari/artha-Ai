"""Tests for quantitative feature calculators."""

import math
import pytest

from arthaai.features.calculators import (
    calculate_ema,
    calculate_realized_volatility,
    calculate_returns,
    calculate_rsi,
    calculate_sma,
    register_standard_features,
)
from arthaai.features.core.registry import FeatureRegistry


def test_calculate_returns_simple_known_answer():
    prices = [100.0, 110.0, 99.0]
    returns = calculate_returns(prices, log=False)
    assert len(returns) == 2
    assert pytest.approx(returns[0], abs=1e-7) == 0.10
    assert pytest.approx(returns[1], abs=1e-7) == -0.10


def test_calculate_returns_log_known_answer():
    prices = [100.0, 110.0, 99.0]
    returns = calculate_returns(prices, log=True)
    assert len(returns) == 2
    assert pytest.approx(returns[0], abs=1e-7) == math.log(1.1)
    assert pytest.approx(returns[1], abs=1e-7) == math.log(99.0 / 110.0)


def test_calculate_returns_edge_cases():
    # Empty and single price
    assert calculate_returns([]) == []
    assert calculate_returns([100.0]) == []

    # Non-finite values
    with pytest.raises(ValueError, match="finite real numbers"):
        calculate_returns([100.0, float("nan")])

    with pytest.raises(ValueError, match="finite real numbers"):
        calculate_returns([float("inf"), 100.0])

    # Zero or negative prices for log returns
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_returns([100.0, 0.0], log=True)

    with pytest.raises(ValueError, match="strictly positive"):
        calculate_returns([100.0, -50.0], log=True)

    # Zero initial price for simple returns
    with pytest.raises(ValueError, match="cannot be zero"):
        calculate_returns([0.0, 100.0], log=False)


def test_calculate_realized_volatility_known_answer():
    returns = [0.01, -0.01, 0.02, -0.02]
    # Sample mean = 0.0
    # Variance = (0.0001 + 0.0001 + 0.0004 + 0.0004) / 3 = 0.001 / 3
    # s = sqrt(0.001 / 3) = 0.01825741858
    # Annualized (factor 252): s * sqrt(252) = 0.2898275349
    vol = calculate_realized_volatility(returns, window=4, annualization_factor=252.0)
    assert vol is not None
    assert pytest.approx(vol, abs=1e-6) == 0.2898275349


def test_calculate_realized_volatility_edge_cases():
    # Insufficient observations
    assert calculate_realized_volatility([0.01, -0.01], window=5) is None

    # Invalid window
    with pytest.raises(ValueError, match="Window must be >= 2"):
        calculate_realized_volatility([0.01, -0.01], window=1)

    # Invalid factor
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_realized_volatility([0.01, -0.01], window=2, annualization_factor=-1.0)

    # Non-finite returns inside trailing window
    assert calculate_realized_volatility([0.01, float("nan"), 0.02], window=2) is None


def test_calculate_sma_known_answer():
    prices = [10.0, 20.0, 30.0, 40.0]
    sma = calculate_sma(prices, window=2)
    assert sma == [None, 15.0, 25.0, 35.0]


def test_calculate_sma_edge_cases():
    assert calculate_sma([10.0, 20.0], window=5) == [None, None]
    with pytest.raises(ValueError, match="Window must be >= 1"):
        calculate_sma([10.0], window=0)

    # Non-finite price
    sma_nan = calculate_sma([10.0, float("nan"), 30.0], window=2)
    assert sma_nan[1] is None


def test_calculate_ema_known_answer():
    prices = [10.0, 20.0, 30.0]
    # span = 2 -> alpha = 2 / 3
    # Index 0: None
    # Index 1: (10 + 20) / 2 = 15.0
    # Index 2: (2/3 * 30.0) + (1/3 * 15.0) = 20.0 + 5.0 = 25.0
    ema = calculate_ema(prices, span=2)
    assert ema[0] is None
    assert pytest.approx(ema[1], abs=1e-7) == 15.0
    assert pytest.approx(ema[2], abs=1e-7) == 25.0


def test_calculate_ema_edge_cases():
    assert calculate_ema([10.0, 20.0], span=5) == [None, None]
    with pytest.raises(ValueError, match="Span must be >= 1"):
        calculate_ema([10.0], span=0)


def test_calculate_rsi_known_answer():
    # 1. Monotonically increasing prices -> RSI = 100.0
    inc_prices = [float(100 + i) for i in range(16)]
    rsi_inc = calculate_rsi(inc_prices, period=14)
    assert rsi_inc == 100.0

    # 2. Monotonically decreasing prices -> RSI = 0.0
    dec_prices = [float(100 - i) for i in range(16)]
    rsi_dec = calculate_rsi(dec_prices, period=14)
    assert rsi_dec == 0.0

    # 3. Constant prices -> RSI = 50.0
    flat_prices = [100.0] * 16
    rsi_flat = calculate_rsi(flat_prices, period=14)
    assert rsi_flat == 50.0


def test_calculate_rsi_edge_cases():
    # Insufficient data (period=14 requires 15 prices)
    assert calculate_rsi([100.0] * 14, period=14) is None

    # Invalid period
    with pytest.raises(ValueError, match="Period must be >= 1"):
        calculate_rsi([100.0] * 15, period=0)

    # Non-finite values
    assert calculate_rsi([100.0] * 14 + [float("nan")], period=14) is None


def test_register_standard_features():
    registry = FeatureRegistry()
    register_standard_features(registry)
    registered = registry.list_features()
    names = [f.name for f in registered]
    assert "daily_returns" in names
    assert "realized_volatility_20d" in names
    assert "sma_20d" in names
    assert "ema_20d" in names
    assert "rsi_14d" in names
