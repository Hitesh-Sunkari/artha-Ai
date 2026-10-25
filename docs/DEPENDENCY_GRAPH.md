# ArthaAI — Dependency Graph & Cycle Verification Report
**Document Status:** RATIFIED (Step 0.7)  
**Verification Mechanism:** Automated Abstract Syntax Tree (AST) Analysis & Tarjan's / DFS Cycle Detection  

---

## 1. Verified Module Adjacency List

The internal dependency graph was extracted directly from the Python AST of `src/arthaai/`:

```
arthaai.core.clock.timezone
  └── (zero internal dependencies; relies exclusively on datetime, zoneinfo)

arthaai.core.instruments.contracts
  └── (zero internal dependencies; pure Pydantic model)

arthaai.core.events.market_events
  ├── arthaai.core.clock.timezone
  └── arthaai.core.instruments.contracts

arthaai.core.market.snapshot
  ├── arthaai.core.clock.timezone
  └── arthaai.core.instruments.contracts

arthaai.core.signals.insight
  ├── arthaai.core.clock.timezone
  └── arthaai.core.instruments.contracts

arthaai.core.portfolio.position
  └── arthaai.core.instruments.contracts

arthaai.core.orders.order
  └── arthaai.core.instruments.contracts

arthaai.control_plane.market_rules.registry
  └── (zero internal dependencies; pure Pydantic model)

arthaai.features.lineage
  ├── arthaai.core.clock.timezone
  └── arthaai.core.instruments.contracts

arthaai.strategy.risk.base
  ├── arthaai.core.market.snapshot
  ├── arthaai.core.portfolio.position
  ├── arthaai.core.signals.insight
  └── arthaai.control_plane.market_rules.registry

arthaai.strategy.base
  ├── arthaai.core.instruments.contracts
  ├── arthaai.core.market.snapshot
  ├── arthaai.core.orders.order
  ├── arthaai.core.portfolio.position
  ├── arthaai.core.signals.insight
  └── arthaai.features.lineage

arthaai.strategy.execution.base
  └── arthaai.core.orders.order

arthaai.backtest.base
  ├── arthaai.core.clock.timezone
  └── arthaai.strategy.base
```

---

## 2. Graph Verification & Cycle Audit Results

Automated graph inspection via `tests/test_architecture_cycles.py` verified:

| Diagnostic Metric | Audit Result | Status |
|---|---|---|
| **Direct Cycles ($A \leftrightarrow B$)** | **0 Detected** | ✅ PASSED |
| **Indirect / Transitive Cycles ($A \to B \to C \to A$)** | **0 Detected** | ✅ PASSED |
| **Forbidden Imports in `core/`** | **0 Detected** | ✅ PASSED |
| **Web Frameworks in Core / Strategy** | **0 Detected** (`fastapi`, `starlette` absent) | ✅ PASSED |
| **LLM SDKs in Core / Strategy** | **0 Detected** (`langgraph`, `openai` absent) | ✅ PASSED |
| **External Trading Engines in Core / Strategy** | **0 Detected** (`nautilus`, `vectorbt` absent) | ✅ PASSED |
| **Broker SDKs in Domain Contracts** | **0 Detected** (`kiteconnect`, `smartapi` absent) | ✅ PASSED |
| **Graph Topology** | **Strict Directed Acyclic Graph (DAG)** | ✅ PASSED |

---

## 3. Layer Depth & Topological Order

A valid topological ordering exists for the entire codebase, proving acyclicity:

1. `arthaai.core.clock.timezone`
2. `arthaai.core.instruments.contracts`
3. `arthaai.control_plane.market_rules.registry`
4. `arthaai.core.portfolio.position`
5. `arthaai.core.orders.order`
6. `arthaai.core.signals.insight`
7. `arthaai.core.market.snapshot`
8. `arthaai.core.events.market_events`
9. `arthaai.features.lineage`
10. `arthaai.strategy.risk.base`
11. `arthaai.strategy.execution.base`
12. `arthaai.strategy.base`
13. `arthaai.backtest.base`

Any change introducing an edge from a lower number to a higher number is immediately blocked by `tests/test_architecture_cycles.py`.
