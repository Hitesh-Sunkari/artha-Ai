"""Data quality rules for corporate actions and price discontinuities."""

from typing import Any

from arthaai.data.quality.rules import QualityResult, QualityRule, QualitySeverity


def _get_val(record: Any, field: str, default: Any = None) -> Any:
    if isinstance(record, dict):
        return record.get(field, default)
    return getattr(record, field, default)


class PriceDiscontinuityRule(QualityRule):
    """Detects large unexplained day-over-day price discontinuities (e.g. > threshold %).

    Often indicates unadjusted corporate actions (splits/bonuses) or bad ticks.
    """

    def __init__(self, max_pct_change: float = 0.20) -> None:
        self.max_pct_change = max_pct_change

    @property
    def rule_name(self) -> str:
        return "price_discontinuity"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.WARNING

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        last_closes: dict[str, float] = {}

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            c = _get_val(rec, "close")
            if c is None:
                continue

            if sym in last_closes and last_closes[sym] > 0:
                prev_c = last_closes[sym]
                pct_change = abs(c - prev_c) / prev_c
                if pct_change > self.max_pct_change:
                    results.append(
                        QualityResult(
                            rule_name=self.rule_name,
                            severity=self.severity,
                            passed=False,
                            details=f"Large price jump of {pct_change:.1%} (prev close: {prev_c}, current: {c})",
                            record_index=idx,
                            symbol=sym,
                            field="close",
                            metric_value=float(pct_change),
                        )
                    )
            last_closes[sym] = float(c)

        return results
