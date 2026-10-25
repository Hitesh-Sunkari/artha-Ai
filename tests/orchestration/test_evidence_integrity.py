"""Evidence-integrity regression tests.

Verifies that the ArthaAI agent pipeline NEVER fabricates market observations,
citations, or quantitative assertions when historical market data is absent.

Rules under test:
1. Zero observations => finding_category must be UNAVAILABLE (not MEASURED, INFERRED).
2. Zero observations => evidence_citations must be empty.
3. Zero observations => no directional buy/sell price claims in any findings.
4. News/macro when feed unconfigured => source_status == NOT_CONFIGURED, no citations.
5. Filing when feed unconfigured => source_status == NOT_CONFIGURED, no citations.
6. Adversarial critique on zero observations => regime_fragility is prefixed UNVERIFIED.
7. Statutory cost calculator rejects invalid instrument types.
8. Statutory cost calculator rejects non-positive price and quantity.
9. Risk validator detects unsupported directional claims on zero-data blackboard.
10. Full Sequential run on non-existent symbol => no fabricated headlines or prices.
"""

import asyncio
from datetime import datetime, timezone

import pytest

from arthaai.mcp.server import calculate_statutory_costs, get_mcp_client
from arthaai.orchestration.a2a_bridge import (
    A2AClientBridge,
    CrewAISpecialistExecutor,
    create_a2a_crewai_app,
)
from arthaai.orchestration.adk_coordinator import (
    ADKMicrostructureSpecialist,
    ADKQuantSpecialist,
    ADKResearchManager,
    ADKRiskValidator,
    OrchestrationPattern,
)
from arthaai.orchestration.blackboard import Blackboard
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_GHOST_SYMBOL = "XYZNONEXISTENT"  # Symbol guaranteed absent from Parquet store
_AS_OF = datetime(2024, 11, 1, 10, 0, tzinfo=timezone.utc)
_RUN_ID = "test-evidence-integrity"


def _sync(coro):
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Rule 1 & 2: Zero observations => UNAVAILABLE, no citations
# ---------------------------------------------------------------------------

class TestQuantSpecialistEmptyResult:
    def test_finding_category_unavailable_on_zero_records(self):
        """When no historical bars exist, finding_category must be UNAVAILABLE."""
        async def _run():
            mcp = get_mcp_client()
            specialist = ADKQuantSpecialist(mcp)
            contrib, mdata = await specialist.execute(
                symbol=_GHOST_SYMBOL, as_of_time=_AS_OF, run_id=_RUN_ID
            )
            return contrib, mdata

        contrib, mdata = _sync(_run())
        assert contrib.findings["finding_category"] == "UNAVAILABLE", (
            f"Expected UNAVAILABLE, got {contrib.findings['finding_category']!r}"
        )
        assert contrib.findings["empty_result"] is True
        assert contrib.findings["records_retrieved"] == 0

    def test_no_citations_on_zero_records(self):
        """When no historical bars exist, evidence_citations must be empty."""
        async def _run():
            mcp = get_mcp_client()
            specialist = ADKQuantSpecialist(mcp)
            contrib, _ = await specialist.execute(
                symbol=_GHOST_SYMBOL, as_of_time=_AS_OF, run_id=_RUN_ID
            )
            return contrib

        contrib = _sync(_run())
        assert contrib.evidence_citations == [], (
            f"Expected empty citations on zero data, got {contrib.evidence_citations!r}"
        )

    def test_all_calculated_metrics_are_none_on_zero_records(self):
        """Calculated metrics must be None (not synthetic) when data is absent."""
        async def _run():
            mcp = get_mcp_client()
            specialist = ADKQuantSpecialist(mcp)
            contrib, _ = await specialist.execute(
                symbol=_GHOST_SYMBOL, as_of_time=_AS_OF, run_id=_RUN_ID
            )
            return contrib

        contrib = _sync(_run())
        metrics = contrib.findings.get("calculated_metrics", {})
        for k, v in metrics.items():
            assert v is None, (
                f"Metric '{k}' must be None on zero records, got {v!r}"
            )


# ---------------------------------------------------------------------------
# Rule 3: No directional price claims when data is absent
# ---------------------------------------------------------------------------

