# VectorBT — Forensic Analysis
**Source:** https://github.com/polakowo/vectorbt  
**Version Studied:** Community Edition (0.26+)  
**License:** ⚠️ Apache 2.0 with Commons Clause Condition v1.0 ("Source Available / Fair Code")  
**Language:** Python 3.9+ (NumPy, pandas, Numba, optional Rust engine)  

---

## 1. What Problem Does It Solve?

Traditional backtesters (Backtrader, Zipline, even NautilusTrader) simulate trading by iterating chronologically through time step-by-step in an event loop: `for bar in bars: strategy.on_bar(bar)`. While this provides high fidelity for order queue simulation, it is painfully slow when evaluating parameter spaces: testing 1,000 parameter combinations over 5 years takes hours or days.

**VectorBT solves strategy exploration at scale.** It treats backtesting as matrix manipulation:
- Packs thousands of parameter combinations into multi-dimensional NumPy arrays (`broadcasting`).
- Computes indicator signals, position allocations, equity curves, drawdowns, and Sharpe ratios across all assets, timeframes, and parameters in a single vectorized pass.
- Compiles the hot execution loop down to machine code using **Numba (LLVM)** or an optional precompiled **Rust engine**.
- Turns days of grid search into seconds.

---

## 2. Architecture & Source Tree Overview

```
vectorbt/
├── base/                      — Core broadcasting and multi-index array manipulations
│   ├── combine.py             — Multi-array combination with automatic dimension matching
│   ├── indexing.py            — Pandas-like slicing across high-dimensional arrays
│   └── reshape.py             — Fast reshaping and tiling
├── generic/                   — Generic time series analysis
│   ├── accessors.py           — Pandas accessors (`df.vbt.*`, `series.vbt.*`)
│   ├── drawdowns.py           — Vectorized drawdown records & duration analytics
│   └── nb.py                  — Numba-compiled core mathematical primitives
├── indicators/                — Vectorized technical indicators
│   ├── factory.py             — `IndicatorFactory`: generates JIT-compiled custom indicators
│   └── basic.py               — RSI, MACD, Bollinger Bands, ATR, Supertrend, etc.
├── portfolio/                 — Vectorized trade & portfolio simulation
│   ├── base.py                — `Portfolio.from_signals()` and `Portfolio.from_orders()`
│   ├── enums.py               — Direction, OrderType, Status definitions
│   └── nb.py                  — Numba-accelerated order matching and position tracking
├── signals/                   — Signal generation, filtering, ranking, and entry/exit mapping
└── returns/                   — Return series, benchmark comparison, QuantStats integration
```

---

## 3. Core Abstractions & Data Models

### 3.1 N-Dimensional Array Broadcasting
VectorBT uses Pandas MultiIndex columns to represent parameter grids.
If testing 5 fast SMA windows × 5 slow SMA windows across 10 stocks:
- Data shape: `(T, 250)` where `T` is the number of bars, and `250` is `10 assets × 25 parameter pairs`.
- Operations are executed simultaneously using SIMD instructions without Python loops.

### 3.2 `Portfolio.from_signals()`
The flagship entry point:
```python
import vectorbt as vbt
import numpy as np

# Download data
price = vbt.YFData.download("RELIANCE.NS", start="2020-01-01").get("Close")

# Generate 50 fast SMAs and 50 slow SMAs (2,500 combinations)
fast_ma, slow_ma = vbt.MA.run_combs(price, window=np.arange(10, 60), r=2)
entries = fast_ma.ma_crossed_above(slow_ma)
exits = fast_ma.ma_crossed_below(slow_ma)

# Run 2,500 backtests simultaneously in Numba
pf = vbt.Portfolio.from_signals(price, entries, exits, freq="1D", fees=0.001)

# Sort parameter combinations by Sharpe ratio in milliseconds
print(pf.sharpe_ratio().sort_values(ascending=False).head(5))
```

---

## 4. Architectural Forensic Questions (Phases C)

### What problem does it solve?
Ultra-fast parameter optimization, combinatorial strategy screening, and vectorized portfolio simulation across large universes.

### What is its best component?
1. **The `IndicatorFactory` and Numba JIT Pipeline:** Compiles vectorized indicators to run at raw C/LLVM speeds directly on NumPy arrays.
2. **`Portfolio.from_signals()` simulation engine:** Generates comprehensive trade records, equity curves, and risk statistics for thousands of simulations in seconds.

### What should ArthaAI reuse?
- **Vectorized Backtest Concepts & Mathematical Primitives:** The design pattern of using multi-dimensional array broadcasting for rapid alpha screening before running heavy multi-agent or event-driven backtests.

### What should ArthaAI wrap?
- If utilized by users who supply their own license, wrap VectorBT via an optional plugin interface (`ArthaAIVectorBTAdapter`).

### What should ArthaAI rewrite or develop natively?
- **ArthaAI-Native Vectorized Screening Engine (CRITICAL):** Because of the Commons Clause restriction (see License section below), ArthaAI MUST NOT depend on VectorBT for its core quantitative research.
- ArthaAI should implement its own native vectorized alpha screener using **Polars** (which outperforms Pandas by 5-10x) and **Numba/Rust** for custom kernel operations.

### What should ArthaAI avoid?
- **Do NOT bundle VectorBT in core distribution.**
- Avoid using vectorized backtests for tick-level order execution or complex order types (bracket orders, iceberg orders, trailing stop-losses with slippage); vectorized backtesting suffers from look-ahead bias and unrealistic fill assumptions in illiquid conditions.

### What dependencies would it introduce?
- `numpy`, `pandas`, `numba`, `scipy`, `matplotlib`, `plotly`.
- Numba introduces LLVM compiler dependencies which can be heavy and prone to Python version incompatibilities (e.g. Numba lagging behind new Python releases).

### What performance cost would it introduce?
- Memory consumption can explode when broadcasting large parameter grids (e.g. 100,000 columns × 1,000,000 ticks can consume gigabytes of RAM in seconds).

### What license constraints exist?
- ⚠️ **Apache 2.0 with Commons Clause Condition v1.0.**
- **CRITICAL RESTRICTION:** The Commons Clause prohibits selling the software or offering a commercial hosted service/SaaS whose value substantially derives from the software.
- This prevents ArthaAI from using VectorBT as a built-in proprietary or commercial offering.

### What maintenance risks exist?
- The open-source community edition of VectorBT is largely in maintenance mode while commercial development focuses on the closed-source "VectorBT PRO".
- Frequent incompatibilities with newer NumPy versions (NumPy 2.0) and Python releases due to strict Numba constraints.
