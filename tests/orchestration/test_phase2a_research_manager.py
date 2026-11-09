"""Integration tests verifying Phase 2A Research Manager against real execution criteria.

Tests all 12 Part F requirements:
1. Manager creates a real dependency-aware task plan.
2. Downstream task consumes an upstream Blackboard artifact with lineage tracking.
3. Sequential execution enforces linear dependency progression.
4. Parallel mode executes independent tasks concurrently.
5. Hierarchical mode supervisory delegation and dynamic instruction formulation.
6. Invalid agent result triggers targeted bounded recovery.
7. Permanently invalid result blocks final synthesis (INCONCLUSIVE / BLOCKED).
8. Cross-run and cross-security artifacts cannot be mixed (raises ValueError).
9. Real MCP tool invocation is observable in execution tracer.
10. A2A requests and responses are schema-validated and traceable.
11. Callbacks record accurate task states, durations, and terminal gates.
12. Final report references exact artifact IDs in source provenance.
"""

import asyncio
from datetime import datetime, timezone
import pytest

from arthaai.core.clock.timezone import now_utc
from arthaai.data.coverage import get_data_coverage_tracker
from arthaai.data.instrument_master.security_master import get_security_master, ResolutionType
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKResearchManager, OrchestrationPattern
from arthaai.orchestration.agent_contracts import AgentFramework, TaskNodeStatus
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import ExecutionTracer, LifecycleEventType
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


@pytest.fixture
def mcp_client():
    return get_mcp_client()


@pytest.fixture
def research_manager(mcp_client):
    return ADKResearchManager(mcp_client=mcp_client)


@pytest.fixture
def sample_request():
    return ResearchRequest(
        request_id="req-phase2a-test",
        run_id="run-phase2a-test",
        symbol="RELIANCE",
        as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
        scope=["quant", "microstructure", "macro", "filings"],
    )


# ============================================================================
# Criterion 1: Dependency-Aware Task Plan Creation
# ============================================================================

def test_01_manager_creates_dependency_aware_task_plan(research_manager, sample_request):
    coverage = get_data_coverage_tracker().audit_coverage("RELIANCE")
    plan = research_manager._create_task_plan(sample_request, OrchestrationPattern.SEQUENTIAL, coverage)

    assert plan.plan_id.startswith("plan-")
    assert plan.run_id == sample_request.run_id
    assert plan.symbol == "RELIANCE"
    assert plan.orchestration_pattern == "SEQUENTIAL"

    # Verify task nodes
    task_ids = [n.task_id for n in plan.nodes]
    assert "task-adk_quant_specialist" in task_ids
    assert "task-adk_microstructure_specialist" in task_ids
    assert "task-crewai_news_macro_specialist" in task_ids
    assert "task-crewai_corporate_filing_specialist" in task_ids
    assert "task-crewai_adversarial_specialist" in task_ids
    assert "task-adk_risk_validator" in task_ids

    # Sequential dependencies
    node_micro = plan.get_node("task-adk_microstructure_specialist")
    assert "task-adk_quant_specialist" in node_micro.dependencies

    node_skeptic = plan.get_node("task-crewai_adversarial_specialist")
    assert "task-adk_quant_specialist" in node_skeptic.dependencies
    assert "task-adk_microstructure_specialist" in node_skeptic.dependencies

    node_risk = plan.get_node("task-adk_risk_validator")
    assert "task-crewai_adversarial_specialist" in node_risk.dependencies
    assert "task-adk_quant_specialist" in node_risk.dependencies

    # In PARALLEL mode, independent tasks have no dependencies
    par_plan = research_manager._create_task_plan(sample_request, OrchestrationPattern.PARALLEL, coverage)
    node_par_micro = par_plan.get_node("task-adk_microstructure_specialist")
    assert node_par_micro.dependencies == []


# ============================================================================
# Criterion 2: Downstream Task Consuming Upstream Blackboard Artifact
# ============================================================================