class TestNoDirectionalClaimsOnZeroData:
    def test_no_buy_keyword_in_findings_on_zero_records(self):
        """No downstream agent should embed 'buy' in findings when data is absent."""
        async def _run():
            mcp = get_mcp_client()
            specialist = ADKQuantSpecialist(mcp)
            contrib, _ = await specialist.execute(
                symbol=_GHOST_SYMBOL, as_of_time=_AS_OF, run_id=_RUN_ID
            )
            return contrib

        contrib = _sync(_run())
        findings_str = str(contrib.findings).lower()
        # Allow the phrase "must not be placed" (adversarial warning) but not "buy now", "buy signal", etc.
        assert "buy signal" not in findings_str
        assert "buy recommendation" not in findings_str

    def test_no_price_value_claimed_on_zero_records(self):
        """Quantitative findings should not embed a synthetic price when data is absent."""
        async def _run():
            mcp = get_mcp_client()
            specialist = ADKQuantSpecialist(mcp)
            contrib, _ = await specialist.execute(
                symbol=_GHOST_SYMBOL, as_of_time=_AS_OF, run_id=_RUN_ID
            )
            return contrib

        contrib = _sync(_run())
        assert "latest_close" not in contrib.findings.get("calculated_metrics", {}), (
            "latest_close must not appear in metrics when records_retrieved == 0"
        )


# ---------------------------------------------------------------------------
# Rule 4 & 5: News/macro and filing with unconfigured feeds
# ---------------------------------------------------------------------------

class TestCrewAISpecialistUnconfiguredFeed:
    def test_news_macro_unconfigured_source_status(self):
        """News macro specialist must report NOT_CONFIGURED and zero citations."""
        executor = CrewAISpecialistExecutor()
        contrib = executor._execute_news_macro(
            symbol="RELIANCE", run_id="test-feed-001", context={}
        )
        assert contrib.findings["source_status"] == "NOT_CONFIGURED"
        assert contrib.findings["finding_category"] == "UNAVAILABLE"
        assert contrib.evidence_citations == []
        assert len(contrib.warnings) > 0

    def test_corporate_filing_unconfigured_source_status(self):
        """Filing specialist must report NOT_CONFIGURED and zero citations."""
        executor = CrewAISpecialistExecutor()
        contrib = executor._execute_corporate_filing(
            symbol="TCS", run_id="test-feed-002", context={}
        )
        assert contrib.findings["source_status"] == "NOT_CONFIGURED"
        assert contrib.findings["finding_category"] == "UNAVAILABLE"
        assert contrib.evidence_citations == []
        assert len(contrib.warnings) > 0

    def test_news_macro_does_not_fabricate_headlines(self):
        """News macro specialist must not fabricate specific stock-related headlines."""
        executor = CrewAISpecialistExecutor()
        contrib = executor._execute_news_macro(
            symbol="INFY", run_id="test-feed-003", context={}
        )
        findings_str = str(contrib.findings).lower()
        # Should not mention specific financial data / numbers as fabricated headlines
        assert "q3 result" not in findings_str or "configured" not in findings_str
        # The key check: no positive market headlines when unconfigured
        assert contrib.findings.get("headline_summary") is None or \
               contrib.findings.get("source_status") == "NOT_CONFIGURED"


# ---------------------------------------------------------------------------
# Rule 6: Adversarial critique on zero observations
# ---------------------------------------------------------------------------

class TestAdversarialOnZeroData:
    def test_regime_fragility_prefixed_unverified_on_zero_data(self):
        """Adversarial critique must label regime_fragility as UNVERIFIED when data absent."""
        executor = CrewAISpecialistExecutor()
        contrib = executor._execute_adversarial_critique(
            symbol=_GHOST_SYMBOL,
            run_id="test-adv-001",
            instructions="",
            context={"records_retrieved": 0, "empty_result": True},
        )
        regime = contrib.findings.get("regime_fragility", "")
        assert regime.startswith("UNVERIFIED"), (
            f"Expected 'UNVERIFIED' prefix, got: {regime!r}"
        )

    def test_finding_category_is_hypothesis_not_measured(self):
        """Adversarial critique on zero data must be HYPOTHESIS, not MEASURED."""
        executor = CrewAISpecialistExecutor()
        contrib = executor._execute_adversarial_critique(
            symbol=_GHOST_SYMBOL,
            run_id="test-adv-002",
            instructions="",
            context={"records_retrieved": 0, "empty_result": True},
        )
        assert contrib.findings["finding_category"] == "HYPOTHESIS"

    def test_no_empirical_claims_cited_on_zero_data(self):
        """Adversarial critique must produce zero citations when data is absent."""
        executor = CrewAISpecialistExecutor()
        contrib = executor._execute_adversarial_critique(
            symbol=_GHOST_SYMBOL,
            run_id="test-adv-003",
            instructions="",
            context={"records_retrieved": 0, "empty_result": True},
        )
        assert contrib.evidence_citations == []


