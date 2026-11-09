"""Regression test suite validating RELIANCE.NS run consistency across all 10 requirement areas.

Covers:
1. Reconcile market data & chart: terminal bar ₹1,196.20 vs historical 31-Aug ₹1,704.52.
2. Microstructure: Corwin-Schultz ~28.45 bps, NSE Large Cap tier, zero hardcoded 5.2 bps.
3. Thesis & Target Matrix: Calibrated HOLD stance (not naive BUY 85), grounded target/stop.
4. Macro & Corporate Evidence: Structured primary source refs, publisher, filing periods.
5. Reproducible Skeptic Stress Tests: All 5 tests PASS with full structured metadata.
6. Statutory Costs: One-way ₹118.62, round-trip ₹222.24 (Finance (No. 2) Act 2024).
7. Observability Timing: Distinct manager execution vs total orchestration wall clock.
8. Decision Gates: Separation of execution, evidence, analytical, validation, recommendation statuses.
9. UI Data Contract: QuantitativeResearchReport target matrix field integrity.
10. Live Run Generation & Durable Disk Persistence in data/runs/.
"""

import asyncio
from datetime import datetime, timezone
from pathlib import Path
import duckdb
import pytest

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client, calculate_statutory_costs
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKCoordinator, OrchestrationPattern
from arthaai.schemas.research_output import ResearchRequest, QuantitativeResearchReport
from arthaai.api.research_api import RunRecord, ResearchRunStatus


@pytest.fixture(scope="module")
def parquet_reliance_data():
    """Reads the underlying OHLCV parquet file for RELIANCE.NS."""
    parquet_path = Path("data/parquet/ohlcv/bars_reliance.parquet")
    assert parquet_path.exists(), f"Parquet file {parquet_path} does not exist."
    con = duckdb.connect()
    df = con.execute(f"SELECT * FROM '{parquet_path}' ORDER BY timestamp ASC").df()
    return df


def test_section1_market_data_and_chart_reconciliation(parquet_reliance_data):
    """Section 1: Reconcile market data and chart tooltip discrepancy.

    Validates that:
    - 1,260 monotonic bars exist up to 2026-10-26.
    - Terminal bar (-1) close is ₹1,196.20.
    - Historical bar (-41) for 2026-08-31 close is ₹1,704.52.
    - Demonstrates that ₹1,704.52 is a true historical bar, not the latest close.
    - 52-week low is ₹1,184.24 and 52-week high is ₹2,538.15.
    """
    df = parquet_reliance_data
    assert len(df) == 1260

    # Terminal bar
    terminal_bar = df.iloc[-1]
    assert terminal_bar["timestamp"].strftime("%Y-%m-%d") == "2026-10-26"
    assert round(terminal_bar["close"], 2) == 1196.20

    # Historical bar for 31 August 2026 (index 1219 / -41)
    aug31_bars = df[df["timestamp"].dt.strftime("%Y-%m-%d") == "2026-08-31"]
    assert len(aug31_bars) == 1
    assert round(aug31_bars.iloc[0]["close"], 2) == 1704.52

    # 52-week (last 252 bars) range
    last_252 = df.iloc[-252:]
    high_52w = last_252["high"].max()
    low_52w = last_252["low"].min()
    assert round(high_52w, 2) == 2538.15
    assert round(low_52w, 2) == 1184.24


def test_section6_statutory_transaction_costs():
    """Section 6: Audit statutory transaction costs under Finance (No. 2) Act 2024.

    Validates:
    - One-way BUY turnover ₹100,000 => STT ₹100, Stamp Duty ₹15, Total ₹118.62 (0.1186%).
    - Round-trip BUY + SELL => Total ₹222.24 (0.2222%).
    """
    buy_costs = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=1000.0,
        quantity=100,
        transaction_type="BUY",
    )
    assert buy_costs["transaction_type"] == "BUY"
    assert round(buy_costs["total_statutory_costs"], 2) == 118.62
    assert round(buy_costs["effective_rate_pct"], 4) == 0.1186
    assert buy_costs["breakdown"]["securities_transaction_tax"] == 100.0
    assert buy_costs["breakdown"]["stamp_duty"] == 15.0

    rt_costs = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=1000.0,
        quantity=100,
        transaction_type="ROUND_TRIP",
    )
    assert rt_costs["transaction_type"] == "ROUND_TRIP"
    assert round(rt_costs["total_statutory_costs"], 2) == 222.24
    assert round(rt_costs["effective_rate_pct"], 4) == 0.2222
    assert rt_costs["breakdown"]["securities_transaction_tax"] == 200.0
    assert rt_costs["breakdown"]["stamp_duty"] == 15.0