def test_02_downstream_task_consumes_upstream_blackboard_artifact(sample_request):
    bb = Blackboard(run_id=sample_request.run_id, request=sample_request)

    # Upstream Quant publishes artifact
    quant_contrib = AgentContribution(
        agent_id="adk_quant_specialist",
        framework="GOOGLE_ADK",
        task_name="market_data_and_quant_features",
        status="SUCCESS",
        findings={"records_retrieved": 1260, "calculated_metrics": {"latest_close": 2750.0}},
        run_id=sample_request.run_id,
        symbol=sample_request.symbol,
    )
    bb.add_contribution(quant_contrib)

    # Downstream Risk Validator consumes artifact
    consumed = bb.get_latest_contribution("market_data_and_quant_features", consumer_id="adk_risk_validator")
    assert consumed is not None
    assert consumed.findings["records_retrieved"] == 1260
    assert consumed.findings["calculated_metrics"]["latest_close"] == 2750.0

    # Verify consumer lineage is recorded
    lineage = bb.get_lineage("market_data_and_quant_features")
    assert lineage is not None
    assert "adk_risk_validator" in lineage.consumers


# ============================================================================
# Criterion 3: Sequential Execution Enforces Dependencies
# ============================================================================

def test_03_sequential_execution_enforces_dependencies(research_manager, sample_request):
    async def run():
        coverage = get_data_coverage_tracker().audit_coverage(sample_request.symbol)
        plan = research_manager._create_task_plan(sample_request, OrchestrationPattern.SEQUENTIAL, coverage)
        bb = Blackboard(run_id=sample_request.run_id, request=sample_request)
        tracer = ExecutionTracer(run_id=sample_request.run_id, pattern="SEQUENTIAL")

        # Manually fail upstream quant node
        node_quant = plan.get_node("task-adk_quant_specialist")
        node_quant.status = TaskNodeStatus.FAILED
        node_quant.error_message = "Synthetic upstream failure"

        # Execute sequential - downstream microstructure node should be BLOCKED
        await research_manager._execute_sequential(sample_request, bb, tracer, plan)

        node_micro = plan.get_node("task-adk_microstructure_specialist")
        assert node_micro.status == TaskNodeStatus.BLOCKED
        assert "not completed" in node_micro.error_message

    asyncio.run(run())


# ============================================================================
# Criterion 4: Parallel Mode Executes Independent Tasks Concurrently
# ============================================================================

def test_04_parallel_mode_executes_independent_tasks_concurrently(research_manager, sample_request):
    async def run():
        report = await research_manager.run_research(sample_request, pattern=OrchestrationPattern.PARALLEL)
        events = research_manager.get_run_events(sample_request.run_id)

        # Find TASK_DISPATCHED events
        dispatched = [e for e in events if e.get("event_type") == LifecycleEventType.TASK_DISPATCHED.value]
        parallel_dispatches = [e for e in dispatched if e.get("payload", {}).get("concurrency") == "PARALLEL_BRANCH"]

        # All 4 independent agents were dispatched concurrently
        dispatched_agents = [e.get("agent_id") for e in parallel_dispatches]
        assert "adk_quant_specialist" in dispatched_agents
        assert "adk_microstructure_specialist" in dispatched_agents
        assert "crewai_news_macro_specialist" in dispatched_agents
        assert "crewai_corporate_filing_specialist" in dispatched_agents

    asyncio.run(run())


# ============================================================================
# Criterion 5: Hierarchical Mode Delegates Through Manager
# ============================================================================

def test_05_hierarchical_mode_delegates_through_manager(research_manager, sample_request):
    async def run():
        report = await research_manager.run_research(sample_request, pattern=OrchestrationPattern.HIERARCHICAL)
        events = research_manager.get_run_events(sample_request.run_id)

        # Check manager plan and supervisor dispatches
        manager_writes = [e for e in events if e.get("agent_id") == "adk_research_manager" and e.get("event_type") == LifecycleEventType.BLACKBOARD_WRITE.value]
        assert len(manager_writes) >= 1

        # Check skeptic challenge occurred
        skeptic_challenges = [e for e in events if e.get("event_type") == LifecycleEventType.SKEPTIC_CHALLENGE.value]
        assert len(skeptic_challenges) >= 1

        # Check gate decision occurred
        gate_events = [e for e in events if e.get("event_type") == LifecycleEventType.GATE_DECISION.value]
        assert len(gate_events) >= 1

    asyncio.run(run())


# ============================================================================
# Criterion 6: Invalid Agent Result Triggers Targeted Recovery
# ============================================================================

