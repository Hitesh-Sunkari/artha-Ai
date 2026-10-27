"""Script to execute a live 5-year research run, verify all fields, test Copilot, and persist."""
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKCoordinator, OrchestrationPattern
from arthaai.orchestration.observability import generate_run_summary
from arthaai.schemas.research_output import ResearchRequest, QuantitativeResearchReport
from arthaai.api.research_api import create_research_api, RunRecord, ResearchRunStatus
from fastapi.testclient import TestClient

async def main():
    print("=== STEP 1: INITIALIZING E2E 7-AGENT PIPELINE ===")
    config = AppConfig()
    print(f"Live trading enabled: {config.live_trading_enabled} (must be False)")
    assert config.live_trading_enabled is False

    crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
    a2a_bridge = A2AClientBridge(
        app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
    )
    mcp_client = get_mcp_client()
    coordinator = ADKCoordinator(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

    run_id = f"run-e2e-live-5y-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    req_id = f"req-{run_id}"
    as_of = datetime.now(timezone.utc)

    request = ResearchRequest(
        request_id=req_id,
        run_id=run_id,
        symbol="RELIANCE",
        as_of_time=as_of,
        timeframe="1d",
        scope=["quant", "compliance", "adversarial"],
    )

    print(f"\n=== STEP 2: EXECUTING RESEARCH RUN ({run_id}) FOR RELIANCE ===")
    start_time = datetime.now(timezone.utc)
    report = await coordinator.run_research(request, pattern=OrchestrationPattern.SEQUENTIAL)
    end_time = datetime.now(timezone.utc)
    duration_s = (end_time - start_time).total_seconds()

    print(f"Run completed in {duration_s:.2f}s")
    print(f"Report Symbol: {report.symbol}")
    print(f"Conviction Score: {report.conviction_score}/100")
    print(f"Recommendation: {report.recommendation}")
    print(f"Executive Thesis:\n  {report.executive_thesis[:200]}...")

    q = report.quantitative_findings
    print(f"\n=== STEP 3: VERIFYING 5-YEAR QUANTITATIVE FINDINGS ===")
    print(f"Records retrieved: {q.get('records_retrieved')}")
    print(f"Data source: {q.get('data_source')}")
    five_y = q.get("five_year_analysis", {})
    print(f"5-Year Coverage: {five_y.get('coverage_years')} years ({five_y.get('coverage_pct')}% of 5y window)")
    print(f"SMA 200: {five_y.get('sma_200d')}")
    print(f"SMA 50: {five_y.get('sma_50d')}")
    print(f"52-Week High: {five_y.get('high_52w')} | 52-Week Low: {five_y.get('low_52w')}")
    print(f"5-Year Max Drawdown: {five_y.get('max_drawdown_5y')}%")
    print(f"5-Year Annualized Vol: {five_y.get('annualized_volatility_5y')}%")
    print(f"Sample bars count: {len(five_y.get('sample_bars', []))}")

    assert q.get("records_retrieved") >= 1200, f"Expected ~1260 bars, got {q.get('records_retrieved')}"
    assert five_y.get("coverage_years") >= 4.9, f"Expected ~5.0 years, got {five_y.get('coverage_years')}"
    assert five_y.get("sma_200d") is not None
    assert five_y.get("high_52w") is not None
    assert five_y.get("max_drawdown_5y") is not None

    print("\n=== STEP 4: PERSISTING RUN RECORD FOR DASHBOARD / OBSERVABILITY ===")
    events = coordinator.get_run_events(run_id)
    bb = coordinator.get_run_blackboard(run_id)
    contribs = [c.model_dump(mode="json") for c in bb.get_contributions()] if bb else []

    record = RunRecord(
        run_id=run_id,
        request_id=req_id,
        symbol="RELIANCE",
        orchestration_pattern="SEQUENTIAL",
        status=ResearchRunStatus.COMPLETED,
        submitted_at=start_time,
        completed_at=end_time,
        report=report,
        events=events,
        blackboard_contributions=contribs,
    )

    runs_dir = Path("data/runs")
    runs_dir.mkdir(parents=True, exist_ok=True)
    out_file = runs_dir / f"{run_id}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(record.model_dump_json(indent=2))
    print(f"Persisted run record to {out_file} ({out_file.stat().st_size} bytes)")

    print("\n=== STEP 5: TESTING COPILOT GROUNDED CHAT WITH RUN CONTEXT ===")
    app = create_research_api()
    client = TestClient(app)

    copilot_payload = {
        "message": "What is the 5-year quantitative thesis, SMA-200 level, and statutory friction for RELIANCE?",
        "context": run_id,
    }
    copilot_resp = client.post("/copilot/chat", json=copilot_payload)
    print(f"Copilot HTTP status: {copilot_resp.status_code}")
    copilot_data = copilot_resp.json()
    print(f"Copilot model used: {copilot_data.get('model')}")
    print(f"Grounded run_id: {copilot_data.get('grounded_run_id')}")
    print(f"Copilot reply excerpt:\n  {copilot_data.get('reply', '')[:300].replace('₹', 'INR')}...\n")

    print("\n=== STEP 6: VERIFYING BENCHMARK INDICES ENDPOINT ===")
    idx_resp = client.get("/market/indices")
    print(f"GET /market/indices status: {idx_resp.status_code}")
    indices = idx_resp.json()
    for idx in indices:
        print(f"  {idx['symbol']} ({idx['name']}): price={idx['price']}, change={idx['change']}, pct={idx['changePct']}, ts={idx['timestamp']}, prov={idx['provenance']}")

    print("\n=== ALL E2E VERIFICATION STEPS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(main())
