"""QualityRunner orchestrating execution of quality checks on dataset records."""

from typing import Any

from arthaai.core.errors import DataQualityError
from arthaai.data.quality.corporate_action_rules import PriceDiscontinuityRule
from arthaai.data.quality.ohlcv_rules import (
    DuplicateRecordRule,
    NegativePriceRule,
    OHLCConsistencyRule,
    SessionGapRule,
    StaleQuoteRule,
    TimestampOrderRule,
    ZeroVolumeRule,
)
from arthaai.data.quality.orderbook_rules import CrossedMarketRule, SequenceGapRule
from arthaai.data.quality.rules import QualityReport, QualityResult, QualityRule, QualitySeverity


class QualityRunner:
    """Orchestrates data quality rules against record collections."""

    def __init__(self, rules: list[QualityRule] | None = None, strict: bool = False) -> None:
        self.rules = rules if rules is not None else self.default_rules()
        self.strict = strict

    @classmethod
    def default_rules(cls) -> list[QualityRule]:
        """Returns standard suite of rules for general market data."""
        return [
            OHLCConsistencyRule(),
            NegativePriceRule(),
            ZeroVolumeRule(),
            TimestampOrderRule(),
            DuplicateRecordRule(),
            CrossedMarketRule(),
            SequenceGapRule(),
            StaleQuoteRule(),
            SessionGapRule(),
            PriceDiscontinuityRule(),
        ]

    def run(self, records: list[Any], dataset_name: str = "dataset") -> QualityReport:
        """Runs all configured rules against the provided records.

        If strict=True and any ERROR result is found, raises DataQualityError.
        """
        all_results: list[QualityResult] = []

        for rule in self.rules:
            res = rule.evaluate(records)
            all_results.extend(res)

        has_errors = any(r.severity == QualitySeverity.ERROR for r in all_results if not r.passed)
        is_valid = not has_errors

        report = QualityReport(
            dataset_name=dataset_name,
            total_records=len(records),
            is_valid=is_valid,
            results=all_results,
        )

        if self.strict and not is_valid:
            err_details = "; ".join(e.details for e in report.errors[:5])
            raise DataQualityError(
                f"Quality validation failed for {dataset_name} with {report.error_count} error(s): {err_details}"
            )

        return report
