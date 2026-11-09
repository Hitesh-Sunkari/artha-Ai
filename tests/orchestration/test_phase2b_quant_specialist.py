"""Phase 2B Integration Test Suite: Quantitative Market Specialist (Google ADK).

Verifies:
1. Real DuckDB Parquet Ingestion (1,260 bars for RELIANCE).
2. Strict Point-in-Time (PIT) filtering without lookahead bias.
3. NSE circuit filter breach detection (>20% single day move).
4. Extreme volatility anomaly detection (>80% annualized volatility).
5. Corrupt bar structural sanity checks (High < Low, negative volume).
6. Honest empty state handling without hallucinations (0 citations, UNAVAILABLE category).
7. Market regime classifications (Trend, Momentum, Volatility).
8. Institutional risk-adjusted performance ratios (Sharpe, Sortino, Calmar).
9. Contract validation by ADKResearchManager.
10. Blackboard intermediate artifact publication and downstream handoff tracking.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any
import pytest

from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.adk_coordinator import ADKQuantSpecialist, ADKResearchManager
from arthaai.orchestration.agent_contracts import TaskExecutionNode, AgentFramework
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import ExecutionTracer
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


@pytest.fixture
def mcp_client():
    return get_mcp_client()


@pytest.fixture
def quant_specialist(mcp_client):
    return ADKQuantSpecialist(mcp_client=mcp_client)


# ============================================================================
# Criterion 1: Real DuckDB Parquet Ingestion & Indicator Calculation
# ============================================================================

def test_01_quant_specialist_ingests_real_duckdb_parquet(quant_specialist):
    async def run():
        as_of = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
        tracer = ExecutionTracer(run_id="run-quant-p2b-01")
        contrib, mres = await quant_specialist.execute(
            symbol="RELIANCE",
            as_of_time=as_of,
            run_id="run-quant-p2b-01",
            tracer=tracer,
        )

        assert contrib.agent_id == "adk_quant_specialist"
        assert contrib.framework == "GOOGLE_ADK"
        assert contrib.status == "SUCCESS"
        assert contrib.evidence_status == "VERIFIED"
        assert contrib.validation_outcome == "PASSED"
        assert contrib.analytical_verdict in ("APPROVED", "CONDITIONALLY_APPROVED", "NEUTRAL", "REJECTED")
        assert contrib.findings.get("quantitative_stance") in ("BULLISH", "MODERATELY_BULLISH", "BEARISH", "NEUTRAL")

        findings = contrib.findings
        assert findings["records_retrieved"] == 1260
        assert findings["empty_result"] is False
        assert findings["finding_category"] == "MEASURED"
        assert findings["data_quality_status"] == "PASSED"

        # Citations point to Parquet
        assert len(contrib.evidence_citations) == 1
        assert "parquet://data/ohlcv/reliance:1260_bars" in contrib.evidence_citations[0]

        # Verify computed quantitative metrics
        metrics = findings["calculated_metrics"]
        assert metrics["latest_close"] is not None and metrics["latest_close"] > 0
        assert metrics["sma_20d"] is not None
        assert metrics["sma_50d"] is not None
        assert metrics["sma_200d"] is not None
        assert metrics["ema_20d"] is not None
        assert metrics["rsi_14d"] is not None
        assert metrics["realized_volatility_20d"] is not None
        assert metrics["realized_volatility_252d"] is not None
        assert metrics["max_drawdown_5y"] is not None and metrics["max_drawdown_5y"] <= 0.0
        assert metrics["sharpe_ratio"] is not None
        assert metrics["coverage_years"] == 5.0

    asyncio.run(run())


# ============================================================================
# Criterion 2: Strict Point-In-Time (PIT) Filtering
# ============================================================================

def test_02_point_in_time_enforcement(quant_specialist):
    async def run():
        # Query historical cutoff: 2024-01-15
        cutoff = datetime(2024, 1, 15, 15, 30, tzinfo=timezone.utc)
        contrib, _ = await quant_specialist.execute(
            symbol="RELIANCE",
            as_of_time=cutoff,
            run_id="run-quant-p2b-pit",
        )

        findings = contrib.findings
        # Must have strictly fewer than 1260 bars (strictly prior to cutoff)
        retrieved = findings["records_retrieved"]
        assert 0 < retrieved < 1260

        # Sample chart bars must have timestamps <= 2024-01-15
        for bar in findings["historical_bars"]:
            bar_ts = bar["timestamp"][:10]
            assert bar_ts <= "2024-01-15"

    asyncio.run(run())


# ============================================================================
# Criterion 3: NSE Circuit Filter Breach Detection (>20% move)
# ============================================================================

def test_03_nse_circuit_filter_breach_detection(quant_specialist):
    async def run():
        # HDFCBANK contains historical unadjusted split/merger causing a single-day >20% move
        as_of = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
        contrib, _ = await quant_specialist.execute(
            symbol="HDFCBANK.NS",
            as_of_time=as_of,
            run_id="run-quant-p2b-circuit",
        )

        findings = contrib.findings
        assert findings["data_quality_status"] == "ANOMALOUS_DATA_FLAGGED"
        assert contrib.evidence_status == "UNVERIFIED"
        assert contrib.validation_outcome == "WARNING"
        assert contrib.analytical_verdict == "REJECTED"
        assert findings.get("quantitative_stance") == "CAUTION"
        assert findings["max_daily_price_change_pct"] > 20.0
        assert any("circuit filter" in issue.lower() for issue in findings["data_quality_issues"])

    asyncio.run(run())


# ============================================================================
# Criterion 4: Extreme Volatility Anomaly Detection (>80%)
# ============================================================================

def test_04_extreme_volatility_anomaly_detection(quant_specialist):
    async def run():
        # Test with custom mock MCP client returning high-volatility bars
        class HighVolMCPClient:
            async def call_tool(self, tool_name: str, args: dict[str, Any]):
                bars = []
                price = 100.0
                base_dt = datetime(2026, 1, 1)
                for i in range(30):
                    ret = 0.10 if i % 2 == 0 else -0.09
                    price = price * (1.0 + ret)
                    dt_str = (base_dt + timedelta(days=i)).strftime("%Y-%m-%d")
                    bars.append({
                        "timestamp": dt_str,
                        "open": price,
                        "high": price * 1.02,
                        "low": price * 0.98,
                        "close": price,
                        "volume": 100000,
                    })
                return {"records_count": len(bars), "records": bars, "empty_result": False}

        high_vol_quant = ADKQuantSpecialist(mcp_client=HighVolMCPClient())
        contrib, _ = await high_vol_quant.execute(
            symbol="SYNTHETIC_VOL",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-quant-p2b-vol",
        )

        findings = contrib.findings
        assert findings["data_quality_status"] == "ANOMALOUS_DATA_FLAGGED"
        assert contrib.evidence_status == "UNVERIFIED"
        assert contrib.validation_outcome == "WARNING"
        assert contrib.analytical_verdict == "REJECTED"
        assert findings.get("quantitative_stance") == "CAUTION"
        assert any("extreme volatility" in issue.lower() for issue in findings["data_quality_issues"])

    asyncio.run(run())


# ============================================================================
# Criterion 5: Corrupt Bar Structural Sanity Checks
# ============================================================================

def test_05_corrupt_bar_detection(quant_specialist):
    async def run():
        class CorruptBarMCPClient:
            async def call_tool(self, tool_name: str, args: dict[str, Any]):
                bars = [
                    {"timestamp": "2026-01-01", "open": 100.0, "high": 90.0, "low": 110.0, "close": 100.0, "volume": -500},
                    {"timestamp": "2026-01-02", "open": 100.0, "high": 105.0, "low": 95.0, "close": 102.0, "volume": 1000},
                ]
                return {"records_count": 2, "records": bars, "empty_result": False}

        corrupt_quant = ADKQuantSpecialist(mcp_client=CorruptBarMCPClient())
        contrib, _ = await corrupt_quant.execute(
            symbol="CORRUPT_CO",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            run_id="run-quant-p2b-corrupt",
        )

        findings = contrib.findings
        assert findings["data_quality_status"] == "ANOMALOUS_DATA_FLAGGED"
        assert any("corrupt bar" in issue.lower() or "high (90" in issue.lower() for issue in findings["data_quality_issues"])
        assert any("negative volume" in issue.lower() for issue in findings["data_quality_issues"])

    asyncio.run(run())


# ============================================================================
# Criterion 6: Honest Empty State Handling Without Hallucinations
# ============================================================================

def test_06_honest_empty_state_handling(quant_specialist):
    async def run():
        as_of = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
        contrib, _ = await quant_specialist.execute(
            symbol="NONEXISTENT_XYZ",
            as_of_time=as_of,
            run_id="run-quant-p2b-empty",
        )

        assert contrib.agent_id == "adk_quant_specialist"
        assert contrib.status == "SUCCESS"
        assert contrib.evidence_status == "UNVERIFIED"
        assert contrib.validation_outcome == "NOT_EVALUATED"
        assert contrib.analytical_verdict == "NOT_EVALUATED"
        assert contrib.evidence_citations == []  # Zero fabricated citations!

        findings = contrib.findings
        assert findings["records_retrieved"] == 0
        assert findings["empty_result"] is True
        assert findings["finding_category"] == "UNAVAILABLE"
        assert findings["data_quality_status"] == "EMPTY_SERIES"

        metrics = findings["calculated_metrics"]
        assert metrics["latest_close"] is None
        assert metrics["sma_20d"] is None
        assert metrics["rsi_14d"] is None
        assert metrics["realized_volatility_20d"] is None
        assert metrics["coverage_years"] is None

    asyncio.run(run())


# ============================================================================
# Criterion 7: Market Regime Classifications
# ============================================================================

def test_07_trend_and_momentum_regime_classification(quant_specialist):
    async def run():
        as_of = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
        contrib, _ = await quant_specialist.execute(
            symbol="TCS",
            as_of_time=as_of,
            run_id="run-quant-p2b-regimes",
        )

        metrics = contrib.findings["calculated_metrics"]
        assert metrics["trend_regime"] in ("BULLISH_TREND", "BEARISH_TREND", "SIDEWAYS_CONSOLIDATION")
        assert metrics["momentum_regime"] in ("OVERBOUGHT", "OVERSOLD", "NEUTRAL_MOMENTUM")
        assert metrics["volatility_regime"] in ("LOW_VOLATILITY", "MODERATE_VOLATILITY", "ELEVATED_VOLATILITY", "EXTREME_VOLATILITY")

    asyncio.run(run())


# ============================================================================
# Criterion 8: Risk-Adjusted Ratios Mathematical Consistency
# ============================================================================

def test_08_risk_adjusted_ratios_mathematical_consistency(quant_specialist):
    async def run():
        as_of = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
        contrib, _ = await quant_specialist.execute(
            symbol="INFY",
            as_of_time=as_of,
            run_id="run-quant-p2b-ratios",
        )

        metrics = contrib.findings["calculated_metrics"]
        assert metrics["sharpe_ratio"] is not None
        assert isinstance(metrics["sharpe_ratio"], float)
        assert metrics["annualized_return"] is not None
        assert isinstance(metrics["annualized_return"], float)

        # Calmar ratio must exist if max drawdown < 0
        if metrics["max_drawdown_5y"] and metrics["max_drawdown_5y"] < -0.01:
            assert metrics["calmar_ratio"] is not None

    asyncio.run(run())


# ============================================================================
# Criterion 9: Contract Validation by ADKResearchManager
# ============================================================================

def test_09_quant_specialist_contract_validation_by_research_manager(quant_specialist):
    async def run():
        mgr = ADKResearchManager()
        as_of = datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc)
        contrib, _ = await quant_specialist.execute(
            symbol="RELIANCE",
            as_of_time=as_of,
            run_id="run-quant-p2b-contract",
        )

        node = TaskExecutionNode(
            task_id="task-adk_quant_specialist",
            agent_id="adk_quant_specialist",
            framework=AgentFramework.GOOGLE_ADK,
            task_name="market_data_and_quant_features",
        )

        errors = mgr._validate_contract(node, contrib)
        assert errors == [], f"Validation errors detected: {errors}"

    asyncio.run(run())


# ============================================================================
# Criterion 10: Downstream Blackboard Handoff & Lineage
# ============================================================================

def test_10_downstream_blackboard_handoff_and_traceability(quant_specialist):
    async def run():
        req = ResearchRequest(
            request_id="req-quant-p2b-handoff",
            run_id="run-quant-p2b-handoff",
            symbol="RELIANCE",
            as_of_time=datetime(2026, 10, 26, 15, 30, tzinfo=timezone.utc),
            timeframe="1d",
            scope=["quant"],
        )
        bb = Blackboard(run_id=req.run_id, request=req)

        contrib, _ = await quant_specialist.execute(
            symbol="RELIANCE",
            as_of_time=req.as_of_time,
            run_id=req.run_id,
        )

        # Downstream handoffs contain microstructure and skeptic
        assert "adk_microstructure_specialist" in contrib.downstream_handoffs
        assert "crewai_adversarial_specialist" in contrib.downstream_handoffs

        # Write contribution to Blackboard
        bb.add_contribution(contrib)

        # Microstructure reads contribution
        read_contrib = bb.get_latest_contribution("market_data_and_quant_features", consumer_id="adk_microstructure_specialist")
        assert read_contrib is not None
        assert read_contrib.findings["records_retrieved"] == 1260

        # Verify lineage tracks consumer
        consumers = bb.get_consumer_lineage("market_data_and_quant_features")
        assert "adk_microstructure_specialist" in consumers

    asyncio.run(run())
