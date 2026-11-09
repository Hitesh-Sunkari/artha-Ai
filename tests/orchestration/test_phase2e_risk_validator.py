"""Phase 2E Integration Test Suite: Statutory Risk & Compliance Validator (Google ADK).

Verifies:
1. ADK Agent definition, identity, and AgentContract compliance.
2. Dynamic reference order sizing (₹100,000 notional / latest close).
3. Exact statutory transaction cost breakdown under Finance (No. 2) Act 2024.
4. Strict safety invariant: live trading permanently blocked.
5. Skeptic objection audit and classification (RESOLVED / UNRESOLVED / NOT_APPLICABLE).
6. Hard veto on unsupported directional claims when market data is empty.
7. Blackboard consumer lineage tracking (consumer_id="adk_risk_validator").
8. Granular lifecycle event tracing (AGENT_START, TOOL_INVOCATION, RISK_VALIDATION, AGENT_COMPLETE).
9. Statutory provenance citation linking to Finance (No. 2) Act 2024.
10. End-to-end integration within ADKResearchManager orchestration.
"""

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any
import pytest

from arthaai.mcp.server import get_mcp_client, calculate_statutory_costs
from arthaai.orchestration.adk_coordinator import (
    ADKRiskValidator,
    ADKResearchManager,
    OrchestrationPattern,
)
from arthaai.orchestration.agent_contracts import (
    AgentContractRegistry,
    AgentFramework,
    AgentRole,
)
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import ExecutionTracer, LifecycleEventType
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


@pytest.fixture
def mcp_client():
    return get_mcp_client()


@pytest.fixture
def risk_validator(mcp_client):
    return ADKRiskValidator(mcp_client)


# ============================================================================
# Criterion 1: ADK Agent Definition & Contract Registry
# ============================================================================

def test_01_adk_agent_definition_and_contract_registry(risk_validator):
    """ADKRiskValidator must be built on Google ADK Agent and fulfill its contract."""
    assert hasattr(risk_validator, "adk_agent")
    assert risk_validator.adk_agent.name == "adk_risk_validator"

    reg = AgentContractRegistry()
    contract = reg.get_contract("adk_risk_validator")
    assert contract is not None
    assert contract.framework == AgentFramework.GOOGLE_ADK
    assert contract.role == AgentRole.RISK_VALIDATOR
    assert "calculate_statutory_costs" in contract.permitted_tools
    assert "market_data_and_quant_features" in contract.input_artifact_dependencies
    assert "adversarial_critique" in contract.input_artifact_dependencies


# ============================================================================
# Criterion 2: Dynamic Reference Order Sizing
# ============================================================================

def test_02_dynamic_order_sizing_from_reference_notional(risk_validator):
    """Validator dynamically derives order quantity from ₹100,000 reference notional."""
    async def run():
        # Test case 1: Stock price ₹2,750 (e.g. RELIANCE) -> ~36 shares, ₹99,000 notional
        bb1 = Blackboard(run_id="run-size-01")
        quant_contrib1 = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"calculated_metrics": {"latest_close": 2750.0}},
            evidence_citations=[],
        )
        bb1.add_contribution(quant_contrib1)

        contrib1, sres1 = await risk_validator.execute(
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-size-01",
            blackboard=bb1,
        )

        stat1 = contrib1.findings["statutory_compliance"]
        assert stat1["price"] == 2750.0
        assert stat1["quantity"] == 36
        assert stat1["notional_inr"] == 99000.0

        # Test case 2: Stock price ₹1,500 (e.g. INFY) -> ~67 shares, ₹100,500 notional
        bb2 = Blackboard(run_id="run-size-02")
        quant_contrib2 = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"calculated_metrics": {"latest_close": 1500.0}},
            evidence_citations=[],
        )
        bb2.add_contribution(quant_contrib2)

        contrib2, sres2 = await risk_validator.execute(
            symbol="INFY",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-size-02",
            blackboard=bb2,
        )

        stat2 = contrib2.findings["statutory_compliance"]
        assert stat2["price"] == 1500.0
        assert stat2["quantity"] == 67
        assert stat2["notional_inr"] == 100500.0

    asyncio.run(run())


# ============================================================================
# Criterion 3: Exact Statutory Cost Breakdown (Finance Act 2024)
# ============================================================================

