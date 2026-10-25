"""Comprehensive Unit Tests for Feature Core Subsystem.

Validates definitions, parameters, results, context, DAG, and registry
for mathematical correctness, point-in-time invariants, and determinism.
"""

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from arthaai.core.errors import PointInTimeError
from arthaai.core.instruments.contracts import AssetClass, Exchange, Instrument
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.data.schemas.raw_record import DataMode
from arthaai.features.core import (
    FeatureContext,
    FeatureDefinition,
    FeatureDependencyGraph,
    FeatureFrequency,
    FeatureParameter,
    FeatureRegistry,
    FeatureResult,
    FeatureSet,
    FeatureStatus,
    FeatureType,
    WarmupPolicy,
)


def sample_instrument() -> Instrument:
    return Instrument(
        symbol="NIFTY",
        exchange=Exchange.NSE,
        asset_class=AssetClass.INDEX,
        lot_size=25,
        tick_size=0.05,
    )


# =====================================================================
# 1. FeatureDefinition & FeatureParameter Tests
# =====================================================================


def test_valid_feature_definition():
    param = FeatureParameter(
        name="period",
        param_type="int",
        default_value=20,
        min_value=2,
        max_value=200,
    )
    feat = FeatureDefinition(
        name="EMA_20",
        version="1.0.0",
        description="20-period Exponential Moving Average",
        feature_type=FeatureType.TREND,
        status=FeatureStatus.VALIDATED,
        required_datasets=["ohlcv"],
        required_columns=["close"],
        frequency=FeatureFrequency.MINUTE_5.value,
        lookback=20,
        warmup_requirements=60,
        warmup_policy=WarmupPolicy.EXPONENTIAL,
        computation="EMA(close, 20)",
        provenance=FieldProvenance.DERIVED,
        parameters={"period": 20},
        parameter_schema={"period": param},
    )
    assert feat.name == "EMA_20"
    assert feat.lookback == 20
    assert feat.warmup_requirements == 60
    assert feat.parameters["period"] == 20


def test_invalid_feature_definition_negative_lookback():
    with pytest.raises(ValueError, match="greater than or equal to 0"):
        FeatureDefinition(
            name="INVALID_LOOKBACK",
            lookback=-5,
        )


def test_parameter_bounds_validation():
    param = FeatureParameter(
        name="rsi_period",
        param_type="int",
        default_value=14,
        min_value=2,
        max_value=100,
        allowed_values=[7, 14, 21],
    )
    # Valid
    param.validate_value(14)

    # Below minimum
    with pytest.raises(ValueError, match="is not in allowed values"):
        param.validate_value(1)

    # Disallowed value
    with pytest.raises(ValueError, match="is not in allowed values"):
        param.validate_value(28)


def test_stochastic_feature_requires_random_seed():
    # Stochastic without seed should fail
    with pytest.raises(ValueError, match="explicit random_seed"):
        FeatureDefinition(
            name="STOCHASTIC_SAMPLE",
            is_deterministic=False,
            random_seed=None,
        )

    # Stochastic with seed succeeds
    feat = FeatureDefinition(
        name="STOCHASTIC_SAMPLE",
        is_deterministic=False,
        random_seed=42,
    )
    assert feat.random_seed == 42


def test_feature_definition_stable_fingerprint():
    feat1 = FeatureDefinition(
        name="SMA_50",
        version="1.0.0",
        feature_type=FeatureType.TREND,
        lookback=50,
        parameters={"period": 50},
    )
    feat2 = FeatureDefinition(
        name="SMA_50",
        version="1.0.0",
        feature_type=FeatureType.TREND,
        lookback=50,
        parameters={"period": 50},
    )
    fp1 = feat1.compute_fingerprint()
    fp2 = feat2.compute_fingerprint()
    assert fp1 == fp2
    assert len(fp1) == 64  # Valid SHA-256


# =====================================================================
# 2. FeatureResult & FeatureSet Tests
# =====================================================================


