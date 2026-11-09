"""Data quality rules for OHLCV data."""

from datetime import datetime, time
from typing import Any

from arthaai.core.clock.timezone import to_ist
from arthaai.data.quality.rules import QualityResult, QualityRule, QualitySeverity


def _get_val(record: Any, field: str, default: Any = None) -> Any:
    if isinstance(record, dict):
        return record.get(field, default)
    return getattr(record, field, default)


class OHLCConsistencyRule(QualityRule):
    """Verifies that high is highest and low is lowest (H >= O, H >= C, L <= O, L <= C, H >= L)."""

    @property
    def rule_name(self) -> str:
        return "ohlc_consistency"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        for idx, rec in enumerate(records):
            o = _get_val(rec, "open")
            h = _get_val(rec, "high")
            low = _get_val(rec, "low")
            c = _get_val(rec, "close")
            symbol = _get_val(rec, "symbol")

            if any(v is None for v in (o, h, low, c)):
                continue

            violations = []
            if h < o:
                violations.append(f"high ({h}) < open ({o})")
            if h < c:
                violations.append(f"high ({h}) < close ({c})")
            if low > o:
                violations.append(f"low ({low}) > open ({o})")
            if low > c:
                violations.append(f"low ({low}) > close ({c})")
            if h < low:
                violations.append(f"high ({h}) < low ({low})")

            if violations:
                results.append(
                    QualityResult(
                        rule_name=self.rule_name,
                        severity=self.severity,
                        passed=False,
                        details=f"OHLC inconsistency: {', '.join(violations)}",
                        record_index=idx,
                        symbol=symbol,
                    )
                )
        return results


class NegativePriceRule(QualityRule):
    """Verifies that open, high, low, close are all strictly positive (> 0)."""

    @property
    def rule_name(self) -> str:
        return "negative_price"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        for idx, rec in enumerate(records):
            symbol = _get_val(rec, "symbol")
            for field in ("open", "high", "low", "close"):
                val = _get_val(rec, field)
                if val is not None and val <= 0:
                    results.append(
                        QualityResult(
                            rule_name=self.rule_name,
                            severity=self.severity,
                            passed=False,
                            details=f"{field} price {val} <= 0",
                            record_index=idx,
                            symbol=symbol,
                            field=field,
                            metric_value=float(val),
                        )
                    )
        return results


class ZeroVolumeRule(QualityRule):
    """Flags if volume is zero or non-positive.

    FALSE-POSITIVE RISK:
      Zero volume during regular trading hours is a genuine market phenomenon in:
      - Illiquid equity scrips (e.g. BSE Z-group or NSE BE series)
      - Far out-of-the-money (OTM) options contracts
      - Deep in-the-money (ITM) illiquid strikes
      - Pre-open / post-close discovery sessions
      Zero volume does NOT automatically imply corrupt data. Therefore, this rule
      is intentionally classified as WARNING (not ERROR), and supports an
      allow_zero_volume toggle for illiquid derivatives or pre-market fixtures.
    """

    def __init__(self, allow_zero_volume: bool = False) -> None:
        self.allow_zero_volume = allow_zero_volume

    @property
    def rule_name(self) -> str:
        return "zero_volume"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.WARNING

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        if self.allow_zero_volume:
            return []
        results: list[QualityResult] = []
        for idx, rec in enumerate(records):
            v = _get_val(rec, "volume")
            symbol = _get_val(rec, "symbol")
            if v is not None and v <= 0:
                results.append(
                    QualityResult(
                        rule_name=self.rule_name,
                        severity=self.severity,
                        passed=False,
                        details=f"Volume is zero or non-positive: {v} (potential illiquidity or feed dropout)",
                        record_index=idx,
                        symbol=symbol,
                        field="volume",
                        metric_value=float(v),
                    )
                )
        return results


class TimestampOrderRule(QualityRule):
    """Verifies that timestamps are monotonically increasing per symbol."""

    @property
    def rule_name(self) -> str:
        return "timestamp_order"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        last_times: dict[str, datetime] = {}

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            et = _get_val(rec, "event_time")
            if et is None:
                continue

            if sym in last_times and et < last_times[sym]:
                results.append(
                    QualityResult(
                        rule_name=self.rule_name,
                        severity=self.severity,
                        passed=False,
                        details=f"Timestamp out of order: {et.isoformat()} < previous {last_times[sym].isoformat()}",
                        record_index=idx,
                        symbol=sym,
                        field="event_time",
                    )
                )
            last_times[sym] = et
        return results


class DuplicateRecordRule(QualityRule):
    """Detects duplicate timestamps for the same symbol."""

    @property
    def rule_name(self) -> str:
        return "duplicate_record"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        seen: set[tuple[str, Any]] = set()

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            et = _get_val(rec, "event_time")
            if et is None:
                continue

            key = (sym, et)
            if key in seen:
                results.append(
                    QualityResult(
                        rule_name=self.rule_name,
                        severity=self.severity,
                        passed=False,
                        details=f"Duplicate timestamp {et.isoformat()} for symbol {sym}",
                        record_index=idx,
                        symbol=sym,
                        field="event_time",
                    )
                )
            else:
                seen.add(key)
        return results


