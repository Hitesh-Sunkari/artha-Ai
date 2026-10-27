# ArthaAI — Orchestration Pattern Comparison Architecture (Phase 6)

## Purpose & Non-Negotiable Invariants

Phase 6 introduces the ability for an institutional user to compare the three core orchestration architectures implemented in ArthaAI:
1. **Sequential Mode**
2. **Parallel Mode**
3. **Hierarchical Mode**

### Invariants:
1. **Never Runs Automatically**: This feature must strictly remain idle until the user explicitly selects `Compare Orchestration Patterns` and confirms the configuration modal.
2. **Isolated Blackboard Namespaces**: Each child execution runs within its own isolated Blackboard (`comp-{id}-seq`, `comp-{id}-par`, `comp-{id}-hie`) to prevent cross-run state pollution.
3. **Common Point-in-Time Snapshot**: All compared runs evaluate identical historical observations from the DuckDB/Parquet store with matching `as_of_time`.
4. **Idempotency & Re-render Protection**: The endpoint `POST /research/compare` accepts an `idempotency_key` ensuring browser re-renders or page refreshes do not spawn duplicate child runs.
5. **Empirical Wall-Clock Timing**: Measured with `time.perf_counter()`; no synthetic or hardcoded benchmark values.

---

## 1. Architectural Comparison Matrix

| Metric | Sequential Mode | Parallel Mode | Hierarchical Mode |
|---|---|---|---|
| **Coordination Model** | Linear Pipeline | Fork-Join Concurrency | Supervisory Delegation & Arbitration |
| **Stage 1** | Research Manager Plan | Research Manager Plan | Research Manager Task Decomposition |
| **Stage 2** | Quant Specialist | [Quant, Microstructure, News, Filings] concurrently | Specialist Task Allocation via A2A |
| **Stage 3** | Microstructure Specialist | Concurrent Execution Across A2A Bridge | Progress Monitoring & Timeout Guards |
| **Stage 4** | News & Macro Specialist | Barrier Synchronization (Join on all 4) | Incomplete Task Recovery & Re-allocation |
| **Stage 5** | Corporate Filings Specialist | Adversarial Skeptic Challenge | Adversarial Skeptic Red-Teaming |
| **Stage 6** | Adversarial Skeptic Challenge | Gated Risk Validation (Finance Act 2024) | Gated Risk Validation (Finance Act 2024) |
| **Stage 7** | Gated Risk Validation | Final Manager Synthesis & Report | Final Manager Synthesis & Rubric Arbitration |
| **Concurrency Level** | 1 (Single-threaded sequence) | Up to 4 Concurrent Specialists | 2 (Supervisory loop + active specialist worker) |
| **Wall-Clock Latency** | Baseline (Sum of all stages) | ~40–55% reduction in specialist phase | Baseline + supervisory arbitration overhead |
| **State Provenance** | Blackboard Monotonic Append | Blackboard Monotonic Concurrent Append | Blackboard Monotonic Hierarchical Append |

---

## 2. API Specifications

### `POST /research/compare`
Request Body:
```json
{
  "symbol": "ICICIBANK.NS",
  "timeframe": "5Y",
  "patterns": ["SEQUENTIAL", "PARALLEL", "HIERARCHICAL"],
  "idempotency_key": "comp-icicibank-1730000000"
}
```

Response (200 OK):
```json
{
  "comparison_id": "comp-a1b2c3d4",
  "symbol": "ICICIBANK.NS",
  "patterns": ["SEQUENTIAL", "PARALLEL", "HIERARCHICAL"],
  "child_runs": {
    "SEQUENTIAL": "comp-a1b2c3d4-seq",
    "PARALLEL": "comp-a1b2c3d4-par",
    "HIERARCHICAL": "comp-a1b2c3d4-hie"
  },
  "status": "RUNNING",
  "created_at": "2026-10-27T12:40:00Z",
  "completed_at": null,
  "summary": {},
  "results": {}
}
```

### `GET /research/compare/{comparison_id}`
Returns comparison progress and, upon completion, the full comparative breakdown including wall-clock duration, agent count, execution order, recommendation, conviction score, and clickable links to each child run's report (`/runs/{run_id}`), trace (`/runs/{run_id}/trace`), and heatmap (`/runs/{run_id}/heatmap`).