def test_immutable_feature_result():
    t_event = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_avail = datetime(2026, 9, 9, 10, 0, 1, tzinfo=UTC)

    res = FeatureResult(
        feature_name="RSI_14",
        feature_version="1.0.0",
        event_time=t_event,
        availability_time=t_avail,
        value=65.5,
        provenance=FieldProvenance.DERIVED,
    )
    assert res.is_available is True
    assert res.value == 65.5

    # Immutable: mutating raises ValidationError
    with pytest.raises(ValidationError):
        res.value = 70.0  # type: ignore


def test_feature_result_pit_violation():
    t_event = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_avail_bad = datetime(2026, 9, 9, 9, 59, 59, tzinfo=UTC)

    with pytest.raises(ValueError, match="Point-in-time violation"):
        FeatureResult(
            feature_name="BAD_RESULT",
            event_time=t_event,
            availability_time=t_avail_bad,
            value=100.0,
        )


def test_feature_result_nan_coercion():
    t_event = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_avail = datetime(2026, 9, 9, 10, 0, 1, tzinfo=UTC)

    res = FeatureResult(
        feature_name="VOL_DIV_ZERO",
        event_time=t_event,
        availability_time=t_avail,
        value=float("nan"),
        provenance=FieldProvenance.DERIVED,
    )
    # NaN must be normalized to None, not silent 0.0!
    assert res.value is None
    assert res.provenance == FieldProvenance.UNAVAILABLE
    assert res.is_available is False
    assert res.quality_status == "NAN_OR_NULL"


def test_feature_set_deterministic_composition():
    inst = sample_instrument()
    t_bar = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_avail = datetime(2026, 9, 9, 10, 0, 2, tzinfo=UTC)

    r1 = FeatureResult(
        feature_name="EMA_20",
        event_time=t_bar,
        availability_time=t_avail,
        value=25000.0,
        provenance=FieldProvenance.DERIVED,
    )
    r2 = FeatureResult(
        feature_name="RSI_14",
        event_time=t_bar,
        availability_time=t_avail,
        value=55.2,
        provenance=FieldProvenance.DERIVED,
    )

    fset = FeatureSet(
        instrument=inst,
        event_time=t_bar,
        availability_time=t_avail,
        results={"EMA_20": r1, "RSI_14": r2},
    )

    assert fset.get("EMA_20") == 25000.0
    assert fset.get("RSI_14") == 55.2
    assert fset.get("UNKNOWN", default=None) is None

    fp1 = fset.compute_fingerprint()
    assert len(fp1) == 64


# =====================================================================
# 3. FeatureContext Tests
# =====================================================================


def test_feature_context_pit_validation():
    inst = sample_instrument()
    t_decision = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)

    ctx = FeatureContext(
        decision_time=t_decision,
        instrument=inst,
    )

    # Valid record available before decision time
    bar_valid = OHLCVBar(
        symbol="NIFTY",
        exchange="NSE",
        asset_class="INDEX",
        frequency=BarFrequency.M5,
        event_time=t_decision - timedelta(minutes=5),
        availability_time=t_decision - timedelta(seconds=10),
        open=25000.0,
        high=25050.0,
        low=24980.0,
        close=25020.0,
        volume=100000,
        source="NSE",
        data_mode=DataMode.HISTORICAL,
    )
    ctx.validate_record_pit(bar_valid)

    # Invalid record available AFTER decision time
    bar_future = OHLCVBar(
        symbol="NIFTY",
        exchange="NSE",
        asset_class="INDEX",
        frequency=BarFrequency.M5,
        event_time=t_decision,
        availability_time=t_decision + timedelta(seconds=1),
        open=25020.0,
        high=25080.0,
        low=25010.0,
        close=25060.0,
        volume=120000,
        source="NSE",
        data_mode=DataMode.HISTORICAL,
    )
    with pytest.raises(PointInTimeError, match="Lookahead violation"):
        ctx.validate_record_pit(bar_future)


