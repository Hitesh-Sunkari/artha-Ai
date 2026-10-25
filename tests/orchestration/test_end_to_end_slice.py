"""End-to-End Vertical Slice Integration Test.

Exercises the full multi-agent pipeline:
ResearchRequest -> ADK Coordinator -> FastMCP Tools -> Official A2A Protocol ->
CrewAI Specialist -> Blackboard Shared State -> Validated QuantitativeResearchReport.
"""

from datetime import datetime, timezone
import pytest

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import (
    A2AClientBridge,
    create_a2a_crewai_app,
)
from arthaai.orchestration.adk_coordinator import ADKCoordinator
from arthaai.schemas.research_output import (
    QuantitativeResearchReport,
    ResearchRequest,
)


import asyncio

def test_end_to_end_vertical_slice():
    async def _test():
        # Verify safety: Live trading must remain blocked
        config = AppConfig()
        assert config.live_trading_enabled is False

        # 1. Setup real in-process A2A server & client bridge
        crewai_app = create_a2a_crewai_app("crewai_adversarial_specialist")
        a2a_bridge = A2AClientBridge(
            app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
        )

        # 2. Setup real FastMCP client
        mcp_client = get_mcp_client()

        # 3. Initialize Google ADK Coordinator
        coordinator = ADKCoordinator(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

        # 4. Formulate validated ResearchRequest
        now = datetime(2024, 11, 1, 10, 30, tzinfo=timezone.utc)
        request = ResearchRequest(
            request_id="req-e2e-001",
            run_id="run-e2e-slice-alpha",
            symbol="RELIANCE",
            as_of_time=now,
            timeframe="1d",
            scope=["quant", "compliance", "adversarial"],
        )

        # 5. Execute full vertical slice
        report = await coordinator.run_research(request)

        # 6. Verify final Pydantic validated output
        assert isinstance(report, QuantitativeResearchReport)
        assert report.run_id == "run-e2e-slice-alpha"
        assert report.symbol == "RELIANCE"
        assert report.as_of_time == now

        # Verify quantitative findings from FastMCP Tool 1
        assert "records_retrieved" in report.quantitative_findings
        assert report.quantitative_findings["data_source"] == "duckdb_parquet_partitioned"

        # Verify statutory risk bounds from FastMCP Tool 2
        assert "total_statutory_costs_inr" in report.statutory_risk_bounds
        assert report.statutory_risk_bounds["total_statutory_costs_inr"] > 0
        assert report.statutory_risk_bounds["effective_rate_pct"] > 0

        # Verify qualitative evidence from CrewAI via A2A
        assert len(report.qualitative_evidence) >= 2
        assert any("NSE" in cite or "SEBI" in cite for cite in report.qualitative_evidence)

        # Verify explicit caveats and honesty
        assert len(report.limitations_and_uncertainties) >= 2
        assert any("Live trading disabled" in lim for lim in report.limitations_and_uncertainties)
        assert any("zero lookahead" in lim.lower() for lim in report.limitations_and_uncertainties)

        # Verify synthesis text
        assert "RELIANCE" in report.executive_thesis
        assert "DuckDB" in report.executive_thesis
        assert "INR" in report.executive_thesis

    asyncio.run(_test())
