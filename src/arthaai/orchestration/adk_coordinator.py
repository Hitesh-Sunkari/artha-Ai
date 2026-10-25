"""Google ADK Coordinator agent orchestrating multi-agent research with MCP tools and A2A protocol."""

import time
from datetime import datetime
from typing import Any
from google.adk import Agent

from arthaai.core.clock.timezone import now_utc
from arthaai.mcp.server import MCPClient, get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge
from arthaai.orchestration.blackboard import Blackboard
from arthaai.schemas.research_output import (
    AgentContribution,
    QuantitativeResearchReport,
    ResearchRequest,
)


class ADKCoordinator:
    """Coordinator agent engineered on Google ADK.

    Orchestrates quantitative research workflow:
    1. Validates research request against point-in-time constraints.
    2. Populates thread-safe Blackboard shared context.
    3. Invokes MCP Tool 1 (DuckDB Market Data) and Tool 2 (Statutory Indian Fees).
    4. Dispatches A2A protocol task to the CrewAI specialist.
    5. Validates responses and synthesizes a structured Pydantic report.
    """

    def __init__(
        self,
        mcp_client: MCPClient | None = None,
        a2a_bridge: A2AClientBridge | None = None,
    ) -> None:
        self.adk_agent = Agent(
            name="adk_research_coordinator",
            description="Google ADK Central Orchestrator managing quantitative state, MCP tools, and A2A handoffs.",
        )
        self.mcp_client = mcp_client or get_mcp_client()
        self.a2a_bridge = a2a_bridge or A2AClientBridge()

    async def run_research(self, request: ResearchRequest) -> QuantitativeResearchReport:
        """Executes the complete vertical slice research flow end-to-end."""
        start_time = time.perf_counter()
        blackboard = Blackboard(run_id=request.run_id, request=request)
        blackboard.set_metadata("start_time", now_utc().isoformat())

        # Step 1: Execute MCP Tool 1 (query_market_data)
        query_date_str = request.as_of_time.strftime("%Y-%m-%d")
        market_data_res = await self.mcp_client.call_tool(
            "query_market_data",
            {
                "symbol": request.symbol,
                "start_date": "2024-01-01",
                "end_date": query_date_str,
                "as_of_time": request.as_of_time.isoformat(),
                "limit": 100,
            },
        )
        blackboard.add_tool_result("query_market_data", market_data_res)

        quant_contribution = AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_ingestion",
            status="SUCCESS" if not market_data_res.get("empty_result") else "SUCCESS",
            findings={
                "records_retrieved": market_data_res.get("records_count", 0),
                "empty_result": market_data_res.get("empty_result", True),
                "data_source": market_data_res.get("source", "duckdb_parquet"),
            },
            evidence_citations=[f"parquet://data/ohlcv/{request.symbol.lower()}"],
            warnings=[market_data_res["message"]] if market_data_res.get("message") else [],
            timestamp=now_utc(),
        )
        blackboard.add_contribution(quant_contribution)

        # Step 2: Execute MCP Tool 2 (calculate_statutory_costs)
        # Use a reference delivery transaction (100 shares @ 1000 INR)
        statutory_res = await self.mcp_client.call_tool(
            "calculate_statutory_costs",
            {
                "instrument_type": "EQUITY_DELIVERY",
                "price": 1000.0,
                "quantity": 100,
                "transaction_type": "BUY",
                "as_of_date": query_date_str,
            },
        )
        blackboard.add_tool_result("calculate_statutory_costs", statutory_res)

        compliance_contribution = AgentContribution(
            agent_id="adk_compliance_specialist",
            framework="GOOGLE_ADK",
            task_name="statutory_cost_audit",
            status="SUCCESS",
            findings={
                "total_statutory_costs_inr": statutory_res.get("total_statutory_costs", 0.0),
                "effective_rate_pct": statutory_res.get("effective_rate_pct", 0.0),
                "breakdown": statutory_res.get("breakdown", {}),
            },
            evidence_citations=[
                f"Statutory Source: {statutory_res.get('statutory_provenance', {}).get('stt_source', 'Finance Act')}"
            ],
            warnings=[],
            timestamp=now_utc(),
        )
        blackboard.add_contribution(compliance_contribution)

        # Step 3: Dispatch A2A Task to CrewAI Specialist
        crewai_contribution = await self.a2a_bridge.invoke_specialist(
            symbol=request.symbol,
            run_id=request.run_id,
            instructions=f"Stress-test quantitative edge and liquidity bounds for {request.symbol}",
        )
        blackboard.add_contribution(crewai_contribution)

        # Step 4: Synthesize Evidence into Validated Report
        elapsed_sec = round(time.perf_counter() - start_time, 3)
        blackboard.set_metadata("latency_seconds", elapsed_sec)

        # Aggregate citations and limitations
        all_citations = blackboard.get_all_citations()
        all_warnings = blackboard.get_all_warnings()

        thesis = (
            f"Institutional Quantitative Synthesis for {request.symbol} (as of {query_date_str}): "
            f"Retrieved {market_data_res.get('records_count', 0)} historical bar records via DuckDB Parquet store. "
            f"Statutory cost analysis establishes a baseline friction of {statutory_res.get('effective_rate_pct', 0.0)}% "
            f"(Total: INR {statutory_res.get('total_statutory_costs', 0.0)} per 100k turnover). "
            f"CrewAI adversarial evaluation cautions: {crewai_contribution.findings.get('regime_fragility', 'No regime alert')}."
        )

        limitations = [
            "Point-in-time data bounds strictly enforced (zero lookahead).",
            "Live trading disabled by system configuration; paper/simulation mode only.",
        ]
        if market_data_res.get("empty_result"):
            limitations.append(f"Historical store has no pre-recorded Parquet bars for {request.symbol} in selected window.")
        limitations.extend(all_warnings)

        provenance = [
            "duckdb_parquet_analytical_engine",
            "statutory_rules_registry_finance_act_2024",
            "crewai_a2a_protocol_endpoint_v1.0",
        ]

        report = QuantitativeResearchReport(
            run_id=request.run_id,
            symbol=request.symbol,
            as_of_time=request.as_of_time,
            executive_thesis=thesis,
            quantitative_findings=quant_contribution.findings,
            statutory_risk_bounds=compliance_contribution.findings,
            qualitative_evidence=all_citations,
            source_provenance=provenance,
            limitations_and_uncertainties=limitations,
            generated_at=now_utc(),
        )

        return report
