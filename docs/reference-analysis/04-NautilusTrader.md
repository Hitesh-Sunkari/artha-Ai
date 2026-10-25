# NautilusTrader — Forensic Analysis
**Source:** https://github.com/nautechsystems/nautilus_trader  
**Version Studied:** v1.218.0 / develop branch (cloned repository, 4,777 files)  
**License:** LGPL-3.0-or-later  
**Language:** Rust (core/engine) + Cython/PyO3 bindings + Python 3.10+  

---

## 1. What Problem Does It Solve?

NautilusTrader is a state-of-the-art, high-performance algorithmic trading and event-driven backtesting platform. It bridges the critical "backtest-to-live" discrepancy gap in quantitative trading by ensuring that the exact same strategy code runs identically in historical event-driven simulation, paper trading, and live market execution.

Key problems it solves:
- **Zero code divergence:** A strategy written for backtesting runs without modifications in live trading.
- **Nanosecond/microsecond time precision:** Uses 64-bit integer Unix nanosecond timestamps across all events to eliminate floating-point time drift and out-of-order execution.
- **Realistic order fill simulation:** Simulates matching engines, order book queue positions, market impact, slippage, and exchange latency models.
- **High throughput:** Hybrid Rust/Cython/Python architecture capable of processing hundreds of thousands of market events per second per core.

---

## 2. Architecture & Source Tree Overview

```
reference/NautilusTrader/
├── crates/                    — High-performance Rust core engine
│   ├── model/                 — Institutional data models: Currency, Money, Price, Quantity,
│   │                            Instrument, Order, OrderBook (L2/L3 ladder), Position, Trade
│   ├── execution/             — Execution engine, routing, venue state
│   ├── backtest/              — High-speed deterministic event simulator
│   ├── risk/                  — Pre-trade risk controls, position limits, sizing engines
│   ├── portfolio/             — Real-time PnL, margin tracking, exposure calculations
│   ├── indicators/            — High-speed streaming technical indicators
│   ├── pyo3/                  — Python FFI bindings via PyO3
│   ├── persistence/           — Feather/Parquet/DuckDB event sourcing & serialisation
│   └── adapters/              — Native Rust exchange connectors (Binance, Interactive Brokers, etc.)
└── python/nautilus_trader/    — Python SDK and high-level strategy interfaces
    ├── trading/strategy.py    — Strategy base class (`TradingStrategy`)
    ├── backtest/engine.py     — BacktestEngine orchestrator
    ├── live/node.py           — Live execution node
    └── model/                 — Python type stubs & wrappers over Rust model structs
```

---

## 3. Core Abstractions & Data Models

### 3.1 Time and Monetary Precision
NautilusTrader strictly rejects floating-point money or dates:
- `Price`: High-precision fixed-point integer with configurable decimal places (e.g. 8 decimals for crypto, 2 for equities).
- `Quantity`: High-precision fixed-point integer for lot sizing and fractions.
- `Money`: Price × Quantity with associated `Currency`.
- `UnixNanos`: `u64` nanoseconds since epoch.

### 3.2 L2/L3 Order Book
Located in `crates/model/src/orderbook/`:
- `OrderBook`: Maintains bid/ask ladders (`ladder.rs`), price levels (`level.rs`), and own active orders (`own.rs`).
- Capable of level-by-level depth updates, order additions, cancellations, and full synthetic order book reconstruction from incremental feeds.
- Order book imbalance (`OFI`), depth ratio, and liquidity metrics computed in nanoseconds.

### 3.3 Event-Driven Execution Loop
- `DataEngine` receives market data events (`Bar`, `QuoteTick`, `TradeTick`, `OrderBookDelta`).
- Feeds events sequentially into the `RiskEngine` and `Strategy` instances via the `MessageBus`.
- Strategy produces `SubmitOrder`, `CancelOrder`, `ModifyOrder` commands.
- `ExecutionEngine` validates margins, routes to venue adapter, and emits `OrderAccepted`, `OrderFilled`, `OrderRejected` events.
- `Portfolio` subscribes to order fills to update positions, unrealized PnL, and equity watermarks.

---

## 4. APIs & Performance Characteristics

