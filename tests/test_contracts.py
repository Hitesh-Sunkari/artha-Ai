from datetime import UTC, date, datetime, timedelta

import pytest

from arthaai.backtest.base import BacktestArtifact
from arthaai.control_plane.market_rules.registry import MarketRuleSet
from arthaai.core.clock.timezone import now_utc
from arthaai.core.events.market_events import MarketEvent
from arthaai.core.instruments.contracts import AssetClass, Exchange, Instrument
from arthaai.core.orders.order import ExecutionReport, OrderIntent, OrderSide, OrderStatus, OrderType
from arthaai.core.portfolio.position import PortfolioTarget
from arthaai.core.signals.insight import AlphaSignal, SignalDirection
from arthaai.features.lineage import FeatureDefinition, FeatureSet
from arthaai.strategy.risk.base import RiskDecision


def create_sample_instrument() -> Instrument:
    return Instrument(
        symbol="NIFTY",
        exchange=Exchange.NSE,
        asset_class=AssetClass.INDEX,
        lot_size=75,
        tick_size=0.05,
    )

def test_market_event_point_in_time_validity():
    t_event = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_received = datetime(2026, 9, 9, 10, 0, 1, tzinfo=UTC)
    inst = create_sample_instrument()

    # Valid point in time: received >= event
    event = MarketEvent(
        event_id="EVT_001",
        event_time=t_event,
        received_time=t_received,
        source="NSE_TICK",
        instrument=inst,
        payload={"price": 25000.0, "qty": 75},
    )
    assert event.availability_time == t_received
    assert event.event_time.tzinfo == UTC

    # Look-ahead violation: received < event must raise ValueError
    t_impossible = datetime(2026, 9, 9, 9, 59, 59, tzinfo=UTC)
    with pytest.raises(ValueError, match="Point-in-time violation"):
        MarketEvent(
            event_id="EVT_BAD",
            event_time=t_event,
            received_time=t_impossible,
            source="NSE_TICK",
            instrument=inst,
            payload={"price": 25000.0},
        )

def test_feature_set_point_in_time_validity():
    t_bar = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    t_calc = datetime(2026, 9, 9, 10, 0, 2, tzinfo=UTC)
    inst = create_sample_instrument()

    feat_def = FeatureDefinition(
        feature_id="EMA_20",
        version="1.0.0",
        formula="EMA(close, 20)",
        inputs=["close"],
        timeframe="1m",
        lookback=20,
        point_in_time_safe=True,
        dataset_version="NSE_1M_V1",
        code_version="git_sha_abc",
    )

    fset = FeatureSet(
        instrument=inst,
        event_time=t_bar,
        availability_time=t_calc,
        values={"EMA_20": 24980.5},
        definitions={"EMA_20": feat_def},
    )
    assert fset.availability_time >= fset.event_time

    # Invalid: availability earlier than bar close
    with pytest.raises(ValueError, match="Point-in-time violation"):
        FeatureSet(
            instrument=inst,
            event_time=t_bar,
            availability_time=t_bar - timedelta(seconds=1),
            values={"EMA_20": 24980.5},
            definitions={"EMA_20": feat_def},
        )

def test_signal_has_source_and_timestamp():
    inst = create_sample_instrument()
    sig = AlphaSignal(
        signal_id="SIG_101",
        timestamp=now_utc(),
        source="TrendFollowingAlpha_v1",
        instrument=inst,
        direction=SignalDirection.BULLISH,
        confidence=0.85,
    )
    assert len(sig.source) > 0
    assert sig.timestamp.tzinfo is not None

def test_portfolio_target_has_timestamp():
    inst = create_sample_instrument()
    t = PortfolioTarget(
        target_id="TGT_001",
        timestamp=now_utc(),
        instrument=inst,
        target_weight=0.10,
        allocated_capital=100_000.0,
    )
    assert t.timestamp is not None
    assert t.timestamp.tzinfo is not None

def test_risk_decision_references_market_rules():
    rule_set = MarketRuleSet(
        rule_set_id="SEBI_NOV_2024",
        exchange="NSE",
        instrument_type="INDEX_DERIVATIVES",
        effective_from=date(2024, 11, 20),
        version="2.0",
        source="SEBI/HO/MRD/2024/11",
        rules={"NIFTY_LOT_SIZE": 75},
    )

    decision = RiskDecision(
        decision_id="DEC_001",
        target_id="TGT_001",
        timestamp=now_utc(),
        approved=True,
        target_position=75,
        maximum_position=150,
        maximum_loss=10_000.0,
        reason="Within daily risk budget",
        risk_checks={"fno_ban": True, "margin_ok": True},
        rule_version=rule_set.version,
        rule_set_id=rule_set.rule_set_id,
    )
    assert decision.rule_version == "2.0"
    assert decision.rule_set_id == "SEBI_NOV_2024"

def test_order_intent_references_originating_decision():
    inst = create_sample_instrument()
    intent = OrderIntent(
        order_intent_id="INTENT_777",
        originating_decision_id="DEC_001",
        timestamp=now_utc(),
        instrument=inst,
        side=OrderSide.BUY,
        order_type=OrderType.LIMIT,
        quantity=75,
        price=25000.0,
    )
    assert intent.originating_decision_id == "DEC_001"

def test_execution_report_references_order_intent():
    inst = create_sample_instrument()
    report = ExecutionReport(
        execution_report_id="FILL_888",
        order_intent_id="INTENT_777",
        timestamp=now_utc(),
        instrument=inst,
        side=OrderSide.BUY,
        status=OrderStatus.FILLED,
        filled_quantity=75,
        average_price=25000.0,
        stt_tax=37.5,
    )
    assert report.order_intent_id == "INTENT_777"
    assert report.filled_quantity == 75

def test_backtest_artifact_records_versions():
    artifact = BacktestArtifact(
        artifact_id="ART_999",
        run_id="RUN_2026_09",
        dataset_version="NSE_NIFTY_2020_2025_V3",
        strategy_version="TrendBreakout_v2.1",
        config_version="CONFIG_STRICT_RISK_V1",
        metrics={"sharpe": 2.1, "max_drawdown": 0.08},
    )
    assert artifact.dataset_version == "NSE_NIFTY_2020_2025_V3"
    assert artifact.strategy_version == "TrendBreakout_v2.1"
    assert artifact.config_version == "CONFIG_STRICT_RISK_V1"
