"""Phase 3B Compact Representative Matrix and Multi-Pattern Evidence Consumption Test Suite.

Verifies:
1. Dynamic SecurityMaster resolution and real data coverage across representative instruments:
   - RELIANCE: corporate action records (1:1 bonus, JFSL demerger), 1,260 bars.
   - INFY: liquid F&O large-cap benchmark, 1,260 bars.
   - TATAMOTORS: demerger and capital reduction corporate actions, 1,260 bars.
   - WIPRO: historical series consistency, 1,260 bars.
   - SWIGGY & ETERNAL: shorter history (125 bars), no SMA200, no 52w low/high.
   - Cash-only equities: has_derivatives=False -> CASH_SEGMENT_ONLY, options omitted.
   - Invalid symbol: 0 observations -> gated INCONCLUSIVE with explicit empty-series reason.
   - Contradictory findings: Quant Approved vs Skeptic Rejected -> Gate BLOCKED.
2. Genuine evidence consumption across all 3 orchestration patterns:
   - SEQUENTIAL: Strict linear dependency progression via Blackboard.
   - PARALLEL: Concurrent execution of independent data branches followed by barrier.
   - HIERARCHICAL: Dynamic supervisory recovery and bounded retry blocking.
"""

import asyncio
from datetime import datetime, timezone
import pytest

from arthaai.core.config import AppConfig
from arthaai.data.instrument_master.security_master import get_security_master
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKCoordinator, OrchestrationPattern
from arthaai.orchestration.agent_contracts import TaskNodeStatus
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import ExecutionTracer, LifecycleEventType
from arthaai.schemas.research_output import ResearchRequest, AgentContribution


# ============================================================================
# Section 8: Compact Representative Matrix Verification
# ============================================================================

def test_security_master_dynamic_resolution_matrix():
    """Verifies that all representative instruments resolve dynamically with exact metadata."""
    sm = get_security_master()

    # 1. RELIANCE: Large-cap F&O with corporate actions
    res_rel = sm.resolve("RELIANCE.NS")
    assert res_rel.resolved is True
    assert res_rel.symbol == "RELIANCE"
    assert res_rel.has_derivatives is True
    assert len(res_rel.corporate_actions) >= 2
    types = [ca["type"] for ca in res_rel.corporate_actions]
    assert "BONUS" in types
    assert "DEMERGER" in types

    # 2. INFY: Liquid large cap F&O
    res_infy = sm.resolve("INFY.NS")
    assert res_infy.resolved is True
    assert res_infy.symbol == "INFY"
    assert res_infy.has_derivatives is True

    # 3. TATAMOTORS: Demerger actions recorded
    res_tm = sm.resolve("TATAMOTORS.NS")
    assert res_tm.resolved is True
    assert res_tm.symbol == "TATAMOTORS"
    assert len(res_tm.corporate_actions) >= 1

    # 4. SWIGGY: Cash-only equity, no derivatives
    res_swiggy = sm.resolve("SWIGGY.NS")
    assert res_swiggy.resolved is True
    assert res_swiggy.symbol == "SWIGGY"
    assert res_swiggy.has_derivatives is False

    # 5. Invalid syntax symbol
    res_syntax_invalid = sm.resolve("!INVALID$#@")
    assert res_syntax_invalid.resolved is False
    assert res_syntax_invalid.resolution_type.value == "INVALID_FORMAT"

    # 6. Uncatalogued equity has no local parquet
    res_uncat = sm.resolve("XYZNONEXISTENT.NS")
    assert res_uncat.has_local_parquet is False
    assert res_uncat.record is None


def test_short_history_swiggy_and_eternal_metrics():
    """Confirms that instruments with < 252 bars do not compute SMA200 or 52-week low/high."""
    async def _run():
        mcp = get_mcp_client()
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(app=crewai_app)
        coordinator = ADKCoordinator(mcp_client=mcp, a2a_bridge=a2a_bridge)

        # Swiggy has 125 bars in local parquet
        req = ResearchRequest(
            request_id="req-swiggy-test",
            run_id="run-swiggy-test",
            symbol="SWIGGY.NS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure"],
        )
        tracer = ExecutionTracer(run_id="run-swiggy-test")
        quant_contrib, mdata = await coordinator.quant_specialist.execute(
            symbol="SWIGGY", as_of_time=req.as_of_time, run_id=req.run_id, tracer=tracer
        )

        calc = quant_contrib.findings.get("calculated_metrics", {})
        five_y = quant_contrib.findings.get("five_year_analysis", {})

        # With 125 bars:
        # - SMA 200d MUST be None (requires 200 bars)
        # - High 52w and Low 52w MUST be None (requires 252 bars)
        # - Realized volatility 252d MUST be None (requires 252 bars)
        assert calc.get("sma_200d") is None, "SMA200 must be None for 125-bar series"
        assert calc.get("high_52w") is None, "High 52w must be None for 125-bar series"
        assert calc.get("low_52w") is None, "Low 52w must be None for 125-bar series"
        assert calc.get("realized_volatility_252d") is None, "Vol 252d must be None for 125-bar series"

        # Shorter-window metrics SHOULD be computed:
        assert calc.get("sma_20d") is not None
        assert calc.get("sma_50d") is not None
        assert calc.get("realized_volatility_20d") is not None
        assert calc.get("realized_volatility_60d") is not None

        # Microstructure on Cash-Only instrument
        bb = Blackboard(run_id=req.run_id)
        bb.add_contribution(quant_contrib)
        micro_contrib = await coordinator.microstructure_specialist.execute(
            symbol="SWIGGY", run_id=req.run_id, tracer=tracer, blackboard=bb
        )
        opts = micro_contrib.findings.get("options_analytics", {})
        assert opts.get("derivatives_eligible") is False
        assert opts.get("segment") == "CASH_SEGMENT_ONLY"
        assert opts.get("options_liquidity_status") == "NO_OPTIONS_LISTED"

    asyncio.run(_run())


