# ArthaAI — Architecture Boundaries & Invariants
**Document Status:** RATIFIED (Step 0.7)  
**Standard:** Automated AST Verification & Strict Layer Isolation  

---

## 1. Architectural Layers & Import Permissions

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 4: Governance, Research & Delivery                                │
│ [ control_plane/, evaluation/, evolution/, gateway/, dashboard/ ]       │
│ Imports: Layers 0, 1, 2, 3, web/db drivers                              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 3: Simulation & Execution Environments                            │
│ [ backtest/, strategy/execution/ ]                                      │
│ Imports: Layers 0, 1, 2, simulation libraries                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 2: Strategy Layer (Framework-Neutral & Backend-Agnostic)          │
│ [ strategy/universe/, alpha/, portfolio/, risk/ ]                       │
│ Imports: Layers 0, 1 ONLY                                               │
│ Prohibited: backtest, gateway, integrations, LLM SDKs, web frameworks   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Quantitative Analytics & Microstructure                        │
│ [ data/, features/, microstructure/, options/ ]                         │
│ Imports: Layer 0, polars, pyarrow, numpy, scipy                         │
│ Prohibited: strategy, backtest, gateway, LLM SDKs                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 0: Foundational Core Contracts & Value Objects                    │
│ [ core/clock/, instruments/, events/, market/, orders/, signals/ ]      │
│ Imports: Python standard library, pydantic v2 ONLY                      │
│ Prohibited: ANY upper layer (Layers 1-4) or third-party infrastructure  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Automated AST Import Normalization & Guardrails

The automated test `tests/test_architecture_boundaries.py` enforces boundary integrity on every git commit.

### Normalized Import Matching Algorithm
The AST visitor extracts both:
1. `import A.B as C` $\to$ normalized to `A.B`
2. `from A.B import C` $\to$ normalized to both `A.B` and `A.B.C`
3. Exact module prefix comparison with dot boundaries:
   $$\text{match} = (\text{imported} == \text{banned}) \lor \text{imported}.\text{startswith}(\text{banned} + \text{"."})$$
This prevents false positives where `arthaai.strategy` might otherwise incorrectly flag `arthaai.strategy_helpers`.

---

## 3. The Five Core Invariants

1. **Strategy Agnosticism:** Strategy code in `arthaai.strategy` will **never** import `fastapi`, `langgraph`, `nautilus_trader`, `openbb`, `vectorbt`, or `kiteconnect`. A strategy expresses quantitative logic through pure inputs and outputs.
2. **Deterministic Hot Path:** The fast quant loop executes exclusively through deterministic mathematics (`core`, `features`, `microstructure`, `strategy`). No LLMs, prompt builders, or network RAG calls are ever imported into this path.
3. **Point-in-Time Causality:** All data structures carry `event_time` and `availability_time`. In backtesting and paper trading, no decision may consume data where $\text{availability\_time} > T_{\text{decision}}$.
4. **Traceable Order Lineage:** Every `OrderIntent` must have an `originating_decision_id`, and every `ExecutionReport` must reference its `order_intent_id`.
5. **Acyclic Hierarchy:** Cycles across modules are mathematically impossible; the build pipeline fails immediately if any circular reference is introduced.