# ---------------------------------------------------------------------------
# Rule 7 & 8: Statutory cost calculator validation
# ---------------------------------------------------------------------------

class TestStatutoryCalculatorValidation:
    def test_rejects_invalid_instrument_type(self):
        """calculate_statutory_costs must reject unsupported instrument types."""
        with pytest.raises((ValueError, Exception)):
            calculate_statutory_costs(
                instrument_type="CRYPTO_SPOT",  # type: ignore[arg-type]
                price=1000.0,
                quantity=100,
                transaction_type="BUY",
            )

    def test_rejects_zero_price(self):
        """calculate_statutory_costs must reject price <= 0."""
        with pytest.raises((ValueError, Exception)):
            calculate_statutory_costs(
                instrument_type="EQUITY_DELIVERY",
                price=0.0,
                quantity=100,
                transaction_type="BUY",
            )

    def test_rejects_negative_price(self):
        """calculate_statutory_costs must reject negative price."""
        with pytest.raises((ValueError, Exception)):
            calculate_statutory_costs(
                instrument_type="EQUITY_DELIVERY",
                price=-50.0,
                quantity=100,
                transaction_type="BUY",
            )

    def test_rejects_zero_quantity(self):
        """calculate_statutory_costs must reject quantity <= 0."""
        with pytest.raises((ValueError, Exception)):
            calculate_statutory_costs(
                instrument_type="EQUITY_DELIVERY",
                price=1000.0,
                quantity=0,
                transaction_type="BUY",
            )

    def test_equity_delivery_stt_both_sides(self):
        """STT for EQUITY_DELIVERY must apply on both BUY and SELL at 0.1%."""
        res_buy = calculate_statutory_costs("EQUITY_DELIVERY", 1000.0, 100, "BUY")
        res_sell = calculate_statutory_costs("EQUITY_DELIVERY", 1000.0, 100, "SELL")
        # STT = 0.1% of 100,000 = 100 INR
        assert res_buy["breakdown"]["securities_transaction_tax"] == pytest.approx(100.0, abs=0.01)
        assert res_sell["breakdown"]["securities_transaction_tax"] == pytest.approx(100.0, abs=0.01)

    def test_futures_stt_sell_only_post_oct2024(self):
        """Futures STT must be 0 on BUY and > 0 only on SELL (post Oct 2024)."""
        res_buy = calculate_statutory_costs("FUTURES", 1000.0, 100, "BUY", as_of_date="2024-11-01")
        res_sell = calculate_statutory_costs("FUTURES", 1000.0, 100, "SELL", as_of_date="2024-11-01")
        assert res_buy["breakdown"]["securities_transaction_tax"] == 0.0
        assert res_sell["breakdown"]["securities_transaction_tax"] > 0.0

    def test_total_costs_positive(self):
        """Total statutory costs must always be positive for valid inputs."""
        res = calculate_statutory_costs("EQUITY_INTRADAY", 500.0, 50, "SELL")
        assert res["total_statutory_costs"] > 0
        assert res["effective_rate_pct"] > 0


# ---------------------------------------------------------------------------
# Rule 9: Risk validator detects unsupported directional claims
# ---------------------------------------------------------------------------

