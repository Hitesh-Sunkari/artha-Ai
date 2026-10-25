"""Deterministic Quantitative Feature Calculators.

Implements mathematical indicators for quantitative financial research:
- Simple and logarithmic returns
- Rolling realized volatility (sample standard deviation with Bessel correction, annualized)
- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- Relative Strength Index (RSI) using Wilder's smoothing convention

Integrates with arthaai.features.core.FeatureDefinition and FeatureRegistry.
Guarantees point-in-time safety, deterministic behavior, and strict NaN/insufficient data handling.
"""

import math
from typing import Any

from arthaai.features.core.base import FeatureFrequency, FeatureStatus, FeatureType
from arthaai.features.core.definition import FeatureDefinition, FeatureParameter
from arthaai.features.core.registry import FeatureRegistry


def calculate_returns(prices: list[float], log: bool = False) -> list[float]:
    """Calculate simple or logarithmic returns from a series of prices.

    Mathematical Conventions:
    - Simple Returns: R_t = (P_t - P_{t-1}) / P_{t-1}
    - Log Returns: r_t = ln(P_t / P_{t-1}) = ln(P_t) - ln(P_{t-1})

    Args:
        prices: Ordered chronological list of prices.
        log: If True, computes logarithmic returns. Otherwise, computes simple percentage returns.

    Returns:
        List of returns of length max(0, len(prices) - 1).

    Raises:
        ValueError: If prices contains non-finite numbers (NaN, Inf) or if prices <= 0 for log returns.
    """
    if len(prices) < 2:
        return []

    returns: list[float] = []
    for i in range(1, len(prices)):
        p_prev = prices[i - 1]
        p_curr = prices[i]

        if not math.isfinite(p_prev) or not math.isfinite(p_curr):
            raise ValueError(f"Prices must be finite real numbers. Found {p_prev}, {p_curr}")

        if log:
            if p_prev <= 0.0 or p_curr <= 0.0:
                raise ValueError(
                    f"Prices must be strictly positive for logarithmic returns. Found {p_prev}, {p_curr}"
                )
            returns.append(math.log(p_curr / p_prev))
        else:
            if p_prev == 0.0:
                raise ValueError("Previous price cannot be zero for simple returns computation.")
            returns.append((p_curr - p_prev) / p_prev)

    return returns


def calculate_realized_volatility(
    returns: list[float],
    window: int = 20,
    annualization_factor: float = 252.0,
) -> float | None:
    """Calculate rolling realized volatility over trailing returns.

    Mathematical Conventions:
    - Trailing window: Uses the most recent `window` observations from returns.
    - Sample variance (Bessel's correction):
        s^2 = (1 / (N - 1)) * sum((R_i - mean(R))^2)
    - Realized Annualized Volatility:
        sigma_annualized = sqrt(s^2) * sqrt(annualization_factor)

    Args:
        returns: List of periodic returns (e.g., daily returns).
        window: Lookback window period (must be >= 2).
        annualization_factor: Factor to annualize standard deviation (default 252 for daily trading days).

    Returns:
        Annualized volatility as a float, or None if observations are insufficient or invalid.

    Raises:
        ValueError: If window < 2 or annualization_factor <= 0.
    """
    if window < 2:
        raise ValueError(f"Window must be >= 2 for sample standard deviation. Got {window}")
    if annualization_factor <= 0.0:
        raise ValueError(f"Annualization factor must be strictly positive. Got {annualization_factor}")

    if len(returns) < window:
        return None

    sample = returns[-window:]
    for r in sample:
        if not math.isfinite(r):
            return None

    n = len(sample)
    mean_r = sum(sample) / n
    variance = sum((r - mean_r) ** 2 for r in sample) / (n - 1)

    if variance < 0.0:
        variance = 0.0

    return math.sqrt(variance) * math.sqrt(annualization_factor)


