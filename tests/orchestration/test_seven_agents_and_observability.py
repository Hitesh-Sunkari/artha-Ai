"""Tests verifying contracts for all seven primary agents and the observability system."""

import asyncio
from datetime import datetime, timezone
import pytest

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import (
    A2AClientBridge,
    create_a2a_crewai_app,
)
from arthaai.orchestration.adk_coordinator import (
    ADKMicrostructureSpecialist,
    ADKQuantSpecialist,
    ADKResearchManager,
    ADKRiskValidator,
    OrchestrationPattern,
)
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import (
    ExecutionTracer,
    LifecycleEventType,
    RunAuditSummary,
    generate_run_summary,
)
from arthaai.schemas.research_output import ResearchRequest


def test_adk_quant_specialist_contract():
    async def _test():
        mcp_client = get_mcp_client()
        quant = ADKQuantSpecialist(mcp_client)
        now = datetime(2024, 11, 1, 10, 0, tzinfo=timezone.utc)
        contrib, mres = await quant.execute(symbol="RELIANCE", as_of_time=now, run_id="run-quant-001")

        assert contrib.agent_id == "adk_quant_specialist"
        assert contrib.framework == "GOOGLE_ADK"
        assert contrib.status == "SUCCESS"
        assert "records_retrieved" in contrib.findings
        assert "calculated_metrics" in contrib.findings
        assert len(contrib.evidence_citations) > 0

    asyncio.run(_test())


def test_adk_microstructure_specialist_contract():
    async def _test():
        micro = ADKMicrostructureSpecialist()
        contrib = await micro.execute(symbol="TCS", run_id="run-micro-001")

        assert contrib.agent_id == "adk_microstructure_specialist"
        assert contrib.framework == "GOOGLE_ADK"
        assert contrib.status == "SUCCESS"
        assert contrib.findings["microstructure_status"] == "UNAVAILABLE"
        assert "minimum_required_schema" in contrib.findings
        assert len(contrib.warnings) > 0

    asyncio.run(_test())


def test_adk_risk_validator_contract():
    async def _test():
        mcp_client = get_mcp_client()
        validator = ADKRiskValidator(mcp_client)
        bb = Blackboard(run_id="run-risk-001")
        now = datetime(2024, 11, 1, 10, 0, tzinfo=timezone.utc)

        contrib, sres = await validator.execute(
            symbol="INFY", as_of_time=now, run_id="run-risk-001", blackboard=bb
        )

        assert contrib.agent_id == "adk_risk_validator"
        assert contrib.framework == "GOOGLE_ADK"
        assert contrib.status == "SUCCESS"
        assert contrib.findings["live_trading_blocked"] is True
        assert contrib.findings["risk_validation_passed"] is True
        assert "statutory_compliance" in contrib.findings

    asyncio.run(_test())


def test_crewai_specialists_contracts_over_a2a():
    async def _test():
        app = create_a2a_crewai_app("crewai_specialist_suite")
        bridge = A2AClientBridge(app=app, base_url="http://testserver", rpc_url="http://testserver/rpc")

        # 1. Macro specialist
        c_macro = await bridge.invoke_specialist(
            symbol="RELIANCE", run_id="run-a2a-contracts", task_name="macro_analysis"
        )
        assert c_macro.agent_id == "crewai_news_macro_specialist"
        assert c_macro.framework == "CREWAI"
        assert c_macro.status == "SUCCESS"
        assert c_macro.findings.get("source_status") == "NOT_CONFIGURED"

        # 2. Corporate filing specialist
        c_filing = await bridge.invoke_specialist(
            symbol="RELIANCE", run_id="run-a2a-contracts", task_name="filing_analysis"
        )
        assert c_filing.agent_id == "crewai_corporate_filing_specialist"
        assert c_filing.framework == "CREWAI"
        assert c_filing.status == "SUCCESS"
        assert c_filing.findings.get("source_status") == "NOT_CONFIGURED"

        # 3. Adversarial skeptic
        c_skeptic = await bridge.invoke_specialist(
            symbol="RELIANCE", run_id="run-a2a-contracts", task_name="adversarial_critique"
        )
        assert c_skeptic.agent_id == "crewai_adversarial_specialist"
        assert c_skeptic.framework == "CREWAI"
        assert c_skeptic.status == "SUCCESS"
        assert "regime_fragility" in c_skeptic.findings
        assert len(c_skeptic.warnings) > 0

    asyncio.run(_test())


def test_observability_tracer_and_run_summary():
    tracer = ExecutionTracer(run_id="run-obs-001", pattern="SEQUENTIAL")
    tracer.record_event(LifecycleEventType.AGENT_START, "adk_research_manager")
    tracer.record_event(LifecycleEventType.TOOL_INVOCATION, "adk_quant_specialist", payload={"tool": "query_market_data"})
    tracer.record_event(LifecycleEventType.TOOL_COMPLETE, "adk_quant_specialist", payload={"tool": "query_market_data"})
    tracer.record_event(LifecycleEventType.SKEPTIC_CHALLENGE, "crewai_adversarial_specialist")
    tracer.record_event(LifecycleEventType.RISK_VALIDATION, "adk_risk_validator", status="SUCCESS")
    tracer.record_event(LifecycleEventType.AGENT_COMPLETE, "adk_research_manager", duration_ms=150.0)

    events = tracer.get_events()
    assert len(events) == 6
    assert events[0].event_type == LifecycleEventType.AGENT_START
    assert events[3].event_type == LifecycleEventType.SKEPTIC_CHALLENGE

    bb = Blackboard(run_id="run-obs-001")
    bb.set_metadata("orchestration_pattern", "SEQUENTIAL")
    bb.set_metadata("latency_seconds", 0.15)
    bb.set_metadata("lifecycle_events", [e.model_dump(mode="json") for e in events])

    summary = generate_run_summary(bb)
    assert isinstance(summary, RunAuditSummary)
    assert summary.run_id == "run-obs-001"
    assert summary.orchestration_pattern == "SEQUENTIAL"
    assert summary.events_count == 6
    assert summary.risk_checks_passed is True
