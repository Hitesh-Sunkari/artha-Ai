"""Phase 2D Integration Test Suite: Adversarial Skeptic Specialist (CrewAI via A2A).

Verifies:
1. End-to-end A2A protocol dispatch over JSON-RPC 2.0 to CrewAI Adversarial Skeptic.
2. Five deterministic stress tests:
   - circuit_filter_boundary (<= 20% limit)
   - volatility_shock_test (2x vol jump and VaR99 <= 15%)
   - statutory_drag_test (Finance Act 2024 friction coverage)
   - liquidity_contraction_test (50% turnover dry-up)
   - lookahead_leakage_audit (PIT verification)
3. Reproducible stress test artifact metadata (test_id, formula, threshold, actual_result, status).
4. Circuit filter breach triggers explicit skeptic objection and REJECTED verdict.
5. Statutory drag coverage failure on negative or inadequate returns.
6. Liquidity contraction stress failure on thin turnover (<25 Cr).
7. Zero market data observations mandate (REJECTED and BLOCKED).
8. Contract validation by ADKResearchManager.
9. Unresolved skeptic objections prevent uncritical bullish final recommendations.
10. Hierarchical manager dynamic instruction tailoring.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any
import pytest

from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import (
    ADKQuantSpecialist,
    ADKMicrostructureSpecialist,
    ADKResearchManager,
    OrchestrationPattern,
)
from arthaai.orchestration.agent_contracts import TaskExecutionNode, AgentFramework
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import ExecutionTracer, LifecycleEventType
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


@pytest.fixture
def a2a_bridge():
    app = create_a2a_crewai_app("crewai_specialist_suite")
    return A2AClientBridge(app=app)


@pytest.fixture
def sample_quant_context():
    return {
        "records_retrieved": 1260,
        "empty_result": False,
        "calculated_metrics": {
            "latest_close": 2750.0,
            "sample_return_mean": 0.0008,  # ~20% annualized return
            "annualized_return": 0.2016,
            "realized_volatility_annualized": 0.18,
            "realized_volatility_20d": 0.16,
            "realized_volatility_252d": 0.18,
            "latest_rsi": 54.0,
            "max_drawdown_5y": -0.185,
        },
        "recent_returns": [0.005, -0.002, 0.008, -0.004, 0.001],
        "average_daily_turnover_inr_cr": 450.0,
        "corwin_schultz_spread_bps": 6.5,
        "macro_regime": "RBI Repo 6.50%",
        "as_of_time": "2026-10-26T15:30:00Z",
    }


# ============================================================================
# Criterion 1: A2A Protocol Dispatch & 5 Deterministic Stress Tests
# ============================================================================

def test_01_a2a_skeptic_receives_upstream_context_and_produces_structured_critique(a2a_bridge, sample_quant_context):
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-p2d-01",
            task_name="adversarial_critique",
            instructions="Critique quantitative thesis and statutory drag coverage",
            upstream_context=sample_quant_context,
        )

        assert contrib.agent_id == "crewai_adversarial_specialist"
        assert contrib.framework == "CREWAI"
        assert contrib.task_name == "adversarial_critique"
        assert contrib.status == "SUCCESS"
        assert contrib.evidence_status == "VERIFIED"
        assert contrib.analytical_verdict in ("CONDITIONALLY_APPROVED", "REJECTED")

        findings = contrib.findings
        assert "stress_tests" in findings
        assert "stress_test_details" in findings
        assert "objections" in findings
        assert "statutory_drag_impact" in findings

        # Verify all 5 stress tests are executed
        stress_tests = findings["stress_tests"]
        assert "circuit_filter_boundary" in stress_tests
        assert "volatility_shock_test" in stress_tests
        assert "statutory_drag_test" in stress_tests
        assert "liquidity_contraction_test" in stress_tests
        assert "lookahead_leakage_audit" in stress_tests

    asyncio.run(run())


# ============================================================================
# Criterion 2: Reproducible Stress Test Artifact Metadata
# ============================================================================

def test_02_stress_test_reproducibility_artifacts(a2a_bridge, sample_quant_context):
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-p2d-02",
            task_name="adversarial_critique",
            upstream_context=sample_quant_context,
        )

        details = contrib.findings["stress_test_details"]
        required_keys = {
            "test_id", "version", "input_artifact_refs", "formula",
            "expected_condition", "threshold", "actual_result",
            "status", "timestamp", "execution_id", "explanation", "limitations",
        }

        for test_name, test_data in details.items():
            missing_keys = required_keys - set(test_data.keys())
            assert not missing_keys, f"Stress test '{test_name}' missing keys: {missing_keys}"
            assert test_data["status"] in ("PASS", "FAIL", "NOT_RUN")

    asyncio.run(run())


# ============================================================================
# Criterion 3: Circuit Filter Breach Triggers Skeptic Objection
# ============================================================================

def test_03_circuit_filter_breach_triggers_skeptic_objection(a2a_bridge, sample_quant_context):
    async def run():
        # Inject 25% single-day price move (breaches 20% NSE circuit limit)
        anomalous_context = {
            **sample_quant_context,
            "recent_returns": [0.01, 0.25, -0.02],
        }

        contrib = await a2a_bridge.invoke_specialist(
            symbol="CIRCUIT_BREACH_CO",
            run_id="run-p2d-03",
            task_name="adversarial_critique",
            upstream_context=anomalous_context,
        )

        findings = contrib.findings
        assert "CIRCUIT_FILTER_BREACH" in findings["objections"]
        assert findings["stress_test_details"]["circuit_filter_boundary"]["status"] == "FAIL"
        assert contrib.analytical_verdict == "REJECTED"
        assert contrib.validation_outcome == "BLOCKED"

    asyncio.run(run())


# ============================================================================
# Criterion 4: Statutory Drag Test Under Finance Act 2024
# ============================================================================

def test_04_statutory_drag_test_evaluates_finance_act_2024(a2a_bridge, sample_quant_context):
    async def run():
        # Case A: Negative expected return fails statutory drag test
        neg_context = {
            **sample_quant_context,
            "calculated_metrics": {
                **sample_quant_context["calculated_metrics"],
                "sample_return_mean": -0.0005,  # negative return
            },
        }
        contrib_neg = await a2a_bridge.invoke_specialist(
            symbol="NEGATIVE_ALPHA_CO",
            run_id="run-p2d-04a",
            task_name="adversarial_critique",
            upstream_context=neg_context,
        )
        assert "NEGATIVE_RETURN_STATUTORY_DRAG" in contrib_neg.findings["objections"]
        assert contrib_neg.findings["stress_test_details"]["statutory_drag_test"]["status"] == "FAIL"

        # Case B: Missing sample mean return marks test NOT_RUN
        missing_context = {
            **sample_quant_context,
            "calculated_metrics": {
                "latest_close": 100.0,
            },
        }
        contrib_miss = await a2a_bridge.invoke_specialist(
            symbol="NO_METRIC_CO",
            run_id="run-p2d-04b",
            task_name="adversarial_critique",
            upstream_context=missing_context,
        )
        assert contrib_miss.findings["stress_test_details"]["statutory_drag_test"]["status"] == "NOT_RUN"
        assert "STATUTORY_DRAG_TEST_NOT_RUN" in contrib_miss.findings["objections"]

    asyncio.run(run())


# ============================================================================
# Criterion 5: Liquidity Contraction Test Probes 50% Volume Dry-Up
# ============================================================================

def test_05_liquidity_contraction_test_probes_50pct_volume_dryup(a2a_bridge, sample_quant_context):
    async def run():
        # Average daily turnover < 25 Cr creates excessive slippage under contraction
        thin_context = {
            **sample_quant_context,
            "average_daily_turnover_inr_cr": 12.0,  # Below 25 Cr threshold
            "corwin_schultz_spread_bps": 22.0,
        }

        contrib = await a2a_bridge.invoke_specialist(
            symbol="ILLIQUID_MIDCAP",
            run_id="run-p2d-05",
            task_name="adversarial_critique",
            upstream_context=thin_context,
        )

        findings = contrib.findings
        assert "LIQUIDITY_CONTRACTION_BREACH" in findings["objections"]
        assert findings["stress_test_details"]["liquidity_contraction_test"]["status"] == "FAIL"
        assert contrib.analytical_verdict == "REJECTED"

    asyncio.run(run())


# ============================================================================
# Criterion 6: Lookahead Leakage Audit
# ============================================================================

def test_06_lookahead_leakage_audit_verifies_pit(a2a_bridge, sample_quant_context):
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-p2d-06",
            task_name="adversarial_critique",
            upstream_context=sample_quant_context,
        )

        test_data = contrib.findings["stress_test_details"]["lookahead_leakage_audit"]
        assert test_data["status"] == "PASS"
        assert test_data["actual_result"]["future_observations_count"] == 0

    asyncio.run(run())


# ============================================================================
# Criterion 7: Zero Market Data Mandate Blocks Specialist
# ============================================================================

def test_07_zero_market_data_mandate_blocks_specialist(a2a_bridge):
    async def run():
        empty_context = {
            "records_retrieved": 0,
            "empty_result": True,
            "calculated_metrics": {},
        }

        contrib = await a2a_bridge.invoke_specialist(
            symbol="NONEXISTENT_XYZ",
            run_id="run-p2d-07",
            task_name="adversarial_critique",
            upstream_context=empty_context,
        )

        assert contrib.analytical_verdict == "REJECTED"
        assert contrib.validation_outcome == "BLOCKED"
        assert contrib.evidence_status == "INSUFFICIENT_DATA"
        assert contrib.evidence_citations == []
        assert "Zero historical observations retrieved" in contrib.warnings[0]

    asyncio.run(run())


# ============================================================================
# Criterion 8: Contract Validation by ADKResearchManager
# ============================================================================

def test_08_contract_validation_by_adk_research_manager(a2a_bridge, sample_quant_context):
    async def run():
        mgr = ADKResearchManager()
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-p2d-08",
            task_name="adversarial_critique",
            upstream_context=sample_quant_context,
        )

        node = TaskExecutionNode(
            task_id="task-crewai_adversarial_specialist",
            agent_id="crewai_adversarial_specialist",
            framework=AgentFramework.CREWAI,
            task_name="adversarial_critique",
        )

        errors = mgr._validate_contract(node, contrib)
        assert errors == [], f"Validation errors detected: {errors}"

    asyncio.run(run())


# ============================================================================
# Criterion 9: Unresolved Objections Block Final Report Approval
# ============================================================================

def test_09_unresolved_skeptic_objections_block_final_report_approval():
    async def run():
        mgr = ADKResearchManager()
        # Request for HDFCBANK (which has historical circuit filter anomaly in unadjusted series)
        req = ResearchRequest(
            request_id="req-p2d-09",
            run_id="run-p2d-09",
            symbol="HDFCBANK.NS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure", "adversarial"],
        )

        report = await mgr.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        # Final recommendation must NOT be BUY when empirical skeptic objections remain active
        assert report.recommendation != "BUY"
        assert report.recommendation in ("HOLD", "SELL", "INCONCLUSIVE", "BLOCKED")

    asyncio.run(run())


# ============================================================================
# Criterion 10: Hierarchical Manager Dynamic Instruction Tailoring
# ============================================================================

def test_10_hierarchical_manager_tailors_skeptic_instructions():
    async def run():
        mgr = ADKResearchManager()
        req = ResearchRequest(
            request_id="req-p2d-10",
            run_id="run-p2d-10",
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure", "adversarial"],
        )

        await mgr.run_research(req, pattern=OrchestrationPattern.HIERARCHICAL)
        events = mgr.get_run_events(req.run_id)

        # Verify TASK_DISPATCHED event for skeptic recorded tailored focus instructions
        dispatched = [e for e in events if e.get("event_type") == LifecycleEventType.TASK_DISPATCHED.value and e.get("agent_id") == "crewai_adversarial_specialist"]
        assert len(dispatched) > 0
        focus_msg = dispatched[0].get("payload", {}).get("focus", "")
        assert "regime shift" in focus_msg or "liquidity traps" in focus_msg or "parameter stability" in focus_msg

    asyncio.run(run())
