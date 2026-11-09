"""Phase 2G Integration Test Suite: Corporate Filing & Disclosure Specialist (CrewAI via A2A).

Verifies:
1. End-to-end A2A protocol dispatch over JSON-RPC 2.0 to CrewAI Corporate Filing Specialist.
2. Agent contract compliance (Framework: CREWAI, role: CORPORATE_FILING_SPECIALIST).
3. Retrieval of authentic company-specific Q2 FY25 quarterly filings (e.g. RELIANCE, TCS, INFY).
4. Statutory compliance audit under SEBI (LODR) Regulations 2015 (Reg 30 Materiality & Reg 33 Financial Results).
5. Zero fabrication mandate on unindexed filings (e.g. SWIGGY): honest limitation disclosure, analytical_verdict="NEUTRAL".
6. Clean/unqualified auditor opinion verification (Limited Review Report without adverse remarks).
7. Real LLM corporate governance synthesis (via llm_adapter) without boilerplate prompt leakage.
8. Unconfigured feed handling (source_status="NOT_CONFIGURED", zero citations).
9. Blackboard consumer lineage tracking (consumer_id="adk_research_manager").
10. Full system integration into ADKResearchManager orchestration.
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
            run_id="run-filing-01",
            task_name="filing_analysis",
            instructions="Audit quarterly financial filings",
            upstream_context={"has_filings_feed": True},
        )

        assert contrib.agent_id == "crewai_corporate_filing_specialist"
        assert contrib.framework == "CREWAI"
        assert contrib.task_name == "corporate_filing_analysis"
        assert contrib.status == "SUCCESS"
        assert contrib.execution_status == "COMPLETED"

        reg = AgentContractRegistry()
        contract = reg.get_contract("crewai_corporate_filing_specialist")
        assert contract is not None
        assert contract.framework == AgentFramework.CREWAI
        assert contract.role == AgentRole.CORPORATE_FILING_SPECIALIST
        assert "retrieve_regulatory_evidence" in contract.permitted_tools

    asyncio.run(run())


# ============================================================================
# Criterion 2: Company-Specific Q2 FY25 Filing Retrieval (RELIANCE)
# ============================================================================

def test_02_company_specific_q2fy25_filing_retrieval_reliance(a2a_bridge):
    """Specialist extracts indexed Q2 FY25 filing chunk for RELIANCE and approves verdict."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-filing-02",
            task_name="corporate_filing_analysis",
            instructions="Audit Q2 FY25 results for Reliance Industries",
            upstream_context={"has_filings_feed": True},
        )

        findings = contrib.findings
        assert findings["company_specific_filing_verified"] is True
        assert contrib.analytical_verdict == "APPROVED"
        assert contrib.evidence_status == "VERIFIED"
        assert any("reliance" in c.lower() for c in contrib.evidence_citations)

        structured_ev = findings.get("structured_evidence", [])
        assert len(structured_ev) > 0
        first_ev = structured_ev[0]
        assert first_ev["validation_outcome"] == "RESOLVED_STORED_DOCUMENT"
        assert "clean" in first_ev["audit_opinion"].lower() or "limited review" in first_ev["audit_opinion"].lower()
        assert "Q2" in first_ev["reporting_period"]

    asyncio.run(run())


# ============================================================================
# Criterion 3: SEBI LODR Regulation 30 & 33 Compliance Audit
# ============================================================================

def test_03_sebi_lodr_reg30_and_reg33_compliance_audit(a2a_bridge):
    """Specialist evaluates reporting timeline (45 days) and material disclosures under SEBI LODR."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="INFY",
            run_id="run-filing-03",
            task_name="filing_analysis",
            instructions="Verify SEBI LODR compliance",
            upstream_context={"has_filings_feed": True},
        )

        findings = contrib.findings
        assert findings["compliance_status"] == "COMPLIANT_LODR_REG_33"
        assert any(auth in findings["regulatory_authority"] for auth in ("NSE", "SEBI", "BSE"))
        assert findings["governance_rating"] == "SATISFACTORY"
        assert "Limited Review Report" in findings["audit_standard"]

    asyncio.run(run())


# ============================================================================
# Criterion 4: Zero Fabrication Mandate on Unindexed Filing (SWIGGY)
# ============================================================================

def test_04_zero_fabrication_unindexed_filing_swiggy(a2a_bridge):
    """Specialist MUST NOT fabricate filings for unindexed tickers (e.g. SWIGGY); emits NEUTRAL and limitation."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="SWIGGY",
            run_id="run-filing-04",
            task_name="filing_analysis",
            instructions="Audit Swiggy filing status",
            upstream_context={"has_filings_feed": True},
        )

        findings = contrib.findings
        # Must honestly report that company-specific filing is not present in local corpus
        assert findings["company_specific_filing_verified"] is False
        assert contrib.analytical_verdict == "NEUTRAL"

        # Must record honest limitation disclosure
        assert any("not found in local corpus" in lim for lim in contrib.limitations)

        # Fallback citations point to generic SEBI LODR regulations
        for c in contrib.evidence_citations:
            assert "lodr" in c.lower() or "sebi" in c.lower()

    asyncio.run(run())


# ============================================================================
# Criterion 5: Clean Unqualified Auditor Opinion Verification
# ============================================================================