def test_feature_context_filter_pit_records():
    inst = sample_instrument()
    t_decision = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    ctx = FeatureContext(decision_time=t_decision, instrument=inst)

    bars = [
        OHLCVBar(
            symbol="NIFTY",
            exchange="NSE",
            asset_class="INDEX",
            frequency=BarFrequency.M5,
            event_time=t_decision - timedelta(minutes=10),
            availability_time=t_decision - timedelta(minutes=5),
            open=25000.0,
            high=25050.0,
            low=24980.0,
            close=25020.0,
            volume=1000,
            source="NSE",
            data_mode=DataMode.HISTORICAL,
        ),
        OHLCVBar(
            symbol="NIFTY",
            exchange="NSE",
            asset_class="INDEX",
            frequency=BarFrequency.M5,
            event_time=t_decision,
            availability_time=t_decision + timedelta(seconds=5),  # FUTURE!
            open=25020.0,
            high=25080.0,
            low=25010.0,
            close=25060.0,
            volume=2000,
            source="NSE",
            data_mode=DataMode.HISTORICAL,
        ),
    ]

    filtered = ctx.filter_pit_records(bars)
    assert len(filtered) == 1
    assert filtered[0].volume == 1000


# =====================================================================
# 4. FeatureDependencyGraph Tests
# =====================================================================


def test_feature_dag_linear_chain():
    dag = FeatureDependencyGraph()

    f_a = FeatureDefinition(name="A")
    f_b = FeatureDefinition(name="B")
    f_c = FeatureDefinition(name="C")

    # Order of insertion is scrambled: C, A, B
    dag.add_feature(f_c, dependencies=["B"])
    dag.add_feature(f_a)
    dag.add_feature(f_b, dependencies=["A"])

    order = dag.topological_sort()
    assert order == ["A", "B", "C"]


def test_feature_dag_cycle_detection():
    dag = FeatureDependencyGraph()
    f_a = FeatureDefinition(name="A")
    f_b = FeatureDefinition(name="B")

    dag.add_feature(f_a, dependencies=["B"])
    dag.add_feature(f_b, dependencies=["A"])

    with pytest.raises(ValueError, match="Cyclic dependency detected"):
        dag.topological_sort()


def test_feature_dag_missing_dependency():
    dag = FeatureDependencyGraph()
    f_a = FeatureDefinition(name="A")
    dag.add_feature(f_a, dependencies=["MISSING_PREREQUISITE"])

    with pytest.raises(ValueError, match="Missing dependency error"):
        dag.topological_sort()


def test_feature_dag_duplicate_feature():
    dag = FeatureDependencyGraph()
    f_a = FeatureDefinition(name="A")
    dag.add_feature(f_a)

    with pytest.raises(ValueError, match="Duplicate feature registration"):
        dag.add_feature(f_a)


def test_feature_dag_deterministic_tie_breaking():
    # Independent nodes X, M, B with no dependencies should resolve in strict alphabetical order: B, M, X
    dag = FeatureDependencyGraph()
    dag.add_feature(FeatureDefinition(name="X"))
    dag.add_feature(FeatureDefinition(name="M"))
    dag.add_feature(FeatureDefinition(name="B"))

    order = dag.topological_sort()
    assert order == ["B", "M", "X"]


# =====================================================================
# 5. FeatureRegistry Tests
# =====================================================================


def test_feature_registry_lifecycle():
    reg = FeatureRegistry()

    f1 = FeatureDefinition(name="VWAP", version="1.0.0", feature_type=FeatureType.VOLUME)
    f2 = FeatureDefinition(name="VWAP", version="1.1.0", feature_type=FeatureType.VOLUME)
    f3 = FeatureDefinition(name="RSI", version="1.0.0", feature_type=FeatureType.MOMENTUM)

    reg.register(f1)
    reg.register(f2)
    reg.register(f3)

    # Get latest version of VWAP
    assert reg.get("VWAP").version == "1.1.0"
    # Get specific version
    assert reg.get("VWAP", "1.0.0").version == "1.0.0"

    # Duplicate registration of same name and version must fail
    with pytest.raises(ValueError, match="already registered"):
        reg.register(f1)

    # Filter by type
    volume_feats = reg.get_by_type(FeatureType.VOLUME)
    assert len(volume_feats) == 2

    # Deterministic fingerprint
    fp1 = reg.compute_fingerprint()
    assert len(fp1) == 64
