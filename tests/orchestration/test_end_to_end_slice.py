"""End-to-End Seven-Agent Research Integration Tests.

Exercises the full multi-agent research pipeline:
- Seven Primary Agents (4 Google ADK + 3 CrewAI)
- Three Orchestration Patterns: SEQUENTIAL, PARALLEL, HIERARCHICAL
- FastMCP Tools (query_market_data, calculate_statutory_costs)
- Official A2A Protocol client/server exchange
- Observability tracing and RunAuditSummary generation
- Financial safety: Live trading guardrail and honest missing-data handling
"""

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
    ADKCoordinator,
    ADKResearchManager,
    OrchestrationPattern,
)
from arthaai.orchestration.observability import generate_run_summary
from arthaai.schemas.research_output import (
    QuantitativeResearchReport,
    ResearchRequest,
)


def test_end_to_end_vertical_slice():
    """Milestone 1 vertical slice regression test."""
    async def _test():
        config = AppConfig()
        assert config.live_trading_enabled is False

        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(
            app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
        )
        mcp_client = get_mcp_client()
        coordinator = ADKCoordinator(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

        now = datetime(2024, 11, 1, 10, 30, tzinfo=timezone.utc)
        request = ResearchRequest(
            request_id="req-e2e-001",
            run_id="run-e2e-slice-alpha",
            symbol="RELIANCE",
            as_of_time=now,
            timeframe="1d",
            scope=["quant", "compliance", "adversarial"],
        )

        report = await coordinator.run_research(request, pattern=OrchestrationPattern.SEQUENTIAL)

        assert isinstance(report, QuantitativeResearchReport)
        assert report.run_id == "run-e2e-slice-alpha"
        assert report.symbol == "RELIANCE"
        assert report.as_of_time == now

        assert "records_retrieved" in report.quantitative_findings
        assert report.quantitative_findings["data_source"] in (
            "duckdb_parquet_partitioned",
            "yfinance_cached_parquet",
            "yfinance_live",
        )

        assert "total_statutory_costs_inr" in report.statutory_risk_bounds
        assert report.statutory_risk_bounds["total_statutory_costs_inr"] > 0
        assert report.statutory_risk_bounds["effective_rate_pct"] > 0

        # Evidence-integrity: statutory citation is always present; Parquet citations only when data exists
        assert len(report.qualitative_evidence) >= 1
        # Statutory citation always contains Finance Act provenance reference
        assert any("Finance Act" in cite or "Statutory Source" in cite for cite in report.qualitative_evidence)

        assert len(report.limitations_and_uncertainties) >= 2
        assert any("Live trading disabled" in lim for lim in report.limitations_and_uncertainties)
        assert any("zero lookahead" in lim.lower() for lim in report.limitations_and_uncertainties)

        assert "RELIANCE" in report.executive_thesis
        assert "DuckDB" in report.executive_thesis
        assert "INR" in report.executive_thesis

    asyncio.run(_test())


def test_sequential_pattern_with_seven_agents():
    """Tests the SEQUENTIAL orchestration pattern activating all 7 primary agents."""
    async def _test():
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(
            app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
        )
        mcp_client = get_mcp_client()
        manager = ADKResearchManager(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

        now = datetime(2024, 11, 1, 11, 0, tzinfo=timezone.utc)
        request = ResearchRequest(
            request_id="req-seq-001",
            run_id="run-seq-7agents",
            symbol="TCS",
            as_of_time=now,
            timeframe="1d",
            scope=["quant", "microstructure", "news", "filings", "adversarial", "compliance"],
        )

        report = await manager.run_research(request, pattern=OrchestrationPattern.SEQUENTIAL)

        assert isinstance(report, QuantitativeResearchReport)
        assert report.symbol == "TCS"
        assert "orchestration_pattern_SEQUENTIAL" in report.source_provenance

        # Evidence-integrity: with empty Parquet store, only statutory citation present
        # Limitations must reflect missing data + live trading guardrail
        assert len(report.qualitative_evidence) >= 1
        assert len(report.limitations_and_uncertainties) >= 2

    asyncio.run(_test())


def test_parallel_pattern_with_seven_agents():
    """Tests the PARALLEL orchestration pattern with concurrent collection and deterministic merge."""
    async def _test():
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(
            app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
        )
        mcp_client = get_mcp_client()
        manager = ADKResearchManager(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

        now = datetime(2024, 11, 1, 11, 0, tzinfo=timezone.utc)
        request = ResearchRequest(
            request_id="req-par-001",
            run_id="run-par-7agents",
            symbol="INFY",
            as_of_time=now,
            timeframe="1d",
            scope=["quant", "microstructure", "news", "filings", "adversarial", "compliance"],
        )

        report = await manager.run_research(request, pattern=OrchestrationPattern.PARALLEL)

        assert isinstance(report, QuantitativeResearchReport)
        assert report.symbol == "INFY"
        assert "orchestration_pattern_PARALLEL" in report.source_provenance
        assert report.statutory_risk_bounds["total_statutory_costs_inr"] > 0

    asyncio.run(_test())


def test_hierarchical_pattern_with_seven_agents():
    """Tests the HIERARCHICAL orchestration pattern with supervisory task delegation."""
    async def _test():
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(
            app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
        )
        mcp_client = get_mcp_client()
        manager = ADKResearchManager(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

        now = datetime(2024, 11, 1, 11, 0, tzinfo=timezone.utc)
        request = ResearchRequest(
            request_id="req-hie-001",
            run_id="run-hie-7agents",
            symbol="HDFCBANK",
            as_of_time=now,
            timeframe="1d",
            scope=["quant", "microstructure", "news", "filings", "adversarial", "compliance"],
        )

        report = await manager.run_research(request, pattern=OrchestrationPattern.HIERARCHICAL)

        assert isinstance(report, QuantitativeResearchReport)
        assert report.symbol == "HDFCBANK"
        assert "orchestration_pattern_HIERARCHICAL" in report.source_provenance
        assert report.statutory_risk_bounds["total_statutory_costs_inr"] > 0

    asyncio.run(_test())


def test_honest_missing_data_behavior():
    """Verifies that empty market data records never generate fabricated metrics."""
    async def _test():
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(
            app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
        )
        mcp_client = get_mcp_client()
        manager = ADKResearchManager(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

        now = datetime(2024, 11, 1, 11, 0, tzinfo=timezone.utc)
        request = ResearchRequest(
            request_id="req-empty-001",
            run_id="run-empty-check",
            symbol="NONEXISTENT_ASSET",
            as_of_time=now,
            timeframe="1d",
        )

        report = await manager.run_research(request, pattern=OrchestrationPattern.SEQUENTIAL)

        # Assert no numerical indicators fabricated
        assert report.quantitative_findings["records_retrieved"] == 0
        assert report.quantitative_findings["empty_result"] is True
        metrics = report.quantitative_findings.get("calculated_metrics", {})
        assert metrics.get("simple_returns") is None
        assert metrics.get("realized_volatility_20d") is None
        assert metrics.get("rsi_14d") is None

        # Assert limitations explicitly report absence of data
        assert any("no pre-recorded Parquet bars" in lim for lim in report.limitations_and_uncertainties)
        assert any("External news feed unconfigured" in lim for lim in report.limitations_and_uncertainties)
        assert any("Official filing disclosures unconfigured" in lim for lim in report.limitations_and_uncertainties)

    asyncio.run(_test())
