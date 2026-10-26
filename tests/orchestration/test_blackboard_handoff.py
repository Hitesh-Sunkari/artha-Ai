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


def test_blackboard_monotonic_versioning_and_audit():
    bb = Blackboard(run_id="run-versioning-test")
    # Initialized with immutable governance safety entry + INITIALIZE event
    v_init = bb.get_version()
    assert v_init >= 2

    now = datetime.now(timezone.utc)
    req = ResearchRequest(
        request_id="req-v1",
        run_id="run-versioning-test",
        symbol="INFY",
        as_of_time=now,
    )
    bb.set_request(req)
    v_req = bb.get_version()
    assert v_req > v_init

    c = AgentContribution(
        agent_id="adk_quant_specialist",
        framework="GOOGLE_ADK",
        task_name="market_data_and_quant_features",
        status="SUCCESS",
        findings={"records_retrieved": 0},
    )
    bb.add_contribution(c)
    v_contrib = bb.get_version()
    assert v_contrib > v_req

    bb.add_tool_result("query_market_data", {"empty_result": True})
    v_tool = bb.get_version()
    assert v_tool > v_contrib

    bb.set_metadata("custom_key", "custom_val")
    v_meta = bb.get_version()
    assert v_meta > v_tool

    audit = bb.get_audit_trail()
    actions = [a["action"] for a in audit]
    assert "INITIALIZE" in actions
    assert "SET_REQUEST" in actions
    assert "ADD_CONTRIBUTION" in actions
    assert "ADD_TOOL_RESULT" in actions
    assert "SET_METADATA" in actions

    snapshot = bb.export_state()
    assert snapshot["version"] == v_meta
    assert snapshot["audit_trail_count"] == len(audit)


def test_blackboard_agent_a_to_agent_b_transfer():
    """Requirement 1 Proof:
    1. Agent A publishes uniquely identifiable, validated result.
    2. Agent B reads that result from Blackboard with consumer tracking.
    3. Agent B's output explicitly references the consumed input.
    4. The trace proves the context transfer.
    5. The final report traces the result back to original source.
    """
    from arthaai.core.clock.timezone import now_utc
    from arthaai.orchestration.blackboard import BlackboardNamespace
    from arthaai.schemas.research_output import QuantitativeResearchReport

    run_id = "run-traceability-handoff-001"
    now = datetime.now(timezone.utc)
    req = ResearchRequest(
        request_id="req-trace-001",
        run_id=run_id,
        symbol="RELIANCE.NS",
        as_of_time=now,
    )
    bb = Blackboard(run_id=run_id, request=req)

    # 1. Agent A (ADK Quant Specialist) computes and publishes unique quantitative metric
    unique_metric_id = "METRIC-VOL-REL-2024-8841"
    quant_payload = {
        "metric_id": unique_metric_id,
        "symbol": "RELIANCE.NS",
        "annualized_volatility": 0.2145,
        "observation_window_days": 30,
        "raw_source": "parquet://ohlcv/reliance_30d.parquet",
    }
    entry_a = bb.write_entry(
        namespace=BlackboardNamespace.MARKET_DATA,
        key="quant_volatility",
        value=quant_payload,
        producer_id="adk_quant_specialist",
    )
    assert entry_a.version > 0
    assert entry_a.producer_id == "adk_quant_specialist"

    # 2. Agent B (CrewAI Adversarial Skeptic) reads result from Blackboard with consumer lineage
    read_val = bb.read_entry(
        namespace=BlackboardNamespace.MARKET_DATA,
        key="quant_volatility",
        consumer_id="crewai_adversarial_skeptic",
    )
    assert read_val is not None
    assert read_val["metric_id"] == unique_metric_id
    assert read_val["annualized_volatility"] == 0.2145

    # Verify consumer lineage recorded on the Blackboard cell
    full_entry = bb._entries[f"{BlackboardNamespace.MARKET_DATA.value}::quant_volatility"]
    assert "crewai_adversarial_skeptic" in full_entry.consumers

    # 3. Agent B produces output explicitly referencing the consumed input
    contribution_b = AgentContribution(
        agent_id="crewai_adversarial_skeptic",
        framework="CREWAI",
        task_name="adversarial_critique",
        status="SUCCESS",
        findings={
            "consumed_metric_id": unique_metric_id,
            "evaluation": f"Volatility {read_val['annualized_volatility']} exceeds 30-day baseline threshold.",
            "stress_scenario": "Severe liquidity crunch in high-volatility regime.",
        },
        evidence_citations=[read_val["raw_source"], "academic://tail_risk_volatility"],
        warnings=["Elevated realized volatility requires hedging before position entry."],
        timestamp=now_utc(),
    )
    bb.add_contribution(contribution_b)

    # 4. Audit trail proves the context transfer
    audit = bb.get_audit_trail()
    actions = [a["action"] for a in audit]
    assert "WRITE_ENTRY" in actions
    assert "ADD_CONTRIBUTION" in actions

    # 5. Final report synthesizes output, preserving traceability to original source
    report = QuantitativeResearchReport(
        run_id=run_id,
        symbol="RELIANCE.NS",
        as_of_time=now,
        executive_thesis=(
            f"Adversarial critique validated elevated risk based on {unique_metric_id}: "
            f"{contribution_b.findings['evaluation']}"
        ),
        quantitative_findings={"volatility": read_val["annualized_volatility"]},
        statutory_risk_bounds={"effective_stt": 0.001},
        qualitative_evidence=contribution_b.evidence_citations,
        source_provenance=[quant_payload["raw_source"], f"blackboard://{run_id}/quant_volatility"],
        limitations_and_uncertainties=contribution_b.warnings,
        recommendation="HOLD",
        conviction_score=68,
        statutory_friction_drag_pct=0.1186,
    )

    assert unique_metric_id in report.executive_thesis
    assert quant_payload["raw_source"] in report.source_provenance
    assert report.recommendation == "HOLD"


