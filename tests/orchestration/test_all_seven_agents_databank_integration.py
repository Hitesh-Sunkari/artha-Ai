"""End-to-End Integration Test for All Seven Research Agents with Shared Data Bank."""

import asyncio
from datetime import datetime, timezone
import pytest

from arthaai.core.clock.timezone import now_utc
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
from arthaai.schemas.research_output import ResearchRequest


def test_seven_agents_end_to_end_databank_execution():
    async def _test():
        mcp_client = get_mcp_client()
        app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(app=app, base_url="http://testserver", rpc_url="http://testserver/rpc")
        
        manager = ADKResearchManager(mcp_client=mcp_client, a2a_bridge=a2a_bridge)
        
        request = ResearchRequest(
            symbol="RELIANCE",
            as_of_time=datetime(2024, 11, 1, 10, 0, tzinfo=timezone.utc),
            pattern="SEQUENTIAL",
            enable_a2a_crewai=True,
            custom_instructions="Evaluate Q2 FY25 operational trajectory and statutory STT impact.",
        )
        
        report = await manager.execute_research(request)
        
        # 1. Verify Report Schema & Status
        assert report.symbol == "RELIANCE"
        assert report.orchestration_pattern == "SEQUENTIAL"
        assert report.run_id is not None
        assert len(report.agent_contributions) == 7

        # 2. Verify all 7 agents contributed
        agent_ids = {c.agent_id for c in report.agent_contributions}
        expected_agents = {
            "adk_research_manager",
            "adk_quant_specialist",
            "adk_microstructure_specialist",
            "adk_risk_validator",
            "crewai_adversarial_specialist",
            "crewai_news_macro_specialist",
            "crewai_corporate_filing_specialist",
        }
        assert agent_ids == expected_agents

        # 3. Verify Framework Interoperability (Google ADK + CrewAI)
        adk_agents = [c for c in report.agent_contributions if c.framework == "GOOGLE_ADK"]
        crewai_agents = [c for c in report.agent_contributions if c.framework == "CREWAI"]
        assert len(adk_agents) == 4
        assert len(crewai_agents) == 3

        # 4. Verify Quant Specialist consumed actual Parquet bars from Data Bank
        quant_contrib = next(c for c in report.agent_contributions if c.agent_id == "adk_quant_specialist")
        assert quant_contrib.findings.get("records_retrieved", 0) >= 700
        assert quant_contrib.findings.get("latest_close") is not None
        assert quant_contrib.findings.get("annualized_volatility") is not None

        # 5. Verify Risk Validator permanently asserted live trading is disabled
        risk_contrib = next(c for c in report.agent_contributions if c.agent_id == "adk_risk_validator")
        assert risk_contrib.findings["live_trading_blocked"] is True
        assert risk_contrib.findings["risk_validation_passed"] is True

        # 6. Verify Adversarial Skeptic challenged the thesis
        skeptic_contrib = next(c for c in report.agent_contributions if c.agent_id == "crewai_adversarial_specialist")
        assert "regime_fragility" in skeptic_contrib.findings
        assert len(skeptic_contrib.warnings) > 0

    asyncio.run(_test())

