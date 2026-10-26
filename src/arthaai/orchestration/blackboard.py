"""Typed, versioned, thread-safe Blackboard architecture for multi-agent state sharing and provenance tracking."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.schemas.research_output import AgentContribution, ResearchRequest


class BlackboardNamespace(str, Enum):
    """Controlled typed namespaces within the shared research blackboard."""

    REQUEST = "request"
    MARKET_DATA = "market_data"
    RAG_EVIDENCE = "rag_evidence"
    AGENT_CONTRIBUTIONS = "agent_contributions"
    TOOL_RESULTS = "tool_results"
    VALIDATION = "validation"
    GOVERNANCE = "governance"


class BlackboardEntry(BaseModel):
    """An individual typed, versioned, and audited cell on the Blackboard."""

    model_config = ConfigDict(frozen=True)

    namespace: BlackboardNamespace
    key: str
    value: Any
    version: int
    producer_id: str
    timestamp: str
    consumers: list[str] = Field(default_factory=list)
    is_immutable: bool = False  # If True, cannot be overwritten by subsequent writes


class BlackboardAuditRecord(BaseModel):
    """Audit log item capturing precise mutation provenance."""

    model_config = ConfigDict(frozen=True)

    version: int
    action: str
    producer_id: str
    timestamp: str
    details: dict[str, Any]


class Blackboard:
    """Thread-safe, typed, versioned shared state container for heterogeneous multi-agent research.

    Enforces:
    - Typed namespace isolation (REQUEST, MARKET_DATA, RAG_EVIDENCE, AGENT_CONTRIBUTIONS, TOOL_RESULTS, VALIDATION, GOVERNANCE)
    - Monotonic versioning with conflict detection
    - Producer and consumer lineage tracking (who wrote it, who read it)
    - Safety immutability guard: untrusted agent output cannot overwrite safety parameters (e.g. live_trading_enabled=False)
    - Disk persistence to data/blackboard/{run_id}.json
    """

    def __init__(self, run_id: str, request: ResearchRequest | None = None) -> None:
        self._lock = RLock()
        self.run_id = run_id
        self.request = request
        self.created_at = now_utc()
        self.version: int = 0
        self._audit_trail: list[dict[str, Any]] = []
        self._entries: dict[str, BlackboardEntry] = {}
        self._contributions: list[AgentContribution] = []
        self._tool_results: dict[str, Any] = {}
        self._metadata: dict[str, Any] = {}

        # Set safety constraint in GOVERNANCE namespace (strictly immutable)
        self._record_entry(
            namespace=BlackboardNamespace.GOVERNANCE,
            key="live_trading_enabled",
            value=False,
            producer_id="system_safety_guardrail",
            is_immutable=True,
        )

        if request is not None:
            self.set_request(request)

        self._record_change("INITIALIZE", "system", {"run_id": run_id})

    def _make_key(self, namespace: BlackboardNamespace, key: str) -> str:
        return f"{namespace.value}::{key}"

    def _record_change(self, action: str, producer_id: str, details: dict[str, Any]) -> None:
        self.version += 1
        self._audit_trail.append(
            {
                "version": self.version,
                "action": action,
                "producer_id": producer_id,
                "timestamp": now_utc().isoformat(),
                "details": details,
            }
        )

    def _record_entry(
        self,
        namespace: BlackboardNamespace,
        key: str,
        value: Any,
        producer_id: str,
        is_immutable: bool = False,
    ) -> BlackboardEntry:
        full_key = self._make_key(namespace, key)
        existing = self._entries.get(full_key)
        if existing and existing.is_immutable:
            raise PermissionError(
                f"Cannot overwrite immutable Blackboard entry '{full_key}' set by '{existing.producer_id}'."
            )

        self.version += 1
        entry = BlackboardEntry(
            namespace=namespace,
            key=key,
            value=value,
            version=self.version,
            producer_id=producer_id,
            timestamp=now_utc().isoformat(),
            consumers=existing.consumers if existing else [],
            is_immutable=is_immutable,
        )
        self._entries[full_key] = entry
        self._audit_trail.append(
            {
                "version": self.version,
                "action": "WRITE_ENTRY",
                "producer_id": producer_id,
                "timestamp": entry.timestamp,
                "details": {
                    "namespace": namespace.value,
                    "key": key,
                    "is_immutable": is_immutable,
                },
            }
        )
        return entry

    def write_entry(
        self,
        namespace: BlackboardNamespace,
        key: str,
        value: Any,
        producer_id: str,
        is_immutable: bool = False,
    ) -> BlackboardEntry:
        """Atomically writes a typed entry with producer tracking and immutability checks."""
        with self._lock:
            return self._record_entry(namespace, key, value, producer_id, is_immutable)

    def read_entry(
        self, namespace: BlackboardNamespace, key: str, consumer_id: str | None = None
    ) -> Any | None:
        """Atomically reads a typed entry, recording consumer provenance."""
        with self._lock:
            full_key = self._make_key(namespace, key)
            entry = self._entries.get(full_key)
            if entry is None:
                return None
            if consumer_id and consumer_id not in entry.consumers:
                updated_consumers = list(entry.consumers) + [consumer_id]
                # Update entry with consumer tracking
                self._entries[full_key] = BlackboardEntry(
                    namespace=entry.namespace,
                    key=entry.key,
                    value=entry.value,
                    version=entry.version,
                    producer_id=entry.producer_id,
                    timestamp=entry.timestamp,
                    consumers=updated_consumers,
                    is_immutable=entry.is_immutable,
                )
            return entry.value

    def add_rag_evidence(
        self, query: str, matches: list[dict[str, Any]], producer_id: str = "adk_research_manager"
    ) -> None:
        """Atomically registers retrieved RAG passages into the RAG_EVIDENCE namespace."""
        with self._lock:
            payload = {
                "query": query,
                "matches_count": len(matches),
                "citations": [m.get("citation_uri") for m in matches if m.get("citation_uri")],
                "documents": matches,
                "timestamp": now_utc().isoformat(),
            }
            self._record_entry(
                namespace=BlackboardNamespace.RAG_EVIDENCE,
                key="retrieved_corpus",
                value=payload,
                producer_id=producer_id,
            )

    def get_rag_evidence(self, consumer_id: str | None = None) -> dict[str, Any] | None:
        """Retrieves verified RAG corpus evidence from the Blackboard."""
        return self.read_entry(BlackboardNamespace.RAG_EVIDENCE, "retrieved_corpus", consumer_id=consumer_id)

    def add_market_data(
        self, symbol: str, data: dict[str, Any], producer_id: str = "adk_quant_specialist"
    ) -> None:
        """Registers canonical market data observations into the MARKET_DATA namespace."""
        with self._lock:
            self._record_entry(
                namespace=BlackboardNamespace.MARKET_DATA,
                key=symbol.upper(),
                value=data,
                producer_id=producer_id,
            )

    def get_market_data(self, symbol: str, consumer_id: str | None = None) -> dict[str, Any] | None:
        """Retrieves canonical market data from the Blackboard."""
        return self.read_entry(BlackboardNamespace.MARKET_DATA, symbol.upper(), consumer_id=consumer_id)

    def get_version(self) -> int:
        """Returns the current monotonic state version."""
        with self._lock:
            return self.version

    def get_audit_trail(self) -> list[dict[str, Any]]:
        """Returns the complete sequence of state modifications."""
        with self._lock:
            return list(self._audit_trail)

    def set_request(self, request: ResearchRequest) -> None:
        """Atomically sets or updates the active research request in the REQUEST namespace."""
        with self._lock:
            self.request = request
            if not self.run_id:
                self.run_id = request.run_id
            self._record_entry(
                namespace=BlackboardNamespace.REQUEST,
                key="active_request",
                value=request.model_dump(mode="json"),
                producer_id="user_api",
                is_immutable=True,
            )
            self._record_change(
                "SET_REQUEST", "user_api", {"request_id": request.request_id, "symbol": request.symbol}
            )

    def add_contribution(self, contribution: AgentContribution) -> None:
        """Atomically appends a validated agent contribution."""
        with self._lock:
            self._contributions.append(contribution)
            # Also record in AGENT_CONTRIBUTIONS namespace
            self._record_entry(
                namespace=BlackboardNamespace.AGENT_CONTRIBUTIONS,
                key=f"{contribution.agent_id}::{contribution.task_name}",
                value=contribution.model_dump(mode="json"),
                producer_id=contribution.agent_id,
            )
            self._record_change(
                "ADD_CONTRIBUTION",
                contribution.agent_id,
                {
                    "agent_id": contribution.agent_id,
                    "framework": contribution.framework,
                    "task_name": contribution.task_name,
                    "status": contribution.status,
                },
            )

    def add_tool_result(self, tool_name: str, result: Any, producer_id: str = "mcp_tool") -> None:
        """Atomically stores output from a tool call in TOOL_RESULTS namespace."""
        with self._lock:
            self._tool_results[tool_name] = result
            self._record_entry(
                namespace=BlackboardNamespace.TOOL_RESULTS,
                key=tool_name,
                value=result,
                producer_id=producer_id,
            )
            self._record_change("ADD_TOOL_RESULT", producer_id, {"tool_name": tool_name})

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
        """Aggregates all unique evidence citations across all contributions and RAG evidence."""
        with self._lock:
            citations: list[str] = []
            for c in self._contributions:
                for cit in c.evidence_citations:
                    if cit not in citations:
                        citations.append(cit)
            # Also include RAG evidence citations
            rag_data = self.read_entry(BlackboardNamespace.RAG_EVIDENCE, "retrieved_corpus")
            if isinstance(rag_data, dict):
                for cit in rag_data.get("citations", []):
                    if cit and cit not in citations:
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

    def set_metadata(self, key: str, value: Any, producer_id: str = "orchestrator") -> None:
        """Sets an arbitrary execution metadata key."""
        with self._lock:
            self._metadata[key] = value
            self._record_change("SET_METADATA", producer_id, {"key": key})

    def get_metadata(self, key: str) -> Any | None:
        """Retrieves execution metadata."""
        with self._lock:
            return self._metadata.get(key)

    def persist_to_disk(self, directory: str | Path = "data/blackboard") -> Path:
        """Atomically persists the complete Blackboard state snapshot to durable JSON storage."""
        with self._lock:
            dir_path = Path(directory)
            dir_path.mkdir(parents=True, exist_ok=True)
            fpath = dir_path / f"blackboard_{self.run_id}.json"
            tmp_path = dir_path / f"blackboard_{self.run_id}.tmp"
            state = self.export_state()
            with open(tmp_path, "w", encoding="utf-8") as fh:
                json.dump(state, fh, indent=2)
            tmp_path.replace(fpath)
            return fpath

    def export_state(self) -> dict[str, Any]:
        """Exports a point-in-time snapshot of the Blackboard state."""
        with self._lock:
            return {
                "run_id": self.run_id,
                "version": self.version,
                "audit_trail_count": len(self._audit_trail),
                "audit_trail": list(self._audit_trail),
                "request": self.request.model_dump(mode="json") if self.request else None,
                "created_at": self.created_at.isoformat(),
                "contributions_count": len(self._contributions),
                "contributions": [c.model_dump(mode="json") for c in self._contributions],
                "tool_results_keys": list(self._tool_results.keys()),
                "namespaces": {
                    ns.value: [
                        {
                            "key": entry.key,
                            "version": entry.version,
                            "producer_id": entry.producer_id,
                            "consumers": entry.consumers,
                            "timestamp": entry.timestamp,
                            "is_immutable": entry.is_immutable,
                        }
                        for full_k, entry in self._entries.items()
                        if entry.namespace == ns
                    ]
                    for ns in BlackboardNamespace
                },
                "citations": self.get_all_citations(),
                "warnings": self.get_all_warnings(),
                "metadata": dict(self._metadata),
            }