def test_06_invalid_agent_result_triggers_targeted_recovery(research_manager, sample_request):
    async def run():
        coverage = get_data_coverage_tracker().audit_coverage(sample_request.symbol)
        plan = research_manager._create_task_plan(sample_request, OrchestrationPattern.SEQUENTIAL, coverage)
        node = plan.get_node("task-adk_quant_specialist")
        bb = Blackboard(run_id=sample_request.run_id, request=sample_request)
        tracer = ExecutionTracer(run_id=sample_request.run_id, pattern="SEQUENTIAL")

        # Invalid contribution missing data_quality_status
        invalid_contrib = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="FAILED",  # Invalid status
            findings={"records_retrieved": 0},  # Missing data_quality_status
            run_id=sample_request.run_id,
            symbol=sample_request.symbol,
        )

        async def recovery_fn(attempt: int, errors: list[str]) -> AgentContribution:
            # Corrected contribution on attempt 1
            return AgentContribution(
                agent_id="adk_quant_specialist",
                framework="GOOGLE_ADK",
                task_name="market_data_and_quant_features",
                status="SUCCESS",
                findings={"records_retrieved": 1260, "data_quality_status": "DATA_VERIFIED_CLEAN"},
                run_id=sample_request.run_id,
                symbol=sample_request.symbol,
            )

        result = await research_manager._validate_and_record_contribution(
            node, invalid_contrib, recovery_fn, bb, tracer, sample_request
        )

        assert node.status == TaskNodeStatus.COMPLETED
        assert node.retry_count == 1
        assert result.status == "SUCCESS"
        assert node.artifact_id is not None

        events = [e.model_dump(mode="json") for e in tracer.get_events()]
        assert any(e.get("event_type") == LifecycleEventType.VALIDATION_FAILURE.value for e in events)
        assert any(e.get("event_type") == LifecycleEventType.TASK_RETRY.value for e in events)
        assert any(e.get("event_type") == LifecycleEventType.VALIDATION_SUCCESS.value for e in events)

    asyncio.run(run())


# ============================================================================
# Criterion 7: Permanently Invalid Result Blocks Final Synthesis
# ============================================================================

def test_07_permanently_invalid_result_blocks_final_synthesis(research_manager, sample_request):
    async def run():
        coverage = get_data_coverage_tracker().audit_coverage(sample_request.symbol)
        plan = research_manager._create_task_plan(sample_request, OrchestrationPattern.SEQUENTIAL, coverage)
        node = plan.get_node("task-adk_quant_specialist")
        bb = Blackboard(run_id=sample_request.run_id, request=sample_request)
        tracer = ExecutionTracer(run_id=sample_request.run_id, pattern="SEQUENTIAL")

        invalid_contrib = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="FAILED",
            findings={"bad_field": 123},
            run_id=sample_request.run_id,
            symbol=sample_request.symbol,
        )

        async def hopeless_recovery(attempt: int, errors: list[str]) -> AgentContribution:
            return invalid_contrib  # Always returns invalid

        await research_manager._validate_and_record_contribution(
            node, invalid_contrib, hopeless_recovery, bb, tracer, sample_request
        )

        assert node.status == TaskNodeStatus.FAILED
        assert node.retry_count == node.max_retries

        # Synthesize report with failed task plan
        report = await research_manager._synthesize_report(
            sample_request, bb, start_time=0.0, tracer=tracer, plan=plan
        )

        assert report.recommendation == "INCONCLUSIVE"
        assert report.conviction_score is None
        assert any("Task node 'task-adk_quant_specialist' ended with status 'FAILED'" in lim for lim in report.limitations_and_uncertainties)

    asyncio.run(run())


# ============================================================================
# Criterion 8: Cross-Run and Cross-Security Artifact Isolation
# ============================================================================

def test_08_cross_run_and_cross_security_artifacts_isolated(sample_request):
    bb = Blackboard(run_id="run-AAA", request=sample_request)

    # Attempt cross-run artifact
    cross_run_contrib = AgentContribution(
        agent_id="adk_quant_specialist",
        framework="GOOGLE_ADK",
        task_name="market_data_and_quant_features",
        status="SUCCESS",
        findings={"records_retrieved": 100},
        run_id="run-BBB",  # Mismatched run ID
        symbol="RELIANCE",
    )
    with pytest.raises(ValueError, match="Cross-run contamination detected"):
        bb.add_contribution(cross_run_contrib)

    # Attempt cross-security artifact
    cross_sec_contrib = AgentContribution(
        agent_id="adk_quant_specialist",
        framework="GOOGLE_ADK",
        task_name="market_data_and_quant_features",
        status="SUCCESS",
        findings={"records_retrieved": 100},
        run_id="run-AAA",
        symbol="TCS",  # Mismatched symbol (request is RELIANCE)
    )
    with pytest.raises(ValueError, match="Cross-security contamination detected"):
        bb.add_contribution(cross_sec_contrib)


