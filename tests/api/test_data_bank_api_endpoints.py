"""Tests for Data Bank API Endpoints (/api/v1/data-bank/coverage and /api/v1/data-bank/health).

Implements Phase B Workstream 5 Verification:
- Machine-readable multi-equity coverage response across all 30 candidate equities.
- 10-category audit reporting.
- Diagnostic pipeline health, EOD cycle status, RAG index metrics, and quarantine counts.
- Enforced live_trading_enabled=False safety lock.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from arthaai.api.research_api import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_api_data_bank_coverage_all_universe(client: TestClient):
    """Verifies GET /api/v1/data-bank/coverage returns 30-equity coverage and 10 categories."""
    resp = client.get("/api/v1/data-bank/coverage")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_universe_equities"] == 30
    assert data["covered_equities"] == 30
    assert data["financial_coverage_pct"] == 100.0
    assert len(data["ten_categories_audited"]) == 10
    assert data["live_trading_permanently_locked"] is True

    # Check that major universe equities exist in inventory
    inv = data["equities_inventory"]
    assert "RELIANCE" in inv
    assert "TCS" in inv
    assert "INFY" in inv
    assert "HDFCBANK" in inv
    assert "SBIN" in inv
    assert inv["RELIANCE"]["daily_ohlcv_bars"] > 1000


def test_api_data_bank_coverage_single_symbol(client: TestClient):
    """Verifies GET /api/v1/data-bank/coverage?symbol=TCS returns symbol-specific statements."""
    resp = client.get("/api/v1/data-bank/coverage?symbol=TCS")
    assert resp.status_code == 200
    data = resp.json()

    assert data["symbol"] == "TCS"
    assert data["overall_eligibility"] in ("FULL_5Y_QUANT_READY", "SHORT_HISTORY_RESTRICTED")
    assert "categories" in data
    assert "daily_ohlcv" in data["categories"]
    assert len(data["financial_results"]) >= 1

    fin = data["financial_results"][0]
    assert fin["symbol"] == "TCS"
    assert fin["revenue"] > 0
    assert fin["basis"] == "CONSOLIDATED"


def test_api_data_bank_health(client: TestClient):
    """Verifies GET /api/v1/data-bank/health returns pipeline status, RAG stats, and locked live trading."""
    resp = client.get("/api/v1/data-bank/health")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "HEALTHY"
    assert data["live_trading_enabled"] is False
    assert data["live_trading_guardrail"] == "PERMANENTLY_LOCKED_SIMULATION_ONLY"

    # EOD Pipeline diagnostics
    eod = data["eod_pipeline"]
    assert eod["pipeline_name"] == "ControlledEODPipeline"
    assert eod["timezone"] == "Asia/Kolkata"
    assert "current_time_ist" in eod
    assert "next_scheduled_run_ist" in eod

    # RAG Index diagnostics
    rag = data["rag_vector_index"]
    assert rag["collection_name"] == "arthaai_evidence_corpus"
    assert rag["total_indexed_chunks"] >= 50
    assert rag["prompt_injection_containment_active"] is True

    # Quarantine metrics
    q = data["quarantine_metrics"]
    assert "quarantined_files_count" in q
    assert "health_verdict" in q