def test_03_exact_statutory_cost_breakdown_finance_act_2024(risk_validator):
    """Statutory cost schedule must precisely match Finance (No. 2) Act 2024 rates."""
    async def run():
        bb = Blackboard(run_id="run-stat-01")
        quant_contrib = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"calculated_metrics": {"latest_close": 1000.0, "sample_return_mean": 0.001}},
            evidence_citations=[],
        )
        bb.add_contribution(quant_contrib)

        contrib, sres = await risk_validator.execute(
            symbol="TESTSEC",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-stat-01",
            blackboard=bb,
        )

        stat = contrib.findings["statutory_compliance"]
        # For price 1000.0 and ref 100,000 -> qty = 100, notional = 100,000
        assert stat["notional_inr"] == 100000.0
        assert stat["quantity"] == 100

        breakdown = stat["breakdown"]
        # STT: 0.1% on buy (₹100) + 0.1% on sell (₹100) = ₹200.0
        assert breakdown["stt"] == 200.0
        # Stamp Duty: 0.015% on buy only = ₹15.0
        assert breakdown["stamp_duty"] == 15.0
        # Exchange fee: 0.00297% * 100,000 * 2 = ₹5.94
        assert breakdown["exchange_turnover_fee"] == 5.94
        # SEBI fee: 0.0001% * 100,000 * 2 = ₹0.20
        assert breakdown["sebi_turnover_charges"] == 0.20
        # GST: 18% of (2.97 + 0.10) per leg = 0.55 * 2 = ₹1.10
        assert breakdown["gst_18pct"] == 1.1
        # Total statutory costs = 200 + 15 + 5.94 + 0.20 + 1.10 = 222.24
        assert stat["total_statutory_costs_inr"] == 222.24
        # Effective rate pct = 222.24 / 100,000 = 0.2222%
        assert stat["effective_rate_pct"] == 0.2222

    asyncio.run(run())


# ============================================================================
# Criterion 4: Strict Safety Invariant - Live Trading Permanently Disabled
# ============================================================================

def test_04_strict_assertion_live_trading_permanently_disabled(risk_validator):
    """Validator must strictly block execution if live trading is ever enabled."""
    async def run():
        # Case A: Default safe configuration (live_trading_enabled = False)
        bb_safe = Blackboard(run_id="run-safe-01")
        contrib_safe, _ = await risk_validator.execute(
            symbol="INFY",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-safe-01",
            blackboard=bb_safe,
        )
        assert contrib_safe.findings["live_trading_blocked"] is True
        assert contrib_safe.findings["risk_validation_passed"] is True
        assert contrib_safe.validation_outcome == "PASSED"
        assert contrib_safe.analytical_verdict == "APPROVED"

        # Case B: Simulated breach (mock config where live_trading_enabled = True)
        mock_unsafe_cfg = SimpleNamespace(live_trading_enabled=True)
        bb_unsafe = Blackboard(run_id="run-unsafe-01")
        contrib_unsafe, _ = await risk_validator.execute(
            symbol="INFY",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-unsafe-01",
            blackboard=bb_unsafe,
            app_config=mock_unsafe_cfg,
        )
        assert contrib_unsafe.findings["live_trading_blocked"] is False
        assert contrib_unsafe.findings["risk_validation_passed"] is False
        assert contrib_unsafe.validation_outcome == "BLOCKED"
        assert contrib_unsafe.analytical_verdict == "REJECTED"
        assert any("CRITICAL RISK FAILURE" in w for w in contrib_unsafe.warnings)

    asyncio.run(run())


# ============================================================================
# Criterion 5: Skeptic Objection Audit & Classification
# ============================================================================

