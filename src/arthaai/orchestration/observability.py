"""Observability, lifecycle tracing, and Blackboard audit summary infrastructure.

Records fine-grained events across Google ADK and CrewAI executions:
- Lifecycle events (AGENT_START, AGENT_COMPLETE, TOOL_INVOCATION, TOOL_COMPLETE)
- Shared state updates (BLACKBOARD_WRITE)
- Quality and governance stages (SKEPTIC_CHALLENGE, RISK_VALIDATION, ERROR)
- Run audit reconstruction via RunAuditSummary
"""

from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.orchestration.blackboard import Blackboard


class LifecycleEventType(str, Enum):
    """Categorization of lifecycle and audit events."""

    AGENT_START = "AGENT_START"
    AGENT_COMPLETE = "AGENT_COMPLETE"
    TOOL_INVOCATION = "TOOL_INVOCATION"
    TOOL_COMPLETE = "TOOL_COMPLETE"
    BLACKBOARD_WRITE = "BLACKBOARD_WRITE"
    SKEPTIC_CHALLENGE = "SKEPTIC_CHALLENGE"
    RISK_VALIDATION = "RISK_VALIDATION"
    A2A_MESSAGE_SENT = "A2A_MESSAGE_SENT"
    A2A_MESSAGE_RECEIVED = "A2A_MESSAGE_RECEIVED"
    RAG_RETRIEVAL = "RAG_RETRIEVAL"
    LLM_INVOCATION = "LLM_INVOCATION"
    ERROR = "ERROR"


class LifecycleEvent(BaseModel):
    """Immutable audit record for a single workflow event."""

    model_config = ConfigDict(frozen=True)

    event_id: str = Field(..., description="Unique event identifier")
    run_id: str = Field(..., description="Correlated research run ID")
    event_type: LifecycleEventType = Field(..., description="Lifecycle stage category")
    agent_id: str = Field(..., description="Executing agent or system identifier")
    framework: str = Field(default="SYSTEM", description="Framework origin: GOOGLE_ADK, CREWAI, or SYSTEM")
    orchestration_pattern: str = Field(default="UNKNOWN", description="Active orchestration pattern")
    status: str = Field(default="SUCCESS", description="Event outcome status (SUCCESS, FAILED, CHALLENGED)")
    duration_ms: float | None = Field(default=None, description="Elapsed execution duration in milliseconds")
    payload: dict[str, Any] = Field(default_factory=dict, description="Sanitized, non-sensitive event metadata")
    timestamp: datetime = Field(default_factory=now_utc, description="UTC event timestamp")


class RunAuditSummary(BaseModel):
    """Structured, inspectable summary reconstructing a complete research workflow execution."""

    model_config = ConfigDict(frozen=True)

    run_id: str = Field(..., description="Correlated execution ID")
    symbol: str = Field(..., description="Analyzed asset symbol")
    orchestration_pattern: str = Field(..., description="Orchestration pattern used (SEQUENTIAL, PARALLEL, HIERARCHICAL)")
    agents_executed: list[str] = Field(default_factory=list, description="List of distinct agents that executed")
    tools_invoked: list[str] = Field(default_factory=list, description="List of distinct tools called")
    accepted_findings_count: int = Field(default=0, description="Count of accepted findings")
    challenges_count: int = Field(default=0, description="Count of adversarial challenges raised")
    risk_checks_passed: bool = Field(default=True, description="True if all risk validation gates passed")
    missing_data_warnings: list[str] = Field(default_factory=list, description="Reported data absence limitations")
    total_duration_seconds: float = Field(default=0.0, description="Total workflow execution duration in seconds")
    events_count: int = Field(default=0, description="Total lifecycle events recorded")
    events: list[dict[str, Any]] = Field(default_factory=list, description="Chronological event records")


class ExecutionTracer:
    """Thread-safe event collector for workflow lifecycle tracing."""

    def __init__(self, run_id: str, pattern: str = "SEQUENTIAL") -> None:
        self.run_id = run_id
        self.pattern = pattern
        self._events: list[LifecycleEvent] = []

    def record_event(
        self,
        event_type: LifecycleEventType,
        agent_id: str,
        framework: str = "GOOGLE_ADK",
        status: str = "SUCCESS",
        duration_ms: float | None = None,
        payload: dict[str, Any] | None = None,
    ) -> LifecycleEvent:
        """Records a new lifecycle event."""
        import uuid

        event = LifecycleEvent(
            event_id=f"evt-{uuid.uuid4().hex[:8]}",
            run_id=self.run_id,
            event_type=event_type,
            agent_id=agent_id,
            framework=framework,
            orchestration_pattern=self.pattern,
            status=status,
            duration_ms=duration_ms,
            payload=payload or {},
            timestamp=now_utc(),
        )
        self._events.append(event)
        return event

    def get_events(self) -> list[LifecycleEvent]:
        """Returns all recorded events."""
        return list(self._events)


def generate_run_summary(blackboard: Blackboard) -> RunAuditSummary:
    """Reconstructs the research workflow and generates a structured RunAuditSummary.

    Inspects blackboard contributions, tool results, citations, and recorded events.
    """
    run_id = blackboard.run_id
    symbol = blackboard.request.symbol if blackboard.request else "UNKNOWN"
    pattern = blackboard.get_metadata("orchestration_pattern") or "SEQUENTIAL"
    latency = blackboard.get_metadata("latency_seconds") or 0.0

    contributions = blackboard.get_contributions()
    agents_executed = list(dict.fromkeys(c.agent_id for c in contributions))
    tools_invoked = list(dict.fromkeys(blackboard.export_state().get("tool_results_keys", [])))

    # Calculate accepted findings vs challenges
    findings_count = sum(len(c.findings) for c in contributions)
    challenges_count = 0
    skeptic_contribs = [c for c in contributions if "skeptic" in c.agent_id.lower()]
    for sc in skeptic_contribs:
        challenges_count += len(sc.findings) + len(sc.warnings)

    risk_passed = True
    risk_contribs = [c for c in contributions if "risk" in c.agent_id.lower() or "compliance" in c.agent_id.lower()]
    for rc in risk_contribs:
        if rc.status != "SUCCESS" or rc.findings.get("risk_passed") is False:
            risk_passed = False

    raw_events = blackboard.get_metadata("lifecycle_events") or []

    return RunAuditSummary(
        run_id=run_id,
        symbol=symbol,
        orchestration_pattern=pattern,
        agents_executed=agents_executed,
        tools_invoked=tools_invoked,
        accepted_findings_count=findings_count,
        challenges_count=challenges_count,
        risk_checks_passed=risk_passed,
        missing_data_warnings=blackboard.get_all_warnings(),
        total_duration_seconds=float(latency),
        events_count=len(raw_events),
        events=raw_events,
    )
