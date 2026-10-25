"""Thread-safe Blackboard architecture for multi-agent state sharing and provenance tracking."""

from threading import RLock
from typing import Any

from arthaai.core.clock.timezone import now_utc
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


class Blackboard:
    """Thread-safe shared state container for heterogeneous multi-agent research.

    Enables Google ADK and CrewAI agents to read and write typed contributions,
    tool outputs, evidence citations, and risk warnings with correlation tracking.
    """

    def __init__(self, run_id: str, request: ResearchRequest | None = None) -> None:
        self._lock = RLock()
        self.run_id = run_id
        self.request = request
        self.created_at = now_utc()
        self.version: int = 0
        self._audit_trail: list[dict[str, Any]] = []
        self._contributions: list[AgentContribution] = []
        self._tool_results: dict[str, Any] = {}
        self._metadata: dict[str, Any] = {}
        self._record_change("INITIALIZE", {"run_id": run_id})

    def _record_change(self, action: str, details: dict[str, Any]) -> None:
        self.version += 1
        self._audit_trail.append(
            {
                "version": self.version,
                "action": action,
                "timestamp": now_utc().isoformat(),
                "details": details,
            }
        )

    def get_version(self) -> int:
        """Returns the current monotonic state version."""
        with self._lock:
            return self.version

    def get_audit_trail(self) -> list[dict[str, Any]]:
        """Returns the complete sequence of state modifications."""
        with self._lock:
            return list(self._audit_trail)

    def set_request(self, request: ResearchRequest) -> None:
        """Atomically sets or updates the active research request."""
        with self._lock:
            self.request = request
            if not self.run_id:
                self.run_id = request.run_id
            self._record_change("SET_REQUEST", {"request_id": request.request_id, "symbol": request.symbol})

    def add_contribution(self, contribution: AgentContribution) -> None:
        """Atomically appends a validated agent contribution."""
        with self._lock:
            self._contributions.append(contribution)
            self._record_change(
                "ADD_CONTRIBUTION",
                {
                    "agent_id": contribution.agent_id,
                    "framework": contribution.framework,
                    "task_name": contribution.task_name,
                    "status": contribution.status,
                },
            )

    def add_tool_result(self, tool_name: str, result: Any) -> None:
        """Atomically stores raw or structured output from a tool call."""
        with self._lock:
            self._tool_results[tool_name] = result
            self._record_change("ADD_TOOL_RESULT", {"tool_name": tool_name})

    def get_contributions(
        self, agent_id: str | None = None, framework: str | None = None
    ) -> list[AgentContribution]:
        """Queries contributions filtered by agent ID or framework origin."""
        with self._lock:
            results = list(self._contributions)
            if agent_id is not None:
                results = [c for c in results if c.agent_id == agent_id]
            if framework is not None:
                results = [c for c in results if c.framework == framework]
            return results

    def get_latest_contribution(self, task_name: str | None = None) -> AgentContribution | None:
        """Retrieves the most recent contribution, optionally filtered by task name."""
        with self._lock:
            if not self._contributions:
                return None
            if task_name is None:
                return self._contributions[-1]
            matching = [c for c in self._contributions if c.task_name == task_name]
            return matching[-1] if matching else None

    def get_tool_result(self, tool_name: str) -> Any | None:
        """Retrieves cached tool result by name."""
        with self._lock:
            return self._tool_results.get(tool_name)

    def get_all_citations(self) -> list[str]:
        """Aggregates all unique evidence citations across all contributions."""
        with self._lock:
            citations: list[str] = []
            for c in self._contributions:
                for cit in c.evidence_citations:
                    if cit not in citations:
                        citations.append(cit)
            return citations

    def get_all_warnings(self) -> list[str]:
        """Aggregates all warnings emitted by agents or tool validators."""
        with self._lock:
            warnings: list[str] = []
            for c in self._contributions:
                for w in c.warnings:
                    if w not in warnings:
                        warnings.append(w)
            return warnings

    def set_metadata(self, key: str, value: Any) -> None:
        """Sets an arbitrary execution metadata key."""
        with self._lock:
            self._metadata[key] = value
            self._record_change("SET_METADATA", {"key": key})

    def get_metadata(self, key: str) -> Any | None:
        """Retrieves execution metadata."""
        with self._lock:
            return self._metadata.get(key)

    def export_state(self) -> dict[str, Any]:
        """Exports a point-in-time snapshot of the Blackboard state."""
        with self._lock:
            return {
                "run_id": self.run_id,
                "version": self.version,
                "audit_trail_count": len(self._audit_trail),
                "request": self.request.model_dump(mode="json") if self.request else None,
                "created_at": self.created_at.isoformat(),
                "contributions_count": len(self._contributions),
                "contributions": [c.model_dump(mode="json") for c in self._contributions],
                "tool_results_keys": list(self._tool_results.keys()),
                "citations": self.get_all_citations(),
                "warnings": self.get_all_warnings(),
                "metadata": dict(self._metadata),
            }