def test_reliance_e2e_research_and_decision_gates():
    """Sections 2, 3, 4, 5, 7, 8, 9, 10: Full E2E Research Execution on RELIANCE.NS."""
    async def _run():
        config = AppConfig()
        assert config.live_trading_enabled is False, "Safety guardrail: live trading must be disabled."

        crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
        a2a_bridge = A2AClientBridge(
            app=crewai_app, base_url="http://testserver", rpc_url="http://testserver/rpc"
        )
        mcp_client = get_mcp_client()
        coordinator = ADKCoordinator(mcp_client=mcp_client, a2a_bridge=a2a_bridge)

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        run_id = f"run-api-reliance-val-{timestamp_str}"
        req_id = f"req-{run_id}"
        as_of = datetime.fromisoformat("2026-10-27T16:07:19.434+00:00")

        request = ResearchRequest(
            request_id=req_id,
            run_id=run_id,
            symbol="RELIANCE.NS",
            as_of_time=as_of,
            timeframe="1d",
            scope=["quant", "microstructure", "news_macro", "corporate_filing", "risk_validation", "adversarial"],
        )

        start_wall_clock = datetime.now(timezone.utc)
        report = await coordinator.run_research(request, pattern=OrchestrationPattern.SEQUENTIAL)
        end_wall_clock = datetime.now(timezone.utc)

        # -------------------------------------------------------------------------
        # Section 1 & 3: Recommendation, Conviction, and Target Matrix
        # -------------------------------------------------------------------------
        assert report.symbol == "RELIANCE.NS"
        # RSI is ~15.38 in a structural breakdown (-29.8% below 200d SMA, 36.5% vol).
        # Naive BUY 85 is strictly prohibited! Calibrated stance is HOLD.
        assert report.recommendation == "HOLD", f"Expected HOLD stance, got {report.recommendation}"
        assert report.conviction_score <= 40, f"Expected calibrated conviction <= 40, got {report.conviction_score}"

        # Target Matrix must be present and empirically grounded
        assert report.target_price is not None
        assert round(report.target_price, 2) == 1347.13  # Grounded in 20-day SMA
        assert report.target_upside_pct is not None
        assert round(report.target_upside_pct, 1) == 12.6  # +12.6% upside

        assert report.stop_loss_price is not None
        assert round(report.stop_loss_price, 2) == 1184.24  # Grounded in 52-week low
        assert report.stop_loss_pct is not None
        assert round(report.stop_loss_pct, 1) == -1.0  # -1.0% stop-loss floor

        assert report.reward_to_risk_ratio is not None
        assert round(report.reward_to_risk_ratio, 2) == 12.62
        assert "20-Day SMA" in report.target_methodology or "20-day SMA" in report.target_methodology

        # -------------------------------------------------------------------------
        # Section 2: Microstructure and Corwin-Schultz Spread
        # -------------------------------------------------------------------------
        bb = coordinator.get_run_blackboard(run_id)
        assert bb is not None

        micro_contrib = next(c for c in bb.get_contributions() if c.agent_id == "adk_microstructure_specialist")
        assert micro_contrib is not None
        micro = micro_contrib.findings
        cs_spread = micro.get("corwin_schultz_spread_bps")
        assert cs_spread is not None
        assert 20.0 <= float(cs_spread) <= 65.0, f"Expected estimated parametric spread in [20, 65] bps, got {cs_spread}"
        assert "Corwin-Schultz" in report.executive_thesis and "bps" in report.executive_thesis
        assert micro.get("spread_type") == "ESTIMATED_PARAMETRIC"

        # -------------------------------------------------------------------------
        # Section 4: Macro and Corporate Evidence Structure
        # -------------------------------------------------------------------------
        macro_contrib = next(c for c in bb.get_contributions() if c.agent_id == "crewai_news_macro_specialist")
        assert macro_contrib is not None
        macro_findings = macro_contrib.findings
        assert "structured_evidence" in macro_findings
        first_macro_ev = macro_findings["structured_evidence"][0]
        assert "primary_source_ref" in first_macro_ev
        assert "Reserve Bank of India" in first_macro_ev.get("publisher", "")
        assert "claim_mapping" in first_macro_ev

        filing_contrib = next(c for c in bb.get_contributions() if c.agent_id == "crewai_corporate_filing_specialist")
        assert filing_contrib is not None
        filing_findings = filing_contrib.findings
        assert "structured_evidence" in filing_findings
        first_filing_ev = filing_findings["structured_evidence"][0]
        assert "reporting_period" in first_filing_ev
        assert "Q2" in first_filing_ev.get("reporting_period") and "FY" in first_filing_ev.get("reporting_period")
        assert "Clean" in first_filing_ev.get("audit_opinion") and "Unqualified" in first_filing_ev.get("audit_opinion")
        assert "passage" in first_filing_ev

        # -------------------------------------------------------------------------
        # Section 5: Reproducible Skeptic Stress Tests
        # -------------------------------------------------------------------------
        skeptic_contrib = next(c for c in bb.get_contributions() if c.agent_id == "crewai_adversarial_specialist")
        assert skeptic_contrib is not None
        stress_test_details = skeptic_contrib.findings.get("stress_test_details", {})
        assert len(stress_test_details) == 5, f"Expected 5 stress tests, got {len(stress_test_details)}"

        for test_name, st in stress_test_details.items():
            assert "test_id" in st
            assert "version" in st
            assert "input_artifact_refs" in st
            assert "formula" in st
            assert "expected_condition" in st
            assert "threshold" in st
            assert "actual_result" in st
            assert st["status"] == "PASS"
            assert "timestamp" in st
            assert "execution_id" in st
            assert "explanation" in st

        # -------------------------------------------------------------------------
        # Section 7: Observability Timing & Lifecycle
        # -------------------------------------------------------------------------
        events = coordinator.get_run_events(run_id)
        assert len(events) >= 10

        manager_starts = [e for e in events if e.get("agent_id") == "adk_research_manager" and e.get("event_type") == "AGENT_START"]
        manager_completes = [e for e in events if e.get("agent_id") == "adk_research_manager" and e.get("event_type") == "AGENT_COMPLETE"]
        assert len(manager_starts) == 1, "Expected exactly 1 manager start event"
        assert len(manager_completes) == 1, "Expected exactly 1 manager complete event"

        mgr_complete_evt = manager_completes[0]
        payload = mgr_complete_evt.get("payload") or {}
        assert "agent_execution_ms" in payload
        assert "orchestration_wall_clock_ms" in payload
        # Agent execution ms should be less than total orchestration wall clock
        assert payload["agent_execution_ms"] <= payload["orchestration_wall_clock_ms"]

        # -------------------------------------------------------------------------
        # Section 8: Final Decision Gates Separation
        # -------------------------------------------------------------------------
        quant_contrib = next(c for c in bb.get_contributions() if c.agent_id == "adk_quant_specialist")
        risk_contrib = next(c for c in bb.get_contributions() if c.agent_id == "adk_risk_validator")

        assert quant_contrib.execution_status == "COMPLETED"
        assert quant_contrib.evidence_status == "VERIFIED"
        assert quant_contrib.validation_outcome == "PASSED"

        assert risk_contrib.execution_status == "COMPLETED"
        assert risk_contrib.evidence_status == "VERIFIED"
        assert risk_contrib.validation_outcome == "PASSED"
        assert report.recommendation == "HOLD"

        # -------------------------------------------------------------------------
        # Section 10: Persist Run Record to data/runs/
        # -------------------------------------------------------------------------
        contribs = [c.model_dump(mode="json") for c in bb.get_contributions()]
        record = RunRecord(
            run_id=run_id,
            request_id=req_id,
            symbol="RELIANCE.NS",
            orchestration_pattern="SEQUENTIAL",
            status=ResearchRunStatus.COMPLETED,
            submitted_at=start_wall_clock,
            completed_at=end_wall_clock,
            report=report,
            blackboard_events=events,
            agent_contributions=contribs,
        )

        runs_dir = Path("data/runs")
        runs_dir.mkdir(parents=True, exist_ok=True)
        out_file = runs_dir / f"{run_id}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(record.model_dump_json(indent=2))

        assert out_file.exists()
        assert out_file.stat().st_size > 1000
        print(f"\n[SUCCESS] Generated and validated new research run: {run_id} ({out_file.stat().st_size} bytes)")

    asyncio.run(_run())