def calculate_sma(
    prices: list[float],
    window: int = 20,
) -> list[float | None]:
    """Calculate Simple Moving Average (SMA) across price series.

    Mathematical Conventions:
    - SMA_t = (1 / window) * sum(P_{t - window + 1} ... P_t)
    - Emits None for periods t < window - 1.

    Args:
        prices: Chronological list of price observations.
        window: Number of periods in moving window (must be >= 1).

    Returns:
        List of SMA values matching input length, with None for warmup periods or invalid windows.

    Raises:
        ValueError: If window < 1.
    """
    if window < 1:
        raise ValueError(f"Window must be >= 1. Got {window}")

    n = len(prices)
    result: list[float | None] = [None] * n

    if n < window:
        return result

    for i in range(window - 1, n):
        slice_p = prices[i - window + 1 : i + 1]
        if any(not math.isfinite(p) for p in slice_p):
            result[i] = None
        else:
            result[i] = sum(slice_p) / window

    return result


def calculate_ema(
    prices: list[float],
    span: int = 20,
) -> list[float | None]:
    """Calculate Exponential Moving Average (EMA) across price series.

    Mathematical Conventions:
    - Multiplier alpha = 2.0 / (span + 1.0)
    - Seed value at t = span - 1 is the SMA of first `span` prices.
    - EMA_t = alpha * P_t + (1 - alpha) * EMA_{t-1} for t >= span.
    - Emits None for periods t < span - 1.

    Args:
        prices: Chronological list of price observations.
        span: Number of periods for exponential decay span (must be >= 1).

    Returns:
        List of EMA values matching input length, with None for warmup periods or invalid inputs.

    Raises:
        ValueError: If span < 1.
    """
    if span < 1:
        raise ValueError(f"Span must be >= 1. Got {span}")

    n = len(prices)
    result: list[float | None] = [None] * n

    if n < span:
        return result

    # Check initial window for non-finite values
    init_slice = prices[:span]
    if any(not math.isfinite(p) for p in init_slice):
        return result

    alpha = 2.0 / (span + 1.0)
    current_ema = sum(init_slice) / span
    result[span - 1] = current_ema

    for i in range(span, n):
        p = prices[i]
        if not math.isfinite(p):
            result[i] = None
            continue
        if current_ema is None:
            # Cannot advance EMA if previous value was invalid
            result[i] = None
        else:
            current_ema = alpha * p + (1.0 - alpha) * current_ema
            result[i] = current_ema

    return result


def calculate_rsi(
    prices: list[float],
    period: int = 14,
) -> float | None:
    """Calculate Relative Strength Index (RSI) using Wilder's smoothing convention.

    Mathematical Conventions:
    - Requires at least (period + 1) price observations (yielding `period` price changes).
    - Price change: delta_t = P_t - P_{t-1}
    - Gain: U_t = max(delta_t, 0), Loss: D_t = max(-delta_t, 0)
    - Initial averages: simple mean of gains and losses over first `period` changes.
    - Wilder's smoothing:
        AvgGain_t = (AvgGain_{t-1} * (period - 1) + U_t) / period
        AvgLoss_t = (AvgLoss_{t-1} * (period - 1) + D_t) / period
    - Relative Strength RS = AvgGain / AvgLoss
    - RSI = 100 - (100 / (1 + RS))
    - If AvgLoss == 0: RSI = 100.0 (or 50.0 if AvgGain == 0 as well).

    Args:
        prices: Chronological list of price observations.
        period: Wilder smoothing period (must be >= 1, standard default is 14).

    Returns:
        Current RSI value bounded in [0.0, 100.0], or None if sample size is insufficient.

    Raises:
        ValueError: If period < 1.
    """
    if period < 1:
        raise ValueError(f"Period must be >= 1. Got {period}")

    if len(prices) < period + 1:
        return None

    for p in prices:
        if not math.isfinite(p):
            return None

    # Calculate price changes
    changes = [prices[i] - prices[i - 1] for i in range(1, len(prices))]

    # Initial period average
    initial_changes = changes[:period]
    avg_gain = sum(max(c, 0.0) for c in initial_changes) / period
    avg_loss = sum(max(-c, 0.0) for c in initial_changes) / period

    # Wilder's smoothing for subsequent changes
    for c in changes[period:]:
        gain = max(c, 0.0)
        loss = max(-c, 0.0)
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period

    if avg_loss == 0.0:
        if avg_gain == 0.0:
            return 50.0
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return max(0.0, min(100.0, rsi))