def test_05_clean_unqualified_audit_opinion_verification(a2a_bridge):
    """Specialist confirms clean limited review opinion with zero adverse auditor qualifications."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="TCS",
            run_id="run-filing-05",
            task_name="filing_analysis",
            instructions="Verify auditor opinion and notes",
            upstream_context={"has_filings_feed": True},
        )

        findings = contrib.findings
        structured_ev = findings.get("structured_evidence", [])
        assert len(structured_ev) > 0
        audit_op = structured_ev[0].get("audit_opinion", "")
        assert "Clean" in audit_op or "Unqualified" in audit_op

    asyncio.run(run())


# ============================================================================
# Criterion 6: Real LLM Corporate Governance Synthesis
# ============================================================================

def test_06_real_llm_governance_synthesis(a2a_bridge):
    """Specialist invokes LLM adapter for structured governance assessment."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="HDFCBANK",
            run_id="run-filing-06",
            task_name="filing_analysis",
            instructions="Generate corporate governance analysis",
            upstream_context={"has_filings_feed": True},
        )

        findings = contrib.findings
        assert "llm_filing_analysis" in findings
        analysis = findings["llm_filing_analysis"]
        assert len(analysis) > 20
        assert "llm_provider" in findings
        assert "You are a SEBI-expert" not in analysis

    asyncio.run(run())


# ============================================================================
# Criterion 7: Unconfigured Feed Honest Reporting
# ============================================================================

def test_07_unconfigured_feed_honest_reporting(a2a_bridge):
    """When filings feed is unconfigured, specialist reports UNAVAILABLE with 0 citations."""
    async def run():
        contrib = await a2a_bridge.invoke_specialist(
            symbol="ITC",
            run_id="run-filing-07",
            task_name="filing_analysis",
            instructions="Audit when feed unconfigured",
            upstream_context={"has_filings_feed": False},
        )

        findings = contrib.findings
        assert findings["source_status"] == "NOT_CONFIGURED"
        assert findings["finding_category"] == "UNAVAILABLE"
        assert contrib.evidence_citations == []
        assert contrib.evidence_status == "INSUFFICIENT_DATA"
        assert contrib.analytical_verdict == "NOT_EVALUATED"
        assert len(contrib.warnings) > 0

    asyncio.run(run())


# ============================================================================
# Criterion 8: Blackboard Lineage Tracking
# ============================================================================

def test_08_blackboard_lineage_tracking(a2a_bridge):
    """Manager reading corporate filing contribution must be tracked in Blackboard lineage."""
    async def run():
        bb = Blackboard(run_id="run-filing-lineage")
        contrib = await a2a_bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-filing-lineage",
            task_name="filing_analysis",
            instructions="Audit Reliance filings",
            upstream_context={"has_filings_feed": True},
        )
        bb.add_contribution(contrib)

        consumed = bb.get_latest_contribution("corporate_filing_analysis", consumer_id="adk_research_manager")
        assert consumed is not None
        assert consumed.agent_id == "crewai_corporate_filing_specialist"

        lineage = bb.get_lineage("corporate_filing_analysis")
        assert lineage is not None
        assert "adk_research_manager" in lineage.consumers

    asyncio.run(run())


# ============================================================================
# Criterion 9: Lifecycle Event Tracing
# ============================================================================

def test_09_lifecycle_event_tracing():
    """ExecutionTracer records full A2A dispatch events for filing specialist."""
    async def run():
        manager = ADKResearchManager()
        req = ResearchRequest(
            request_id="req-filing-trace-01",
            run_id="run-filing-trace-01",
            symbol="INFY",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            orchestration_pattern=OrchestrationPattern.SEQUENTIAL,
        )

        report = await manager.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        events = manager.get_run_events(req.run_id)

        filing_events = [e for e in events if e.get("agent_id") == "crewai_corporate_filing_specialist"]
        event_types = [e.get("event_type") for e in filing_events]

        assert LifecycleEventType.AGENT_START.value in event_types
        assert LifecycleEventType.A2A_MESSAGE_RECEIVED.value in event_types
        assert LifecycleEventType.AGENT_COMPLETE.value in event_types

    asyncio.run(run())


# ============================================================================
# Criterion 10: End-to-End ADK Research Manager Integration
# ============================================================================

def test_10_end_to_end_research_manager_integration():
    """ADKResearchManager executes crewai_corporate_filing_specialist in full research workflow."""
    async def run():
        manager = ADKResearchManager()
        req = ResearchRequest(
            request_id="req-p2g-manager-01",
            run_id="run-p2g-manager-01",
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            orchestration_pattern=OrchestrationPattern.SEQUENTIAL,
        )

        report = await manager.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        assert report is not None
        assert report.symbol == "RELIANCE"

        bb = manager.get_run_blackboard(report.run_id)
        assert bb is not None

        filing_contrib = bb.get_latest_contribution("corporate_filing_analysis")
        assert filing_contrib is not None
        assert filing_contrib.agent_id == "crewai_corporate_filing_specialist"
        assert filing_contrib.status == "SUCCESS"
        assert filing_contrib.findings["company_specific_filing_verified"] is True

        plan = manager.get_run_task_plan(report.run_id)
        assert plan is not None
        node = plan.get_node("task-crewai_corporate_filing_specialist")
        assert node is not None
        assert node.status.value in ("COMPLETED", "VERIFIED")

    asyncio.run(run())
