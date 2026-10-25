# ArthaAI Data Quality Engine Specification

## 1. Overview & Principles

Garbage data produces dangerous backtests and catastrophic live trades. The ArthaAI Data Quality Engine (`arthaai.data.quality`) validates all ingested records before persistence or strategy consumption.

### Severity Levels
- **`ERROR`**: Fatal anomaly. Corrupts bar logic, violates mathematical causality, or indicates inverted prices. Datasets with ERRORs are marked `FAILED` in the registry and rejected if running in `strict` mode.
- **`WARNING`**: Suspicious pattern that may be legitimate market behavior (e.g. illiquidity, price gaps due to corporate actions, trading outside standard hours).
- **`INFO`**: Informational audit markers (e.g. tracking volume distribution).

---

## 2. Rule Catalog

### 2.1 OHLCV & Price Rules
1. **`OHLCConsistencyRule` (`ERROR`)**
   - Invariants:
     $$H \ge O, \quad H \ge C, \quad L \le O, \quad L \le C, \quad H \ge L$$
   - Any violation triggers an immediate ERROR.
2. **`NegativePriceRule` (`ERROR`)**
   - Invariant: $O > 0, H > 0, L > 0, C > 0$.
   - Indian equities and standard derivatives cannot trade at negative prices (unlike crude oil under specific zero-storage events).
3. **`ZeroVolumeRule` (`WARNING`)**
   - Invariant: $V > 0$.
   - Flags illiquid or suspended instruments where volume is zero.
4. **`TimestampOrderRule` (`ERROR`)**
   - Invariant: $T_{i} \ge T_{i-1}$ per instrument.
   - Rejects out-of-order time series to preserve sequential causality.
5. **`DuplicateRecordRule` (`ERROR`)**
   - Invariant: Unique $(symbol, event\_time)$.
   - Prevents double-counting trades or bar aggregates.
6. **`StaleQuoteRule` (`WARNING`)**
   - Detects frozen prices ($O = H = L = C$ with $V = 0$) across $N$ consecutive bars (default: 5).
7. **`MissingBarRule` (`WARNING`)**
   - Checks if the interval between adjacent bars exceeds $1.5\times$ the expected frequency (e.g. 90s for 1m bars).
8. **`SessionGapRule` (`WARNING`)**
   - Converts event timestamps to IST and checks if bars lie outside the official NSE session ($09:15 \le T_{\text{IST}} \le 15:30$).

### 2.2 Order Book Rules
9. **`CrossedMarketRule` (`ERROR`)**
   - Invariant: $P_{\text{best\_bid}} < P_{\text{best\_ask}}$.
   - Bid $\ge$ Ask indicates a crossed/locked market or corrupted feed parsing.
10. **`SequenceGapRule` (`ERROR`)**
    - Invariant: $\text{Seq}_{i} = \text{Seq}_{i-1} + 1$.
    - Detects dropped packets in real-time UDP/WebSocket feeds.

### 2.3 Corporate Action & Discontinuity Rules
11. **`PriceDiscontinuityRule` (`WARNING`)**
    - Invariant: $\frac{|C_t - C_{t-1}|}{C_{t-1}} \le \text{threshold}$ (default: 20%).
    - Large jumps are flagged for verification against unadjusted splits or bonuses.

---

## 3. Runner Architecture

```python
runner = QualityRunner(strict=True)
report = runner.run(canonical_bars, dataset_name="reliance_1m")
if not report.is_valid:
    # Strict mode raises DataQualityError automatically
    print(f"Validation failed with {report.error_count} errors")
```
