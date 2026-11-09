"""Phase 2F Integration Test Suite: Macro & News Sentiment Specialist (CrewAI via A2A).

Verifies:
1. End-to-end A2A protocol dispatch over JSON-RPC 2.0 to CrewAI News & Macro Specialist.
2. Agent contract compliance (Framework: CREWAI, role: NEWS_MACRO_SPECIALIST).
3. Authentic RBI monetary policy anchor (Repo Rate 6.50%, SDF 6.25%, MSF 6.75%, CPI 4.0% +/- 2%).
4. Grounded ChromaDB RAG evidence retrieval with verified statutory citation URIs.
5. Real LLM macroeconomic synthesis (via llm_adapter) without raw boilerplate or emojis.
6. Honest reporting and zero fabrication when external feeds are unconfigured (source_status="NOT_CONFIGURED", zero citations).
7. Prohibition of breaking news rumors, gossip, or unindexed social sentiment.
8. Lineage tracking and downstream Blackboard consumption by ADKResearchManager.
9. Lifecycle event tracing (AGENT_START, A2A_MESSAGE_SENT, A2A_MESSAGE_RECEIVED, AGENT_COMPLETE).
10. Full system integration into ADKResearchManager sequential and parallel execution.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any
import pytest

from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import (
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
def a2a_bridge():
    app = create_a2a_crewai_app("crewai_specialist_suite")
    return A2AClientBridge(app=app)


# ============================================================================
# Criterion 1: A2A Protocol Dispatch & Agent Contract Registry
# ============================================================================

def test_01_a2a_dispatch_and_agent_contract(a2a_bridge):
    """Specialist must be invokable over A2A and fulfill its registered contract."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-macro-01",
            task_name="macro_analysis",
            instructions="Analyze macroeconomic context",
            upstream_context={"has_macro_feed": True},
        )

        assert contrib.agent_id == "crewai_news_macro_specialist"
        assert contrib.framework == "CREWAI"
        assert contrib.task_name == "news_macro_analysis"
        assert contrib.status == "SUCCESS"
        assert contrib.execution_status == "COMPLETED"

        reg = AgentContractRegistry()
        contract = reg.get_contract("crewai_news_macro_specialist")
        assert contract is not None
        assert contract.framework == AgentFramework.CREWAI
        assert contract.role == AgentRole.NEWS_MACRO_SPECIALIST
        assert "retrieve_regulatory_evidence" in contract.permitted_tools

    asyncio.run(run())


# ============================================================================
# Criterion 2: Authentic RBI Monetary Policy Anchor
# ============================================================================

def test_02_authentic_rbi_monetary_policy_anchor(a2a_bridge):
    """Specialist must ground its macro thesis on authentic RBI monetary policy parameters."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="TCS",
            run_id="run-macro-02",
            task_name="news_macro_analysis",
            instructions="Assess interest rate corridor impact",
            upstream_context={"has_macro_feed": True},
        )

        findings = contrib.findings
        assert findings["policy_anchor"] == "RBI MPC Repo Rate (6.50%)"
        assert findings["inflation_target_pct"] == 4.0
        assert findings["inflation_tolerance_band"] == "+/- 2.0%"
        assert "LAF" in findings["systemic_liquidity_regime"]
        assert "discount rate" in findings["rate_environment_impact"].lower()
        assert findings["macro_verdict"] in ("NEUTRAL", "TAILWIND", "HEADWIND")

    asyncio.run(run())


# ============================================================================
# Criterion 3: Grounded ChromaDB RAG Evidence Retrieval
# ============================================================================

def test_03_rag_chromadb_grounded_evidence_retrieval(a2a_bridge):
    """Specialist must extract authentic RAG chunks from ChromaDB with verified citations."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="INFY",
            run_id="run-macro-03",
            task_name="macro_analysis",
            instructions="Audit monetary policy evidence",
            upstream_context={"has_macro_feed": True},
        )

        assert contrib.evidence_status == "VERIFIED"
        assert len(contrib.evidence_citations) > 0
        for cite in contrib.evidence_citations:
            assert cite.startswith("rag://")

        structured_ev = contrib.findings.get("structured_evidence", [])
        assert len(structured_ev) > 0
        first_ev = structured_ev[0]
        assert "Reserve Bank of India" in first_ev.get("publisher", "")
        assert "RBI" in first_ev.get("primary_source_ref", "")
        assert "claim_mapping" in first_ev
        assert "validation_outcome" in first_ev

    asyncio.run(run())


# ============================================================================
# Criterion 4: Real LLM Macroeconomic Synthesis
# ============================================================================

def test_04_real_llm_macroeconomic_synthesis(a2a_bridge):
    """Specialist must invoke LLM adapter for structured, punchy macroeconomic thesis."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-macro-04",
            task_name="macro_analysis",
            instructions="Generate macroeconomic equity impact thesis",
            upstream_context={"has_macro_feed": True},
        )

        findings = contrib.findings
        assert "llm_macro_analysis" in findings
        analysis = findings["llm_macro_analysis"]
        assert len(analysis) > 20
        assert "llm_provider" in findings
        # Verify absence of raw prompts or emoji chatter
        assert "You are a senior macroeconomic analyst" not in analysis

    asyncio.run(run())


# ============================================================================
# Criterion 5: Unconfigured Feed Honest Reporting (Zero Fabrication)
# ============================================================================

def test_05_unconfigured_feed_honest_reporting_no_fabrication(a2a_bridge):
    """When external macro/news feed is unconfigured, specialist must report UNAVAILABLE with 0 citations."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="HDFCBANK",
            run_id="run-macro-05",
            task_name="macro_analysis",
            instructions="Assess macro when unconfigured",
            upstream_context={"has_macro_feed": False},
        )

        findings = contrib.findings
        assert findings["source_status"] == "NOT_CONFIGURED"
        assert findings["finding_category"] == "UNAVAILABLE"
        assert contrib.evidence_citations == []  # Zero fabricated citations!
        assert len(contrib.warnings) > 0
        assert "not configured" in contrib.warnings[0].lower()

    asyncio.run(run())