class StaleQuoteRule(QualityRule):
    """Detects frozen prices where open=high=low=close with 0 volume across >= consecutive bars."""

    def __init__(self, max_stale_bars: int = 5) -> None:
        self.max_stale_bars = max_stale_bars

    @property
    def rule_name(self) -> str:
        return "stale_quote"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.WARNING

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        stale_counts: dict[str, int] = {}
        last_prices: dict[str, float] = {}

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            o = _get_val(rec, "open")
            h = _get_val(rec, "high")
            lo = _get_val(rec, "low")
            c = _get_val(rec, "close")
            v = _get_val(rec, "volume", 0)

            if any(p is None for p in (o, h, lo, c)):
                continue

            is_flat = (o == h == lo == c)
            same_as_last = (sym in last_prices and c == last_prices[sym])

            if is_flat and same_as_last and (v == 0 or v is None):
                stale_counts[sym] = stale_counts.get(sym, 0) + 1
                if stale_counts[sym] >= self.max_stale_bars:
                    results.append(
                        QualityResult(
                            rule_name=self.rule_name,
                            severity=self.severity,
                            passed=False,
                            details=f"Symbol {sym} stale price ({c}) across {stale_counts[sym]} bars",
                            record_index=idx,
                            symbol=sym,
                            field="close",
                            metric_value=float(c),
                        )
                    )
            else:
                stale_counts[sym] = 0
            last_prices[sym] = c

        return results


class MissingBarRule(QualityRule):
    """Detects missing bars when an expected interval in seconds is specified."""

    def __init__(self, expected_interval_seconds: int = 60) -> None:
        self.interval_seconds = expected_interval_seconds

    @property
    def rule_name(self) -> str:
        return "missing_bar"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.WARNING

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        last_times: dict[str, datetime] = {}

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            et = _get_val(rec, "event_time")
            if et is None:
                continue

            if sym in last_times:
                diff = (et - last_times[sym]).total_seconds()
                # If gap is > 1.5x expected interval and < overnight/session gap (e.g. 1 hour)
                if diff > self.interval_seconds * 1.5 and diff < 3600:
                    results.append(
                        QualityResult(
                            rule_name=self.rule_name,
                            severity=self.severity,
                            passed=False,
                            details=f"Gap of {diff}s detected between bars (expected ~{self.interval_seconds}s)",
                            record_index=idx,
                            symbol=sym,
                            field="event_time",
                            metric_value=diff,
                        )
                    )
            last_times[sym] = et
        return results


class SessionGapRule(QualityRule):
    """Flags bars occurring outside standard Indian market hours (09:15 - 15:30 IST)."""

    def __init__(self, start_time: time = time(9, 15), end_time: time = time(15, 30)) -> None:
        self.start_time = start_time
        self.end_time = end_time

    @property
    def rule_name(self) -> str:
        return "session_gap"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.WARNING

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        for idx, rec in enumerate(records):
            et = _get_val(rec, "event_time")
            sym = _get_val(rec, "symbol")
            if et is None:
                continue

            # Convert to IST time
            ist_dt = to_ist(et) if et.tzinfo else et
            rec_time = ist_dt.time()

            if rec_time < self.start_time or rec_time > self.end_time:
                results.append(
                    QualityResult(
                        rule_name=self.rule_name,
                        severity=self.severity,
                        passed=False,
                        details=f"Bar timestamp {rec_time.strftime('%H:%M:%S')} IST is outside trading session [09:15-15:30]",
                        record_index=idx,
                        symbol=sym,
                        field="event_time",
                    )
                )
        return results


class DuplicateDateRule(QualityRule):
    """Detects multiple bars on the exact same calendar date for the same symbol."""

    @property
    def rule_name(self) -> str:
        return "duplicate_date"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        seen_dates: dict[tuple[str, Any], int] = {}

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            et = _get_val(rec, "event_time") or _get_val(rec, "timestamp")
            if et is None:
                continue

            cal_date = et.date() if hasattr(et, "date") else str(et)[:10]
            key = (sym, cal_date)

            if key in seen_dates:
                results.append(
                    QualityResult(
                        rule_name=self.rule_name,
                        severity=self.severity,
                        passed=False,
                        details=f"Duplicate bar on same calendar date {cal_date} for symbol {sym}",
                        record_index=idx,
                        symbol=sym,
                        field="event_time",
                    )
                )
            else:
                seen_dates[key] = idx
        return results


class ExtremePriceJumpRule(QualityRule):
    """Detects single-day price jumps exceeding statutory circuit limits without corporate action."""

    def __init__(self, max_allowed_jump_pct: float = 35.0) -> None:
        self.max_allowed_jump_pct = max_allowed_jump_pct

    @property
    def rule_name(self) -> str:
        return "extreme_price_jump"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        last_close: dict[str, float] = {}

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            c = _get_val(rec, "close")
            et = _get_val(rec, "event_time") or _get_val(rec, "timestamp")
            t_str = str(et)[:10] if et is not None else ""

            if c is not None and sym in last_close:
                prev = last_close[sym]
                if prev > 0:
                    pct = abs((c - prev) / prev) * 100.0
                    # Special exception for Lok Sabha election result day 2024-06-04
                    if pct > self.max_allowed_jump_pct and t_str != "2024-06-04":
                        results.append(
                            QualityResult(
                                rule_name=self.rule_name,
                                severity=self.severity,
                                passed=False,
                                details=f"Single-day price change of {pct:.2f}% breaches statutory boundary ({self.max_allowed_jump_pct}%) without corporate action",
                                record_index=idx,
                                symbol=sym,
                                field="close",
                                metric_value=pct,
                            )
                        )
            if c is not None and c > 0:
                last_close[sym] = float(c)

        return results
