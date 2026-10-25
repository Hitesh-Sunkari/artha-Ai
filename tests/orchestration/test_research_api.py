"""Tests for the ArthaAI Research API endpoints.

Tests all 6 endpoints:
    GET  /health
    GET  /ready
    POST /research
    GET  /runs/{run_id}
    GET  /runs/{run_id}/trace
    GET  /evaluation/summary

Uses FastAPI TestClient for synchronous HTTP testing and
httpx.AsyncClient for async endpoint tests.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from arthaai.api.research_api import (
    ADKResearchManager,
    ResearchSubmitResponse,
    RunRecord,
    RunStore,
    create_research_api,
)
from arthaai.schemas.research_output import (
    AgentContribution,
    QuantitativeResearchReport,
    ResearchRequest,
)
from arthaai.orchestration.adk_coordinator import OrchestrationPattern


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_mock_report(run_id: str = "run-test-001", symbol: str = "RELIANCE") -> QuantitativeResearchReport:
    """Creates a minimal valid QuantitativeResearchReport for mocking."""
    return QuantitativeResearchReport(
        run_id=run_id,
        symbol=symbol,
        as_of_time=datetime(2024, 11, 1, 10, 0, tzinfo=timezone.utc),
        executive_thesis=(
            f"Institutional Quantitative Synthesis for {symbol}: "
            "0 historical bar records retrieved via DuckDB Parquet store. "
            "Statutory cost: 0.1186%. Total: INR 118.62. "
            "Adversarial: UNVERIFIED regime classification."
        ),
        quantitative_findings={
            "records_retrieved": 0,
            "empty_result": True,
            "finding_category": "UNAVAILABLE",
            "data_source": "duckdb_parquet_partitioned",
            "calculated_metrics": {
                "simple_returns": None,
                "realized_volatility_20d": None,
                "sma_20d": None,
                "ema_20d": None,
                "rsi_14d": None,
            },
        },
        statutory_risk_bounds={
            "total_statutory_costs_inr": 118.62,
            "effective_rate_pct": 0.1186,
        },
        qualitative_evidence=["Statutory Source: Finance (No. 2) Act 2024"],
        source_provenance=[
            "duckdb_parquet_analytical_engine",
            "statutory_rules_registry_finance_act_2024",
            "crewai_a2a_protocol_endpoint_v1.0",
            "orchestration_pattern_SEQUENTIAL",
        ],
        limitations_and_uncertainties=[
            "Point-in-time data bounds strictly enforced (zero lookahead).",
            "Live trading disabled by system configuration; paper/simulation mode only.",
            f"Historical store has no pre-recorded Parquet bars for {symbol}.",
        ],
    )


async def _mock_run_research(request: ResearchRequest, pattern=None) -> QuantitativeResearchReport:
    """Mock for ADKResearchManager.run_research returning a controlled report."""
    await asyncio.sleep(0.01)  # Simulate minimal async work
    return _make_mock_report(run_id=request.run_id, symbol=request.symbol)


@pytest.fixture
def mock_manager():
    """Provides a mocked ADKResearchManager."""
    manager = AsyncMock(spec=ADKResearchManager)
    manager.run_research = AsyncMock(side_effect=_mock_run_research)
    return manager


@pytest.fixture
def api_client(mock_manager):
    """Provides a TestClient with a mocked ADKResearchManager."""
    api = create_research_api(manager=mock_manager)
    return TestClient(api, raise_server_exceptions=True)


@pytest.fixture
def api_client_real():
    """Provides a TestClient using the real (no-mock) ADKResearchManager.

    Used only for health/ready endpoint tests that don't trigger research.
    """
    api = create_research_api()
    return TestClient(api, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_returns_200(self, api_client_real):
        response = api_client_real.get("/health")
        assert response.status_code == 200

    def test_health_response_schema(self, api_client_real):
        data = api_client_real.get("/health").json()
        assert data["status"] == "ok"
        assert data["service"] == "arthaai-research-api"
        assert "timestamp" in data

    def test_health_is_always_ok(self, api_client_real):
        """Health must return 200 even when no research has been submitted."""
        for _ in range(3):
            response = api_client_real.get("/health")
            assert response.status_code == 200


# ---------------------------------------------------------------------------
# GET /ready
# ---------------------------------------------------------------------------

class TestReadinessEndpoint:
    def test_ready_returns_200_or_503(self, api_client_real):
        """Readiness probe returns 200 when dependencies are healthy."""
        response = api_client_real.get("/ready")
        assert response.status_code == 200

    def test_ready_response_has_required_fields(self, api_client_real):
        data = api_client_real.get("/ready").json()
        assert "ready" in data
        assert "mcp_available" in data
        assert "a2a_available" in data
        assert "live_trading_blocked" in data
        assert "timestamp" in data

    def test_ready_live_trading_blocked_is_true(self, api_client_real):
        """live_trading_blocked must always be True (safety invariant)."""
        data = api_client_real.get("/ready").json()
        assert data["live_trading_blocked"] is True, (
            "Live trading guardrail must be enabled in all environments."
        )


# ---------------------------------------------------------------------------
# POST /research
# ---------------------------------------------------------------------------

class TestResearchSubmitEndpoint:
    def test_submit_research_returns_202(self, api_client):
        response = api_client.post("/research", json={
            "symbol": "RELIANCE",
            "as_of_time": "2024-11-01T10:00:00+00:00",
            "orchestration_pattern": "SEQUENTIAL",
        })
        assert response.status_code == 202

    def test_submit_research_response_schema(self, api_client):
        data = api_client.post("/research", json={
            "symbol": "TCS",
            "as_of_time": "2024-11-01T10:00:00+00:00",
        }).json()
        assert "run_id" in data
        assert "request_id" in data
        assert data["status"] == "PENDING"
        # Message contains the actual run_id value (e.g. "Poll GET /runs/run-api-xxx")
        assert "Poll GET /runs/" in data["message"]
        assert "submitted_at" in data

    def test_submit_research_run_id_is_unique(self, api_client):
        run_ids = set()
        for i in range(5):
            data = api_client.post("/research", json={
                "symbol": f"SYM{i}",
                "as_of_time": "2024-11-01T10:00:00+00:00",
            }).json()
            run_ids.add(data["run_id"])
        assert len(run_ids) == 5, "Each run must have a unique run_id"

    def test_submit_rejects_empty_symbol(self, api_client):
        response = api_client.post("/research", json={
            "symbol": "   ",
            "as_of_time": "2024-11-01T10:00:00+00:00",
        })
        assert response.status_code == 422

    def test_submit_rejects_invalid_pattern(self, api_client):
        response = api_client.post("/research", json={
            "symbol": "RELIANCE",
            "as_of_time": "2024-11-01T10:00:00+00:00",
            "orchestration_pattern": "INVALID_PATTERN",
        })
        assert response.status_code == 422

    def test_submit_accepts_all_valid_patterns(self, api_client):
        for pattern in ["SEQUENTIAL", "PARALLEL", "HIERARCHICAL"]:
            resp = api_client.post("/research", json={
                "symbol": "INFY",
                "as_of_time": "2024-11-01T10:00:00+00:00",
                "orchestration_pattern": pattern,
            })
            assert resp.status_code == 202, f"Pattern {pattern} should be accepted"

    def test_submit_accepts_lowercase_pattern(self, api_client):
        resp = api_client.post("/research", json={
            "symbol": "SBIN",
            "as_of_time": "2024-11-01T10:00:00+00:00",
            "orchestration_pattern": "sequential",
        })
        assert resp.status_code == 202

    def test_submit_with_custom_scope(self, api_client):
        resp = api_client.post("/research", json={
            "symbol": "WIPRO",
            "as_of_time": "2024-11-01T10:00:00+00:00",
            "scope": ["quant", "macro", "filing"],
        })
        assert resp.status_code == 202


# ---------------------------------------------------------------------------
# GET /runs/{run_id}
# ---------------------------------------------------------------------------

class TestGetRunEndpoint:
    def test_get_nonexistent_run_returns_404(self, api_client):
        response = api_client.get("/runs/nonexistent-run-id-xyz")
        assert response.status_code == 404

    def test_get_run_after_submit_returns_valid_status(self, api_client):
        # Submit
        submit_data = api_client.post("/research", json={
            "symbol": "RELIANCE",
            "as_of_time": "2024-11-01T10:00:00+00:00",
        }).json()
        run_id = submit_data["run_id"]

        # Get run status (may be PENDING/RUNNING/COMPLETED)
        response = api_client.get(f"/runs/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == run_id
        assert data["status"] in ("PENDING", "RUNNING", "COMPLETED", "FAILED")

    def test_completed_run_has_report_fields(self, api_client):
        """After a mocked run completes, the report must contain all required fields."""
        # Submit research
        submit_data = api_client.post("/research", json={
            "symbol": "RELIANCE",
            "as_of_time": "2024-11-01T10:00:00+00:00",
        }).json()
        run_id = submit_data["run_id"]

        # Poll until completed (mocked run is very fast)
        import time
        for _ in range(20):
            data = api_client.get(f"/runs/{run_id}").json()
            if data["status"] == "COMPLETED":
                break
            time.sleep(0.1)

        if data["status"] == "COMPLETED":
            report = data.get("report", {})
            assert "run_id" in report
            assert "executive_thesis" in report
            assert "quantitative_findings" in report
            assert "statutory_risk_bounds" in report
            assert "limitations_and_uncertainties" in report

    def test_completed_run_has_latency(self, api_client):
        """Completed run response must include latency_seconds."""
        submit_data = api_client.post("/research", json={
            "symbol": "TCS",
            "as_of_time": "2024-11-01T10:00:00+00:00",
        }).json()
        run_id = submit_data["run_id"]

        import time
        for _ in range(20):
            data = api_client.get(f"/runs/{run_id}").json()
            if data["status"] in ("COMPLETED", "FAILED"):
                break
            time.sleep(0.1)

        if data["status"] == "COMPLETED":
            assert "latency_seconds" in data
            assert data["latency_seconds"] >= 0


# ---------------------------------------------------------------------------
# GET /runs/{run_id}/trace
# ---------------------------------------------------------------------------

class TestTraceEndpoint:
    def test_trace_nonexistent_run_returns_404(self, api_client):
        response = api_client.get("/runs/nonexistent-xyz/trace")
        assert response.status_code == 404

    def test_trace_returns_valid_schema(self, api_client):
        submit_data = api_client.post("/research", json={
            "symbol": "INFY",
            "as_of_time": "2024-11-01T10:00:00+00:00",
        }).json()
        run_id = submit_data["run_id"]

        response = api_client.get(f"/runs/{run_id}/trace")
        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == run_id
        assert "status" in data
        assert "events" in data
        assert "events_count" in data
        assert isinstance(data["events"], list)


# ---------------------------------------------------------------------------
# GET /evaluation/summary
# ---------------------------------------------------------------------------

class TestEvaluationSummaryEndpoint:
    def test_empty_summary_returns_200(self, api_client):
        response = api_client.get("/evaluation/summary")
        assert response.status_code == 200

    def test_empty_summary_schema(self, api_client):
        data = api_client.get("/evaluation/summary").json()
        assert "total_runs" in data
        assert "completed_runs" in data
        assert "failed_runs" in data
        assert "mean_latency_seconds" in data
        assert "p95_latency_seconds" in data
        assert "unsupported_claim_rate_pct" in data
        assert "schema_valid_pct" in data
        assert "orchestration_pattern_counts" in data
        assert "symbols_analyzed" in data
        assert "timestamp" in data

    def test_summary_counts_increase_with_submissions(self, api_client):
        # Empty state
        before = api_client.get("/evaluation/summary").json()
        initial_total = before["total_runs"]

        # Submit 2 runs
        for symbol in ["RELIANCE", "TCS"]:
            api_client.post("/research", json={
                "symbol": symbol,
                "as_of_time": "2024-11-01T10:00:00+00:00",
            })

        after = api_client.get("/evaluation/summary").json()
        assert after["total_runs"] == initial_total + 2

    def test_summary_unsupported_claim_rate_starts_zero(self, api_client):
        """Unsupported claim rate must start at 0% with an empty store."""
        data = api_client.get("/evaluation/summary").json()
        assert data["unsupported_claim_rate_pct"] == 0.0

    def test_summary_schema_valid_pct_is_100_or_zero(self, api_client):
        """schema_valid_pct must be 0 when no runs, or 100 when all succeed."""
        data = api_client.get("/evaluation/summary").json()
        assert data["schema_valid_pct"] in (0.0, 100.0)
