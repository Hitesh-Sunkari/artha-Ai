"""Phase 2C Integration Test Suite: Microstructure & Liquidity Specialist (Google ADK).

Verifies:
1. Parametric Corwin-Schultz (2012) bid-ask spread and Amihud (2002) illiquidity calculation from verified bars.
2. Institutional turnover-based liquidity tiers (Tier-1, Tier-2, Tier-3) and execution style recommendations (VWAP, TWAP, Limit).
3. Zero-fabrication enforcement on Level 2/3 orderbook depth and signed tick order flow.
4. Zero-fabrication enforcement on options derivatives (PCR, ATM IV, Max Pain omitted when contract feed unavailable).
5. Honest missing data handling without hallucinated citations when upstream bars are empty.
6. Roll (1984) effective spread proxy calculation.
7. Contract validation by ADKResearchManager.
8. Downstream Blackboard handoff and consumer lineage tracking.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any
import pytest

from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.adk_coordinator import (
    ADKMicrostructureSpecialist,
    ADKQuantSpecialist,
    ADKResearchManager,
    assign_liquidity_tier,
)
from arthaai.orchestration.agent_contracts import TaskExecutionNode, AgentFramework
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import ExecutionTracer
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


@pytest.fixture
def mcp_client():
    return get_mcp_client()


@pytest.fixture
def micro_specialist():
    return ADKMicrostructureSpecialist()


# ============================================================================
# Criterion 1: Parametric Corwin-Schultz & Amihud Calculations
# ============================================================================

def test_01_microstructure_specialist_computes_corwin_schultz_and_amihud(micro_specialist, mcp_client):
    async def run():
        req = ResearchRequest(
            request_id="req-p2c-01",
            run_id="run-p2c-01",
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure"],
        )
        bb = Blackboard(run_id=req.run_id, request=req)
        quant = ADKQuantSpecialist(mcp_client=mcp_client)

        quant_contrib, _ = await quant.execute("RELIANCE", req.as_of_time, req.run_id)
        bb.add_contribution(quant_contrib)

        tracer = ExecutionTracer(run_id=req.run_id)
        contrib = await micro_specialist.execute(
            symbol="RELIANCE",
            run_id=req.run_id,
            tracer=tracer,
            blackboard=bb,
        )

        assert contrib.agent_id == "adk_microstructure_specialist"
        assert contrib.framework == "GOOGLE_ADK"
        assert contrib.status == "SUCCESS"
        assert contrib.evidence_status == "VERIFIED"
        assert contrib.validation_outcome == "PASSED"
        assert contrib.analytical_verdict in ("APPROVED", "CONDITIONALLY_APPROVED", "NEUTRAL")

        findings = contrib.findings
        assert findings["microstructure_status"] == "MEASURED_PARAMETRIC"
        assert findings["spread_type"] == "ESTIMATED_PARAMETRIC"
        assert findings["corwin_schultz_spread_bps"] is not None
        assert isinstance(findings["corwin_schultz_spread_bps"], float)
        assert findings["corwin_schultz_spread_bps"] > 0.0

        assert findings["amihud_illiquidity_ratio"] is not None
        assert isinstance(findings["amihud_illiquidity_ratio"], float)
        assert findings["average_daily_turnover_inr_cr"] > 0.0

        # Academic citations
        assert "academic://corwin_schultz_2012#high_low_spread_estimator" in contrib.evidence_citations
        assert "academic://amihud_2002#illiquidity_ratio" in contrib.evidence_citations

    asyncio.run(run())


# ============================================================================
# Criterion 2: Liquidity Tiers & Execution Style Recommendations
# ============================================================================

def test_02_liquidity_tiers_and_execution_style_recommendations(micro_specialist):
    # Tier-1: >= 100 Cr
    assert assign_liquidity_tier(150.0) == "TIER-1 (High Institutional Liquidity)"
    # Tier-2: 25 - 100 Cr
    assert assign_liquidity_tier(50.0) == "TIER-2 (Moderate Liquidity)"
    # Tier-3: < 25 Cr
    assert assign_liquidity_tier(10.0) == "TIER-3 (Constrained Liquidity)"

    async def run():
        # High liquidity simulation
        bb = Blackboard(run_id="run-p2c-tier", request=ResearchRequest(
            request_id="req-p2c-tier", run_id="run-p2c-tier", symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
        ))
        bars = [
            {"timestamp": f"2026-10-{i+1:02d}", "open": 2500.0, "high": 2520.0, "low": 2490.0, "close": 2510.0, "volume": 2000000}
            for i in range(25)
        ]
        bb.add_contribution(AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"records_retrieved": len(bars), "historical_bars": bars},
            run_id="run-p2c-tier",
            symbol="RELIANCE",
        ))

        contrib = await micro_specialist.execute("RELIANCE", "run-p2c-tier", blackboard=bb)
        findings = contrib.findings
        assert "TIER-1" in findings["liquidity_tier"]
        assert findings["recommended_max_order_pct_adv"] == 3.0
        assert "VWAP" in findings["execution_style_recommendation"]

    asyncio.run(run())


# ============================================================================
# Criterion 3: Zero Fabrication on Level 2/3 and Signed Order Flow
# ============================================================================

def test_03_zero_fabrication_on_level2_and_orderflow(micro_specialist):
    async def run():
        bb = Blackboard(run_id="run-p2c-zfab", request=ResearchRequest(
            request_id="req-p2c-zfab", run_id="run-p2c-zfab", symbol="TCS",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
        ))
        bars = [
            {"timestamp": f"2026-10-{i+1:02d}", "open": 3500.0, "high": 3530.0, "low": 3480.0, "close": 3510.0, "volume": 500000}
            for i in range(20)
        ]
        bb.add_contribution(AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"records_retrieved": len(bars), "historical_bars": bars},
            run_id="run-p2c-zfab",
            symbol="TCS",
        ))

        contrib = await micro_specialist.execute("TCS", "run-p2c-zfab", blackboard=bb)
        findings = contrib.findings

        # Level 2/3 and Order Flow must be strictly labeled as UNAVAILABLE, not fabricated
        assert findings["slippage_status"] == "UNAVAILABLE_NO_ORDERBOOK_FEED"
        assert findings["effective_slippage_bps"] is None
        assert findings["kyles_lambda_status"] == "UNAVAILABLE_NO_TICK_ORDERFLOW"
        assert findings["standard_kyles_lambda"] is None
        assert "Tick-level L2/L3 queue depth omitted" in findings["queue_depth_status"]

    asyncio.run(run())


# ============================================================================
# Criterion 4: Zero Fabrication on Options & Derivatives
# ============================================================================

def test_04_zero_fabrication_on_options_and_derivatives(micro_specialist):
    async def run():
        bb = Blackboard(run_id="run-p2c-opt", request=ResearchRequest(
            request_id="req-p2c-opt", run_id="run-p2c-opt", symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
        ))
        bars = [
            {"timestamp": f"2026-10-{i+1:02d}", "open": 2500.0, "high": 2520.0, "low": 2490.0, "close": 2510.0, "volume": 1000000}
            for i in range(20)
        ]
        bb.add_contribution(AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"records_retrieved": len(bars), "historical_bars": bars},
            run_id="run-p2c-opt",
            symbol="RELIANCE",
        ))

        # Test F&O equity (RELIANCE)
        contrib_rel = await micro_specialist.execute("RELIANCE", "run-p2c-opt", blackboard=bb)
        opt_rel = contrib_rel.findings["options_analytics"]
        assert opt_rel["derivatives_eligible"] is True
        assert opt_rel["segment"] == "NSE_DERIVATIVES_FO"
        assert opt_rel["put_call_ratio_oi"] is None
        assert opt_rel["atm_implied_volatility_pct"] is None
        assert opt_rel["max_pain_strike"] is None
        assert opt_rel["options_liquidity_status"] == "UNAVAILABLE_NO_CONTRACT_FEED"

        # Test Non-F&O equity (SWIGGY)
        contrib_swiggy = await micro_specialist.execute("SWIGGY", "run-p2c-opt", blackboard=bb)
        opt_swiggy = contrib_swiggy.findings["options_analytics"]
        assert opt_swiggy["derivatives_eligible"] is False
        assert opt_swiggy["segment"] == "CASH_SEGMENT_ONLY"
        assert opt_swiggy["options_liquidity_status"] == "NO_OPTIONS_LISTED"

    asyncio.run(run())


# ============================================================================
# Criterion 5: Honest Missing Data Handling
# ============================================================================

def test_05_honest_missing_data_handling(micro_specialist):
    async def run():
        # Empty blackboard without quant bars
        bb = Blackboard(run_id="run-p2c-empty", request=ResearchRequest(
            request_id="req-p2c-empty", run_id="run-p2c-empty", symbol="EMPTY_SYM",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
        ))

        contrib = await micro_specialist.execute("EMPTY_SYM", "run-p2c-empty", blackboard=bb)
        assert contrib.status == "SUCCESS"
        assert contrib.evidence_status == "INSUFFICIENT_DATA"
        assert contrib.analytical_verdict == "NOT_EVALUATED"
        assert contrib.validation_outcome == "WARNING"
        assert contrib.evidence_citations == []  # Zero fabricated citations!
        assert contrib.findings["microstructure_status"] == "UNAVAILABLE"

    asyncio.run(run())


# ============================================================================
# Criterion 6: Roll (1984) Effective Spread Calculation
# ============================================================================

def test_06_roll_spread_and_serial_covariance(micro_specialist):
    async def run():
        bb = Blackboard(run_id="run-p2c-roll", request=ResearchRequest(
            request_id="req-p2c-roll", run_id="run-p2c-roll", symbol="ROLL_TEST",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
        ))
        # Alternating prices (100, 102, 100, 102) create negative autocovariance (bid-ask bounce)
        bars = [
            {
                "timestamp": f"2026-10-{i+1:02d}",
                "open": 100.0,
                "high": 103.0,
                "low": 99.0,
                "close": 102.0 if i % 2 == 0 else 100.0,
                "volume": 100000,
            }
            for i in range(20)
        ]
        bb.add_contribution(AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"records_retrieved": len(bars), "historical_bars": bars},
            run_id="run-p2c-roll",
            symbol="ROLL_TEST",
        ))

        contrib = await micro_specialist.execute("ROLL_TEST", "run-p2c-roll", blackboard=bb)
        findings = contrib.findings
        assert findings["roll_effective_spread_bps"] is not None
        assert findings["roll_effective_spread_bps"] > 0.0
        assert "academic://roll_1984#effective_spread" in contrib.evidence_citations

    asyncio.run(run())


# ============================================================================
# Criterion 7: Contract Validation by ADKResearchManager
# ============================================================================

def test_07_contract_validation_by_adk_research_manager(micro_specialist):
    async def run():
        mgr = ADKResearchManager()
        bb = Blackboard(run_id="run-p2c-mgr", request=ResearchRequest(
            request_id="req-p2c-mgr", run_id="run-p2c-mgr", symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
        ))
        bars = [
            {"timestamp": f"2026-10-{i+1:02d}", "open": 2500.0, "high": 2520.0, "low": 2490.0, "close": 2510.0, "volume": 1000000}
            for i in range(20)
        ]
        bb.add_contribution(AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"records_retrieved": len(bars), "historical_bars": bars},
            run_id="run-p2c-mgr",
            symbol="RELIANCE",
        ))

        contrib = await micro_specialist.execute("RELIANCE", "run-p2c-mgr", blackboard=bb)
        node = TaskExecutionNode(
            task_id="task-adk_microstructure_specialist",
            agent_id="adk_microstructure_specialist",
            framework=AgentFramework.GOOGLE_ADK,
            task_name="microstructure_analysis",
        )

        errors = mgr._validate_contract(node, contrib)
        assert errors == [], f"Validation errors detected: {errors}"

    asyncio.run(run())


# ============================================================================
# Criterion 8: Downstream Blackboard Handoff & Consumer Lineage
# ============================================================================

def test_08_downstream_blackboard_handoff_and_consumer_lineage(micro_specialist):
    async def run():
        req = ResearchRequest(
            request_id="req-p2c-hand",
            run_id="run-p2c-hand",
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant", "microstructure"],
        )
        bb = Blackboard(run_id=req.run_id, request=req)
        bars = [
            {"timestamp": f"2026-10-{i+1:02d}", "open": 2500.0, "high": 2520.0, "low": 2490.0, "close": 2510.0, "volume": 1000000}
            for i in range(20)
        ]
        bb.add_contribution(AgentContribution(
            agent_id="adk_quant_specialist",
            framework="GOOGLE_ADK",
            task_name="market_data_and_quant_features",
            status="SUCCESS",
            findings={"records_retrieved": len(bars), "historical_bars": bars},
            run_id=req.run_id,
            symbol=req.symbol,
        ))

        contrib = await micro_specialist.execute("RELIANCE", req.run_id, blackboard=bb)
        assert "crewai_adversarial_specialist" in contrib.downstream_handoffs
        assert "adk_risk_validator" in contrib.downstream_handoffs

        # Write to blackboard
        bb.add_contribution(contrib)

        # Adversarial skeptic reads microstructure contribution
        read_contrib = bb.get_latest_contribution("microstructure_analysis", consumer_id="crewai_adversarial_specialist")
        assert read_contrib is not None
        assert read_contrib.findings["corwin_schultz_spread_bps"] is not None

        # Lineage tracks consumer
        consumers = bb.get_consumer_lineage("microstructure_analysis")
        assert "crewai_adversarial_specialist" in consumers

    asyncio.run(run())