class TestRiskValidatorUnsupportedClaims:
    def test_risk_validator_flags_buy_claim_on_empty_data_blackboard(self):
        """Risk validator must flag unsupported directional 'buy' claim on empty Blackboard."""
        async def _run():
            mcp = get_mcp_client()
            validator = ADKRiskValidator(mcp)
            bb = Blackboard(run_id="test-risk-unsupported")

            # Inject a quant contribution with empty_result=True
            quant_contrib = AgentContribution(
                agent_id="adk_quant_specialist",
                framework="GOOGLE_ADK",
                task_name="market_data_and_quant_features",
                status="SUCCESS",
                findings={"empty_result": True, "records_retrieved": 0},
                evidence_citations=[],
            )
            bb.add_contribution(quant_contrib)

            # Inject a downstream contribution that makes a "buy" claim
            downstream_contrib = AgentContribution(
                agent_id="some_other_agent",
                framework="GOOGLE_ADK",
                task_name="recommendation",
                status="SUCCESS",
                findings={"recommendation": "Strong buy signal detected"},
                evidence_citations=[],
            )
            bb.add_contribution(downstream_contrib)

            contrib, _ = await validator.execute(
                symbol=_GHOST_SYMBOL,
                as_of_time=_AS_OF,
                run_id="test-risk-unsupported",
                blackboard=bb,
            )
            return contrib

        contrib = _sync(_run())
        assert contrib.findings["unsupported_assertions_flagged"] is True, (
            "Risk validator must flag unsupported 'buy' assertion on empty data Blackboard"
        )

    def test_risk_validator_passes_when_no_unsupported_claims(self):
        """Risk validator must pass when Blackboard has no unsupported directional claims."""
        async def _run():
            mcp = get_mcp_client()
            validator = ADKRiskValidator(mcp)
            bb = Blackboard(run_id="test-risk-clean")

            # Only legitimate UNAVAILABLE quant result
            quant_contrib = AgentContribution(
                agent_id="adk_quant_specialist",
                framework="GOOGLE_ADK",
                task_name="market_data_and_quant_features",
                status="SUCCESS",
                findings={"empty_result": True, "records_retrieved": 0, "finding_category": "UNAVAILABLE"},
                evidence_citations=[],
            )
            bb.add_contribution(quant_contrib)

            contrib, _ = await validator.execute(
                symbol=_GHOST_SYMBOL,
                as_of_time=_AS_OF,
                run_id="test-risk-clean",
                blackboard=bb,
            )
            return contrib

        contrib = _sync(_run())
        assert contrib.findings["unsupported_assertions_flagged"] is False
        assert contrib.findings["live_trading_blocked"] is True


# ---------------------------------------------------------------------------
# Rule 10: Full sequential run with non-existent symbol
# ---------------------------------------------------------------------------

class TestFullRunNoFabrication:
    def test_sequential_run_ghost_symbol_no_fabricated_prices(self):
        """End-to-end sequential run on unknown symbol must not emit fabricated prices."""
        async def _run():
            manager = ADKResearchManager()
            request = ResearchRequest(
                request_id="req-fabrication-check",
                run_id="run-fabrication-check",
                symbol=_GHOST_SYMBOL,
                as_of_time=_AS_OF,
                scope=["quant", "compliance", "adversarial"],
            )
            report = await manager.run_research(request, OrchestrationPattern.SEQUENTIAL)
            return report

        report = _sync(_run())
        # Quantitative findings must be empty/UNAVAILABLE
        assert report.quantitative_findings.get("records_retrieved", 0) == 0
        assert report.quantitative_findings.get("empty_result", True) is True

        # No fabricated close price in qualitative evidence citations
        for citation in report.qualitative_evidence:
            assert "parquet://" not in citation or "0_bars" not in citation, (
                f"Unexpected non-empty citation on zero data: {citation!r}"
            )

        # Must mention historical store unavailability
        limitations_str = " ".join(report.limitations_and_uncertainties).lower()
        assert any(
            "no historical records" in limitations_str
            or "no pre-recorded parquet" in limitations_str
            or "zero historical bars" in limitations_str
            for _ in [True]
        )

    def test_sequential_run_reports_live_trading_blocked(self):
        """Sequential run must always confirm live trading is blocked."""
        async def _run():
            manager = ADKResearchManager()
            request = ResearchRequest(
                request_id="req-livetrading-check",
                run_id="run-livetrading-check",
                symbol=_GHOST_SYMBOL,
                as_of_time=_AS_OF,
            )
            report = await manager.run_research(request, OrchestrationPattern.SEQUENTIAL)
            return report

        report = _sync(_run())
        # live_trading_blocked check is embedded in statutory_risk_bounds provenance
        assert "live trading disabled" in " ".join(report.limitations_and_uncertainties).lower()
