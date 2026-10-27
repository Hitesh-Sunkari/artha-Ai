"""Data quality rules for order book snapshots and updates."""

from typing import Any

from arthaai.data.quality.rules import QualityResult, QualityRule, QualitySeverity


def _get_val(record: Any, field: str, default: Any = None) -> Any:
    if isinstance(record, dict):
        return record.get(field, default)
    return getattr(record, field, default)


class CrossedMarketRule(QualityRule):
    """Verifies that best bid is strictly less than best ask (bid < ask)."""

    @property
    def rule_name(self) -> str:
        return "crossed_market"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol")
            bid = _get_val(rec, "bid_price")
            ask = _get_val(rec, "ask_price")

            # Check L1 / Quote style
            if bid is not None and ask is not None:
                if bid >= ask:
                    results.append(
                        QualityResult(
                            rule_name=self.rule_name,
                            severity=self.severity,
                            passed=False,
                            details=f"Crossed/locked market: bid ({bid}) >= ask ({ask})",
                            record_index=idx,
                            symbol=sym,
                            field="bid_price",
                            metric_value=float(bid - ask),
                        )
                    )
                continue

            # Check OrderBookSnapshot style (bids/asks lists)
            bids = _get_val(rec, "bids")
            asks = _get_val(rec, "asks")
            if bids and asks:
                best_bid = _get_val(bids[0], "price")
                best_ask = _get_val(asks[0], "price")
                if best_bid is not None and best_ask is not None and best_bid >= best_ask:
                    results.append(
                        QualityResult(
                            rule_name=self.rule_name,
                            severity=self.severity,
                            passed=False,
                            details=f"Crossed/locked book: best bid ({best_bid}) >= best ask ({best_ask})",
                            record_index=idx,
                            symbol=sym,
                            field="bids",
                            metric_value=float(best_bid - best_ask),
                        )
                    )
        return results


class SequenceGapRule(QualityRule):
    """Detects missing sequence numbers in stream data."""

    @property
    def rule_name(self) -> str:
        return "sequence_gap"

    @property
    def severity(self) -> QualitySeverity:
        return QualitySeverity.ERROR

    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        results: list[QualityResult] = []
        last_seq: dict[str, int] = {}

        for idx, rec in enumerate(records):
            sym = _get_val(rec, "symbol", "UNKNOWN")
            seq = _get_val(rec, "sequence_number")
            if seq is None:
                continue

            if sym in last_seq:
                expected = last_seq[sym] + 1
                if seq != expected:
                    results.append(
                        QualityResult(
                            rule_name=self.rule_name,
                            severity=self.severity,
                            passed=False,
                            details=f"Sequence gap for {sym}: received {seq}, expected {expected}",
                            record_index=idx,
                            symbol=sym,
                            field="sequence_number",
                            metric_value=float(seq - expected),
                        )
                    )
            last_seq[sym] = seq

        return results