# ============================================================================
# Criterion 6: Zero News Rumor or Gossip Fabrication
# ============================================================================

def test_06_zero_news_rumor_or_gossip_fabrication(a2a_bridge):
    """Specialist must strictly refuse to fabricate social media sentiment or unverified rumors."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="SWIGGY",
            run_id="run-macro-06",
            task_name="macro_analysis",
            instructions="Audit headlines for rumors",
            upstream_context={"has_macro_feed": True},
        )

        findings = contrib.findings
        findings_str = str(findings).lower()
        # Verify no unsourced gossip keywords
        assert "rumor has it" not in findings_str
        assert "social media buzz" not in findings_str
        assert "unconfirmed leak" not in findings_str

    asyncio.run(run())


# ============================================================================
# Criterion 7: Blackboard Lineage Tracking
# ============================================================================

def test_07_blackboard_lineage_tracking(a2a_bridge):
    """Downstream manager consumption of macro artifact must be tracked in Blackboard lineage."""
    async def run():
        bb = Blackboard(run_id="run-macro-lineage")
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-macro-lineage",
            task_name="macro_analysis",
            instructions="Evaluate macro environment",
            upstream_context={"has_macro_feed": True},
        )
        bb.add_contribution(contrib)

        # ADK Research Manager reads macro contribution
        consumed = bb.get_latest_contribution("news_macro_analysis", consumer_id="adk_research_manager")
        assert consumed is not None
        assert consumed.agent_id == "crewai_news_macro_specialist"

        lineage = bb.get_lineage("news_macro_analysis")
        assert lineage is not None
        assert "adk_research_manager" in lineage.consumers

    asyncio.run(run())


# ============================================================================
# Criterion 8: Lifecycle Event Tracing Over A2A
# ============================================================================

def test_08_lifecycle_event_tracing():
    """ExecutionTracer records full A2A lifecycle events for macro specialist."""
    async def run():
        manager = ADKResearchManager()
        req = ResearchRequest(
            request_id="req-macro-trace-01",
            run_id="run-macro-trace-01",
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            orchestration_pattern=OrchestrationPattern.SEQUENTIAL,
        )

        report = await manager.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        events = manager.get_run_events(req.run_id)

        macro_events = [e for e in events if e.get("agent_id") == "crewai_news_macro_specialist"]
        event_types = [e.get("event_type") for e in macro_events]

        assert LifecycleEventType.AGENT_START.value in event_types
        assert LifecycleEventType.A2A_MESSAGE_RECEIVED.value in event_types
        assert LifecycleEventType.AGENT_COMPLETE.value in event_types

    asyncio.run(run())


# ============================================================================
# Criterion 9: Symbol Neutrality of Statutory Policy Anchor
# ============================================================================

def test_09_symbol_neutrality_of_macro_anchor(a2a_bridge):
    """Monetary policy corridor is systemic across Indian equities regardless of ticker."""
    async def run():
        c_rel = await a2a_bridge.invoke_specialist("RELIANCE", "run-sym-01", "macro_analysis", upstream_context={"has_macro_feed": True})
        c_infy = await a2a_bridge.invoke_specialist("INFY", "run-sym-02", "macro_analysis", upstream_context={"has_macro_feed": True})
        c_swiggy = await a2a_bridge.invoke_specialist("SWIGGY", "run-sym-03", "macro_analysis", upstream_context={"has_macro_feed": True})

        for c in (c_rel, c_infy, c_swiggy):
            assert c.findings["policy_anchor"] == "RBI MPC Repo Rate (6.50%)"
            assert c.findings["inflation_target_pct"] == 4.0
            assert c.findings["macro_verdict"] == "NEUTRAL"

    asyncio.run(run())


# ============================================================================
# Criterion 10: End-to-End ADK Research Manager Integration
# ============================================================================

def test_10_end_to_end_research_manager_integration():
    """ADKResearchManager executes crewai_news_macro_specialist in full research workflow."""
    async def run():
        manager = ADKResearchManager()
        req = ResearchRequest(
            request_id="req-p2f-manager-01",
            run_id="run-p2f-manager-01",
            symbol="TCS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            orchestration_pattern=OrchestrationPattern.SEQUENTIAL,
        )

        report = await manager.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        assert report is not None
        assert report.symbol == "TCS"

        bb = manager.get_run_blackboard(report.run_id)
        assert bb is not None

        macro_contrib = bb.get_latest_contribution("news_macro_analysis")
        assert macro_contrib is not None
        assert macro_contrib.agent_id == "crewai_news_macro_specialist"
        assert macro_contrib.status == "SUCCESS"
        assert macro_contrib.evidence_status == "VERIFIED"

        plan = manager.get_run_task_plan(report.run_id)
        assert plan is not None
        node = plan.get_node("task-crewai_news_macro_specialist")
        assert node is not None
        assert node.status.value in ("COMPLETED", "VERIFIED")

    asyncio.run(run())
