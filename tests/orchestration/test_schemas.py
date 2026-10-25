"""Tests for Pydantic v2 multi-agent research schemas."""

from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from arthaai.schemas.research_output import (
    AgentContribution,
    QuantitativeResearchReport,
    ResearchRequest,
)


def test_research_request_validation():
    now = datetime.now(timezone.utc)
    req = ResearchRequest(
        request_id="req-123",
        run_id="run-456",
        symbol="RELIANCE",
        as_of_time=now,
        timeframe="1d",
    )
    assert req.symbol == "RELIANCE"
    assert req.run_id == "run-456"
    assert req.scope == ["quant", "compliance", "adversarial"]

    # Immutability check
    with pytest.raises(ValidationError):
        req.symbol = "TCS"  # type: ignore


def test_agent_contribution_validation():
    now = datetime.now(timezone.utc)
    c = AgentContribution(
        agent_id="agent-adk-1",
        framework="GOOGLE_ADK",
        task_name="market_depth",
        status="SUCCESS",
        findings={"vwap": 2450.5},
        evidence_citations=["parquet://data/ohlcv/reliance"],
    )
    assert c.framework == "GOOGLE_ADK"
    assert c.status == "SUCCESS"
    assert c.findings["vwap"] == 2450.5

    # Invalid framework
    with pytest.raises(ValidationError):
        AgentContribution(
            agent_id="bad",
            framework="LANGCHAIN",  # type: ignore
            task_name="t",
            status="SUCCESS",
        )


def test_quantitative_research_report_validation():
    now = datetime.now(timezone.utc)
    report = QuantitativeResearchReport(
        run_id="run-999",
        symbol="INFY",
        as_of_time=now,
        executive_thesis="Bullish consolidation near 1850.",
        quantitative_findings={"momentum": 0.65},
        statutory_risk_bounds={"stt_inr": 25.0},
        qualitative_evidence=["NSE Circular"],
        source_provenance=["duckdb_parquet"],
        limitations_and_uncertainties=["Zero live execution"],
    )
    assert report.run_id == "run-999"
    assert report.symbol == "INFY"
    assert len(report.limitations_and_uncertainties) == 1

    # Missing required field
    with pytest.raises(ValidationError):
        QuantitativeResearchReport(
            run_id="run-incomplete",
            symbol="INFY",
            as_of_time=now,
            # Missing executive_thesis
        )
