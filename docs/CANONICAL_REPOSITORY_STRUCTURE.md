# ArthaAI — Canonical Repository Structure
**Document Status:** FROZEN & AUTHORITATIVE (Step 0.6)  
**Date:** September 2026  
**Standard:** Single Authoritative Filesystem Specification (Zero Duplication)  

---

## 1. Authoritative Repository File Tree

```
ArthaAI/
│
├── .gitignore
├── README.md
├── pyproject.toml
│
├── configs/
│   ├── dev.yaml
│   ├── paper.yaml
│   ├── live.yaml
│   └── logging.yaml
│
├── dashboard/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   ├── chart/
│       │   │   ├── LightweightChart.tsx
│       │   │   └── OrderOverlay.tsx
│       │   ├── orders/
│       │   │   ├── OrderBookView.tsx
│       │   │   └── TradeHistoryView.tsx
│       │   ├── risk/
│       │   │   ├── RiskGauges.tsx
│       │   │   └── CircuitStatus.tsx
│       │   └── intelligence/
│       │       ├── AgentDebateFeed.tsx
│       │       └── RegimeIndicator.tsx
│       └── services/
│           ├── api.ts
│           └── websocket.ts
│
├── datasets/
│   └── README.md
│
├── docs/
│   ├── ARCHITECTURE_DECISIONS.md
│   ├── ARCHITECTURE_FREEZE.md
│   ├── CANONICAL_REPOSITORY_STRUCTURE.md
│   ├── DEPENDENCY_BOUNDARIES.md
│   ├── INTEGRATION_PLAN.md
│   ├── LICENSE_AUDIT.md
│   ├── MODULE_OWNERSHIP.md
│   ├── PERFORMANCE_AUDIT.md
│   ├── REFERENCE_REUSE_MATRIX.md
│   ├── STEP0_PRINCIPAL_ENGINEER_REVIEW.md
│   └── reference-analysis/
│       ├── 01-TradingAgents.md
│       ├── 02-LangGraph.md
│       ├── 03-OpenBB.md
│       ├── 04-NautilusTrader.md
│       ├── 05-Paperclip.md
│       ├── 06-VectorBT.md
│       ├── 07-LEAN.md
│       └── 08-Hermes.md
│
├── migrations/
│   ├── env.py
│   ├── alembic.ini
│   └── versions/
│       └── 001_initial_schema.py
│
├── reference/
│   ├── Hermes/
│   ├── LangGraph/
│   ├── LEAN/
│   ├── NautilusTrader/
│   ├── OpenBB/
│   ├── Paperclip/
│   ├── TradingAgents/
│   └── VectorBT/
│
├── research/
│   ├── experiments/
│   ├── notebooks/
│   └── reports/
│
├── src/
│   └── arthaai/
│       ├── __init__.py
│       │
│       ├── core/
│       │   ├── __init__.py
│       │   ├── clock/
│       │   │   ├── __init__.py
│       │   │   └── timezone.py
│       │   ├── events/
│       │   │   ├── __init__.py
│       │   │   └── market_events.py
│       │   ├── instruments/
│       │   │   ├── __init__.py
│       │   │   └── contracts.py
│       │   ├── market/
│       │   │   ├── __init__.py
│       │   │   └── snapshot.py
│       │   ├── orders/
│       │   │   ├── __init__.py
│       │   │   └── order.py
│       │   ├── portfolio/
│       │   │   ├── __init__.py
│       │   │   └── position.py
│       │   └── signals/
│       │       ├── __init__.py
│       │       └── insight.py
│       │
│       ├── data/
│       │   ├── __init__.py
│       │   ├── ingestion/
│       │   │   ├── __init__.py
│       │   │   ├── parquet_writer.py
│       │   │   └── tick_buffer.py
│       │   ├── normalization/
│       │   │   ├── __init__.py
│       │   │   └── clean.py
│       │   ├── providers/
│       │   │   ├── __init__.py
│       │   │   ├── base.py
│       │   │   ├── angelone.py
│       │   │   ├── dhan.py
│       │   │   ├── nse.py
│       │   │   ├── upstox.py
│       │   │   ├── yfinance.py
│       │   │   └── zerodha.py
│       │   ├── quality/
│       │   │   ├── __init__.py
│       │   │   ├── engine.py
│       │   │   └── rules.py
│       │   └── schemas/
│       │       ├── __init__.py
│       │       └── bar.py
│       │
│       ├── features/
│       │   ├── __init__.py
│       │   ├── registry.py
│       │   ├── indicators/
│       │   │   ├── __init__.py
│       │   │   ├── momentum.py
│       │   │   ├── trend.py
│       │   │   └── volume.py
│       │   ├── statistics/
│       │   │   ├── __init__.py
│       │   │   ├── distribution.py
│       │   │   └── rolling.py
│       │   └── volatility/
│       │       ├── __init__.py
│       │       ├── atr.py
│       │       └── bollinger.py
│       │
│       ├── microstructure/
│       │   ├── __init__.py
│       │   ├── absorption/
│       │   │   ├── __init__.py
│       │   │   └── detector.py
│       │   ├── delta/
│       │   │   ├── __init__.py
│       │   │   ├── cumulative.py
│       │   │   └── volume_delta.py
│       │   ├── imbalance/
│       │   │   ├── __init__.py
│       │   │   └── stacked.py
│       │   ├── liquidity/
│       │   │   ├── __init__.py
│       │   │   └── sweep.py
│       │   ├── ofi/
│       │   │   ├── __init__.py
│       │   │   └── calculator.py
│       │   ├── orderbook/
│       │   │   ├── __init__.py
│       │   │   └── ladder.py
│       │   ├── trades/
│       │   │   ├── __init__.py
│       │   │   └── aggressor.py
│       │   └── volume_profile/
│       │       ├── __init__.py
│       │       └── poc.py
│       │
│       ├── options/
│       │   ├── __init__.py
│       │   ├── chain/
│       │   │   ├── __init__.py
│       │   │   └── builder.py
│       │   ├── expiry/
│       │   │   ├── __init__.py
│       │   │   └── calendar.py
│       │   ├── gamma/
│       │   │   ├── __init__.py
│       │   │   ├── exposure.py
│       │   │   └── levels.py
│       │   ├── greeks/
│       │   │   ├── __init__.py
│       │   │   └── black76.py
│       │   ├── iv/
│       │   │   ├── __init__.py
│       │   │   └── solver.py
│       │   └── volatility_surface/
│       │       ├── __init__.py
│       │       └── smile.py
│       │
│       ├── strategy/
│       │   ├── __init__.py
│       │   ├── alpha/
│       │   │   ├── __init__.py
│       │   │   ├── base.py
│       │   │   └── models.py
│       │   ├── execution/
│       │   │   ├── __init__.py
│       │   │   ├── router.py
│       │   │   └── slicing.py
│       │   ├── portfolio/
│       │   │   ├── __init__.py
│       │   │   ├── allocator.py
│       │   │   └── sizer.py
│       │   ├── risk/
│       │   │   ├── __init__.py
│       │   │   ├── circuit.py
│       │   │   ├── fno_ban.py
│       │   │   └── pretrade.py
│       │   └── universe/
│       │       ├── __init__.py
│       │       ├── filters.py
│       │       └── point_in_time.py
│       │
│       ├── intelligence/
│       │   ├── __init__.py
│       │   ├── graph/
│       │   │   ├── __init__.py
│       │   │   ├── consensus.py
│       │   │   └── workflow.py
│       │   ├── memory/
│       │   │   ├── __init__.py
│       │   │   └── scratchpad.py
│       │   ├── personas/
│       │   │   ├── __init__.py
│       │   │   ├── fundamental.py
│       │   │   ├── macro.py
│       │   │   ├── risk_officer.py
│       │   │   └── sentiment.py
│       │   ├── rag/
│       │   │   ├── __init__.py
│       │   │   ├── chunker.py
│       │   │   ├── retriever.py
│       │   │   └── store.py
│       │   └── schemas/
│       │       ├── __init__.py
│       │       └── context.py
│       │
│       ├── backtest/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── costs.py
│       │   ├── integrity.py
│       │   ├── nautilus_backend.py
│       │   └── polars_backend.py
│       │
│       ├── evaluation/
│       │   ├── __init__.py
│       │   ├── execution.py
│       │   ├── performance.py
│       │   ├── risk.py
│       │   ├── robustness.py
│       │   └── statistical.py
│       │
│       ├── control_plane/
│       │   ├── __init__.py
│       │   ├── datasets/
│       │   │   ├── __init__.py
│       │   │   └── registry.py
│       │   ├── experiments/
│       │   │   ├── __init__.py
│       │   │   └── tracker.py
│       │   ├── features/
│       │   │   ├── __init__.py
│       │   │   └── registry.py
│       │   ├── market_rules/
│       │   │   ├── __init__.py
│       │   │   └── registry.py
│       │   ├── promotions/
│       │   │   ├── __init__.py
│       │   │   └── gate.py
│       │   └── strategies/
│       │       ├── __init__.py
│       │       └── registry.py
│       │
│       ├── evolution/
│       │   ├── __init__.py
│       │   ├── candidates/
│       │   │   ├── __init__.py
│       │   │   └── generator.py
│       │   ├── optimization/
│       │   │   ├── __init__.py
│       │   │   └── genetic.py
│       │   ├── promotion/
│       │   │   ├── __init__.py
│       │   │   └── evaluator.py
│       │   └── validation/
│       │       ├── __init__.py
│       │       └── stress.py
│       │
│       ├── integrations/
│       │   ├── __init__.py
│       │   ├── llm/
│       │   │   ├── __init__.py
│       │   │   └── client.py
│       │   ├── nautilus/
│       │   │   ├── __init__.py
│       │   │   └── adapter.py
│       │   ├── openbb/
│       │   │   ├── __init__.py
│       │   │   └── adapter.py
│       │   ├── tradingagents/
│       │   │   ├── __init__.py
│       │   │   └── adapter.py
│       │   ├── tradingview/
│       │   │   ├── __init__.py
│       │   │   └── alerts.py
│       │   └── vectorbt/
│       │       ├── __init__.py
│       │       └── adapter.py
│       │
│       └── gateway/
│           ├── __init__.py
│           ├── server.py
│           ├── webhooks.py
│           └── websocket.py
│
└── tests/
    ├── __init__.py
    ├── backtest/
    │   ├── __init__.py
    │   └── test_simulators.py
    ├── integration/
    │   ├── __init__.py
    │   └── test_broker_pipeline.py
    ├── performance/
    │   ├── __init__.py
    │   └── test_benchmarks.py
    ├── regression/
    │   ├── __init__.py
    │   └── test_historical_rules.py
    └── unit/
        ├── __init__.py
        ├── test_core.py
        ├── test_features.py
        ├── test_microstructure.py
        ├── test_options.py
        └── test_risk.py
```

---

## 2. Structural Sanity Validations Passed

1. **Zero Duplicate Directories:** `intelligence/`, `tests/`, `gateway/`, `control_plane/`, `graph/` appear exactly once in their canonical locations.
2. **Correct Placement of Nautilus Backend:** `nautilus_backend.py` is located strictly under `src/arthaai/backtest/` with external bridge utilities in `src/arthaai/integrations/nautilus/`. It does not appear in `gateway/`.
3. **Single Integrity File:** `integrity.py` exists uniquely under `src/arthaai/backtest/integrity.py`.
4. **Package Naming Standard:** All application code lives under `src/arthaai/` (PEP 8 standard lowercase package name, resolving import ambiguities).
5. **No Orphan Files:** Every module path has a direct owner and import parent.