def test_05_skeptic_objection_classification_and_audit(risk_validator):
    """Every Skeptic objection must be explicitly classified; unresolved objections block approval."""
    async def run():
        # Case A: Unresolved critical objection (e.g. circuit filter breach)
        bb_blocked = Blackboard(run_id="run-obj-blocked")
        skeptic_blocked = AgentContribution(
            agent_id="crewai_adversarial_specialist",
            framework="CREWAI",
            task_name="adversarial_critique",
            status="SUCCESS",
            findings={"objections": ["CIRCUIT_FILTER_BREACH", "LIQUIDITY_CONTRACTION_BREACH"]},
            evidence_citations=[],
        )
        bb_blocked.add_contribution(skeptic_blocked)

        contrib_blocked, _ = await risk_validator.execute(
            symbol="ANOMALOUS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-obj-blocked",
            blackboard=bb_blocked,
        )

        findings_b = contrib_blocked.findings
        assert findings_b["risk_validation_passed"] is False
        assert contrib_blocked.validation_outcome == "BLOCKED"
        assert contrib_blocked.analytical_verdict == "REJECTED"
        assert "CIRCUIT_FILTER_BREACH" in findings_b["unresolved_objections"]
        assert "LIQUIDITY_CONTRACTION_BREACH" in findings_b["unresolved_objections"]
        assert findings_b["classified_objections"]["CIRCUIT_FILTER_BREACH"] == "UNRESOLVED"

        # Case B: Resolvable statutory objection resolved by validated returns
        bb_resolved = Blackboard(run_id="run-obj-resolved")
        quant_good = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"calculated_metrics": {"latest_close": 2000.0, "sample_return_mean": 0.001}},  # ~25% ann > 0.22% drag
            evidence_citations=[],
        )
        skeptic_resolvable = AgentContribution(
            agent_id="crewai_adversarial_specialist",
            framework="CREWAI",
            task_name="adversarial_critique",
            status="SUCCESS",
            findings={"objections": ["STATUTORY_DRAG_UNVERIFIED"]},
            evidence_citations=[],
        )
        bb_resolved.add_contribution(quant_good)
        bb_resolved.add_contribution(skeptic_resolvable)

        contrib_res, _ = await risk_validator.execute(
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-obj-resolved",
            blackboard=bb_resolved,
        )

        findings_r = contrib_res.findings
        assert findings_r["risk_validation_passed"] is True
        assert contrib_res.validation_outcome == "PASSED"
        assert contrib_res.analytical_verdict == "APPROVED"
        assert len(findings_r["unresolved_objections"]) == 0
        assert "RESOLVED" in findings_r["classified_objections"]["STATUTORY_DRAG_UNVERIFIED"]

        # Case C: Not-applicable derivative objection for cash equity delivery
        bb_na = Blackboard(run_id="run-obj-na")
        skeptic_na = AgentContribution(
            agent_id="crewai_adversarial_specialist",
            framework="CREWAI",
            task_name="adversarial_critique",
            status="SUCCESS",
            findings={"objections": ["DERIVATIVE_EXPIRY_RISK"]},
            evidence_citations=[],
        )
        bb_na.add_contribution(skeptic_na)

        contrib_na, _ = await risk_validator.execute(
            symbol="INFY",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-obj-na",
            blackboard=bb_na,
        )
        assert contrib_na.findings["risk_validation_passed"] is True
        assert "NOT_APPLICABLE" in contrib_na.findings["classified_objections"]["DERIVATIVE_EXPIRY_RISK"]

    asyncio.run(run())


# ============================================================================
# Criterion 6: Unsupported Directional Claims Vetoed
# ============================================================================

def test_06_unsupported_directional_claims_vetoed(risk_validator):
    """Validator must veto directional buy assertions if quant data is empty."""
    async def run():
        bb = Blackboard(run_id="run-unsupp-01")
        quant_empty = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"empty_result": True, "records_retrieved": 0},
            evidence_citations=[],
        )
        bb.add_contribution(quant_empty)

        # Injected rogue buy assertion
        rogue_contrib = AgentContribution(
            agent_id="rogue_agent",
            framework="CREWAI",
            task_name="unverified_signal",
            status="SUCCESS",
            findings={"signal": "Strong buy recommendation based on unverified chatter"},
            evidence_citations=[],
        )
        bb.add_contribution(rogue_contrib)

        contrib, _ = await risk_validator.execute(
            symbol="GHOST",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-unsupp-01",
            blackboard=bb,
        )

        assert contrib.findings["unsupported_assertions_flagged"] is True
        assert contrib.findings["risk_validation_passed"] is False
        assert contrib.validation_outcome == "BLOCKED"
        assert contrib.analytical_verdict == "REJECTED"
        assert any("Unsupported directional assertions" in w for w in contrib.warnings)

    asyncio.run(run())


# ============================================================================
# Criterion 7: Blackboard Consumer Lineage Tracking
# ============================================================================