- **Throughput:** >150,000 to 500,000 ticks/second in backtest mode in Rust/Cython.
- **Memory Footprint:** Highly optimized zero-copy buffers using Rust vectors and memory-mapped files.
- **Python Integration:** Strategy logic is written in standard Python:
  ```python
  from nautilus_trader.trading.strategy import Strategy
  from nautilus_trader.model.data import Bar, QuoteTick
  from nautilus_trader.model.instruments import Instrument

  class EMAStrategy(Strategy):
      def on_start(self):
          self.instrument = self.cache.instrument(self.instrument_id)
          self.subscribe_bars(self.bar_type)

      def on_bar(self, bar: Bar):
          if self.ema_fast.value > self.ema_slow.value and not self.portfolio.is_invested:
              order = self.order_factory.market(
                  instrument_id=self.instrument_id,
                  order_side=OrderSide.BUY,
                  quantity=self.calculate_quantity(),
              )
              self.submit_order(order)
  ```

---

## 5. Architectural Forensic Questions (Phases C)

### What problem does it solve?
Deterministic, zero-drift quantitative trading spanning institutional backtesting, order book queue simulation, and live multi-venue execution.

### What is its best component?
1. **The Rust `model` crate** (`crates/model`): Institutional-grade representations of `OrderBook`, `Position`, `Price`, `Quantity`, and `Money`.
2. **The Execution Simulation Engine** (`crates/backtest`): Realistic order matching, fill latency models, slippage curves, and queue priority simulation.

### What should ArthaAI reuse?
- **Reuse as an execution/backtest backend**: NautilusTrader can serve as ArthaAI's high-fidelity event-driven simulation and execution engine for intraday and tick-level trading.
- **Order Book Ladder architecture**: Its bid/ask ladder design for Level 2/Level 3 order books and Order Flow Imbalance (OFI) calculations.

### What should ArthaAI wrap?
- Wrap NautilusTrader's `BacktestEngine` and `LiveNode` behind ArthaAI's unified `BacktestEngine` and `ExecutionEngine` interfaces.
- The user strategy logic in ArthaAI should never directly subclass `nautilus_trader.trading.strategy.Strategy`; rather, ArthaAI's `Strategy` interface will compile down or adapt into a NautilusTrader execution node when tick-level fidelity is required.

### What should ArthaAI rewrite or develop natively?
- **Indian Market Adapters**: NautilusTrader has no native connectors for Zerodha Kite Connect, Angel One SmartAPI, Upstox, Dhan, or NSE/BSE multicast data. ArthaAI must build custom adapters.
- **Options Greeks & Multi-leg Strategy Engine**: NautilusTrader's options support is nascent; ArthaAI requires an Indian options trading engine (Nifty/BankNifty weekly expiries, straddles, iron condors, Black-76 IV surfaces).
- **AI Agent Integration**: NautilusTrader has zero concept of LLM agents, multi-agent reasoning, or unstructured news processing.

### What should ArthaAI avoid?
- Do not modify NautilusTrader internal Rust code directly. Modifying internal Rust crates would incur severe maintenance overhead across upstream releases.
- Avoid forcing low-frequency or daily-bar vector strategies into NautilusTrader; VectorBT or Polars is 100x faster for bulk matrix operations.

### What dependencies would it introduce?
- Cython, PyO3, Rust toolchain (cargo) for source builds, `msgpack`, `pyarrow`, `uvloop`.
- Pre-built binary wheels exist on PyPI for Linux, macOS, and Windows (`pip install nautilus_trader`).

### What performance cost would it introduce?
- Very low latency overhead (nanosecond/microsecond scale).
- Higher memory overhead than pure NumPy matrices when holding millions of individual tick objects.

### What license constraints exist?
- **LGPL-3.0-or-later**.
- **Crucial distinction from AGPL**: LGPL allows ArthaAI to import NautilusTrader as a Python package library (`pip install nautilus_trader`) or link against it dynamically without forcing ArthaAI's proprietary source code or strategy IP to be open-sourced under LGPL.
- Any direct modifications *to* NautilusTrader's own source files would have to be shared under LGPL. Keeping NautilusTrader unmodified as an external pip dependency completely protects ArthaAI's proprietary architecture.

### What maintenance risks exist?
- Fast-moving upstream codebase; API breaking changes between minor versions (0.x to 1.x transitions).
- Complex build environment if compiling custom Rust extensions.
