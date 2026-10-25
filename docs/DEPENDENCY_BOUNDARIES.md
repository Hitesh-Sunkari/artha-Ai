# ArthaAI — Dependency Boundaries & Architectural Invariants
**Document Status:** RATIFIED (Step 0.6)  
**Standard:** Strict Acyclic Layered Architecture (Dependency Inversion Principle)  

---

## 1. The Strict Layered Dependency Ladder

Dependencies in ArthaAI strictly flow **downward**. Upper layers may import lower layers; lower layers are strictly forbidden from importing upper layers:

```
▲ Level 6: PRESENTATION & DELIVERY   [ gateway/, dashboard/ ]
│                                     │
│ Level 5: THIRD-PARTY BRIDGES       [ integrations/ (nautilus, openbb, tradingview, llm) ]
│                                     │
│ Level 4: REASONING & EVOLUTION     [ intelligence/, evolution/ ]
│                                     │
│ Level 3: SIMULATION & GOVERNANCE   [ backtest/, evaluation/, control_plane/ ]
│                                     │
│ Level 2: STRATEGY PIPELINE         [ strategy/ (universe, alpha, portfolio, risk, execution) ]
│                                     │
│ Level 1: QUANTITATIVE DOMAINS      [ data/, features/, microstructure/, options/ ]
│                                     │
▼ Level 0: FOUNDATIONAL CORE         [ core/ (clock, events, instruments, market, orders, portfolio, signals) ]
```

---

## 2. Strict Architectural Invariants & Prohibited Imports

### Invariant 1: Foundational Core Purity (`src/arthaai/core/`)
- `core/` contains pure domain models, enums, value objects, and timezone semantics.
- **PROHIBITED IMPORTS IN CORE:**
  - ❌ `fastapi`, `starlette`, `uvicorn` (Zero web framework code)
  - ❌ `langgraph`, `langchain`, `openai`, `anthropic` (Zero AI/LLM SDKs)
  - ❌ `nautilus_trader`, `openbb`, `vectorbt` (Zero external trading libraries)
  - ❌ `scipy`, `sklearn`, `torch` (Zero heavy scientific ML engines in core contracts)
  - ❌ Any upper ArthaAI module (`data`, `strategy`, `backtest`, `gateway`, etc.)
- **ALLOWED IN CORE:**
  - ✅ Standard library (`datetime`, `zoneinfo`, `enum`, `typing`, `abc`, `uuid`, `math`)
  - ✅ `pydantic` (v2 data validation and serialization only)

### Invariant 2: Quantitative Domain Independence (`Level 1`)
- `data/`, `features/`, `microstructure/`, and `options/` compute domain analytics.
- **RULES:**
  - May import: `core/`, and low-level math engines (`polars`, `pyarrow`, `numpy`, `scipy`).
  - May NOT import: `strategy/`, `intelligence/`, `backtest/`, `gateway/`, `integrations/`.
  - Feature calculations must be deterministic and pure functions over dataframes/ticks.

### Invariant 3: Strategy Framework Purity (`Level 2: strategy/`)
- Implements the INSPIRED_BY_LEAN 5-stage pipeline (`Universe → Alpha → Portfolio → Risk → Execution`).
- **RULES:**
  - May import: `core/`, `data/schemas/`, `features/`, `microstructure/`, `options/`.
  - May NOT import: `backtest/` (Strategy code must not know if it is running in backtest, paper, or live mode).
  - May NOT import: `intelligence/graph/` (Strategy does not call LLMs directly; it only reads validated context schemas).
  - May NOT import: `gateway/` or `integrations/`.

### Invariant 4: Asynchronous Intelligence Quarantine (`Level 4: intelligence/`)
- Contains LLM multi-agent debate (LangGraph), RAG (PostgreSQL + pgvector), and episodic memory.
- **RULES:**
  - Runs strictly in the **Slow Loop (15m to 24h)**.
  - Produces typed schemas: `MarketRegimeContext`, `RiskContext`, `PortfolioContext`.
  - The fast quant loop consumes these schemas through Redis / SQLite cache without ever importing LangGraph or LLM SDKs.

### Invariant 5: Third-Party Isolation (`Level 5: integrations/`)
- Wraps external dependencies (`nautilus_trader`, `vectorbt`, `openbb`, `tradingview`).
- **RULES:**
  - Every third-party library is isolated behind an ArthaAI interface.
  - If NautilusTrader or OpenBB changes their API, **only** the adapter in `src/arthaai/integrations/` changes.
  - Core ArthaAI code never imports external libraries directly.

### Invariant 6: Delivery Edge Isolation (`Level 6: gateway/`)
- FastAPI REST endpoints, WebSocket streaming, and TradingView webhook receivers.
- **RULES:**
  - Translates network requests into calls to ArthaAI core/strategy/control_plane interfaces.
  - No quantitative business logic or strategy calculations may live in gateway routes.

---

## 3. Anti-Circular Dependency Enforcement

To prevent circular dependencies across modules:

| Cross-Module Relationship | Permitted Direction | Prohibited Reverse Direction |
|---|---|---|
| `core` vs `strategy` | `strategy` imports `core` | ❌ `core` never imports `strategy` |
| `data` vs `strategy` | `strategy` imports `data.schemas` | ❌ `data` never imports `strategy` |
| `backtest` vs `strategy` | `backtest` imports `strategy` | ❌ `strategy` never imports `backtest` |
| `evaluation` vs `backtest` | `evaluation` imports `backtest.base` | ❌ `backtest` never imports `evaluation` |
| `control_plane` vs `strategy` | `control_plane` inspects `strategy` | ❌ `strategy` never imports `control_plane` |
| `gateway` vs `core` | `gateway` imports `core` | ❌ `core` never imports `gateway` |

---

## 4. Automated CI Architecture Gate

In continuous integration (`tests/test_architecture_boundaries.py`), an automated AST import analyzer parses all source files in `src/arthaai/` and fails any commit that violates these boundaries:

```python
import ast
import os
import pytest

FORBIDDEN_IMPORTS = {
    "src/arthaai/core": ["fastapi", "langgraph", "langchain", "nautilus_trader", "openbb", "vectorbt", "arthaai.strategy", "arthaai.gateway"],
    "src/arthaai/data": ["arthaai.strategy", "arthaai.backtest", "arthaai.gateway"],
    "src/arthaai/features": ["arthaai.strategy", "arthaai.backtest", "arthaai.gateway"],
    "src/arthaai/microstructure": ["arthaai.strategy", "arthaai.backtest", "arthaai.gateway"],
    "src/arthaai/options": ["arthaai.strategy", "arthaai.backtest", "arthaai.gateway"],
    "src/arthaai/strategy": ["arthaai.backtest", "arthaai.gateway", "langgraph", "fastapi"],
}

def test_enforce_clean_architecture_boundaries():
    for root_dir, banned_list in FORBIDDEN_IMPORTS.items():
        for root, _, files in os.walk(root_dir):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        tree = ast.parse(f.read(), filename=filepath)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                for banned in banned_list:
                                    assert not alias.name.startswith(banned), f"Illegal import '{alias.name}' in {filepath}"
                        elif isinstance(node, ast.ImportFrom):
                            if node.module:
                                for banned in banned_list:
                                    assert not node.module.startswith(banned), f"Illegal import '{node.module}' in {filepath}"
```

---

## 5. Summary

By establishing strict layer hierarchies, isolating third-party frameworks behind clean adapters, banishing web and AI SDKs from the core domain, and enforcing automated AST linting in CI, **ArthaAI guarantees zero circular dependencies, high maintainability, and clean separation of concerns for the next five years.**
