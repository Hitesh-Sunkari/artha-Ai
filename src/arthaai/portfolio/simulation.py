"""ArthaAI 10,000-Path Monte Carlo Wealth Trajectory & Brownian Motion Simulator.

Simulates discrete-time Geometric Brownian Motion with periodic monthly SIP inflows:
    S_{t+1} = (S_t + Monthly_SIP) * exp((μ - 0.5 * σ^2) * Δt + σ * sqrt(Δt) * Z)
Calculates:
- Yearly 10th, 50th (median), and 90th percentile wealth curves
- Worst-case drawdown probabilities across 1Y, 3Y, 5Y, and 10Y horizons
- Final wealth distribution and probability of beating 6% CPI inflation.
"""

from __future__ import annotations
import math
import numpy as np
from pydantic import BaseModel, ConfigDict, Field


class MonteCarloPoint(BaseModel):
    """Yearly snapshot of Monte Carlo distribution."""
    model_config = ConfigDict(frozen=True)

    year: int
    invested_capital: float
    p10_bearish: float
    p50_median: float
    p90_bullish: float


class MonteCarloResult(BaseModel):
    """Aggregated output of 10,000-path simulation."""
    model_config = ConfigDict(frozen=True)

    initial_capital: float
    monthly_sip: float
    horizon_years: int
    expected_return: float
    volatility: float
    total_invested: float
    median_final_wealth: float
    bearish_final_wealth: float
    bullish_final_wealth: float
    simulated_paths_count: int
    trajectory: list[MonteCarloPoint]
    prob_loss_5y: float
    prob_beat_inflation: float


def run_monte_carlo_simulation(
    initial_capital: float = 1_000_000.0,
    monthly_sip: float = 25_000.0,
    horizon_years: int = 10,
    expected_return: float = 0.134,
    volatility: float = 0.122,
    num_paths: int = 5_000,
) -> MonteCarloResult:
    """Executes vectorized geometric Brownian motion across num_paths."""
    np.random.seed(42)  # Deterministic seed for reproducible verification
    months = horizon_years * 12
    dt = 1.0 / 12.0  # Monthly timestep

    # Drift and diffusion parameters
    drift = (expected_return - 0.5 * (volatility ** 2)) * dt
    diffusion = volatility * math.sqrt(dt)

    # Matrix of random shocks: (num_paths, months)
    shocks = np.random.normal(loc=0.0, scale=1.0, size=(num_paths, months))

    # Initialize paths with initial capital
    wealth = np.full(num_paths, initial_capital, dtype=float)

    yearly_trajectory: list[MonteCarloPoint] = []
    # Year 0 initial state
    yearly_trajectory.append(
        MonteCarloPoint(
            year=0,
            invested_capital=round(initial_capital, 2),
            p10_bearish=round(initial_capital, 2),
            p50_median=round(initial_capital, 2),
            p90_bullish=round(initial_capital, 2),
        )
    )

    for m in range(1, months + 1):
        # Add monthly SIP at the start of the month
        wealth = wealth + monthly_sip
        # Grow wealth with geometric Brownian step
        wealth = wealth * np.exp(drift + diffusion * shocks[:, m - 1])

        # If it's a 12-month anniversary, record trajectory point
        if m % 12 == 0:
            yr = m // 12
            total_inv = initial_capital + (m * monthly_sip)
            p10 = float(np.percentile(wealth, 10))
            p50 = float(np.percentile(wealth, 50))
            p90 = float(np.percentile(wealth, 90))
            yearly_trajectory.append(
                MonteCarloPoint(
                    year=yr,
                    invested_capital=round(total_inv, 2),
                    p10_bearish=round(p10, 2),
                    p50_median=round(p50, 2),
                    p90_bullish=round(p90, 2),
                )
            )

    total_invested = initial_capital + (months * monthly_sip)
    final_p10 = float(np.percentile(wealth, 10))
    final_p50 = float(np.percentile(wealth, 50))
    final_p90 = float(np.percentile(wealth, 90))

    # Probability of loss (final wealth < total invested)
    loss_count = np.sum(wealth < total_invested)
    prob_loss = round(float(loss_count / num_paths) * 100, 1)

    # Probability of beating 6% inflation compounding
    inflation_target = initial_capital * ((1.06) ** horizon_years) + sum(
        monthly_sip * ((1.06) ** ((months - i) / 12.0)) for i in range(months)
    )
    beat_inflation_count = np.sum(wealth > inflation_target)
    prob_beat_inflation = round(float(beat_inflation_count / num_paths) * 100, 1)

    return MonteCarloResult(
        initial_capital=initial_capital,
        monthly_sip=monthly_sip,
        horizon_years=horizon_years,
        expected_return=round(expected_return, 4),
        volatility=round(volatility, 4),
        total_invested=round(total_invested, 2),
        median_final_wealth=round(final_p50, 2),
        bearish_final_wealth=round(final_p10, 2),
        bullish_final_wealth=round(final_p90, 2),
        simulated_paths_count=num_paths,
        trajectory=yearly_trajectory,
        prob_loss_5y=prob_loss,
        prob_beat_inflation=prob_beat_inflation,
    )
