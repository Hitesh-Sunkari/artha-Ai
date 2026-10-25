"""Adversarial Tests for Feature Core Subsystem.

Specifically designed to probe and catch:
1. Lookahead leakage / future timestamp injection
2. Silent zero fallback for missing/NaN data
3. Nondeterministic ordering across scrambled DAG insertions
4. Hash instability across repeated serialization
5. Provenance downgrading/upgrading violations
"""

import math
from datetime import UTC, datetime, timedelta

import pytest

from arthaai.core.errors import PointInTimeError
from arthaai.core.instruments.contracts import AssetClass, Exchange, Instrument
from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.features.core import (
    FeatureContext,
    FeatureDefinition,
    FeatureDependencyGraph,
    FeatureResult,
    FeatureSet,
    FeatureType,
)


def sample_inst() -> Instrument:
    return Instrument(
        symbol="NIFTY",
        exchange=Exchange.NSE,
        asset_class=AssetClass.INDEX,
        lot_size=25,
        tick_size=0.05,
    )


def test_adversarial_future_timestamp_rejected():
    """An availability_time before event_time violates physical causality."""
    t_now = datetime(2026, 9, 9, 12, 0, 0, tzinfo=UTC)
    t_impossible = t_now - timedelta(microseconds=1)

    with pytest.raises(ValueError, match="Point-in-time violation"):
        FeatureResult(
            feature_name="ADV_FUTURE_LEAK",
            event_time=t_now,
            availability_time=t_impossible,
            value=123.45,
        )

    with pytest.raises(ValueError, match="Point-in-time violation"):
        FeatureSet(
            instrument=sample_inst(),
            event_time=t_now,
            availability_time=t_impossible,
            values={"ADV_FUTURE_LEAK": 123.45},
        )


def test_adversarial_availability_after_decision_time():
    """FeatureContext must catch any record where availability_time > decision_time."""
    inst = sample_inst()
    t_decision = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    ctx = FeatureContext(decision_time=t_decision, instrument=inst)

    class SyntheticRecord:
        def __init__(self, avail: datetime):
            self.availability_time = avail

    # 1 millisecond into the future is a violation!
    leaking_record = SyntheticRecord(t_decision + timedelta(milliseconds=1))
    with pytest.raises(PointInTimeError, match="Lookahead violation"):
        ctx.validate_record_pit(leaking_record)


def test_adversarial_nan_never_silently_converted_to_zero():
    """Mathematical NaN or division-by-zero must NEVER become 0.0."""
    t_event = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_avail = datetime(2026, 9, 9, 10, 0, 1, tzinfo=UTC)

    # Synthetic 0/0 calculation
    try:
        val = 0.0 / 0.0
    except ZeroDivisionError:
        val = float("nan")

    assert math.isnan(val)

    res = FeatureResult(
        feature_name="DIV_ZERO_TEST",
        event_time=t_event,
        availability_time=t_avail,
        value=val,
        provenance=FieldProvenance.DERIVED,
    )

    # CRITICAL AUDIT CHECK: Value must be None, NOT 0.0!
    assert res.value != 0.0
    assert res.value is None
    assert res.is_available is False
    assert res.provenance == FieldProvenance.UNAVAILABLE
    assert res.quality_status == "NAN_OR_NULL"


def test_adversarial_dag_scrambled_deterministic_ordering():
    """Regardless of insertion order, topological sort MUST yield bit-for-bit identical sequences."""
    # Graph dependencies:
    # A -> B -> C -> D
    # E -> D
    # F (isolated)

    def build_graph(order: list[tuple[str, list[str]]]) -> list[str]:
        dag = FeatureDependencyGraph()
        for name, deps in order:
            dag.add_feature(FeatureDefinition(name=name), dependencies=deps)
        return dag.topological_sort()

    scramble_1 = [
        ("D", ["C", "E"]),
        ("C", ["B"]),
        ("B", ["A"]),
        ("A", []),
        ("E", []),
        ("F", []),
    ]

    scramble_2 = [
        ("F", []),
        ("A", []),
        ("E", []),
        ("B", ["A"]),
        ("C", ["B"]),
        ("D", ["C", "E"]),
    ]

    scramble_3 = [
        ("E", []),
        ("F", []),
        ("D", ["C", "E"]),
        ("A", []),
        ("C", ["B"]),
        ("B", ["A"]),
    ]

    res_1 = build_graph(scramble_1)
    res_2 = build_graph(scramble_2)
    res_3 = build_graph(scramble_3)

    assert res_1 == res_2 == res_3
    # Lexicographical tie-breaking ensures A, E, F are sequenced deterministically
    assert res_1 == ["A", "B", "C", "E", "D", "F"]


def test_adversarial_hash_stability():
    """Calculates hash 100 times across reconstructed instances and ensures 100% stability."""
    hashes = set()
    for _ in range(100):
        feat = FeatureDefinition(
            name="STABLE_HASH_FEATURE",
            version="1.0.0",
            feature_type=FeatureType.MOMENTUM,
            required_datasets=["ohlcv"],
            required_columns=["high", "low", "close"],
            parameters={"period": 14, "smooth": 3},
        )
        hashes.add(feat.compute_fingerprint())

    assert len(hashes) == 1, "Hash was unstable across repeated identical definitions!"
