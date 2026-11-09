"""Pydantic v2 canonical schemas for multi-agent quantitative research outputs."""

from datetime import datetime
from typing import Any, Literal
import uuid
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc


def canonicalize_recommendation(raw: str | None) -> Literal["BUY", "HOLD", "SELL", "INCONCLUSIVE"]:
    """Maps raw or provisional stances (e.g. ACCUMULATE, REDUCE, INSUFFICIENT_EVIDENCE) to canonical recommendation enum."""
    if not raw:
        return "INCONCLUSIVE"
    u = str(raw).strip().upper()
    if u in ("BUY", "ACCUMULATE", "STRONG_BUY", "OVERWEIGHT", "ACCUMULATE_BASKET"):
        return "BUY"
    if u in ("SELL", "REDUCE", "TRIM", "UNDERWEIGHT", "AVOID"):
        return "SELL"
    if u in ("HOLD", "NEUTRAL", "EQUAL_WEIGHT", "NEUTRAL_HOLD", "BALANCED_ALLOCATION"):
        return "HOLD"
    return "INCONCLUSIVE"


class ResearchRequest(BaseModel):
    """Structured request for quantitative multi-agent market research."""

    model_config = ConfigDict(frozen=True, extra="allow")

    request_id: str = Field(
        default_factory=lambda: f"req-{uuid.uuid4().hex[:8]}", description="Unique client request identifier"
    )
    run_id: str = Field(
        default_factory=lambda: f"run-{uuid.uuid4().hex[:8]}", description="Distributed execution correlation ID"
    )
    symbol: str = Field(..., description="Target Indian market asset symbol (e.g. RELIANCE, NIFTY)")
    as_of_time: datetime = Field(..., description="Point-in-time timestamp (UTC)")
    timeframe: str = Field(default="1d", description="Analysis timeframe (e.g. 1m, 5m, 1h, 1d)")
    scope: list[str] = Field(
        default_factory=lambda: ["quant", "compliance", "adversarial"],
        description="List of research scopes to activate",
    )
    pattern: str | None = Field(default="SEQUENTIAL", description="Orchestration pattern")
    enable_a2a_crewai: bool = Field(default=True, description="Enable CrewAI specialists over A2A")
    custom_instructions: str | None = Field(default=None, description="Custom research prompt instructions")