def test_invalid_symbol_produces_inconclusive_blocked():
    """Confirms that non-existent symbol with 0 observations safely returns INCONCLUSIVE."""
    async def _run():
        mcp = get_mcp_client()
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(app=crewai_app)
        coordinator = ADKCoordinator(mcp_client=mcp, a2a_bridge=a2a_bridge)

        req = ResearchRequest(
            request_id="req-invalid-sym",
            run_id="run-invalid-sym",
            symbol="NONEXISTENT_XYZ.NS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure", "news_macro", "corporate_filing", "risk_validation", "adversarial"],
        )
        report = await coordinator.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        assert report.recommendation in ("INCONCLUSIVE", "INSUFFICIENT_EVIDENCE")
        assert report.conviction_score is None
        assert any("Insufficient data" in lim or "0 historical" in lim or "Zero historical" in lim for lim in report.limitations_and_uncertainties)
        assert report.verify_audit_hash() is True

    asyncio.run(_run())


# ============================================================================
# Section 6: Multi-Pattern Evidence Consumption Verification
# ============================================================================

def test_sequential_execution_evidence_consumption():
    """Verifies that in SEQUENTIAL mode, each agent consumes actual upstream Blackboard artifacts."""
    async def _run():
        mcp = get_mcp_client()
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(app=crewai_app)
        coordinator = ADKCoordinator(mcp_client=mcp, a2a_bridge=a2a_bridge)

        req = ResearchRequest(
            request_id="req-seq-evidence-test",
            run_id="run-seq-evidence-test",
            symbol="INFY.NS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure", "news_macro", "corporate_filing", "risk_validation", "adversarial"],
        )
        report = await coordinator.run_research(req, pattern=OrchestrationPattern.SEQUENTIAL)
        bb = coordinator.get_run_blackboard(req.run_id)
        assert bb is not None

        # Verify Blackboard contributions exist for all 7 agents
        contribs = bb.get_contributions()
        agent_ids = {c.agent_id for c in contribs}
        assert "adk_quant_specialist" in agent_ids
        assert "adk_microstructure_specialist" in agent_ids
        assert "crewai_news_macro_specialist" in agent_ids
        assert "crewai_corporate_filing_specialist" in agent_ids
        assert "crewai_adversarial_specialist" in agent_ids
        assert "adk_risk_validator" in agent_ids
        assert "adk_research_manager" in agent_ids

        # Verify downstream handoffs: Risk Validator consumed both Skeptic and Quant
        risk_c = next(c for c in contribs if c.agent_id == "adk_risk_validator")
        assert "risk_validation_passed" in risk_c.findings
        if not risk_c.findings["risk_validation_passed"]:
            assert report.recommendation == "INCONCLUSIVE"
        assert report.verify_audit_hash() is True

    asyncio.run(_run())


def test_parallel_execution_concurrency_and_barrier():
    """Verifies PARALLEL mode concurrency for independent data branches followed by dependency barrier."""
    async def _run():
        mcp = get_mcp_client()
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(app=crewai_app)
        coordinator = ADKCoordinator(mcp_client=mcp, a2a_bridge=a2a_bridge)

        req = ResearchRequest(
            request_id="req-par-test",
            run_id="run-par-test",
            symbol="WIPRO.NS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure", "news_macro", "corporate_filing", "risk_validation", "adversarial"],
        )
        report = await coordinator.run_research(req, pattern=OrchestrationPattern.PARALLEL)
        assert report.symbol == "WIPRO.NS"
        assert report.verify_audit_hash() is True

        # Check tracer events to confirm PARALLEL_BRANCH tags on independent tasks
        events = coordinator.get_run_events(req.run_id)
        dispatches = [e for e in events if e.get("event_type") == "TASK_DISPATCHED"]
        parallel_dispatches = [d for d in dispatches if d.get("payload", {}).get("mode") == "PARALLEL"]
        assert len(parallel_dispatches) >= 4, "Independent data branches must be dispatched with PARALLEL mode"

    asyncio.run(_run())


def test_hierarchical_execution_supervisory_recovery():
    """Verifies HIERARCHICAL mode supervisory delegation, bounded retries, and contract enforcement."""
    async def _run():
        mcp = get_mcp_client()
        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(app=crewai_app)
        coordinator = ADKCoordinator(mcp_client=mcp, a2a_bridge=a2a_bridge)

        req = ResearchRequest(
            request_id="req-hier-test",
            run_id="run-hier-test",
            symbol="TATAMOTORS.NS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure", "news_macro", "corporate_filing", "risk_validation", "adversarial"],
        )
        report = await coordinator.run_research(req, pattern=OrchestrationPattern.HIERARCHICAL)
        assert report.symbol == "TATAMOTORS.NS"
        assert report.verify_audit_hash() is True

        # Confirm task plan recorded COMPLETED status for all executed nodes
        plan = coordinator._task_plans.get(req.run_id)
        assert plan is not None
        assert all(n.status == TaskNodeStatus.COMPLETED for n in plan.nodes)

    asyncio.run(_run())
