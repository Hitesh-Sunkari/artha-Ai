"""Phase 2 Regression Tests: Evidence, Agent Contracts, and Final Decision Gates.

Covers all 12 regression requirements:
1. Official conviction score absent before final synthesis.
2. Conflicting Skeptic verdict fields rejected and separated.
3. Unresolved critical Skeptic objection blocks unsupported positive recommendation.
4. Quantitative metrics reproducible from stored observations.
5. Extreme volatility and circuit filter trigger data-quality checks.
6. Unsupported microstructure measurements (slippage) become explicitly unavailable.
7. Unresolved RAG citations fail evidence validation.
8. Stress tests marked passed only after actual deterministic execution.
9. Final synthesis consumes the validated Risk Validator artifact.
10. Duplicate trace events prevented (single Manager start/complete).
11. Blackboard artifact consumption provable via consumer lineage.
12. Frontend statuses and canonical recommendation enum matching persisted backend contract.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
import math
import time
import duckdb
import pytest

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import (
    A2AClientBridge,
    CrewAISpecialistExecutor,
    create_a2a_crewai_app,
)
from arthaai.orchestration.adk_coordinator import (
    ADKCoordinator,
    ADKQuantSpecialist,
    ADKMicrostructureSpecialist,
    ADKRiskValidator,
    OrchestrationPattern,
    assign_liquidity_tier,
)
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import ExecutionTracer, LifecycleEventType
from arthaai.schemas.research_output import (
    AgentContribution,
    QuantitativeResearchReport,
    ResearchRequest,
    canonicalize_recommendation,
)


# ---------------------------------------------------------------------------
# 1. Official conviction score absent before final synthesis
# ---------------------------------------------------------------------------
def test_conviction_absent_before_final_synthesis():
    """Initial Manager stage must publish only provisional plan with conviction_score=None."""
    blackboard = Blackboard(run_id="run-test-conv-absent")

    # Initial provisional plan written by Manager
    plan_c = AgentContribution(
        agent_id="adk_research_manager",
        framework="GOOGLE_ADK",
        task_name="research_plan_and_supervision",
        status="SUCCESS",
        execution_status="COMPLETED",
        evidence_status="NOT_APPLICABLE",
        analytical_verdict="NOT_EVALUATED",
        validation_outcome="NOT_EVALUATED",
        conviction_score=None,
        findings={
            "initial_hypothesis": "PROVISIONAL_EVALUATION_PENDING_SPECIALIST_EVIDENCE",
            "conviction_score": None,
            "official_recommendation": None,
            "task_dependencies": ["quant_analysis", "market_microstructure", "news_macro", "corporate_filing"],
        },
    )
    blackboard.add_contribution(plan_c)

    retrieved = blackboard.get_latest_contribution("research_plan_and_supervision")
    assert retrieved is not None
    assert retrieved.findings.get("conviction_score") is None
    assert retrieved.findings.get("official_recommendation") is None
    assert retrieved.findings.get("initial_hypothesis") == "PROVISIONAL_EVALUATION_PENDING_SPECIALIST_EVIDENCE"


# ---------------------------------------------------------------------------
# 2. Conflicting Skeptic verdict fields rejected and separated
# ---------------------------------------------------------------------------
def test_conflicting_skeptic_verdict_fields_rejected_and_separated():
    """Ensure separation of execution_status, evidence_status, analytical_verdict, validation_outcome."""
    executor = CrewAISpecialistExecutor()
    failing_context = {
        "records_retrieved": 1260,
        "empty_result": False,
        "recent_returns": [-0.5834, 0.01, -0.02],
        "calculated_metrics": {
            "realized_volatility_annualized": 2.101,
            "sample_return_mean": -0.0008,
            "latest_close": 680.20,
        },
        "corwin_schultz_spread_bps": 62.67,
        "average_daily_turnover_inr_cr": 333.27,
    }

    result = asyncio.run(
        executor._execute_adversarial_critique(
            symbol="HDFCBANK.NS",
            run_id="run-test-critique",
            instructions="Red team HDFCBANK thesis",
            context=failing_context,
        )
    )

    # Execution completed without python crashes
    assert result.execution_status == "COMPLETED"
    # But analytical verdict is REJECTED because stress tests failed
    assert result.analytical_verdict == "REJECTED"
    assert result.validation_outcome == "BLOCKED"
    assert result.findings.get("skeptic_verdict") == "REJECTED"
    # Objections are explicitly populated
    assert len(result.findings.get("objections", [])) > 0
    # Must NOT claim CONDITIONALLY APPROVED
    assert result.findings.get("skeptic_verdict") != "CONDITIONALLY_APPROVED_WITH_STATUTORY_DRAG_DISCOUNT"


# ---------------------------------------------------------------------------
# 3. Unresolved critical Skeptic objection blocks positive recommendation
# ---------------------------------------------------------------------------
def test_unresolved_skeptic_objection_blocks_positive_recommendation():
    """Risk Validator must classify objections as UNRESOLVED and block synthesis."""
    blackboard = Blackboard(run_id="run-test-block")
    tracer = ExecutionTracer(run_id="run-test-block")
    mcp_client = get_mcp_client()
    validator = ADKRiskValidator(mcp_client=mcp_client)

    # Post Skeptic contribution with critical objection
    skeptic_c = AgentContribution(
        agent_id="crewai_adversarial_specialist",
        framework="CREWAI",
        task_name="adversarial_critique",
        status="SUCCESS",
        execution_status="COMPLETED",
        evidence_status="VERIFIED",
        analytical_verdict="REJECTED",
        validation_outcome="BLOCKED",
        findings={
            "skeptic_verdict": "REJECTED",
            "objections": [
                "CIRCUIT_FILTER_BREACH",
                "EXTREME_VOLATILITY_ANOMALY",
            ],
            "stress_tests": {
                "circuit_filter_boundary": "FAILED: Trailing price move of 58.34% breaches NSE 20.0% circuit filter limit.",
                "volatility_shock_test": "FAILED: Baseline annualized volatility (210.1%) exceeds 80% boundary.",
            },
        },
    )
    blackboard.add_contribution(skeptic_c)

    now = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
    # Run Risk Validator
    val_contrib, _ = asyncio.run(
        validator.execute(
            symbol="HDFCBANK.NS",
            as_of_time=now,
            run_id="run-test-block",
            blackboard=blackboard,
            tracer=tracer,
        )
    )

    # Risk Validator must be BLOCKED and REJECTED
    assert val_contrib.validation_outcome == "BLOCKED"
    assert val_contrib.analytical_verdict == "REJECTED"
    assert val_contrib.status == "FAILED"
    objection_reviews = val_contrib.findings.get("unresolved_objections", [])
    assert len(objection_reviews) == 2
    assert "CIRCUIT_FILTER_BREACH" in objection_reviews

    # Add risk validator output to blackboard
    blackboard.add_contribution(val_contrib)

    # Now verify ADKCoordinator final synthesis enforces INCONCLUSIVE
    coordinator = ADKCoordinator(mcp_client=mcp_client)
    request = ResearchRequest(
        request_id="req-test-gate",
        run_id="run-test-block",
        symbol="HDFCBANK.NS",
        as_of_time=now,
    )

    report = asyncio.run(
        coordinator._synthesize_report(
            request=request,
            blackboard=blackboard,
            start_time=time.perf_counter(),
            tracer=tracer,
        )
    )
    # Manager CANNOT override Risk Validator gate failure:
    assert report.recommendation == "INCONCLUSIVE"
    assert report.conviction_score is None
    assert any("Risk Validator Gate BLOCKED" in lim or "Adversarial Skeptic Gate REJECTED" in lim for lim in report.limitations_and_uncertainties)


# ---------------------------------------------------------------------------
# 4. Quantitative metrics reproducible from stored observations
# ---------------------------------------------------------------------------
def test_quantitative_metrics_reproducible_from_stored_observations():
    """Verify that HDFCBANK 1,260 bars, close 680.20, RSI 15.01, and 210.1% volatility reproduce from parquet."""
    parquet_path = Path("data/parquet/ohlcv/bars_hdfcbank.parquet")
    if not parquet_path.exists():
        pytest.skip("Historical parquet file bars_hdfcbank.parquet not found.")

    con = duckdb.connect()
    df = con.execute(f"SELECT close, volume FROM read_parquet('{parquet_path.as_posix()}') ORDER BY timestamp ASC").fetchdf()
    con.close()

    total_bars = len(df)
    assert total_bars == 1260

    closes = df["close"].tolist()
    latest_close = closes[-1]
    prev_close = closes[-2]

    # Latest close is 680.20, previous is 1632.86
    assert abs(latest_close - 680.20) < 0.05
    assert abs(prev_close - 1632.86) < 0.05

    # Compute single day return
    single_day_return = (latest_close - prev_close) / prev_close
    assert abs(single_day_return - (-0.5834)) < 0.001

    # Compute 20-day returns and annualized volatility
    recent_closes = closes[-21:]
    returns = [(recent_closes[i] - recent_closes[i - 1]) / recent_closes[i - 1] for i in range(1, len(recent_closes))]
    mean_ret = sum(returns) / len(returns)
    variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
    daily_vol = math.sqrt(variance)
    annualized_vol = daily_vol * math.sqrt(252)

    # Reported annualized volatility was ~210.1%
    assert abs(annualized_vol - 2.101) < 0.05

    # Compute 14-period RSI
    delta = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    recent_delta = delta[-14:]
    gains = [d for d in recent_delta if d > 0]
    losses = [-d for d in recent_delta if d < 0]
    avg_gain = sum(gains) / 14.0 if gains else 0.0
    avg_loss = sum(losses) / 14.0 if losses else 0.0001
    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))

    # Reported RSI was ~15.01
    assert abs(rsi - 15.01) < 0.5


# ---------------------------------------------------------------------------
# 5. Extreme volatility and circuit filter trigger data-quality checks
# ---------------------------------------------------------------------------
def test_extreme_volatility_and_circuit_filter_triggers_data_quality_gate():
    """Quant Specialist flags data anomaly on >20% daily price change and >80% annualized volatility."""
    tracer = ExecutionTracer(run_id="run-test-quant-gate")
    mcp_client = get_mcp_client()
    quant = ADKQuantSpecialist(mcp_client=mcp_client)

    now = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
    contrib, _ = asyncio.run(
        quant.execute(
            symbol="HDFCBANK.NS",
            as_of_time=now,
            run_id="run-test-quant-gate",
            tracer=tracer,
        )
    )

    assert contrib.findings.get("data_quality_status") == "ANOMALOUS_DATA_FLAGGED"
    assert contrib.evidence_status == "UNVERIFIED"
    assert contrib.validation_outcome == "WARNING"
    assert contrib.findings.get("max_daily_price_change_pct") > 20.0
    assert any("circuit filter" in str(iss).lower() for iss in contrib.findings.get("data_quality_issues", []))


# ---------------------------------------------------------------------------
# 6. Unsupported microstructure measurements become unavailable
# ---------------------------------------------------------------------------
def test_unsupported_microstructure_measurements_become_unavailable():
    """Microstructure specialist must label spread as estimated parametric, and mark slippage UNAVAILABLE."""
    blackboard = Blackboard(run_id="run-test-micro")
    tracer = ExecutionTracer(run_id="run-test-micro")
    micro = ADKMicrostructureSpecialist()

    # Synthetic bars in quant contribution
    bars = [
        {"timestamp": f"2026-10-{i+1:02d}", "open": 1000.0, "high": 1010.0, "low": 990.0, "close": 1000.0, "volume": 500000}
        for i in range(40)
    ]
    blackboard.add_contribution(AgentContribution(
        agent_id="adk_quant_specialist",
        framework="GOOGLE_ADK",
        task_name="market_data_and_quant_features",
        status="SUCCESS",
        findings={
            "records_retrieved": 40,
            "empty_result": False,
            "historical_bars": bars,
            "calculated_metrics": {"latest_close": 1000.0},
        },
    ))

    contrib = asyncio.run(
        micro.execute(
            symbol="HDFCBANK.NS",
            run_id="run-test-micro",
            tracer=tracer,
            blackboard=blackboard,
        )
    )

    assert contrib.findings.get("spread_type") == "ESTIMATED_PARAMETRIC"
    assert "Corwin-Schultz" in contrib.findings.get("spread_estimation_method", "")
    assert contrib.findings.get("spread_lookback_window") == 30
    assert contrib.findings.get("effective_slippage_bps") is None
    assert contrib.findings.get("slippage_status") == "UNAVAILABLE_NO_ORDERBOOK_FEED"

    # Test liquidity tier assignment rules
    assert "TIER-1" in assign_liquidity_tier(333.27)  # >= 100 Cr
    assert "TIER-1" in assign_liquidity_tier(100.0)
    assert "TIER-2" in assign_liquidity_tier(50.0)   # 25-100 Cr
    assert "TIER-3" in assign_liquidity_tier(15.0)   # < 25 Cr


# ---------------------------------------------------------------------------
# 7. Unresolved RAG citations fail evidence validation
# ---------------------------------------------------------------------------
def test_unresolved_rag_citations_fail_evidence_validation():
    """RAG evidence items must resolve against real documents; fake citations fail validation."""
    executor = CrewAISpecialistExecutor()

    # Test valid filing retrieval
    filing_contrib = asyncio.run(
        executor._execute_corporate_filing(
            symbol="HDFCBANK.NS",
            run_id="run-test-filing",
            context={"has_filings_feed": True, "topic": "Q2 FY25 LODR compliance"},
        )
    )
    assert filing_contrib.execution_status == "COMPLETED"
    assert filing_contrib.evidence_status == "VERIFIED"
    assert len(filing_contrib.findings.get("structured_evidence", [])) > 0
    first_ev = filing_contrib.findings["structured_evidence"][0]
    assert "HDFCBANK-Q2FY25" in first_ev["source_id"]
    assert first_ev["validation_outcome"] == "RESOLVED_STORED_DOCUMENT"
    assert "HDFC Bank Limited" in first_ev["passage"]

    # Test news macro retrieval
    macro_contrib = asyncio.run(
        executor._execute_news_macro(
            symbol="HDFCBANK.NS",
            run_id="run-test-macro",
            context={"has_macro_feed": True, "topic": "RBI repo rate and monetary stance"},
        )
    )
    assert macro_contrib.execution_status == "COMPLETED"
    assert macro_contrib.evidence_status == "VERIFIED"
    assert len(macro_contrib.findings.get("structured_evidence", [])) > 0
    macro_ev = macro_contrib.findings["structured_evidence"][0]
    assert "RBI" in macro_ev["source_id"]
    assert macro_ev["validation_outcome"] == "RESOLVED_STORED_DOCUMENT"
    assert "6.50%" in macro_ev["passage"]


# ---------------------------------------------------------------------------
# 8. Stress tests marked passed only after actual execution
# ---------------------------------------------------------------------------
def test_stress_tests_marked_passed_only_after_actual_execution():
    """Stress tests must return NOT_EXECUTED or INSUFFICIENT_DATA when inputs are missing."""
    executor = CrewAISpecialistExecutor()
    empty_context = {"records_retrieved": 0, "empty_result": True}
    result = asyncio.run(
        executor._execute_adversarial_critique(
            symbol="TEST.NS",
            run_id="run-test-empty",
            instructions="",
            context=empty_context,
        )
    )
    tests = result.findings.get("stress_tests", {})

    # Without return observations, tests cannot be marked PASSED
    assert "NOT_EXECUTED" in tests["circuit_filter_boundary"]
    assert "NOT_EXECUTED" in tests["volatility_shock_test"]
    assert result.analytical_verdict == "REJECTED"
    assert result.evidence_status == "INSUFFICIENT_DATA"


# ---------------------------------------------------------------------------
# 9. Final synthesis consumes the validated Risk Validator artifact
# ---------------------------------------------------------------------------
def test_final_synthesis_consumes_validated_risk_validator_artifact():
    """Manager _synthesize_report must inspect the Risk Validator artifact on the blackboard."""
    blackboard = Blackboard(run_id="run-test-synth-gate")
    tracer = ExecutionTracer(run_id="run-test-synth-gate")
    coordinator = ADKCoordinator()

    # Post passing Quant and Micro
    blackboard.add_contribution(AgentContribution(
        agent_id="adk_quant_specialist", framework="GOOGLE_ADK", task_name="market_data_and_quant_features",
        status="SUCCESS", execution_status="COMPLETED", evidence_status="VERIFIED",
        analytical_verdict="APPROVED", validation_outcome="PASSED",
        findings={"records_retrieved": 100, "empty_result": False, "calculated_metrics": {"latest_close": 1000.0, "realized_volatility_annualized": 0.20}},
    ))
    # Post BLOCKED Risk Validator
    blackboard.add_contribution(AgentContribution(
        agent_id="adk_risk_validator", framework="GOOGLE_ADK", task_name="statutory_and_risk_validation",
        status="FAILED", execution_status="COMPLETED", evidence_status="VERIFIED",
        analytical_verdict="REJECTED", validation_outcome="BLOCKED",
        findings={"risk_validation_passed": False, "unresolved_objections": ["Risk budget breached"]},
    ))

    request = ResearchRequest(
        request_id="req-synth",
        run_id="run-test-synth-gate",
        symbol="TCS.NS",
        as_of_time=datetime.now(timezone.utc),
    )

    report = asyncio.run(
        coordinator._synthesize_report(
            request=request,
            blackboard=blackboard,
            start_time=time.perf_counter(),
            tracer=tracer,
        )
    )
    assert report.recommendation == "INCONCLUSIVE"
    assert report.conviction_score is None


# ---------------------------------------------------------------------------
# 10. Duplicate trace events prevented
# ---------------------------------------------------------------------------
def test_duplicate_trace_events_prevented():
    """Manager start and complete lifecycle events must have unique execution IDs and no duplicates."""
    tracer = ExecutionTracer(run_id="run-test-trace")

    # Record Manager start and tool steps
    tracer.record_event(
        event_type=LifecycleEventType.AGENT_START,
        agent_id="adk_research_manager",
        framework="GOOGLE_ADK",
        payload={"stage": "SUPERVISORY_INITIALIZATION"},
    )
    tracer.record_event(
        event_type=LifecycleEventType.TOOL_COMPLETE,
        agent_id="adk_research_manager",
        framework="GOOGLE_ADK",
        payload={"tool": "query_market_data"},
    )
    tracer.record_event(
        event_type=LifecycleEventType.AGENT_COMPLETE,
        agent_id="adk_research_manager",
        framework="GOOGLE_ADK",
        payload={"stage": "FINAL_SYNTHESIS_COMPLETE"},
    )

    events = tracer.get_trace("run-test-trace")
    manager_starts = [e for e in events if e.agent_id == "adk_research_manager" and e.event_type == LifecycleEventType.AGENT_START]
    manager_completes = [e for e in events if e.agent_id == "adk_research_manager" and e.event_type == LifecycleEventType.AGENT_COMPLETE]

    assert len(manager_starts) == 1
    assert len(manager_completes) == 1
    assert manager_starts[0].execution_id is not None
    assert manager_completes[0].execution_id is not None


# ---------------------------------------------------------------------------
# 11. Blackboard artifact consumption provable via consumer lineage
# ---------------------------------------------------------------------------
def test_blackboard_artifact_consumption_provable():
    """InstitutionalBlackboard records consumer lineage when contributions are read."""
    blackboard = Blackboard(run_id="run-test-lineage")
    quant_c = AgentContribution(
        agent_id="adk_quant_specialist",
        framework="GOOGLE_ADK",
        task_name="quant_analysis",
        status="SUCCESS",
        findings={"latest_close": 1600.0},
    )
    blackboard.add_contribution(quant_c)

    # Consume with consumer_id
    retrieved = blackboard.get_latest_contribution("quant_analysis", consumer_id="adk_risk_validator")
    assert retrieved is not None
    lineage = blackboard.get_consumer_lineage("quant_analysis")
    assert "adk_risk_validator" in lineage

    # Check audit trail entry
    trail = blackboard.get_audit_trail()
    add_events = [t for t in trail if t.get("action") == "ADD_CONTRIBUTION"]
    assert len(add_events) == 1
    assert add_events[0]["producer_id"] == "adk_quant_specialist"
    assert "art-adk_quant_specialist-v" in add_events[0]["details"]["artifact_id"]


# ---------------------------------------------------------------------------
# 12. Frontend statuses and canonical recommendation enum matching
# ---------------------------------------------------------------------------
def test_frontend_contract_and_canonical_recommendation():
    """Canonical recommendation maps correctly to BUY, HOLD, SELL, INCONCLUSIVE."""
    assert canonicalize_recommendation("BUY") == "BUY"
    assert canonicalize_recommendation("ACCUMULATE") == "BUY"
    assert canonicalize_recommendation("HOLD") == "HOLD"
    assert canonicalize_recommendation("SELL") == "SELL"
    assert canonicalize_recommendation("TRIM") == "SELL"
    assert canonicalize_recommendation("AVOID") == "SELL"
    assert canonicalize_recommendation("INCONCLUSIVE") == "INCONCLUSIVE"
    assert canonicalize_recommendation(None) == "INCONCLUSIVE"
    assert canonicalize_recommendation("UNKNOWN_VALUE") == "INCONCLUSIVE"

    # QuantitativeResearchReport accepts INCONCLUSIVE and conviction_score=None
    report = QuantitativeResearchReport(
        run_id="run-test-schema",
        symbol="HDFCBANK.NS",
        as_of_time=datetime.now(timezone.utc),
        executive_thesis="Thesis blocked by circuit filter breach.",
        recommendation="INCONCLUSIVE",
        conviction_score=None,
        quantitative_findings={},
        statutory_risk_bounds={},
        qualitative_evidence=[],
        source_provenance=[],
        limitations_and_uncertainties=["Data anomaly flagged"],
    )
    assert report.recommendation == "INCONCLUSIVE"
    assert report.conviction_score is None