def test_blackboard_vs_peer_to_peer_comparison():
    """Architecture comparison experiment: Blackboard vs Peer-to-Peer.
    Evaluates:
    - Context visibility (decoupled multi-consumer access)
    - Immutability enforcement (blocking safety rule corruption)
    - Provenance tracking (versioned audit log)
    - Fault recovery (retaining partial state on downstream failure)
    """
    from arthaai.orchestration.blackboard import BlackboardNamespace

    # 1. Blackboard Approach
    bb = Blackboard(run_id="run-comparison-bb")
    # In __init__, Blackboard automatically sets live_trading_enabled=False as immutable
    assert bb.read_entry(BlackboardNamespace.GOVERNANCE, "live_trading_enabled") is False

    # Context visibility: Any specialist can inspect state without direct parameter passing
    bb.write_entry(BlackboardNamespace.MARKET_DATA, "last_price", 2850.0, "agent_quant")
    assert bb.read_entry(BlackboardNamespace.MARKET_DATA, "last_price", "agent_micro") == 2850.0
    assert bb.read_entry(BlackboardNamespace.MARKET_DATA, "last_price", "agent_macro") == 2850.0

    # Immutability enforcement: Malicious or hallucinated agent cannot overwrite safety
    with pytest.raises(PermissionError, match="Cannot overwrite immutable Blackboard entry"):
        bb.write_entry(BlackboardNamespace.GOVERNANCE, "live_trading_enabled", True, "rogue_agent")

    # Provenance tracking
    assert bb.get_version() >= 3
    assert len(bb.get_audit_trail()) >= 3

    # 2. Peer-to-Peer Direct Dictionary Passing
    p2p_state = {"live_trading_enabled": False}

    # In P2P, a rogue agent silently overwrites safety constraint with zero error or audit
    p2p_state["live_trading_enabled"] = True
    assert p2p_state["live_trading_enabled"] is True  # Fails safety invariant!

    # P2P has zero consumer tracking or mutation provenance
    assert "version" not in p2p_state
    assert "audit_trail" not in p2p_state


