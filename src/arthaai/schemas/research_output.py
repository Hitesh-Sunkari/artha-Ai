"""Pydantic v2 canonical schemas for multi-agent quantitative research outputs."""

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc


class ResearchRequest(BaseModel):
    """Structured request for quantitative multi-agent market research."""

    model_config = ConfigDict(frozen=True)

    request_id: str = Field(..., description="Unique client request identifier")
    run_id: str = Field(..., description="Distributed execution correlation ID")
    symbol: str = Field(..., description="Target Indian market asset symbol (e.g. RELIANCE, NIFTY)")
    as_of_time: datetime = Field(..., description="Point-in-time timestamp (UTC)")
    timeframe: str = Field(default="1d", description="Analysis timeframe (e.g. 1m, 5m, 1h, 1d)")
    scope: list[str] = Field(
        default_factory=lambda: ["quant", "compliance", "adversarial"],
        description="List of research scopes to activate",
    )


class AgentContribution(BaseModel):
    """Typed intermediate output produced by an individual specialist agent."""

    model_config = ConfigDict(frozen=True)

    agent_id: str = Field(..., description="Identifier of the executing agent")
    framework: Literal["GOOGLE_ADK", "CREWAI"] = Field(..., description="Agent framework origin")
    task_name: str = Field(..., description="Specific research task executed")
    status: Literal["SUCCESS", "FAILED"] = Field(..., description="Execution outcome")
    findings: dict[str, Any] = Field(default_factory=dict, description="Structured factual findings and metrics")
    evidence_citations: list[str] = Field(
        default_factory=list, description="Data partitions, circulars, or documents cited"
    )
    warnings: list[str] = Field(default_factory=list, description="Data quality, regime shift, or risk warnings")
    timestamp: datetime = Field(default_factory=now_utc, description="UTC completion timestamp")


class QuantitativeResearchReport(BaseModel):
    """Validated final multi-agent quantitative research report."""

    model_config = ConfigDict(frozen=True)

    run_id: str = Field(..., description="Execution correlation ID")
    symbol: str = Field(..., description="Target asset identifier")
    as_of_time: datetime = Field(..., description="Point-in-time analysis timestamp (UTC)")
    executive_thesis: str = Field(..., description="Synthesized multi-agent executive summary")
    quantitative_findings: dict[str, Any] = Field(
        default_factory=dict, description="Verified quantitative metrics and calculations"
    )
    statutory_risk_bounds: dict[str, Any] = Field(
        default_factory=dict, description="Statutory taxes, exchange fees, and regulatory bounds"
    )
    qualitative_evidence: list[str] = Field(
        default_factory=list, description="Citations and evidence contributed by specialist agents"
    )
    source_provenance: list[str] = Field(
        default_factory=list, description="Data partitions, models, and rule versions consulted"
    )
    limitations_and_uncertainties: list[str] = Field(
        default_factory=list, description="Explicit caveats and missing data warnings (zero fabrication)"
    )
    generated_at: datetime = Field(default_factory=now_utc, description="Report generation timestamp")
