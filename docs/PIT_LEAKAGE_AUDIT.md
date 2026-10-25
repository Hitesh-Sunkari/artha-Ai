# POINT-IN-TIME (PIT) LEAKAGE & TEMPORAL INTEGRITY AUDIT

**System:** ArthaAI Indian Market Data Foundation  
**Audit Scope:** Temporal Semantics, Availability Tracking, Lookahead Leakage Prevention  
**Date:** 2026-09-11  
**Status:** FULLY VERIFIED — ZERO LEAKAGE DETECTED  

---

## 1. Temporal Semantics & Timestamp Taxonomy

Lookahead bias is the primary cause of inflated backtesting returns and failed live deployments in quantitative trading. ArthaAI enforces a formal timestamp hierarchy across every canonical schema:

```
+-------------------------------------------------------------------------------+
|                             TEMPORAL TIMELINE                                 |
+-------------------------------------------------------------------------------+
       |                                      |                                |
       v                                      v                                v
  [event_time]                       [availability_time]                [ingested_at]
  Exchange / Real-world              System Knowledge Boundary          Internal Storage
  - Trade execution timestamp        - Ingestion network timestamp      - Database insertion
  - OHLCV bar close timestamp        - Announcement arrival timestamp   - Parquet partition
  - News publication timestamp       - Embargo expiration timestamp     - Cache entry time
```

### Semantic Definitions
1. **`event_time` (datetime, UTC):** The exact exchange or real-world moment an event occurred. For intraday bars, this is the bar close timestamp; for daily bars, this is 15:30:00 IST (10:00:00 UTC) on the trading date.
2. **`availability_time` (datetime, UTC):** The point in time at which the information was first observable and actionable by the system without future knowledge.
3. **`decision_time` (datetime, UTC):** The historical cutoff supplied by an algorithm, agent, or researcher simulating an action.
4. **`ingested_at` / `received_time` (datetime, UTC):** Telemetry timestamps recording pipeline ingestion and hardware arrival.

### Mandatory Point-in-Time Causality Invariant
For any research, simulation, or backtesting query evaluating state at `decision_time`:
$$\mathbf{availability\_time} \le \mathbf{decision\_time}$$

An event where $\mathbf{event\_time} \le \mathbf{decision\_time}$ but $\mathbf{availability\_time} > \mathbf{decision\_time}$ **MUST BE EXCLUDED**.

---

## 2. Timezone Standards

- **Internal Storage & Query Standard:** Strict **UTC (`datetime.timezone.utc`)**.
- **Normalization Boundary:** All timestamps arriving from external adapters (NSE bhavcopy, vendor ticks, news feeds) are converted to timezone-aware UTC upon entry. Native naive datetimes are rejected by Pydantic models.
- **Indian Standard Time (IST):** Fixed offset `UTC+05:30` (no Daylight Saving Time). Handled via `arthaai.core.clock.timezone`.

---

## 3. Inferred Availability Semantics

When historical data feeds do not explicitly report an availability timestamp (e.g., standard daily Bhavcopy):
- The normalizer sets `availability_time` equal to `event_time` (or standard EOD release time 18:00 IST).
- The normalizer **must set `availability_time_inferred = True`**.
- This transparently flags that the availability timestamp is an inference, preventing researchers from assuming tick-level dissemination precision on end-of-day data.
- The `verify_research_eligibility()` gate rejects datasets with inferred availability unless `allow_inferred_availability=True` is explicitly passed by the researcher.

---

## 4. Adversarial Leakage Audit Results

The test suite in `tests/data/test_pit_adversarial.py` subjected every canonical data domain to adversarial lookahead scenarios. In each scenario, an event occurred *before* the decision cutoff, but its availability timestamp was *after* the cutoff.

### Domain-by-Domain Test Verification

| Domain | Event Time | Availability Time | Decision Time | Expected Result | Test Status |
|--------|------------|-------------------|---------------|-----------------|-------------|
| **OHLCV Bars** | 15:30:00 UTC | 15:35:00 UTC | 15:31:00 UTC | Record **excluded** | ✅ PASSED |
| **Trades (Ticks)** | 10:00:00.100 UTC | 10:00:00.900 UTC | 10:00:00.500 UTC | Record **excluded** | ✅ PASSED |
| **Quotes (L1/BBO)** | 10:00:00.100 UTC | 10:00:00.400 UTC | 10:00:00.200 UTC | Record **excluded** | ✅ PASSED |
| **Options Greeks** | 10:00:00 UTC | 10:05:00 UTC | 10:02:00 UTC | Contract **excluded** | ✅ PASSED |
| **Corporate Actions** | 2024-03-01 (Ex-Date) | 2024-03-05 (Notice) | 2024-03-02 | Action **excluded** | ✅ PASSED |
| **News Articles** | 2024-10-15 08:00 UTC | 2024-10-15 09:30 UTC | 2024-10-15 09:00 UTC | Article **excluded** | ✅ PASSED |
| **Macro Economic Events** | 2024-10-15 12:00 UTC | 2024-10-15 12:05 UTC | 2024-10-15 12:01 UTC | Event **excluded** | ✅ PASSED |

### Unfiltered Query Contract Verification
When `as_of_availability=None` is explicitly supplied, the query engine operates in unconstrained dataset extraction mode, returning all records. This behavior was verified across all domains (`test_unfiltered_query_includes_all_records` passed).

---

## 5. Summary Audit Conclusion

The ArthaAI query engine (`DuckDBEngine`), storage layer (`ParquetStore`), and research boundary (`ResearchDataset`) enforce mathematical point-in-time causality. There are zero known lookahead leakage paths in the data foundation.
