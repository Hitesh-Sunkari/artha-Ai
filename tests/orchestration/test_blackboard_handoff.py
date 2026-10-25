"""Tests for Blackboard shared state container and multi-agent handoffs."""

import threading
from datetime import datetime, timezone
import pytest

from arthaai.orchestration.blackboard import Blackboard
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


def test_blackboard_lifecycle():
    now = datetime.now(timezone.utc)
    req = ResearchRequest(
        request_id="req-001",
        run_id="run-001",
        symbol="RELIANCE",
        as_of_time=now,
    )
    bb = Blackboard(run_id="run-001", request=req)
    assert bb.run_id == "run-001"
    assert bb.request.symbol == "RELIANCE"

    # Add ADK contribution
    c1 = AgentContribution(
        agent_id="adk_quant",
        framework="GOOGLE_ADK",
        task_name="feature_extraction",
        status="SUCCESS",
        findings={"realized_vol_30d": 0.185},
        evidence_citations=["parquet://ohlcv/reliance"],
        warnings=["Low volume bar detected at market open"],
    )
    bb.add_contribution(c1)

    # Add CrewAI contribution
    c2 = AgentContribution(
        agent_id="crewai_skeptic",
        framework="CREWAI",
        task_name="adversarial_critique",
        status="SUCCESS",
        findings={"critique": "Regime shift expected"},
        evidence_citations=["NSE Circular 2024/09"],
        warnings=["Do not hold through corporate announcement"],
    )
    bb.add_contribution(c2)

    # Assert filtering by framework
    adk_contribs = bb.get_contributions(framework="GOOGLE_ADK")
    assert len(adk_contribs) == 1
    assert adk_contribs[0].agent_id == "adk_quant"

    crew_contribs = bb.get_contributions(framework="CREWAI")
    assert len(crew_contribs) == 1
    assert crew_contribs[0].agent_id == "crewai_skeptic"

    # Assert aggregated citations and warnings
    citations = bb.get_all_citations()
    assert len(citations) == 2
    assert "parquet://ohlcv/reliance" in citations
    assert "NSE Circular 2024/09" in citations

    warnings = bb.get_all_warnings()
    assert len(warnings) == 2

    # Assert snapshot export
    snapshot = bb.export_state()
    assert snapshot["run_id"] == "run-001"
    assert snapshot["contributions_count"] == 2


def test_blackboard_thread_safety():
    bb = Blackboard(run_id="run-thread-safe")
    errors = []

    def writer(framework, agent_id):
        try:
            for i in range(50):
                c = AgentContribution(
                    agent_id=f"{agent_id}-{i}",
                    framework=framework,
                    task_name="concurrent_task",
                    status="SUCCESS",
                    findings={"val": i},
                )
                bb.add_contribution(c)
        except Exception as e:
            errors.append(e)

    t1 = threading.Thread(target=writer, args=("GOOGLE_ADK", "adk_agent"))
    t2 = threading.Thread(target=writer, args=("CREWAI", "crew_agent"))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(errors) == 0
    assert len(bb.get_contributions()) == 100