def test_07_blackboard_consumer_lineage_tracking(risk_validator):
    """Validator must register consumer_id='adk_risk_validator' on Blackboard reads."""
    async def run():
        bb = Blackboard(run_id="run-lineage-01")
        quant_contrib = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"calculated_metrics": {"latest_close": 2750.0}},
            evidence_citations=[],
        )
        skeptic_contrib = AgentContribution(
            agent_id="crewai_adversarial_specialist",
            framework="CREWAI",
            task_name="adversarial_critique",
            status="SUCCESS",
            findings={"objections": []},
            evidence_citations=[],
        )
        bb.add_contribution(quant_contrib)
        bb.add_contribution(skeptic_contrib)

        await risk_validator.execute(
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-lineage-01",
            blackboard=bb,
        )

        quant_lineage = bb.get_lineage("market_data_and_quant_features")
        assert quant_lineage is not None
        assert "adk_risk_validator" in quant_lineage.consumers

        skeptic_lineage = bb.get_lineage("adversarial_critique")
        assert skeptic_lineage is not None
        assert "adk_risk_validator" in skeptic_lineage.consumers

    asyncio.run(run())


# ============================================================================
# Criterion 8: Lifecycle Event Tracing
# ============================================================================

def test_08_lifecycle_event_tracing(risk_validator):
    """Validator records detailed lifecycle events into ExecutionTracer."""
    async def run():
        tracer = ExecutionTracer("run-trace-risk")
        bb = Blackboard(run_id="run-trace-risk")

        contrib, _ = await risk_validator.execute(
            symbol="TCS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-trace-risk",
            blackboard=bb,
            tracer=tracer,
        )

        events = tracer.get_events()
        event_types = [e.event_type for e in events]

        assert LifecycleEventType.AGENT_START in event_types
        assert LifecycleEventType.TOOL_INVOCATION in event_types
        assert LifecycleEventType.TOOL_COMPLETE in event_types
        assert LifecycleEventType.RISK_VALIDATION in event_types
        assert LifecycleEventType.AGENT_COMPLETE in event_types

        # Verify tool payload details
        invocations = [e for e in events if e.event_type == LifecycleEventType.TOOL_INVOCATION]
        assert any(e.payload.get("tool") == "calculate_statutory_costs" for e in invocations)

    asyncio.run(run())


# ============================================================================
# Criterion 9: Statutory Provenance Citations
# ============================================================================

def test_09_evidence_citations_and_provenance(risk_validator):
    """Validator output includes verifiable statutory citations for regulatory compliance."""
    async def run():
        bb = Blackboard(run_id="run-cite-01")
        contrib, _ = await risk_validator.execute(
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-cite-01",
            blackboard=bb,
        )

        assert len(contrib.evidence_citations) > 0
        citation = contrib.evidence_citations[0]
        assert "Statutory Source" in citation
        assert "Finance (No. 2) Act 2024" in citation
        assert contrib.evidence_status == "VERIFIED"

    asyncio.run(run())


# ============================================================================
# Criterion 10: End-to-End ADK Research Manager Integration
# ============================================================================

def test_10_end_to_end_research_manager_integration():
    """ADKResearchManager executes adk_risk_validator and validates its contract."""
    async def run():
        manager = ADKResearchManager()
        req = ResearchRequest(
            request_id="req-p2e-manager-01",
            run_id="run-p2e-manager-01",
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            orchestration_pattern=OrchestrationPattern.SEQUENTIAL,
        )

        report = await manager.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        assert report is not None
        assert report.symbol == "RELIANCE"

        bb = manager.get_run_blackboard(report.run_id)
        assert bb is not None

        risk_contrib = bb.get_latest_contribution("statutory_and_risk_validation")
        assert risk_contrib is not None
        assert risk_contrib.agent_id == "adk_risk_validator"
        assert risk_contrib.framework == "GOOGLE_ADK"
        assert risk_contrib.status == "SUCCESS"
        assert risk_contrib.findings["risk_validation_passed"] is True

        plan = manager.get_run_task_plan(report.run_id)
        assert plan is not None
        node = plan.get_node("task-adk_risk_validator")
        assert node is not None
        assert node.status.value in ("COMPLETED", "VERIFIED")

    asyncio.run(run())