def register_standard_features(registry: FeatureRegistry) -> None:
    """Registers standard feature definitions for the quantitative calculators.

    Args:
        registry: Target FeatureRegistry instance.
    """
    features = [
        FeatureDefinition(
            name="daily_returns",
            version="1.0.0",
            description="Daily simple percentage returns computed as (P_t - P_{t-1}) / P_{t-1}",
            feature_type=FeatureType.RETURNS,
            status=FeatureStatus.PRODUCTION,
            required_datasets=["ohlcv"],
            required_columns=["close"],
            frequency=FeatureFrequency.DAILY.value,
            lookback=2,
            computation="calculate_returns",
            parameters={"log": False},
            parameter_schema={"log": FeatureParameter(name="log", param_type="bool", default_value=False)},
        ),
        FeatureDefinition(
            name="realized_volatility_20d",
            version="1.0.0",
            description="20-day annualized realized volatility using sample Bessel standard deviation",
            feature_type=FeatureType.VOLATILITY,
            status=FeatureStatus.PRODUCTION,
            required_datasets=["ohlcv"],
            required_columns=["close"],
            frequency=FeatureFrequency.DAILY.value,
            lookback=21,
            computation="calculate_realized_volatility",
            parameters={"window": 20, "annualization_factor": 252.0},
            parameter_schema={
                "window": FeatureParameter(name="window", param_type="int", default_value=20, min_value=2),
                "annualization_factor": FeatureParameter(
                    name="annualization_factor", param_type="float", default_value=252.0, min_value=1.0
                ),
            },
        ),
        FeatureDefinition(
            name="sma_20d",
            version="1.0.0",
            description="20-day Simple Moving Average",
            feature_type=FeatureType.PRICE,
            status=FeatureStatus.PRODUCTION,
            required_datasets=["ohlcv"],
            required_columns=["close"],
            frequency=FeatureFrequency.DAILY.value,
            lookback=20,
            computation="calculate_sma",
            parameters={"window": 20},
            parameter_schema={
                "window": FeatureParameter(name="window", param_type="int", default_value=20, min_value=1)
            },
        ),
        FeatureDefinition(
            name="ema_20d",
            version="1.0.0",
            description="20-day Exponential Moving Average",
            feature_type=FeatureType.PRICE,
            status=FeatureStatus.PRODUCTION,
            required_datasets=["ohlcv"],
            required_columns=["close"],
            frequency=FeatureFrequency.DAILY.value,
            lookback=20,
            computation="calculate_ema",
            parameters={"span": 20},
            parameter_schema={
                "span": FeatureParameter(name="span", param_type="int", default_value=20, min_value=1)
            },
        ),
        FeatureDefinition(
            name="rsi_14d",
            version="1.0.0",
            description="14-day Relative Strength Index using Wilder smoothing",
            feature_type=FeatureType.MOMENTUM,
            status=FeatureStatus.PRODUCTION,
            required_datasets=["ohlcv"],
            required_columns=["close"],
            frequency=FeatureFrequency.DAILY.value,
            lookback=15,
            computation="calculate_rsi",
            parameters={"period": 14},
            parameter_schema={
                "period": FeatureParameter(name="period", param_type="int", default_value=14, min_value=1)
            },
        ),
    ]

    for feat in features:
        registry.register(feat)