class AgentContribution(BaseModel):
    """Typed intermediate output produced by an individual specialist agent."""

    model_config = ConfigDict(frozen=True)

    agent_id: str = Field(..., description="Identifier of the executing agent")
    framework: Literal["GOOGLE_ADK", "CREWAI"] = Field(..., description="Agent framework origin")
    task_name: str = Field(..., description="Specific research task executed")
    run_id: str | None = Field(default=None, description="Correlated research run ID")
    symbol: str | None = Field(default=None, description="Target asset symbol")
    
    # 4 Separated Statuses enforcing Phase 2 Agent Contracts
    execution_status: Literal["COMPLETED", "FAILED", "RUNNING", "SKIPPED"] = Field(
        default="COMPLETED", description="Agent process execution status"
    )
    evidence_status: Literal["VERIFIED", "INSUFFICIENT_DATA", "UNVERIFIED", "UNRESOLVED", "NOT_APPLICABLE"] = Field(
        default="VERIFIED", description="Evidence retrieval and citation resolution status"
    )
    analytical_verdict: Literal["APPROVED", "CONDITIONALLY_APPROVED", "NEUTRAL", "REJECTED", "NOT_EVALUATED"] = Field(
        default="NEUTRAL", description="Domain analytical stance / evaluation verdict"
    )
    validation_outcome: Literal["PASSED", "WARNING", "BLOCKED", "NOT_EVALUATED"] = Field(
        default="PASSED", description="Risk, compliance, and governance gate outcome"
    )

    # Backward-compatible execution status
    status: Literal["SUCCESS", "FAILED"] = Field(default="SUCCESS", description="Backward-compatible execution outcome")

    findings: dict[str, Any] = Field(default_factory=dict, description="Structured factual findings and metrics")
    evidence_citations: list[str] = Field(
        default_factory=list, description="Data partitions, circulars, or documents cited"
    )
    warnings: list[str] = Field(default_factory=list, description="Data quality, regime shift, or risk warnings")
    limitations: list[str] = Field(default_factory=list, description="Explicit domain limitations and data gaps")
    downstream_handoffs: list[str] = Field(
        default_factory=list, description="Downstream agent IDs or task names consuming this artifact"
    )
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
    recommendation: Literal["BUY", "HOLD", "SELL", "INCONCLUSIVE", "INSUFFICIENT_EVIDENCE", "ACCUMULATE"] = Field(
        default="INCONCLUSIVE", description="Canonical recommendation enum (BUY, HOLD, SELL, INCONCLUSIVE)"
    )
    conviction_score: int | None = Field(
        default=None, description="Reproducible multi-agent conviction score (0-100), or None if unverified"
    )
    statutory_friction_drag_pct: float | None = Field(
        default=None, description="Statutory roundtrip drag percentage dynamically computed by transaction cost engine"
    )
    rag_citations: list[str] = Field(
        default_factory=list, description="Authoritative RAG statutory and filing citations"
    )
    # Calibrated Price Target Matrix (Phase 2 & Section 3 Mandate - Zero Client Fabrication)
    target_price: float | None = Field(default=None, description="Projected target price in INR, or None if unverified/inconclusive")
    target_upside_pct: float | None = Field(default=None, description="Projected return upside percentage, or None")
    stop_loss_price: float | None = Field(default=None, description="Risk stop loss floor price in INR, or None")
    stop_loss_pct: float | None = Field(default=None, description="Stop loss downside percentage, or None")
    reward_to_risk_ratio: float | None = Field(default=None, description="Calibrated reward-to-risk ratio, or None")
    target_methodology: str | None = Field(default=None, description="Target and risk corridor derivation methodology")
    orchestration_pattern: str | None = Field(default="SEQUENTIAL", description="Orchestration pattern used")
    agent_contributions: list[AgentContribution] = Field(default_factory=list, description="Contributing specialist agent findings")
    audit_hash: str | None = Field(default=None, description="Cryptographic SHA-256 state provenance hash")
    generated_at: datetime = Field(default_factory=now_utc, description="Report generation timestamp")

    def compute_audit_hash(self) -> str:
        """Computes deterministic SHA-256 state provenance hash over canonical report contents."""
        import hashlib
        import json

        canonical_dict = {
            "run_id": self.run_id,
            "symbol": self.symbol,
            "as_of_time": self.as_of_time.isoformat() if self.as_of_time else None,
            "recommendation": self.recommendation,
            "conviction_score": self.conviction_score,
            "statutory_friction_drag_pct": self.statutory_friction_drag_pct,
            "executive_thesis": self.executive_thesis,
            "quantitative_findings": self.quantitative_findings,
            "statutory_risk_bounds": self.statutory_risk_bounds,
            "qualitative_evidence": sorted(self.qualitative_evidence),
            "source_provenance": sorted(self.source_provenance),
            "limitations_and_uncertainties": sorted(self.limitations_and_uncertainties),
            "target_price": self.target_price,
            "target_upside_pct": self.target_upside_pct,
            "stop_loss_price": self.stop_loss_price,
            "stop_loss_pct": self.stop_loss_pct,
            "reward_to_risk_ratio": self.reward_to_risk_ratio,
            "target_methodology": self.target_methodology,
        }
        serialized = json.dumps(canonical_dict, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def verify_audit_hash(self) -> bool:
        """Verifies if the current audit_hash matches the canonical serialization hash."""
        if not self.audit_hash:
            return False
        return self.audit_hash == self.compute_audit_hash()