# ============================================================================
# Criterion 9: Real MCP Tool Invocation is Observable
# ============================================================================

def test_09_real_mcp_tool_invocation_observable(research_manager, sample_request):
    async def run():
        report = await research_manager.run_research(sample_request, pattern=OrchestrationPattern.SEQUENTIAL)
        events = research_manager.get_run_events(sample_request.run_id)

        tool_invocations = [e for e in events if e.get("event_type") == LifecycleEventType.TOOL_INVOCATION.value]
        tool_completes = [e for e in events if e.get("event_type") == LifecycleEventType.TOOL_COMPLETE.value]

        tool_names = [e.get("payload", {}).get("tool") for e in tool_invocations]
        assert "query_market_data" in tool_names
        assert "calculate_statutory_costs" in tool_names
        assert "retrieve_regulatory_evidence" in tool_names
        assert len(tool_completes) >= 3

    asyncio.run(run())


# ============================================================================
# Criterion 10: A2A Requests and Responses Schema-Validated and Traceable
# ============================================================================

def test_10_a2a_requests_and_responses_schema_validated_and_traceable(sample_request):
    async def run():
        app = create_a2a_crewai_app("crewai_specialist_suite")
        bridge = A2AClientBridge(app=app)

        contrib = await bridge.invoke_specialist(
            symbol=sample_request.symbol,
            run_id=sample_request.run_id,
            task_name="macro_analysis",
            instructions="Analyze RBI monetary policy and repo rate stance",
            upstream_context={"has_macro_feed": True},
        )

        assert isinstance(contrib, AgentContribution)
        assert contrib.agent_id == "crewai_news_macro_specialist"
        assert contrib.framework == "CREWAI"
        assert contrib.status == "SUCCESS"
        assert "macro_regime" in contrib.findings or "headline_summary" in contrib.findings

    asyncio.run(run())


# ============================================================================
# Criterion 11: Callbacks Record Accurate Task States and Errors
# ============================================================================

def test_11_callbacks_record_accurate_task_states_and_errors(research_manager, sample_request):
    async def run():
        report = await research_manager.run_research(sample_request, pattern=OrchestrationPattern.SEQUENTIAL)
        events = research_manager.get_run_events(sample_request.run_id)

        event_types = [e.get("event_type") for e in events]
        assert LifecycleEventType.TASK_PLANNED.value in event_types
        assert LifecycleEventType.TASK_DISPATCHED.value in event_types
        assert LifecycleEventType.BLACKBOARD_READ.value in event_types
        assert LifecycleEventType.BLACKBOARD_WRITE.value in event_types
        assert LifecycleEventType.VALIDATION_SUCCESS.value in event_types
        assert LifecycleEventType.GATE_DECISION.value in event_types
        assert LifecycleEventType.AGENT_COMPLETE.value in event_types

        # Ensure all completed events have non-negative durations
        completed_events = [e for e in events if e.get("event_type") == LifecycleEventType.AGENT_COMPLETE.value]
        for e in completed_events:
            assert e.get("duration_ms") is not None
            assert e.get("duration_ms") >= 0.0

    asyncio.run(run())


# ============================================================================
# Criterion 12: Final Report References Exact Artifact IDs
# ============================================================================

def test_12_final_report_references_exact_artifacts(research_manager, sample_request):
    async def run():
        report = await research_manager.run_research(sample_request, pattern=OrchestrationPattern.SEQUENTIAL)

        # Check source provenance contains exact artifact IDs
        artifact_entries = [p for p in report.source_provenance if p.startswith("artifact:art-")]
        assert len(artifact_entries) >= 3
        assert any("adk_quant_specialist" in p for p in artifact_entries)
        assert any("adk_risk_validator" in p for p in artifact_entries)

    asyncio.run(run())
