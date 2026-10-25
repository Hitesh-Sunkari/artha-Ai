"""Smoke test script for ArthaAI Phase 2 Seven-Agent Research System.

Demonstrates end-to-end multi-agent execution across all 7 agents:
1. ADKResearchManager (Google ADK)
2. ADKQuantSpecialist (Google ADK + FastMCP)
3. ADKMicrostructureSpecialist (Google ADK)
4. ADKRiskValidator (Google ADK + FastMCP)
5. CrewAINewsMacroSpecialist (CrewAI via official A2A)
6. CrewAICorporateFilingSpecialist (CrewAI via official A2A)
7. CrewAIAdversarialSkeptic (CrewAI via official A2A)

Usage:
    python scripts/smoke_test_slice.py [SYMBOL] [PATTERN]
    Example: python scripts/smoke_test_slice.py RELIANCE SEQUENTIAL
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKResearchManager, OrchestrationPattern
from arthaai.schemas.research_output import ResearchRequest


async def main() -> None:
    symbol = sys.argv[1].upper() if len(sys.argv) > 1 else "RELIANCE"
    pattern_str = sys.argv[2].upper() if len(sys.argv) > 2 else "SEQUENTIAL"
    pattern = OrchestrationPattern(pattern_str)

    print(f"=== Starting ArthaAI Seven-Agent Research Smoke Test for {symbol} ===")
    print(f"=== Selected Orchestration Pattern: {pattern.value} ===")

    # 1. Safety Guardrail Check
    config = AppConfig()
    print(f"[Safety Guardrail] Live trading enabled: {config.live_trading_enabled} (Strictly blocked)")
    assert config.live_trading_enabled is False, "CRITICAL: Live trading must not be enabled."

    # 2. Spin up in-process A2A CrewAI Specialist Suite service
    print("[A2A Service] Initializing CrewAI Specialist Suite Service...")
    crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
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

    # 4. Initialize Google ADK Research Manager
    print("[Google ADK] Initializing ADK Central Research Manager...")
    manager = ADKResearchManager(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

    # 5. Formulate request
    now = datetime.now(timezone.utc)
    request = ResearchRequest(
        request_id=f"smoke-{now.strftime('%Y%m%d%H%M%S')}",
        run_id=f"run-smoke-7agents-{now.strftime('%Y%m%d%H%M%S')}",
        symbol=symbol,
        as_of_time=now,
        timeframe="1d",
        scope=["quant", "microstructure", "news", "filings", "adversarial", "compliance"],
    )
    print(f"[Research Request] Dispatched Run ID: {request.run_id} | Symbol: {symbol}")

    # 6. Execute full seven-agent research workflow
    print(f"[Execution] Executing research flow ({pattern.value})...")
    report = await manager.run_research(request, pattern=pattern)

    print("\n" + "=" * 65)
    print("           VALIDATED QUANTITATIVE RESEARCH REPORT")
    print("=" * 65)
    print(f"Run ID:        {report.run_id}")
    print(f"Target Symbol: {report.symbol}")
    print(f"Timestamp:     {report.as_of_time.isoformat()}")

    print("\n[EXECUTIVE THESIS]")
    print(report.executive_thesis)

    print("\n[QUANTITATIVE FINDINGS (ADK Quant Specialist + FastMCP)]")
    for k, v in report.quantitative_findings.items():
        if k == "calculated_metrics" and isinstance(v, dict):
            print("  Calculated Metrics:")
            for mk, mv in v.items():
                print(f"    * {mk}: {mv}")
        else:
            print(f"  - {k}: {v}")

    print("\n[STATUTORY RISK BOUNDS (ADK Risk Validator + FastMCP)]")
    for k, v in report.statutory_risk_bounds.items():
        if k != "breakdown":
            print(f"  - {k}: {v}")
    if "breakdown" in report.statutory_risk_bounds:
        print("  Itemized Breakdown (INR):")
        for bk, bv in report.statutory_risk_bounds["breakdown"].items():
            print(f"    * {bk}: Rs {bv}")

    print("\n[QUALITATIVE EVIDENCE & CITATIONS (CrewAI Suite via A2A)]")
    for cit in report.qualitative_evidence:
        print(f"  - {cit}")

    print("\n[PROVENANCE & METHODOLOGY]")
    for prov in report.source_provenance:
        print(f"  - {prov}")

    print("\n[LIMITATIONS & FINANCIAL CAVEATS (Zero-Fabrication Guardrail)]")
    for lim in report.limitations_and_uncertainties:
        print(f"  ! {lim}")
    print("=" * 65)
    print(f"Workflow ({pattern.value}) executed and validated successfully!\n")


if __name__ == "__main__":
    asyncio.run(main())
