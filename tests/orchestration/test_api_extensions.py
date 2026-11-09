"""Tests for extended API endpoints: /runs, /evaluation/dataset, /evaluation/experiments, /evaluation/run, /system/status."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient

from arthaai.api.research_api import create_research_api, RunStore
from arthaai.schemas.research_output import QuantitativeResearchReport


def _make_mock_report(run_id: str = "run-test-001", symbol: str = "TCS") -> QuantitativeResearchReport:
    return QuantitativeResearchReport(
        run_id=run_id,
        symbol=symbol,
        as_of_time=datetime(2024, 11, 1, 10, 0, tzinfo=timezone.utc),
        executive_thesis=f"Institutional Quantitative Synthesis for {symbol}",
        quantitative_findings={
            "records_retrieved": 0,
            "empty_result": True,
            "finding_category": "UNAVAILABLE",
            "data_source": "duckdb_parquet_partitioned",
            "calculated_metrics": {},
        },
        statutory_risk_bounds={
            "total_statutory_costs_inr": 118.62,
            "effective_rate_pct": 0.1186,
        },
        qualitative_evidence=["Statutory Source: Finance (No. 2) Act 2024"],
        source_provenance=["duckdb_parquet_analytical_engine"],
        audit_hash="test-hash-1234",
    )


@pytest.fixture
def client():
    store = RunStore(persistence_dir=None)
    mock_mgr = AsyncMock()
    mock_mgr.run_research = AsyncMock(return_value=_make_mock_report())
    mock_mgr.get_run_events = lambda run_id: []
    mock_mgr.get_run_blackboard = lambda run_id: None
    app = create_research_api(run_store=store, manager=mock_mgr)
    return TestClient(app)


class TestApiExtensions:
    def test_list_runs_empty(self, client):
        response = client.get("/runs")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_runs_after_submit(self, client):
        client.post("/research", json={
            "symbol": "TCS",
            "as_of_time": "2024-11-01T10:00:00+00:00",
        })
        response = client.get("/runs")
        assert response.status_code == 200
        runs = response.json()
        assert len(runs) >= 1
        assert runs[0]["symbol"] == "TCS"
        assert "run_id" in runs[0]
        assert "status" in runs[0]

    def test_evaluation_dataset_endpoint(self, client):
        response = client.get("/evaluation/dataset")
        assert response.status_code == 200
        data = response.json()
        assert data["dataset_version"] == "1.0.0"
        assert data["total_cases"] == 44
        assert "summary" in data
        assert "cases" in data
        assert len(data["cases"]) == 44

    def test_evaluation_experiments_endpoint(self, client):
        response = client.get("/evaluation/experiments")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_system_status_endpoint(self, client):
        response = client.get("/system/status")
        assert response.status_code == 200
        data = response.json()
        assert data["api_version"] == "1.0.0"
        assert "live_trading_guardrail" in data
        assert data["live_trading_guardrail"]["status"] == "ENFORCED_BLOCKED"
        assert "adk_orchestration" in data
        assert len(data["adk_orchestration"]["specialists"]) == 4
        assert "crewai_specialists" in data
        assert len(data["crewai_specialists"]["specialists"]) == 3
        assert "fastmcp_server" in data

    def test_securities_search_endpoint(self, client):
        response = client.get("/securities/search?q=Reliance")
        assert response.status_code == 200
        items = response.json()
        assert len(items) >= 1
        assert any(item["symbol"] == "RELIANCE" for item in items)

    def test_securities_resolve_endpoint(self, client):
        # Seeded stock
        resp1 = client.get("/securities/RELIANCE")
        assert resp1.status_code == 200
        d1 = resp1.json()
        assert d1["resolved"] is True
        assert d1["canonical_id"] == "NSE:RELIANCE"
        assert d1["has_local_parquet"] is True

        # Dynamic unseeded Indian equity
        resp2 = client.get("/securities/ZOMATO.NS")
        assert resp2.status_code == 200
        d2 = resp2.json()
        assert d2["resolved"] is True
        assert d2["symbol"] in ("ZOMATO", "ETERNAL")
        assert d2["exchange"] == "NSE"

        # Invalid stock
        resp3 = client.get("/securities/INVALID$$$")
        assert resp3.status_code == 200
        d3 = resp3.json()
        assert d3["resolved"] is False

