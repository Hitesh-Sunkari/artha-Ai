"""Smoke test script for ArthaAI Phase 2 minimum vertical slice.

Demonstrates end-to-end multi-agent execution:
ResearchRequest -> Google ADK Coordinator -> FastMCP Tools -> A2A Protocol ->
CrewAI Specialist -> Blackboard Shared State -> Validated QuantitativeResearchReport.

Usage:
    python scripts/smoke_test_slice.py [SYMBOL]
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKCoordinator
from arthaai.schemas.research_output import ResearchRequest


async def main() -> None:
    symbol = sys.argv[1].upper() if len(sys.argv) > 1 else "RELIANCE"
    print(f"=== Starting ArthaAI Vertical Slice Smoke Test for {symbol} ===")

    # 1. Safety check
    config = AppConfig()
    print(f"[Safety Guardrail] Live trading enabled: {config.live_trading_enabled} (Strictly blocked)")
    assert config.live_trading_enabled is False, "CRITICAL: Live trading must not be enabled."

    # 2. Spin up in-process A2A CrewAI Specialist service
    print("[A2A Service] Initializing CrewAI Specialist A2A Service...")
    crewai_app = create_a2a_crewai_app("crewai_adversarial_specialist")
    a2a_bridge = A2AClientBridge(
        app=crewai_app,
        base_url="http://127.0.0.1:8000",
        rpc_url="http://127.0.0.1:8000/rpc",
    )
    print("  -> A2A routes registered: /.well-known/agent-card.json, /rpc")

    # 3. Setup FastMCP client
    print("[FastMCP Client] Connecting to FastMCP server...")
    mcp_client = get_mcp_client()
    tools = await mcp_client.list_tools()
    print(f"  -> Discovered MCP tools: {tools}")

    # 4. Initialize Google ADK Coordinator
    print("[Google ADK] Initializing ADK Central Coordinator...")
    coordinator = ADKCoordinator(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

    # 5. Formulate request
    now = datetime.now(timezone.utc)
    request = ResearchRequest(
        request_id=f"smoke-{now.strftime('%Y%m%d%H%M%S')}",
        run_id=f"run-smoke-{now.strftime('%Y%m%d%H%M%S')}",
        symbol=symbol,
        as_of_time=now,
        timeframe="1d",
        scope=["quant", "compliance", "adversarial"],
    )
    print(f"[Research Request] Dispatched Run ID: {request.run_id} | Symbol: {symbol}")

    # 6. Execute full vertical slice
    print("[Execution] Executing end-to-end research flow...")
    report = await coordinator.run_research(request)

    print("\n" + "=" * 60)
    print("           VALIDATED QUANTITATIVE RESEARCH REPORT")
    print("=" * 60)
    print(f"Run ID:        {report.run_id}")
    print(f"Target Symbol: {report.symbol}")
    print(f"Timestamp:     {report.as_of_time.isoformat()}")
    print("\n[EXECUTIVE THESIS]")
    print(report.executive_thesis)
    print("\n[QUANTITATIVE FINDINGS (MCP Tool 1)]")
    for k, v in report.quantitative_findings.items():
        print(f"  - {k}: {v}")
    print("\n[STATUTORY RISK BOUNDS (MCP Tool 2)]")
    for k, v in report.statutory_risk_bounds.items():
        if k != "breakdown":
            print(f"  - {k}: {v}")
    if "breakdown" in report.statutory_risk_bounds:
        print("  Itemized Breakdown (INR):")
        for bk, bv in report.statutory_risk_bounds["breakdown"].items():
            print(f"    * {bk}: Rs {bv}")
    print("\n[QUALITATIVE EVIDENCE & CITATIONS (CrewAI via A2A)]")
    for cit in report.qualitative_evidence:
        print(f"  - {cit}")
    print("\n[PROVENANCE & METHODOLOGY]")
    for prov in report.source_provenance:
        print(f"  - {prov}")
    print("\n[LIMITATIONS & FINANCIAL CAVEATS]")
    for lim in report.limitations_and_uncertainties:
        print(f"  ! {lim}")
    print("=" * 60)
    print("Vertical slice executed and validated successfully!\n")


if __name__ == "__main__":
    asyncio.run(main())
