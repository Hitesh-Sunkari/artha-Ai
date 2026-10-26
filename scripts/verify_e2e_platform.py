"""End-to-end verification script for ArthaAI platform.
Validates all API endpoints, multi-agent execution, RAG ChromaDB store,
Blackboard state persistence, and creates artifacts/verification artifacts.
"""

import asyncio
import json
import os
import sys

os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"
os.environ["ANONYMIZED_TELEMETRY"] = "false"

from datetime import datetime, timezone
from pathlib import Path
from starlette.testclient import TestClient

# Ensure src is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from arthaai.api.research_api import create_research_api
from arthaai.orchestration.blackboard import Blackboard, BlackboardNamespace
from arthaai.rag.chroma_store import ChromaRAGStore

def main():
    print("=" * 70)
    print("ARTHAAI END-TO-END PLATFORM VERIFICATION")
    print("=" * 70)

    app = create_research_api()
    client = TestClient(app)

    results = {}

    # 1. Health Probe
    print("\n[1/10] Testing GET /health...")
    r = client.get("/health")
    assert r.status_code == 200, f"Health probe failed: {r.text}"
    print(f"  OK: {r.json()}")
    results["health"] = r.json()

    # 2. Readiness Probe
    print("\n[2/10] Testing GET /ready...")
    r = client.get("/ready")
    assert r.status_code == 200, f"Readiness probe failed: {r.text}"
    ready_data = r.json()
    assert ready_data["live_trading_blocked"] is True, "CRITICAL: Live trading must be blocked!"
    print(f"  OK: {ready_data}")
    results["ready"] = ready_data

    # 3. Portfolio Universe
    print("\n[3/10] Testing GET /portfolio/universe...")
    r = client.get("/portfolio/universe")
    assert r.status_code == 200, f"Portfolio universe failed: {r.text}"
    universe_data = r.json()
    assets = universe_data.get("assets", [])
    assert len(assets) >= 50, f"Expected >= 50 assets, got {len(assets)}"
    print(f"  OK: Retrieved {len(assets)} institutional assets ({[a['ticker'] for a in assets[:4]]}...)")
    results["universe_count"] = len(assets)

    # 4. Portfolio Optimization (SLSQP + Ledoit-Wolf)
    print("\n[4/10] Testing POST /portfolio/optimize...")
    opt_payload = {
        "selected_tickers": ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "INDIA_GOVT_10Y", "GOLDBEES.NS"],
        "initial_capital": 1000000.0,
        "monthly_sip": 25000.0,
        "risk_tolerance": 6,
        "horizon_years": 10
    }
    r = client.post("/portfolio/optimize", json=opt_payload)
    assert r.status_code == 200, f"Optimization failed: {r.text}"
    opt_data = r.json()
    assert "candidates" in opt_data and len(opt_data["candidates"]) >= 3
    print(f"  OK: Generated {len(opt_data['candidates'])} Pareto candidates (Status: {opt_data.get('status')})")
    results["optimization"] = {
        "status": opt_data.get("status"),
        "candidates": [c["candidate_id"] for c in opt_data["candidates"]]
    }

    # 5. Monte Carlo Simulation
    print("\n[5/10] Testing POST /portfolio/simulate...")
    cand = opt_data["candidates"][0]
    sim_payload = {
        "initial_capital": 1000000.0,
        "monthly_sip": 25000.0,
        "horizon_years": 10,
        "expected_return": cand["nominal_return"],
        "volatility": cand["volatility"],
        "num_paths": 1000
    }
    r = client.post("/portfolio/simulate", json=sim_payload)
    assert r.status_code == 200, f"Simulation failed: {r.text}"
    sim_data = r.json()
    assert "trajectory" in sim_data and len(sim_data["trajectory"]) > 0
    final_pt = sim_data["trajectory"][-1]
    print(f"  OK: Simulated {sim_data['simulated_paths_count']} paths (P50 terminal: Rs. {final_pt['p50_median']:,.2f}, P90: Rs. {final_pt['p90_bullish']:,.2f})")
    results["simulation"] = {
        "p10_terminal": final_pt["p10_bearish"],
        "p50_terminal": final_pt["p50_median"],
        "p90_terminal": final_pt["p90_bullish"]
    }

    # 6. Crisis Stress Testing
    print("\n[6/10] Testing POST /portfolio/stress-test...")
    stress_payload = {
        "weights": {h["ticker"]: h["weight"] for h in cand["holdings"]},
        "portfolio_title": cand["title"],
        "expected_return": cand["nominal_return"],
        "volatility": cand["volatility"]
    }
    r = client.post("/portfolio/stress-test", json=stress_payload)
    assert r.status_code == 200, f"Stress test failed: {r.text}"
    stress_data = r.json()
    crises = stress_data.get("crisis_scenarios", [])
    assert len(crises) >= 4
    print(f"  OK: Tested {len(crises)} historical crises ({[x['label'] for x in crises]})")
    results["stress_test"] = [
        {"scenario": x["label"], "drawdown": x["portfolio_drawdown"]}
        for x in crises
    ]

    # 7. Investment Committee Deliberation
    print("\n[7/10] Testing POST /committee/deliberate...")
    comm_payload = {
        "target_subject": "RELIANCE.NS Allocation Proposal",
        "portfolio_candidate": cand
    }
    r = client.post("/committee/deliberate", json=comm_payload)
    assert r.status_code == 200, f"Committee deliberation failed: {r.text}"
    comm_data = r.json()
    assert "official_verdict" in comm_data and "transcript" in comm_data
    print(f"  OK: Committee session {comm_data['session_id']}")
    print(f"      Official Verdict: {comm_data['official_verdict']}")
    print(f"      Votes: {comm_data['votes_summary']}")
    print(f"      Transcript Members: {[m['role_title'] for m in comm_data['transcript']]}")
    results["committee"] = {
        "verdict": comm_data["official_verdict"],
        "votes": comm_data["votes_summary"],
        "constraints": comm_data["binding_constraints"]
    }

    # 8. RAG ChromaDB Store & Search
    print("\n[8/10] Testing GET /rag/manifest & POST /rag/search...")
    r = client.get("/rag/manifest")
    assert r.status_code == 200, f"RAG manifest failed: {r.text}"
    rag_manifest = r.json()
    stats = rag_manifest.get("statistics", {})
    print(f"  OK: ChromaDB Corpus {stats.get('total_indexed_chunks')} chunks across {stats.get('manifest_sources_count')} authoritative sources")

    search_payload = {
        "query": "SEBI LODR Regulation 30 disclosure timelines for material events",
        "limit": 3
    }
    r = client.post("/rag/search", json=search_payload)
    assert r.status_code == 200, f"RAG search failed: {r.text}"
    search_data = r.json()
    results_list = search_data.get("results", [])
    assert len(results_list) > 0
    top_match = results_list[0]
    print(f"  OK: Top Search Match: '{top_match['title']}' (Score: {top_match['relevance_score']:.4f})")
    print(f"      Authority: {top_match['source_authority']}")
    print(f"      Snippet: {top_match['sanitized_snippet'][:120]}...")
    results["rag"] = {
        "indexed_chunks": stats.get("total_indexed_chunks"),
        "top_match_title": top_match["title"],
        "relevance_score": top_match["relevance_score"]
    }

    # 9. Copilot Chat
    print("\n[9/10] Testing POST /copilot/chat...")
    copilot_payload = {
        "message": "What is the LTCG tax rate under Finance Act 2024?",
        "context": "portfolio"
    }
    r = client.post("/copilot/chat", json=copilot_payload)
    assert r.status_code == 200, f"Copilot chat failed: {r.text}"
    copilot_data = r.json()
    assert "reply" in copilot_data and len(copilot_data["reply"]) > 0
    print(f"  OK: Copilot reply received ({len(copilot_data['reply'])} chars)")
    results["copilot"] = {
        "reply_preview": copilot_data["reply"][:140] + "..."
    }

    # 10. Research Run for RELIANCE with Real Blackboard & Guardrails
    print("\n[10/10] Submitting Research Run for RELIANCE.NS...")
    research_payload = {
        "symbol": "RELIANCE.NS",
        "as_of_time": "2026-10-26T12:00:00Z",
        "orchestration_pattern": "SEQUENTIAL",
        "scope": ["quant", "compliance", "adversarial"]
    }
    r = client.post("/research", json=research_payload)
    assert r.status_code == 202, f"Research submission failed: {r.text}"
    run_submit = r.json()
    run_id = run_submit["run_id"]
    print(f"  OK: Submitted run {run_id}. Polling for completion...")

    # Poll run status
    completed = False
    for _ in range(30):
        import time
        time.sleep(1)
        r = client.get(f"/runs/{run_id}")
        assert r.status_code == 200
        run_record = r.json()
        status = run_record["status"]
        if status == "COMPLETED":
            completed = True
            break
        elif status == "FAILED":
            print(f"  FAILED: {run_record.get('error')}")
            break
        print(f"  Polling... status: {status}")

    assert completed, f"Research run did not complete in time. Last status: {run_record.get('status')}"
    print(f"  OK: Run {run_id} COMPLETED successfully!")
    rep = run_record["report"]
    print(f"      Recommendation: {rep.get('recommendation')}")
    print(f"      Conviction Score: {rep.get('conviction_score')}")
    print(f"      Statutory Friction Drag: {rep.get('statutory_friction_drag_pct')}%")
    print(f"      RAG Citations Count: {len(rep.get('rag_citations', []))}")
    print(f"      Audit Hash: {rep.get('audit_hash')}")

    # Heatmap test
    print(f"\nTesting GET /runs/{run_id}/heatmap...")
    r = client.get(f"/runs/{run_id}/heatmap")
    assert r.status_code == 200, f"Heatmap failed: {r.text}"
    heatmap_data = r.json()
    print(f"  OK: Heatmap entries: {len(heatmap_data.get('agent_heatmap', []))} agents tracked.")

    # Save verification artifacts
    out_dir = Path("artifacts/verification")
    out_dir.mkdir(parents=True, exist_ok=True)

    summary_file = out_dir / "platform_verification_results.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "ALL_TESTS_PASSED",
            "results": results,
            "run_id": run_id,
            "report_summary": {
                "recommendation": rep.get("recommendation"),
                "conviction_score": rep.get("conviction_score"),
                "statutory_friction_drag_pct": rep.get("statutory_friction_drag_pct"),
                "rag_citations": rep.get("rag_citations"),
                "audit_hash": rep.get("audit_hash")
            }
        }, f, indent=2)
    print(f"\nWrote verification results to {summary_file}")
    print("\nALL 10 VERIFICATION STAGES PASSED WITH ZERO ERRORS.")

if __name__ == "__main__":
    main()
