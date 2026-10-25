"""Tests for extended API endpoints: /runs, /evaluation/dataset, /evaluation/experiments, /evaluation/run, /system/status."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from arthaai.api.research_api import create_research_api, RunStore


@pytest.fixture
def client():
    store = RunStore()
    app = create_research_api(run_store=store)
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
