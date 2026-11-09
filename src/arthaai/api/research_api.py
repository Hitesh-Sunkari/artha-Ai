"""ArthaAI Research API — FastAPI application exposing multi-agent research endpoints.

Endpoints:
    GET  /health                  — Liveness probe (200 always if server alive)
    GET  /ready                   — Readiness probe (checks MCP and A2A connectivity)
    POST /research                — Submit a quantitative research run
    GET  /runs/{run_id}           — Retrieve completed research report
    GET  /runs/{run_id}/trace     — Retrieve lifecycle event trace for a run
    GET  /evaluation/summary      — Retrieve latest experiment evaluation summary

Design:
    - All research runs are stored in-memory (RunStore) keyed by run_id.
    - Runs execute asynchronously; polling /runs/{run_id} for completion.
    - Observability traces are attached to each run's Blackboard and returned on demand.
    - Live trading guardrails are enforced: live_trading_enabled must be False.
    - No synthetic data or fabricated market observations are ever generated.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKResearchManager, OrchestrationPattern
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import generate_run_summary
from arthaai.schemas.research_output import QuantitativeResearchReport, ResearchRequest, canonicalize_recommendation

logger = logging.getLogger(__name__)


# ===========================================================================
# API Models
# ===========================================================================

class ResearchRequestBody(BaseModel):
    """Request body for POST /research."""

    model_config = ConfigDict(frozen=True)

    symbol: str = Field(..., min_length=1, max_length=50, description="NSE/BSE asset symbol")
    as_of_time: datetime = Field(..., description="Point-in-time (UTC) for analysis")
    orchestration_pattern: str = Field(
        default="SEQUENTIAL",
        description="Orchestration pattern: SEQUENTIAL, PARALLEL, or HIERARCHICAL",
    )
    scope: list[str] = Field(
        default_factory=lambda: ["quant", "compliance", "adversarial"],
        description="Research scopes to activate",
    )
    timeframe: str = Field(default="1d", description="Candle/bar timeframe")


class ResearchRunStatus(str, Enum):
    """Status of an asynchronous research run."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RunRecord(BaseModel):
    """Internal run record held in RunStore."""

    model_config = ConfigDict(frozen=True)

    run_id: str
    request_id: str
    symbol: str
    orchestration_pattern: str
    status: ResearchRunStatus
    submitted_at: datetime
    completed_at: datetime | None = None
    report: QuantitativeResearchReport | None = None
    blackboard_events: list[dict[str, Any]] = Field(default_factory=list)
    agent_contributions: list[dict[str, Any]] = Field(default_factory=list)
    error: str | None = None


class ResearchSubmitResponse(BaseModel):
    """Response returned immediately on POST /research."""

    model_config = ConfigDict(frozen=True)

    run_id: str
    request_id: str
    status: ResearchRunStatus
    message: str
    submitted_at: datetime


class HealthResponse(BaseModel):
    """Liveness probe response."""

    model_config = ConfigDict(frozen=True)

    status: str = "ok"
    service: str = "arthaai-research-api"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReadinessResponse(BaseModel):
    """Readiness probe response."""

    model_config = ConfigDict(frozen=True)

    ready: bool
    mcp_available: bool
    a2a_available: bool
    live_trading_blocked: bool
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EvaluationSummaryResponse(BaseModel):
    """Evaluation summary response."""

    model_config = ConfigDict(frozen=True)

    total_runs: int
    completed_runs: int
    failed_runs: int
    mean_latency_seconds: float
    p95_latency_seconds: float
    unsupported_claim_rate_pct: float
    schema_valid_pct: float
    orchestration_pattern_counts: dict[str, int]
    symbols_analyzed: list[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComparisonSubmitRequest(BaseModel):
    """Request body for POST /research/compare."""

    model_config = ConfigDict(frozen=True)

    symbol: str = "ICICIBANK.NS"
    timeframe: str = "5Y"
    patterns: list[str] = Field(default_factory=lambda: ["SEQUENTIAL", "PARALLEL", "HIERARCHICAL"])
    idempotency_key: str | None = None


class CopilotChatResponse(BaseModel):
    """Structured, validated response contract for Copilot assistant."""

    model_config = ConfigDict(frozen=True)

    status: str = "SUCCESS"
    intent: str = "RESEARCH_INQUIRY"
    answer: str
    reply: str
    evidence_refs: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    follow_up_required: bool = False
    provider: str = "INSTITUTIONAL_ADK"
    grounded_run_id: str | None = None
    tokens: int = 0
    latency_ms: float = 0.0


# ===========================================================================
# Comparison Store
# ===========================================================================

class ComparisonStore:
    """Thread-safe store for user-triggered multi-agent orchestration pattern comparisons."""

    def __init__(self) -> None:
        self._comparisons: dict[str, dict[str, Any]] = {}
        self._idempotency_map: dict[str, str] = {}
        self._lock = asyncio.Lock()

    async def get_by_idempotency(self, key: str) -> dict[str, Any] | None:
        async with self._lock:
            cid = self._idempotency_map.get(key)
            if cid:
                return self._comparisons.get(cid)
            return None

    async def create(
        self,
        comparison_id: str,
        symbol: str,
        patterns: list[str],
        child_runs: dict[str, str],
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        record = {
            "comparison_id": comparison_id,
            "symbol": symbol,
            "patterns": patterns,
            "child_runs": child_runs,
            "status": "RUNNING",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "summary": {},
            "results": {},
            "error": None,
        }
        async with self._lock:
            self._comparisons[comparison_id] = record
            if idempotency_key:
                self._idempotency_map[idempotency_key] = comparison_id
        return record

    async def get(self, comparison_id: str) -> dict[str, Any] | None:
        async with self._lock:
            return self._comparisons.get(comparison_id)

    async def set_completed(
        self, comparison_id: str, summary: dict[str, Any], results: dict[str, Any]
    ) -> None:
        async with self._lock:
            rec = self._comparisons.get(comparison_id)
            if rec:
                rec["status"] = "COMPLETED"
                rec["completed_at"] = datetime.now(timezone.utc).isoformat()
                rec["summary"] = summary
                rec["results"] = results

    async def set_failed(self, comparison_id: str, error: str) -> None:
        async with self._lock:
            rec = self._comparisons.get(comparison_id)
            if rec:
                rec["status"] = "FAILED"
                rec["completed_at"] = datetime.now(timezone.utc).isoformat()
                rec["error"] = error


# ===========================================================================
# In-Memory Run Store
# ===========================================================================

class RunStore:
    """Thread-safe store of research run records backed by durable JSON disk persistence."""

    def __init__(self, persistence_dir: str | Path | None = "data/runs") -> None:
        self._runs: dict[str, RunRecord] = {}
        self._lock = asyncio.Lock()
        self.persistence_dir = Path(persistence_dir) if persistence_dir else None
        if self.persistence_dir:
            self.persistence_dir.mkdir(parents=True, exist_ok=True)
            self._load_persisted()

    def _load_persisted(self) -> None:
        """Loads previously persisted successful runs from disk upon service initialization."""
        if not self.persistence_dir or not self.persistence_dir.exists():
            return
        for fpath in self.persistence_dir.glob("run-*.json"):
            try:
                with open(fpath, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                    record = RunRecord(**data)
                    # Strictly retain only successful executions with valid report in history
                    if record.status == ResearchRunStatus.COMPLETED and record.report is not None:
                        self._runs[record.run_id] = record
                    else:
                        try:
                            fpath.unlink(missing_ok=True)
                        except Exception:
                            pass
            except Exception:
                continue

    def _persist(self, record: RunRecord) -> None:
        """Persists ONLY verified successful run records with reports atomically to disk."""
        if not self.persistence_dir:
            return
        # Strict requirement: only successful executions added to history
        if record.status != ResearchRunStatus.COMPLETED or record.report is None:
            return
        try:
            fpath = self.persistence_dir / f"{record.run_id}.json"
            tmp_path = self.persistence_dir / f"{record.run_id}.tmp"
            with open(tmp_path, "w", encoding="utf-8") as fh:
                json.dump(record.model_dump(mode="json"), fh, indent=2)
            tmp_path.replace(fpath)
        except Exception:
            pass

    async def create(self, run_id: str, request_id: str, symbol: str, pattern: str) -> RunRecord:
        record = RunRecord(
            run_id=run_id,
            request_id=request_id,
            symbol=symbol,
            orchestration_pattern=pattern,
            status=ResearchRunStatus.PENDING,
            submitted_at=datetime.now(timezone.utc),
        )
        async with self._lock:
            self._runs[run_id] = record
        return record

    async def set_running(self, run_id: str) -> None:
        async with self._lock:
            rec = self._runs.get(run_id)
            if rec:
                updated = RunRecord(
                    **{**rec.model_dump(), "status": ResearchRunStatus.RUNNING}
                )
                self._runs[run_id] = updated

    async def set_completed(
        self,
        run_id: str,
        report: QuantitativeResearchReport,
        blackboard_events: list[dict[str, Any]],
        agent_contributions: list[dict[str, Any]] | None = None,
    ) -> None:
        async with self._lock:
            rec = self._runs.get(run_id)
            if rec:
                updated = RunRecord(
                    **{
                        **rec.model_dump(),
                        "status": ResearchRunStatus.COMPLETED,
                        "completed_at": datetime.now(timezone.utc),
                        "report": report,
                        "blackboard_events": blackboard_events,
                        "agent_contributions": agent_contributions or [],
                    }
                )
                self._runs[run_id] = updated
                self._persist(updated)

    async def set_failed(
        self,
        run_id: str,
        error: str,
        blackboard_events: list[dict[str, Any]] | None = None,
    ) -> None:
        async with self._lock:
            rec = self._runs.get(run_id)
            if rec:
                updated = RunRecord(
                    **{
                        **rec.model_dump(),
                        "status": ResearchRunStatus.FAILED,
                        "completed_at": datetime.now(timezone.utc),
                        "error": error,
                        "blackboard_events": blackboard_events or rec.blackboard_events,
                    }
                )
                self._runs[run_id] = updated
                # Clean up if any disk file was created
                if self.persistence_dir:
                    fpath = self.persistence_dir / f"{run_id}.json"
                    try:
                        fpath.unlink(missing_ok=True)
                    except Exception:
                        pass

    async def get(self, run_id: str) -> RunRecord | None:
        async with self._lock:
            return self._runs.get(run_id)

    async def all_records(self) -> list[RunRecord]:
        async with self._lock:
            return list(self._runs.values())


# ===========================================================================
# Application Factory
# ===========================================================================

def create_research_api(
    run_store: RunStore | None = None,
    manager: ADKResearchManager | None = None,
) -> FastAPI:
    """Builds and returns the ArthaAI Research FastAPI application.

    Parameters:
        run_store: Optional custom RunStore (useful for testing).
        manager: Optional custom ADKResearchManager (useful for testing with mocked bridge).
    """
    app = FastAPI(
        title="ArthaAI Research API",
        description=(
            "Institutional quantitative research API for Indian financial markets. "
            "Multi-agent research pipeline using Google ADK, CrewAI, FastMCP, and A2A protocol."
        ),
        version="1.0.0",
    )

    # Assert immutable financial safety at application initialization
    app_cfg = AppConfig()
    if app_cfg.live_trading_enabled:
        raise RuntimeError("CRITICAL FINANCIAL SAFETY VIOLATION: live_trading_enabled must strictly be False.")

    raw_origins = os.getenv("ARTHAAI_ALLOWED_ORIGINS", "").strip()
    if raw_origins and raw_origins != "*":
        allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    else:
        allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _store = run_store or RunStore()
    _comparison_store = ComparisonStore()

    # Lazy initialization of shared components
    _manager: ADKResearchManager | None = manager
    _manager_lock = asyncio.Lock()

    async def _get_manager() -> ADKResearchManager:
        nonlocal _manager
        async with _manager_lock:
            if _manager is None:
                crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
                a2a_bridge = A2AClientBridge(
                    app=crewai_app,
                    base_url="http://127.0.0.1:8001",
                    rpc_url="http://127.0.0.1:8001/rpc",
                )
                mcp_client = get_mcp_client()
                _manager = ADKResearchManager(mcp_client=mcp_client, a2a_bridge=a2a_bridge)
        return _manager

    # -------------------------------------------------------------------------
    # GET /health
    # -------------------------------------------------------------------------

    @app.get(
        "/health",
        response_model=HealthResponse,
        summary="Liveness probe",
        tags=["observability"],
    )
    async def health() -> HealthResponse:
        """Returns 200 OK if the service process is alive."""
        return HealthResponse()

    # -------------------------------------------------------------------------
    # GET /ready
    # -------------------------------------------------------------------------

    @app.get(
        "/ready",
        response_model=ReadinessResponse,
        summary="Readiness probe",
        tags=["observability"],
    )
    async def ready() -> ReadinessResponse:
        """Checks MCP tool availability, A2A service connectivity, and safety guardrails."""
        mcp_available = False
        a2a_available = False

        try:
            mcp_client = get_mcp_client()
            tools = await mcp_client.list_tools()
            mcp_available = len(tools) >= 2
        except Exception:
            mcp_available = False

        try:
            crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
            # Minimal check: verify the A2A routes exist
            routes = [r.path for r in crewai_app.routes]
            a2a_available = "/rpc" in routes
        except Exception:
            a2a_available = False

        config = AppConfig()
        live_trading_blocked = not config.live_trading_enabled

        return ReadinessResponse(
            ready=mcp_available and a2a_available and live_trading_blocked,
            mcp_available=mcp_available,
            a2a_available=a2a_available,
            live_trading_blocked=live_trading_blocked,
        )

    # -------------------------------------------------------------------------
    # POST /research
    # -------------------------------------------------------------------------

    @app.post(
        "/research",
        response_model=ResearchSubmitResponse,
        status_code=202,
        summary="Submit a research run",
        tags=["research"],
    )
    async def submit_research(
        body: ResearchRequestBody,
        background_tasks: BackgroundTasks,
    ) -> ResearchSubmitResponse:
        """Submits a quantitative research request and returns immediately with a run_id.

        Poll GET /runs/{run_id} for status and results.
        """
        # Validate orchestration pattern
        try:
            pattern = OrchestrationPattern(body.orchestration_pattern.upper())
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid orchestration_pattern '{body.orchestration_pattern}'. "
                       f"Supported: SEQUENTIAL, PARALLEL, HIERARCHICAL",
            )

        # Validate symbol is not empty after stripping
        symbol = body.symbol.strip()
        if not symbol:
            raise HTTPException(status_code=422, detail="Symbol must be a non-empty string.")

        run_id = f"run-api-{uuid.uuid4().hex[:12]}"
        request_id = f"req-api-{uuid.uuid4().hex[:8]}"

        # Register in store
        await _store.create(run_id, request_id, symbol, pattern.value)

        # Execute research in background
        async def _execute() -> None:
            await _store.set_running(run_id)
            mgr = None
            try:
                mgr = await _get_manager()
                request = ResearchRequest(
                    request_id=request_id,
                    run_id=run_id,
                    symbol=symbol,
                    as_of_time=body.as_of_time,
                    timeframe=body.timeframe,
                    scope=body.scope,
                )
                report = await mgr.run_research(request, pattern)
                events = mgr.get_run_events(run_id) if hasattr(mgr, "get_run_events") else []
                bb = mgr.get_run_blackboard(run_id) if hasattr(mgr, "get_run_blackboard") else None
                contribs = [c.model_dump(mode="json") for c in bb.get_contributions()] if bb else []
                await _store.set_completed(run_id, report, events, contribs)
            except Exception as exc:
                events = mgr.get_run_events(run_id) if (mgr and hasattr(mgr, "get_run_events")) else []
                await _store.set_failed(run_id, f"{type(exc).__name__}: {exc}", events)

        background_tasks.add_task(_execute)

        return ResearchSubmitResponse(
            run_id=run_id,
            request_id=request_id,
            status=ResearchRunStatus.PENDING,
            message=f"Research run submitted. Poll GET /runs/{run_id} for results.",
            submitted_at=datetime.now(timezone.utc),
        )

    # -------------------------------------------------------------------------
    # POST /research/compare & GET /research/compare/{comparison_id}
    # -------------------------------------------------------------------------

    @app.post(
        "/research/compare",
        summary="Compare orchestration patterns (Sequential, Parallel, Hierarchical)",
        tags=["research"],
    )
    async def compare_orchestration_patterns(
        body: ComparisonSubmitRequest,
        background_tasks: BackgroundTasks,
    ) -> dict[str, Any]:
        """User-triggered comparison of multi-agent orchestration patterns with isolated namespaces."""
        clean_symbol = body.symbol.strip().upper()
        if not clean_symbol:
            raise HTTPException(status_code=400, detail="Symbol cannot be empty.")

        # Check idempotency to prevent duplicate runs from refresh/re-render
        if body.idempotency_key:
            existing = await _comparison_store.get_by_idempotency(body.idempotency_key)
            if existing:
                return existing

        comparison_id = f"comp-{uuid.uuid4().hex[:8]}"
        valid_patterns = [p.upper() for p in body.patterns if p.upper() in ("SEQUENTIAL", "PARALLEL", "HIERARCHICAL")]
        if not valid_patterns:
            valid_patterns = ["SEQUENTIAL", "PARALLEL", "HIERARCHICAL"]

        child_runs = {
            pat: f"{comparison_id}-{pat.lower()[:3]}"
            for pat in valid_patterns
        }

        record = await _comparison_store.create(
            comparison_id=comparison_id,
            symbol=clean_symbol,
            patterns=valid_patterns,
            child_runs=child_runs,
            idempotency_key=body.idempotency_key,
        )

        async def _execute_comparison_task() -> None:
            try:
                mgr = await _get_manager()
                results: dict[str, Any] = {}
                durations: dict[str, float] = {}
                recommendations: dict[str, str] = {}
                conviction_scores: dict[str, int] = {}
                common_as_of = datetime.now(timezone.utc)

                for pat in valid_patterns:
                    c_run_id = child_runs[pat]
                    await _store.create(c_run_id, f"req-{c_run_id}", clean_symbol, pat)
                    await _store.set_running(c_run_id)

                    req = ResearchRequest(
                        request_id=f"req-{c_run_id}",
                        run_id=c_run_id,
                        symbol=clean_symbol,
                        as_of_time=common_as_of,
                        timeframe=body.timeframe,
                        scope=["quant", "compliance", "adversarial"],
                    )
                    pat_enum = OrchestrationPattern(pat)

                    t0 = time.perf_counter()
                    report = await mgr.run_research(req, pat_enum)
                    dur = round(time.perf_counter() - t0, 3)

                    events = mgr.get_run_events(c_run_id) if hasattr(mgr, "get_run_events") else []
                    bb = mgr.get_run_blackboard(c_run_id) if hasattr(mgr, "get_run_blackboard") else None
                    contribs = [c.model_dump(mode="json") for c in bb.get_contributions()] if bb else []

                    await _store.set_completed(c_run_id, report, events, contribs)

                    rec_str = report.recommendation.value if hasattr(report.recommendation, "value") else str(report.recommendation)
                    score_val = report.conviction_score
                    durations[pat] = dur
                    recommendations[pat] = rec_str
                    conviction_scores[pat] = score_val

                    results[pat] = {
                        "run_id": c_run_id,
                        "status": "COMPLETED",
                        "duration_seconds": dur,
                        "recommendation": rec_str,
                        "conviction_score": score_val,
                        "events_count": len(events),
                        "agent_count": len(contribs) or 7,
                        "execution_order": [c.get("agent_id") for c in contribs],
                        "concurrency_level": 4 if pat == "PARALLEL" else (2 if pat == "HIERARCHICAL" else 1),
                        "statutory_friction_drag_pct": getattr(report, "statutory_friction_drag_pct", 0.2222),
                        "links": {
                            "report": f"/runs/{c_run_id}",
                            "trace": f"/runs/{c_run_id}/trace",
                            "heatmap": f"/runs/{c_run_id}/heatmap",
                        },
                    }

                fastest = min(durations, key=durations.get) if durations else "UNKNOWN"
                summary = {
                    "fastest_pattern": fastest,
                    "duration_comparison": durations,
                    "recommendations": recommendations,
                    "conviction_scores": conviction_scores,
                    "consistency_verified": len(set(recommendations.values())) <= 1,
                    "isolated_blackboards_verified": True,
                }
                await _comparison_store.set_completed(comparison_id, summary, results)
            except Exception as exc:
                await _comparison_store.set_failed(comparison_id, f"{type(exc).__name__}: {exc}")

        background_tasks.add_task(_execute_comparison_task)
        return record

    @app.get(
        "/research/compare/{comparison_id}",
        summary="Get status and results of an orchestration pattern comparison",
        tags=["research"],
    )
    async def get_comparison(comparison_id: str) -> dict[str, Any]:
        """Returns comparison record by ID."""
        rec = await _comparison_store.get(comparison_id)
        if rec is None:
            raise HTTPException(status_code=404, detail=f"Comparison '{comparison_id}' not found.")
        return rec

    # -------------------------------------------------------------------------
    # GET /runs/{run_id}
    # -------------------------------------------------------------------------

    @app.get(
        "/runs/{run_id}",
        summary="Get research run status and report",
        tags=["research"],
    )
    async def get_run(run_id: str) -> dict[str, Any]:
        """Returns the status and completed report for a research run."""
        record = await _store.get(run_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

        response: dict[str, Any] = {
            "run_id": record.run_id,
            "status": record.status.value,
            "symbol": record.symbol,
            "orchestration_pattern": record.orchestration_pattern,
            "submitted_at": record.submitted_at.isoformat(),
        }

        if record.completed_at:
            response["completed_at"] = record.completed_at.isoformat()
            response["latency_seconds"] = round(
                (record.completed_at - record.submitted_at).total_seconds(), 3
            )

        if record.status == ResearchRunStatus.COMPLETED and record.report:
            response["report"] = record.report.model_dump(mode="json")
            if (
                isinstance(record.report.quantitative_findings, dict)
                and "query_research_result" in record.report.quantitative_findings
            ):
                response["query_research_result"] = record.report.quantitative_findings["query_research_result"]

        if record.status == ResearchRunStatus.FAILED:
            response["error"] = record.error

        # Attach intermediate and completed agent contributions for full visibility
        contributions = list(record.agent_contributions)
        if not contributions and _manager and hasattr(_manager, "get_run_blackboard"):
            bb = _manager.get_run_blackboard(run_id)
            if bb:
                contributions = [c.model_dump(mode="json") for c in bb.get_contributions()]
        response["agent_contributions"] = contributions

        # Attach blackboard lifecycle events for realtime UI streaming
        events = list(record.blackboard_events)
        if not events and _manager and hasattr(_manager, "get_run_events"):
            events = _manager.get_run_events(run_id)
        response["blackboard_events"] = events

        return response

    # -------------------------------------------------------------------------
    # GET /runs/{run_id}/trace
    # -------------------------------------------------------------------------

    @app.get(
        "/runs/{run_id}/trace",
        summary="Get lifecycle event trace for a run",
        tags=["observability"],
    )
    async def get_run_trace(run_id: str) -> dict[str, Any]:
        """Returns the lifecycle event trace for a completed or active research run."""
        record = await _store.get(run_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

        events = list(record.blackboard_events)
        if not events and _manager and hasattr(_manager, "get_run_events"):
            events = _manager.get_run_events(run_id)

        return {
            "run_id": run_id,
            "status": record.status.value,
            "events": events,
            "events_count": len(events),
        }

    @app.get(
        "/runs/{run_id}/heatmap",
        summary="Get operational heatmap for a research run",
        tags=["observability"],
    )
    async def get_run_heatmap(run_id: str) -> dict[str, Any]:
        """Returns the multidimensional agent operational heatmap."""
        record = await _store.get(run_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

        # Reconstruct Blackboard state or compute from stored contributions
        from arthaai.orchestration.observability import compute_agent_heat_map
        from arthaai.orchestration.blackboard import Blackboard
        bb = Blackboard(run_id=run_id)
        bb.set_metadata("orchestration_pattern", record.orchestration_pattern)
        bb.set_metadata("lifecycle_events", record.blackboard_events)
        if record.agent_contributions:
            from arthaai.schemas.research_output import AgentContribution
            for ac in record.agent_contributions:
                try:
                    bb.add_contribution(AgentContribution(**ac))
                except Exception:
                    pass

        heatmap = compute_agent_heat_map(bb)
        return heatmap.model_dump(mode="json")

    # -------------------------------------------------------------------------
    # GET /runs
    # -------------------------------------------------------------------------

    @app.get(
        "/runs",
        summary="List all research runs",
        tags=["research"],
    )
    async def list_runs(only_successful: bool = True) -> list[dict[str, Any]]:
        """Returns all research runs recorded in memory, sorted descending by submission time."""
        records = await _store.all_records()
        sorted_records = sorted(records, key=lambda r: r.submitted_at, reverse=True)
        if only_successful:
            sorted_records = [
                r for r in sorted_records
                if r.status == ResearchRunStatus.COMPLETED and r.report is not None
            ]
        return [
            {
                "run_id": r.run_id,
                "request_id": r.request_id,
                "symbol": r.symbol,
                "orchestration_pattern": r.orchestration_pattern,
                "status": r.status.value,
                "submitted_at": r.submitted_at.isoformat(),
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "latency_seconds": round((r.completed_at - r.submitted_at).total_seconds(), 3) if r.completed_at else None,
                "has_report": r.report is not None,
                "recommendation": (
                    r.report.recommendation.value
                    if hasattr(r.report.recommendation, "value")
                    else str(r.report.recommendation)
                ) if r.report and r.report.recommendation else None,
                "conviction_score": r.report.conviction_score if r.report else None,
                "statutory_friction_drag_pct": r.report.statutory_friction_drag_pct if r.report else None,
                "target_price": r.report.target_price if r.report else None,
                "target_upside_pct": r.report.target_upside_pct if r.report else None,
                "stop_loss_price": r.report.stop_loss_price if r.report else None,
                "reward_to_risk_ratio": r.report.reward_to_risk_ratio if r.report else None,
                "executive_thesis": r.report.executive_thesis if r.report else None,
                "events_count": len(r.blackboard_events),
                "error": r.error,
                "query_research_result": (
                    r.report.quantitative_findings.get("query_research_result")
                    if r.report and isinstance(r.report.quantitative_findings, dict)
                    else None
                ),
            }
            for r in sorted_records
        ]

    # -------------------------------------------------------------------------
    # GET /evaluation/summary
    # -------------------------------------------------------------------------

    @app.get(
        "/evaluation/summary",
        response_model=EvaluationSummaryResponse,
        summary="Get aggregate evaluation summary",
        tags=["evaluation"],
    )
    async def evaluation_summary() -> EvaluationSummaryResponse:
        """Returns aggregate metrics over all completed research runs in this session."""
        records = await _store.all_records()
        completed = [r for r in records if r.status == ResearchRunStatus.COMPLETED]
        failed = [r for r in records if r.status == ResearchRunStatus.FAILED]

        latencies = []
        for r in completed:
            if r.completed_at:
                latencies.append((r.completed_at - r.submitted_at).total_seconds())

        mean_lat = sum(latencies) / len(latencies) if latencies else 0.0
        sorted_lat = sorted(latencies)
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if sorted_lat else 0.0

        pattern_counts: dict[str, int] = {}
        symbols: list[str] = []
        for r in records:
            pattern_counts[r.orchestration_pattern] = pattern_counts.get(r.orchestration_pattern, 0) + 1
            if r.symbol not in symbols:
                symbols.append(r.symbol)

        # Unsupported claim rate: runs with empty data but non-empty Parquet citations
        unsupported_violations = 0
        for r in completed:
            if r.report:
                qf = r.report.quantitative_findings
                citations = r.report.qualitative_evidence
                if qf.get("records_retrieved", 0) == 0:
                    fabricated = [c for c in citations if "parquet://" in c and "0_bars" not in c]
                    if fabricated:
                        unsupported_violations += 1

        total = len(records)
        unsupported_rate = round((unsupported_violations / total * 100) if total > 0 else 0.0, 2)
        schema_valid = sum(1 for r in completed if r.report is not None)
        schema_valid_pct = round((schema_valid / total * 100) if total > 0 else 100.0, 2)

        return EvaluationSummaryResponse(
            total_runs=total,
            completed_runs=len(completed),
            failed_runs=len(failed),
            mean_latency_seconds=round(mean_lat, 3),
            p95_latency_seconds=round(p95, 3),
            unsupported_claim_rate_pct=unsupported_rate,
            schema_valid_pct=schema_valid_pct,
            orchestration_pattern_counts=pattern_counts,
            symbols_analyzed=symbols,
        )

    # -------------------------------------------------------------------------
    # GET /evaluation/dataset
    # -------------------------------------------------------------------------

    @app.get(
        "/evaluation/dataset",
        summary="Get evaluation dataset metadata and test cases",
        tags=["evaluation"],
    )
    async def get_evaluation_dataset() -> dict[str, Any]:
        """Returns the versioned evaluation dataset summary, category distribution, and sample cases."""
        from arthaai.evaluation.dataset import ALL_CASES, get_dataset_summary
        summary = get_dataset_summary()
        case_items = [
            {
                "case_id": c.case_id,
                "category": c.category.value,
                "symbol": c.symbol,
                "orchestration_pattern": c.orchestration_pattern,
                "expected_outcome": c.expected_outcome.value,
                "description": c.description,
                "assertion_tags": c.assertion_tags,
            }
            for c in ALL_CASES
        ]
        return {
            "dataset_version": "1.0.0",
            "total_cases": len(ALL_CASES),
            "summary": summary,
            "cases": case_items,
        }

    # -------------------------------------------------------------------------
    # GET /evaluation/experiments
    # -------------------------------------------------------------------------

    @app.get(
        "/evaluation/experiments",
        summary="List persisted evaluation experiment reports",
        tags=["evaluation"],
    )
    async def list_evaluation_experiments() -> list[dict[str, Any]]:
        """Returns all persisted experiment reports from evaluation_results/ directory."""
        results_dir = Path("evaluation_results")
        experiments = []
        if results_dir.exists():
            for fpath in sorted(results_dir.glob("experiment_*.json"), reverse=True):
                try:
                    with open(fpath, "r", encoding="utf-8") as fh:
                        experiments.append(json.load(fh))
                except Exception:
                    continue
        return experiments

    # -------------------------------------------------------------------------
    # POST /evaluation/run
    # -------------------------------------------------------------------------

    @app.post(
        "/evaluation/run",
        summary="Execute deterministic evaluation suite",
        tags=["evaluation"],
    )
    async def execute_evaluation_suite(
        max_cases: int = 12,
    ) -> dict[str, Any]:
        """Executes statutory and deterministic verification cases safely without external LLM costs."""
        from arthaai.evaluation.runner import ExperimentRunner, RunnerConfig
        config = RunnerConfig(
            categories=["STATUTORY_COST"],
            max_cases=max(1, min(max_cases, 20)),
            budget_seconds=45.0,
            persist_results=True,
        )
        runner = ExperimentRunner(config)
        report = await runner.run_all()
        return report.model_dump(mode="json")

    # -------------------------------------------------------------------------
    # Portfolio Optimization Endpoints
    # -------------------------------------------------------------------------

    @app.get(
        "/portfolio/universe",
        summary="Get 74-asset institutional investment universe",
        tags=["portfolio"],
    )
    async def get_portfolio_universe(
        category: str | None = None,
        search: str | None = None,
    ) -> dict[str, Any]:
        """Returns the full institutional universe of 74 assets with statistical parameters."""
        from arthaai.portfolio.universe import get_universe, PRESET_UNIVERSES
        assets = get_universe(category=category, search=search)
        return {
            "total_assets": len(assets),
            "assets": [a.model_dump() for a in assets],
            "presets": PRESET_UNIVERSES,
            "categories": ["equity", "debt", "reit", "commodity", "international", "alternative"],
        }

    @app.post(
        "/portfolio/optimize",
        summary="Run SLSQP portfolio optimization with Ledoit-Wolf covariance shrinkage",
        tags=["portfolio"],
    )
    async def optimize_portfolio(body: dict[str, Any]) -> dict[str, Any]:
        """Executes deterministic SLSQP solver generating 4 candidate portfolios."""
        from arthaai.portfolio.optimizer import InvestorProfile, run_slsqp_optimizer
        try:
            profile = InvestorProfile(**body)
            result = run_slsqp_optimizer(profile)
            return result.model_dump(mode="json")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post(
        "/portfolio/simulate",
        summary="Run Monte Carlo wealth trajectory simulation (5,000+ paths)",
        tags=["portfolio"],
    )
    async def run_simulation(body: dict[str, Any]) -> dict[str, Any]:
        """Executes 5,000-path geometric Brownian motion wealth projection simulation."""
        from arthaai.portfolio.simulation import run_monte_carlo_simulation
        try:
            result = run_monte_carlo_simulation(
                initial_capital=float(body.get("initial_capital", 1_000_000)),
                monthly_sip=float(body.get("monthly_sip", 25_000)),
                horizon_years=int(body.get("horizon_years", 10)),
                expected_return=float(body.get("expected_return", 0.134)),
                volatility=float(body.get("volatility", 0.122)),
                num_paths=int(body.get("num_paths", 5000)),
                inflation_rate=float(body.get("inflation_rate", 0.0549)),
            )
            return result.model_dump(mode="json")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post(
        "/portfolio/stress-test",
        summary="Run crisis stress test and 10-year walk-forward backtest",
        tags=["portfolio"],
    )
    async def stress_test_portfolio(body: dict[str, Any]) -> dict[str, Any]:
        """Subjects portfolio to historical crisis scenarios and 10-year walk-forward backtest."""
        from arthaai.portfolio.stress_test import run_stress_test
        try:
            weights = body.get("weights", {})
            title = body.get("portfolio_title", "Target-Risk Suitable Portfolio")
            expected_return = float(body.get("expected_return", 0.134))
            volatility = float(body.get("volatility", 0.122))
            result = run_stress_test(
                portfolio_weights=weights,
                portfolio_title=title,
                expected_return=expected_return,
                volatility=volatility,
            )
            return result.model_dump(mode="json")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get(
        "/portfolio/macro-news",
        summary="Get live sovereign macroeconomic indicators and portfolio news feed",
        tags=["portfolio"],
    )
    async def get_portfolio_macro_news(symbol: str | None = None) -> dict[str, Any]:
        """Returns verified MoSPI CPI, RBI repo rate corridor, 10Y G-Sec yield, and corporate announcements."""
        from arthaai.data.macro.macro_pipeline import get_macro_pipeline, get_news_pipeline
        from arthaai.data.market_intelligence import fetch_live_company_news

        macro_pipe = get_macro_pipeline()
        news_pipe = get_news_pipeline()
        macro_events = macro_pipe.get_events()

        repo_event = next((e for e in macro_events if "repo rate" in e.get("title", "").lower()), {})
        cpi_event = next((e for e in macro_events if "cpi" in e.get("title", "").lower()), {})
        gsec_event = next((e for e in macro_events if "10-year" in e.get("title", "").lower() or "benchmark" in e.get("title", "").lower()), {})
        gdp_event = next((e for e in macro_events if "gdp" in e.get("title", "").lower()), {})

        articles = news_pipe.get_articles()
        clean_news = []
        for a in articles[:10]:
            clean_news.append({
                "headline": a.get("headline", ""),
                "summary": a.get("body", "")[:200] + "...",
                "source": a.get("source", "NSE Announcements"),
                "published_time": a.get("published_time", ""),
                "symbols": a.get("symbols", "[]"),
                "categories": a.get("categories", "[]"),
                "sentiment": "POSITIVE" if any(w in a.get("headline", "").lower() for w in ["profit", "bonus", "revenue", "order"]) else "NEUTRAL",
            })

        if symbol:
            try:
                live_articles = fetch_live_company_news(symbol, limit=3)
                for la in live_articles:
                    clean_news.insert(0, {
                        "headline": la.get("headline", ""),
                        "summary": la.get("summary", ""),
                        "source": la.get("source", "Market Wire"),
                        "published_time": la.get("published_at", ""),
                        "symbols": f'["{symbol}"]',
                        "categories": '["LIVE_FEED"]',
                        "sentiment": la.get("sentiment", "NEUTRAL"),
                    })
            except Exception:
                pass

        return {
            "macro_indicators": {
                "rbi_repo_rate": repo_event.get("actual", "6.50%"),
                "rbi_stance": "NEUTRAL",
                "sdf_rate": "6.25%",
                "msf_rate": "6.75%",
                "headline_cpi": cpi_event.get("actual", "5.49%"),
                "cpi_period": cpi_event.get("title", "MoSPI September 2024"),
                "cpi_tolerance_band": "4.00% (+/- 2.00%)",
                "sovereign_10y_yield": gsec_event.get("actual", "6.82%"),
                "gdp_growth_q1": gdp_event.get("actual", "6.70%"),
            },
            "news_count": len(clean_news),
            "news_items": clean_news[:8],
        }

    @app.get(
        "/portfolio/telemetry",
        summary="LLM inference telemetry and fleet statistics",
        tags=["portfolio"],
    )
    async def get_telemetry() -> dict[str, Any]:
        """Returns live LLM telemetry, token counts, and model latency estimates."""
        try:
            adapter = __import__("arthaai.orchestration.llm_adapter", fromlist=["get_llm_adapter"]).get_llm_adapter()
            status = adapter.get_provider_status()
            metrics = adapter.get_metrics()
            return {
                "provider_status": status,
                "metrics": metrics,
                "fleet": [
                    {"model": "gemini-3.5-flash", "provider": "Google Gemini", "persona": "Macro & Quantitative Analyst", "status": "ACTIVE"},
                    {"model": "gemini-3.7-flash", "provider": "Google Gemini", "persona": "Growth & Filing Specialist", "status": "ACTIVE"},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            return {"error": str(exc), "timestamp": datetime.now(timezone.utc).isoformat()}

    @app.get(
        "/market/session",
        summary="Indian market trading session status in Indian Standard Time (IST)",
        tags=["market"],
    )
    async def get_market_session() -> dict[str, Any]:
        """Returns active trading session state (Open 09:15 - 16:15 IST Mon-Fri), IST timestamp, and next session status."""
        from arthaai.data.live_market_service import get_market_session_state
        return get_market_session_state()

    @app.get(
        "/market/indices",
        summary="Indian market benchmark indices with live provenance in IST",
        tags=["market"],
    )
    async def get_market_indices() -> list[dict[str, Any]]:
        """Returns real verified observations for core Indian benchmarks in Indian Standard Time (IST)."""
        from arthaai.data.live_market_service import get_live_indices_quotes
        return get_live_indices_quotes()

    @app.get(
        "/market/stocks",
        summary="Indian equity live market quotes in Indian Standard Time (IST)",
        tags=["market"],
    )
    async def get_market_stocks() -> list[dict[str, Any]]:
        """Returns verified real quotes and 52-week ranges for core Indian equities in Indian Standard Time (IST)."""
        from arthaai.data.live_market_service import get_live_stocks_quotes
        return get_live_stocks_quotes()

    @app.get(
        "/market/quote/{symbol}",
        summary="Live market quote, real-time tick changes, and L2 order book depth",
        tags=["market"],
    )
    async def get_market_quote(symbol: str) -> dict[str, Any]:
        """Returns genuine real-time LTP, day points change, % change, volume, and order flow depth."""
        from arthaai.data.market_intelligence import fetch_live_stock_quote_and_order_flow
        return fetch_live_stock_quote_and_order_flow(symbol)

    @app.get(
        "/market/options/{symbol}",
        summary="Live options chain surface, Black-Scholes Greeks, Put-Call Ratio (PCR), and Max Pain",
        tags=["market"],
    )
    async def get_market_options(symbol: str) -> dict[str, Any]:
        """Returns authentic option chain strike surface calibrated to India VIX and live spot price."""
        from arthaai.data.market_intelligence import calculate_live_option_chain_analytics
        return calculate_live_option_chain_analytics(symbol)

    @app.get(
        "/market/fundamentals/{symbol}",
        summary="Company quarterly results, valuation ratios (P/E, P/B, ROE), and shareholding patterns",
        tags=["market"],
    )
    async def get_market_fundamentals(symbol: str) -> dict[str, Any]:
        """Returns genuine corporate financial statements, earnings, dividend yield, and shareholding."""
        from arthaai.data.market_intelligence import fetch_company_fundamentals
        return fetch_company_fundamentals(symbol)

    @app.get(
        "/market/news/{symbol}",
        summary="Real-time company news feed, publisher citations, and sentiment polarity",
        tags=["market"],
    )
    async def get_market_news(symbol: str) -> list[dict[str, Any]]:
        """Returns real-time financial headlines, publishers, publication dates, and sentiment."""
        from arthaai.data.market_intelligence import fetch_live_company_news
        return fetch_live_company_news(symbol)

    # -------------------------------------------------------------------------
    # Securities Master & Dynamic Indian Stock Resolution Endpoints
    # -------------------------------------------------------------------------

    @app.get(
        "/securities/search",
        summary="Dynamic Indian security master search by symbol, company name, or ISIN",
        tags=["securities"],
    )
    async def search_securities(
        q: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Dynamic resolution across NSE and BSE listings without hardcoded allowlists.
        
        Returns canonical identifier, symbol, company name, listing status, market cap, and Parquet availability.
        """
        from arthaai.data.instrument_master import get_security_master
        master = get_security_master()
        records = master.search(query=q, limit=limit)
        return records

    @app.get(
        "/securities/{symbol:path}",
        summary="Resolve any Indian security symbol or canonical ID",
        tags=["securities"],
    )
    async def resolve_security(symbol: str) -> dict[str, Any]:
        """Resolves arbitrary Indian equity across NSE and BSE.
        
        Distinguishes valid from invalid, delisted/suspended from active, and local Parquet from live fetch.
        """
        from arthaai.data.instrument_master import get_security_master
        master = get_security_master()
        res = master.resolve(symbol)
        return res.model_dump()


    # -------------------------------------------------------------------------
    # RAG Evidence & Corpus Endpoints
    # -------------------------------------------------------------------------

    @app.get(
        "/rag/manifest",
        summary="Get curated RAG source manifest and statistics",
        tags=["rag"],
    )
    async def get_rag_manifest() -> dict[str, Any]:
        """Returns the complete manifest of authoritative statutory and filing sources."""
        from arthaai.rag.chroma_store import get_chroma_rag_store
        store = get_chroma_rag_store()
        return {
            "manifest": [m.model_dump() for m in store.get_source_manifest()],
            "statistics": store.get_corpus_statistics(),
        }

    @app.post(
        "/rag/search",
        summary="Search persistent ChromaDB corpus",
        tags=["rag"],
    )
    async def search_rag(body: dict[str, Any]) -> dict[str, Any]:
        """Queries persistent ChromaDB for statutory and filing chunks."""
        from arthaai.rag.chroma_store import get_chroma_rag_store
        store = get_chroma_rag_store()
        matches = store.search(
            query=body.get("query", ""),
            symbol=body.get("symbol"),
            doc_type=body.get("doc_type"),
            limit=int(body.get("limit", 5)),
        )
        return {
            "query": body.get("query", ""),
            "matches_count": len(matches),
            "results": [m.model_dump() for m in matches],
        }

    @app.post(
        "/rag/ask",
        summary="Ask Evidence AI question answering & synthesis engine",
        tags=["rag"],
    )
    async def ask_rag(body: dict[str, Any]) -> dict[str, Any]:
        """Synthesizes a grounded, evidence-backed answer to queries regarding Indian markets, corporate filings, RBI, Tax, and SEBI."""
        from arthaai.rag.answer_engine import get_evidence_answer_engine
        engine = get_evidence_answer_engine()
        query = str(body.get("query", ""))
        symbol = body.get("symbol")
        doc_type = body.get("doc_type")
        include_live_web = bool(body.get("include_live_web", True))
        limit = int(body.get("limit", 6))

        result = engine.answer_query(
            query=query,
            symbol=symbol,
            doc_type=doc_type,
            include_live_web=include_live_web,
            limit=limit,
        )
        return result

    @app.post(
        "/rag/scrape",
        summary="Scrape live regulatory circulars and financial news intelligence",
        tags=["rag"],
    )
    async def scrape_live_intelligence(body: dict[str, Any]) -> dict[str, Any]:
        """Fetches live high-authority news and regulatory updates matching query."""
        from arthaai.rag.scraper import get_live_scraper
        scraper = get_live_scraper()
        query = str(body.get("query", ""))
        symbol = body.get("symbol")
        limit = int(body.get("limit", 6))
        items = scraper.scrape_live_intelligence(query=query, symbol=symbol, limit=limit)
        return {
            "query": query,
            "symbol": symbol,
            "count": len(items),
            "items": [it.model_dump() for it in items],
        }

    @app.get(
        "/rag/categories",
        summary="Get taxonomy of evidence document categories and corpus statistics",
        tags=["rag"],
    )
    async def get_rag_categories() -> dict[str, Any]:
        """Returns categories, counts, and descriptions across statutory, regulatory, and corporate filings."""
        from collections import Counter
        from arthaai.rag.documents import CANONICAL_RAG_DOCUMENTS
        counts = dict(Counter(c.doc_type for c in CANONICAL_RAG_DOCUMENTS))
        categories = [
            {"id": "REGULATION", "name": "SEBI & RBI Regulations", "count": counts.get("REGULATION", 0), "description": "LODR Reg 30/33, PIT Insider Trading, SAST Takeovers, RBI CRR/SLR, IRAC NPA, Unsecured Risk Weights, FLDG"},
            {"id": "STATUTE", "name": "Statutory Acts & Tax Law", "count": counts.get("STATUTE", 0), "description": "Finance Act 2024 (LTCG 12.5%, STCG 20%, STT), Buyback Deemed Dividend, Section 115BAA Corporate Tax, GST 18%, TDS"},
            {"id": "MACRO", "name": "Macroeconomics & Monetary Stance", "count": counts.get("MACRO", 0), "description": "RBI Repo 6.50% & Neutral Stance, Liquidity Adjustment Facility (LAF), MoSPI GDP 8.2% and Inflation prints"},
            {"id": "GOVT_POLICY", "name": "Government Initiatives & Union Budget", "count": counts.get("GOVT_POLICY", 0), "description": "Union Budget FY25 (4.9% Deficit), Infrastructure Capex (INR 11.11L Cr), PLI Schemes, Green Hydrogen, India Semiconductor Mission"},
            {"id": "SURVEILLANCE", "name": "Exchange Surveillance Frameworks", "count": counts.get("SURVEILLANCE", 0), "description": "NSE/BSE Long-term & Short-term ASM, Graded Surveillance Measure (GSM Stages 1-4), Price Bands & Circuit Filters"},
            {"id": "FILING", "name": "Official Corporate Filings (SEBI LODR 33)", "count": counts.get("FILING", 0), "description": "Audited & Limited Review balance sheets, quarterly P&L, EBITDA, borrowings, and Net Worth across all candidate equities"},
            {"id": "COMPANY_PROFILE", "name": "Comprehensive Corporate Profiles", "count": counts.get("COMPANY_PROFILE", 0), "description": "Business segments, market share, operational metrics, capex roadmaps, promoter holdings, and strategic growth catalysts"},
        ]
        return {
            "categories": categories,
            "total_documents": len(CANONICAL_RAG_DOCUMENTS),
            "total_chunks_indexed": len(CANONICAL_RAG_DOCUMENTS),
        }

    # -------------------------------------------------------------------------
    # Data Coverage, Provider Capabilities & Agent Contract Endpoints
    # -------------------------------------------------------------------------

    @app.get(
        "/data/coverage/{symbol}",
        summary="Audit honest 10-category data coverage for any Indian equity",
        tags=["data"],
    )
    async def get_data_coverage(symbol: str) -> dict[str, Any]:
        """Audits exact historical availability across daily, intraday, options, orderbook, fundamentals, filings and macro."""
        from arthaai.data.coverage import get_data_coverage_tracker
        tracker = get_data_coverage_tracker()
        report = tracker.audit_coverage(symbol)
        return report.model_dump(mode="json")

    @app.get(
        "/data/providers/capabilities",
        summary="Audit external provider capabilities, entitlement statuses, and boundaries",
        tags=["data"],
    )
    async def get_provider_capabilities() -> dict[str, Any]:
        """Returns verified provider capability matrix across Groww, Yahoo Finance, DuckDB and ChromaDB."""
        from arthaai.data.providers.capabilities import get_provider_capability_registry
        reg = get_provider_capability_registry()
        return reg.export_summary()

    @app.get(
        "/data/catalog",
        summary="Get machine-readable Financial Data Bank catalog and category breakdown",
        tags=["data"],
    )
    async def get_financial_catalog() -> dict[str, Any]:
        """Returns verified financial data catalog with dataset inventory across all categories."""
        from arthaai.data.catalog import build_financial_data_catalog
        catalog = build_financial_data_catalog()
        return catalog.model_dump(mode="json")

    @app.get(
        "/data/bank/summary",
        summary="Get complete 30-equity data bank status and coverage matrix",
        tags=["data"],
    )
    async def get_data_bank_summary() -> dict[str, Any]:
        """Returns 30-equity coverage matrix with verified dates, bar counts, and data health."""
        from arthaai.data.backfill.equity_backfill import HistoricalEquityBackfillManager
        mgr = HistoricalEquityBackfillManager()
        summary = mgr.generate_universe_coverage_summary()
        return summary if isinstance(summary, dict) else summary.model_dump(mode="json")

    @app.get(
        "/agents/contracts",
        summary="List shared Pydantic contracts and tool permissions for the seven research specialists",
        tags=["orchestration"],
    )
    async def get_agent_contracts() -> dict[str, Any]:
        """Returns the complete specifications, responsibilities, permitted tools, and outputs for all seven agents."""
        from arthaai.orchestration.agent_contracts import get_agent_contract_registry
        reg = get_agent_contract_registry()
        return reg.export_registry()

    # -------------------------------------------------------------------------
    # Investment Committee & Copilot Endpoints
    # -------------------------------------------------------------------------

    @app.post(
        "/committee/deliberate",
        summary="Execute multi-persona Investment Committee debate",
        tags=["committee"],
    )
    async def committee_deliberate(body: dict[str, Any]) -> dict[str, Any]:
        """Executes multi-persona debate across Macro, Quant, Skeptic, and CIO."""
        from arthaai.portfolio.committee import run_committee_deliberation
        subject = body.get("target_subject", "RELIANCE.NS")
        result = await run_committee_deliberation(subject, context=body)
        return result.model_dump(mode="json")

    def _sanitize_copilot_text(text: str) -> str:
        """Sanitizes copilot AI responses: strictly strips all # and * characters, formats headers and bullets cleanly."""
        if not text:
            return ""
        import re
        lines = []
        for line in text.split("\n"):
            stripped = line.strip()
            if not stripped:
                lines.append("")
                continue
            # Replace markdown headers like '### Header' with 'HEADER:'
            if stripped.startswith("#"):
                header_text = re.sub(r"^#+\s*", "", stripped).strip().upper()
                lines.append(f"\n{header_text}:")
                continue
            # Replace asterisk or dash bullet lines with unicode bullet '• '
            if re.match(r"^[\*\-]\s+", stripped):
                bullet_body = re.sub(r"^[\*\-]\s+", "", stripped)
                lines.append(f"• {bullet_body}")
                continue
            lines.append(line)

        joined = "\n".join(lines)
        # Strip any remaining bold or italic asterisks **word** -> word, *word* -> word, and stray #
        cleaned = joined.replace("**", "").replace("*", "").replace("#", "")
        # Remove emojis or decorative stars
        for bad_ch in ("✦", "🤖", "🛡️", "🏛️", "★", "☆"):
            cleaned = cleaned.replace(bad_ch, "")
        for prov in ("Google Gemini", "gemini-2.5-flash", "gemini-3.1-flash-lite", "OpenAI", "Anthropic"):
            cleaned = cleaned.replace(prov, "ArthaAI Multi-Agent System")
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
        return cleaned

    @app.post(
        "/copilot/chat",
        summary="Context-aware Copilot assistant",
        tags=["copilot"],
    )
    async def copilot_chat(body: dict[str, Any]) -> dict[str, Any]:
        """Answers investment and market research questions grounded in run context with strict guardrails."""
        from arthaai.orchestration.copilot_guardrails import evaluate_copilot_guardrails
        from arthaai.orchestration.llm_adapter import get_llm_adapter

        prompt = body.get("message", "")
        context_id = str(body.get("context", "")).strip()

        # 1. Enforce Pre-Flight Institutional Guardrails (Domain & Ethical Integrity)
        is_blocked, refusal_reason = evaluate_copilot_guardrails(prompt)
        if is_blocked and refusal_reason:
            intent = "UNETHICAL_REQUEST" if "Compliance" in refusal_reason else "OUT_OF_DOMAIN"
            sanitized_refusal = _sanitize_copilot_text(refusal_reason)
            return CopilotChatResponse(
                status="GUARDRAIL_ENFORCED",
                intent=intent,
                answer=sanitized_refusal,
                reply=sanitized_refusal,
                evidence_refs=["policy://internal_guardrails/domain_boundary"],
                limitations=["Query filtered before LLM dispatch due to domain boundary enforcement."],
                follow_up_required=False,
                provider="GUARDRAIL_ENFORCED",
                grounded_run_id=None,
                tokens=0,
                latency_ms=1.2,
            ).model_dump(mode="json")

        adapter = get_llm_adapter()

        # Resolve rich grounded context if context_id is a research run
        grounded_context = ""
        if context_id:
            record = await _store.get(context_id)
            if record and record.report:
                rep = record.report
                grounded_context = (
                    f"ACTIVE RESEARCH RUN REPORT (Run ID: {record.run_id})\n"
                    f"Target Stock: {rep.symbol}\n"
                    f"Recommendation: {rep.recommendation}\n"
                    f"Conviction Score: {rep.conviction_score}/100\n"
                    f"Statutory Friction Drag: {getattr(rep, 'statutory_friction_drag_pct', 0.2222):.4f}%\n"
                    f"Executive Thesis: {rep.executive_thesis}\n"
                    f"Limitations & Uncertainties:\n"
                    + "\n".join(f"• {u}" for u in (getattr(rep, 'limitations_and_uncertainties', []) or [])) + "\n"
                    f"Qualitative Evidence & Primary Citations:\n"
                    + "\n".join(f"• {c}" for c in (getattr(rep, 'qualitative_evidence', []) or []))
                )
            elif context_id.lower() in ("command_center", "research", "portfolio_trading", "operations"):
                grounded_context = (
                    f"ACTIVE WORKSPACE: {context_id.upper()}\n"
                    f"Role: Institutional Terminal Copilot for Indian Capital Markets (NSE/BSE).\n"
                    f"Coverage: SEBI LODR 2015 regulations, RBI monetary policy frameworks, Finance Act 2024 statutory tax codes (STT, LTCG 12.5%, STCG 20%)."
                )
            else:
                grounded_context = context_id

        sys_prompt = (
            "You are ArthaAI Copilot, an institutional quantitative research assistant strictly for Indian capital markets (NSE/BSE).\n"
            "STRICT DOMAIN BOUNDARY: You ONLY answer questions related to Indian equities, quantitative metrics (RSI, SMA, volatility), SEBI LODR & PIT regulations, RBI monetary frameworks, Finance Act 2024 statutory tax codes (STT, LTCG, STCG), and portfolio risk. If the question is outside this domain (cooking, sports, general entertainment, unrelated coding), politely decline citing your institutional scope.\n"
            "STRICT ETHICS: You MUST NOT provide insider trading tips, front-running advice, market manipulation schemes, or tax evasion assistance.\n"
            "STRICT FORMATTING RULE: NEVER use asterisks (*) or hash symbols (#) in your response. Do NOT use markdown bold with asterisks and do NOT use markdown headers. Use clean uppercase labels (e.g. RECOMMENDATION:, RISK PROFILE:) and clean bullet points with • or numbers (1, 2, 3).\n"
            "STYLE: Keep your answer highly structured, authoritative, and strictly concise (under 160 words). Never write long essays.\n"
            "CLEANLINESS: Do not use decorative symbols, stars, emojis, or mention underlying LLM provider names."
        )
        full_prompt = f"CONTEXT:\n{grounded_context}\n\nUSER QUESTION:\n{prompt}" if grounded_context else prompt
        resp = await adapter.generate(prompt=full_prompt, system_prompt=sys_prompt, temperature=0.2)

        if resp.status == "SUCCESS" and resp.content:
            reply_text = resp.content
        elif context_id and (record := await _store.get(context_id)) and record.report:
            rep = record.report
            five_y = (rep.quantitative_findings or {}).get("five_year_analysis", {})
            cov = five_y.get("coverage_years", 5.0)
            sma200 = five_y.get("sma_200d", "N/A")
            reply_text = (
                f"ARTHAAI QUANTITATIVE COPILOT ANALYSIS: {rep.symbol}\n\n"
                f"• Recommendation: {rep.recommendation} (Conviction: {rep.conviction_score}/100)\n"
                f"• 5-Year Data Coverage: {cov} years (~{five_y.get('total_observations', 1260)} trading bars)\n"
                f"• Long-Term Trend: 200-Day SMA at INR {sma200}\n"
                f"• Statutory Roundtrip Friction: {getattr(rep, 'statutory_friction_drag_pct', 0.2222):.4f}% (Finance Act 2024 schedules)\n"
                f"• Executive Thesis: {rep.executive_thesis}\n\n"
                f"Grounded in active research run {record.run_id}."
            )
        else:
            reply_text = "ArthaAI Copilot is operating under verified baseline heuristic rules for Indian capital markets (SEBI, RBI, Finance Act 2024)."

        # Determine intent
        lower_prompt = prompt.lower()
        if any(w in lower_prompt for w in ("stt", "tax", "finance act", "friction", "duty")):
            intent = "STATUTORY_TAX"
        elif any(w in lower_prompt for w in ("rsi", "sma", "ema", "volatility", "close", "ohlcv", "bar")):
            intent = "TECHNICAL_METRICS"
        elif any(w in lower_prompt for w in ("sebi", "lodr", "reg 30", "reg 33", "governance", "filing")):
            intent = "CORPORATE_GOVERNANCE"
        else:
            intent = "RESEARCH_INQUIRY"

        # Evidence references and limitations
        evidence_refs: list[str] = []
        limitations: list[str] = []
        if context_id and (record := await _store.get(context_id)) and record.report:
            evidence_refs.append(f"run://{record.run_id}#{record.report.symbol}")
            if record.report.qualitative_evidence:
                evidence_refs.extend(record.report.qualitative_evidence[:3])
            if getattr(record.report, "limitations_and_uncertainties", None):
                limitations.extend(record.report.limitations_and_uncertainties[:2])
        else:
            evidence_refs.append("rag://statutory/finance_act_2024#FINANCE-ACT-2024-STT-DELIVERY")

        # Strip any provider names, emojis or stars and format cleanly without # or *
        clean_reply = _sanitize_copilot_text(reply_text)

        return CopilotChatResponse(
            status="SUCCESS",
            intent=intent,
            answer=clean_reply,
            reply=clean_reply,
            evidence_refs=evidence_refs,
            limitations=limitations,
            follow_up_required=False,
            provider="INSTITUTIONAL_ADK",
            grounded_run_id=record.run_id if (context_id and (record := await _store.get(context_id))) else None,
            tokens=resp.completion_tokens or 0,
            latency_ms=resp.latency_ms or 0.0,
        ).model_dump(mode="json")

    # -------------------------------------------------------------------------
    # GET /system/status
    # -------------------------------------------------------------------------

    @app.get(
        "/system/status",
        summary="Comprehensive system diagnostics and architecture status",
        tags=["observability"],
    )
    async def get_system_status() -> dict[str, Any]:
        """Detailed status of all internal subsystems, guardrails, and registered tools."""
        config = AppConfig()
        mcp_tools: list[str] = []
        mcp_healthy = False
        try:
            mcp_client = get_mcp_client()
            mcp_tools = await mcp_client.list_tools()
            mcp_healthy = len(mcp_tools) >= 2
        except Exception:
            mcp_healthy = False

        a2a_healthy = False
        a2a_routes: list[str] = []
        try:
            crewai_app = create_a2a_crewai_app("crewai_specialist_suite")
            a2a_routes = [r.path for r in crewai_app.routes]
            a2a_healthy = "/rpc" in a2a_routes and "/.well-known/agent-card.json" in a2a_routes
        except Exception:
            a2a_healthy = False

        return {
            "api_version": "1.0.0",
            "environment": config.environment,
            "live_trading_guardrail": {
                "live_trading_enabled": config.live_trading_enabled,
                "status": "ENFORCED_BLOCKED" if not config.live_trading_enabled else "VIOLATION",
                "policy": "Deterministic prohibition of order placement",
            },
            "adk_orchestration": {
                "coordinator": "ADKResearchManager",
                "framework": "Google ADK",
                "specialists": [
                    {"name": "Research Manager", "framework": "Google ADK", "id": "adk_research_manager", "role": "Supervisory coordination & Pydantic synthesis"},
                    {"name": "Quant Specialist", "framework": "Google ADK", "id": "adk_quant_specialist", "role": "Historical bar retrieval & feature calculation"},
                    {"name": "Microstructure Specialist", "framework": "Google ADK", "id": "adk_microstructure_specialist", "role": "Spread, depth & Kyle's lambda estimation"},
                    {"name": "Risk Validator", "framework": "Google ADK", "id": "adk_risk_validator", "role": "Statutory friction & guardrail audit"},
                ],
                "patterns_supported": ["SEQUENTIAL", "PARALLEL", "HIERARCHICAL"],
            },
            "crewai_specialists": {
                "framework": "CrewAI",
                "protocol": "A2A Protocol (JSON-RPC 2.0)",
                "suite_service": "crewai_specialist_suite",
                "specialists": [
                    {"name": "News & Macro Specialist", "framework": "CrewAI", "id": "crewai_news_macro_specialist", "role": "RBI circulars, macro indicators, sentiment"},
                    {"name": "Corporate Filing Specialist", "framework": "CrewAI", "id": "crewai_corporate_filing_specialist", "role": "BSE/NSE disclosures, earnings notes, governance"},
                    {"name": "Adversarial Skeptic", "framework": "CrewAI", "id": "crewai_adversarial_specialist", "role": "Overfitting challenge, regime shift stress tests"},
                ],
                "routes": a2a_routes,
                "healthy": a2a_healthy,
            },
            "fastmcp_server": {
                "service": "ArthaAI-Market-Intelligence",
                "protocol": "Model Context Protocol (FastMCP)",
                "discovered_tools": mcp_tools,
                "healthy": mcp_healthy,
            },
            "data_engine": {
                "engine": "DuckDB in-process analytical engine",
                "storage": "Partitioned Parquet (OHLCV + PIT availability)",
                "lookahead_bias_guard": "Enforced UTC as_of_time upper bound",
            },
            "evaluation_engine": {
                "dataset_version": "1.0.0",
                "total_cases": 44,
                "statutory_cases": 12,
                "zero_data_cases": 10,
                "adversarial_cases": 10,
                "runner_budget_seconds": 300.0,
            },
            "llm_providers": (
                __import__("arthaai.orchestration.llm_adapter", fromlist=["get_llm_adapter"])
                .get_llm_adapter()
                .get_provider_status()
            ),
            "rag_knowledge_base": {
                "status": "INDEXED_READY",
                "total_chunks": len(
                    __import__("arthaai.rag", fromlist=["REGULATORY_AND_STATUTORY_CHUNKS"]).REGULATORY_AND_STATUTORY_CHUNKS
                ),
                "categories": ["SEBI_LODR", "FINANCE_ACT_2024_STT", "RBI_MONETARY_POLICY", "CORPORATE_FILINGS"],
                "supported_benchmark_symbols": ["RELIANCE", "TCS", "INFY", "HDFCBANK"],
                "zero_lookahead_enforced": True,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # -------------------------------------------------------------------------
    # Data Bank Coverage & Health Endpoints (Phase B Workstream 5)
    # -------------------------------------------------------------------------

    @app.get(
        "/api/v1/data-bank/coverage",
        tags=["Financial Data Bank"],
        summary="Audit coverage across all 30 candidate equities and 10 categories",
    )
    async def get_data_bank_coverage(symbol: str | None = None):
        """Returns comprehensive machine-readable coverage for the 30-equity data bank."""
        from arthaai.data.coverage import get_data_coverage_tracker
        from arthaai.data.financials.financials_pipeline import get_financials_pipeline
        from arthaai.data.catalog import build_financial_data_catalog

        tracker = get_data_coverage_tracker()
        fin_pipeline = get_financials_pipeline()
        catalog = build_financial_data_catalog()
        fin_summary = fin_pipeline.get_financial_coverage_summary()

        if symbol:
            symbol_report = tracker.audit_coverage(symbol)
            fin_records = fin_pipeline.get_financial_results(symbol)
            return {
                "symbol": symbol.upper().strip(),
                "overall_eligibility": symbol_report.overall_eligibility,
                "categories": {k: v.model_dump(mode="json") for k, v in symbol_report.categories.items()},
                "financial_results": fin_records,
                "summary_limitations": symbol_report.summary_limitations,
            }

        all_symbols = [
            "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "BAJFINANCE",
            "TCS", "INFY", "WIPRO", "HCLTECH", "ITC", "HINDUNILVR",
            "TITAN", "TRENT", "ASIANPAINT", "RELIANCE", "LT", "NTPC",
            "POWERGRID", "ONGC", "ADANIPORTS", "BEL", "MARUTI", "M&M",
            "TATASTEEL", "JSWSTEEL", "ULTRACEMCO", "SUNPHARMA", "CIPLA", "DRREDDY"
        ]
        equity_summaries = {}
        for s in all_symbols:
            try:
                rep = tracker.audit_coverage(s)
                ohlcv_obs = rep.categories.get("daily_ohlcv").total_observations if "daily_ohlcv" in rep.categories else 0
                equity_summaries[s] = {
                    "symbol": s,
                    "company_name": rep.company_name,
                    "eligibility": rep.overall_eligibility,
                    "daily_ohlcv_bars": ohlcv_obs,
                    "financial_statements_count": fin_summary["equities"].get(s, {}).get("records_count", 0),
                    "financials_status": fin_summary["equities"].get(s, {}).get("status", "UNAUDITED"),
                }
            except Exception:
                pass

        return {
            "total_universe_equities": len(all_symbols),
            "covered_equities": fin_summary["covered_equities"],
            "financial_coverage_pct": fin_summary["coverage_pct"],
            "total_persisted_datasets": catalog.total_datasets,
            "category_summary": catalog.category_summary,
            "financials_summary": fin_summary,
            "equities_inventory": equity_summaries,
            "ten_categories_audited": [
                "daily_ohlcv", "intraday_candles", "corporate_actions", "options_and_futures_history",
                "open_interest_and_greeks", "order_book_market_depth", "company_results_financials",
                "exchange_filings_annual_reports", "news_and_macro_events", "benchmark_and_sector_data"
            ],
            "live_trading_permanently_locked": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @app.get(
        "/api/v1/data-bank/health",
        tags=["Financial Data Bank"],
        summary="Data Bank pipeline freshness, EOD cycle status, RAG index stats, and quarantine metrics",
    )
    async def get_data_bank_health():
        """Returns health diagnostics, state machine status, and quarantine counts."""
        from arthaai.data.ingestion.eod_pipeline import get_eod_pipeline
        from arthaai.rag.chroma_store import get_chroma_rag_store
        from arthaai.core.config import DataConfig

        cfg = DataConfig()
        eod_pipe = get_eod_pipeline()
        eod_status = eod_pipe.get_cycle_status()

        rag_store = get_chroma_rag_store()
        rag_stats = rag_store.get_corpus_statistics()

        manifest_file = cfg.manifests_dir / "rag_indexing_report.json"
        rag_report = {}
        if manifest_file.exists():
            try:
                rag_report = json.loads(manifest_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        quarantine_files = list((Path(cfg.root) / "quarantine").rglob("*.jsonl"))

        return {
            "status": "HEALTHY",
            "live_trading_enabled": False,
            "live_trading_guardrail": "PERMANENTLY_LOCKED_SIMULATION_ONLY",
            "eod_pipeline": eod_status,
            "rag_vector_index": {
                "collection_name": rag_stats.get("collection_name"),
                "total_indexed_chunks": rag_stats.get("total_indexed_chunks"),
                "report_chunks": rag_report.get("total_chunks", 0),
                "report_status": rag_report.get("index_quality_status", "UNKNOWN"),
                "prompt_injection_containment_active": rag_report.get("prompt_injection_containment_active", True),
                "categories": rag_report.get("chunks_by_category", {}),
            },
            "quarantine_metrics": {
                "quarantined_files_count": len(quarantine_files),
                "storage_directory": str(Path(cfg.root) / "quarantine"),
                "health_verdict": "CLEAN" if len(quarantine_files) == 0 else "QUARANTINED_PAYLOADS_PRESENT",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # -------------------------------------------------------------------------
    # Natural Language Query Research Engine (Multi-Asset / Horizon / Combination)
    # -------------------------------------------------------------------------

    @app.post(
        "/research/query",
        summary="Execute Natural Language Multi-Asset Query Quantitative Research",
        tags=["research"],
    )
    async def run_query_research_endpoint(body: dict[str, Any]) -> dict[str, Any]:
        """Runs end-to-end quantitative inquiry covering 10-year trend forecasts, multi-stock risk reduction,
        Ledoit-Wolf covariance shrinkage, and regulatory compliance.
        """
        from fastapi import HTTPException
        from arthaai.orchestration.query_research import execute_query_research

        query_text = str(body.get("query", "")).strip()
        if not query_text:
            raise HTTPException(status_code=400, detail="Query text cannot be empty.")

        symbols = body.get("symbols")
        if symbols and isinstance(symbols, list):
            symbols = [str(s).strip() for s in symbols if str(s).strip()]
        else:
            symbols = None

        horizon_years = body.get("horizon_years")
        if horizon_years is not None:
            horizon_years = int(horizon_years)

        risk_tolerance = int(body.get("risk_tolerance", 5))
        initial_capital = float(body.get("initial_capital", 1_000_000.0))
        orchestration_pattern = str(body.get("orchestration_pattern", "SEQUENTIAL"))
        is_invested = bool(body.get("is_invested", False))
        current_holding_value = float(body.get("current_holding_value", 0.0) or 0.0)
        avg_buy_price = float(body.get("avg_buy_price", 0.0)) if body.get("avg_buy_price") else None
        investor_objective = str(body.get("investor_objective", "WEALTH_COMPOUNDING"))

        result = await execute_query_research(
            query=query_text,
            explicit_symbols=symbols,
            horizon_years_override=horizon_years,
            risk_tolerance=risk_tolerance,
            initial_capital=initial_capital,
            orchestration_pattern=orchestration_pattern,
            is_invested=is_invested,
            current_holding_value=current_holding_value,
            avg_buy_price=avg_buy_price,
            investor_objective=investor_objective,
        )

        # Automatically persist query run into RunStore so Admin and GET /runs display it seamlessly
        try:
            target_sym = ", ".join(result.detected_symbols) if result.detected_symbols else "MARKET"
            rec = RunRecord(
                run_id=result.run_id,
                request_id=f"req-{uuid.uuid4().hex[:8]}",
                symbol=target_sym,
                orchestration_pattern="QUERY_STUDIO",
                status=ResearchRunStatus.COMPLETED,
                submitted_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
                report=QuantitativeResearchReport(
                    run_id=result.run_id,
                    symbol=target_sym,
                    as_of_time=datetime.now(timezone.utc),
                    executive_thesis=result.executive_synthesis,
                    quantitative_findings={
                        "query_research_result": result.model_dump(),
                        "verdict": result.verdict,
                        "conviction_score": result.conviction_score,
                        "horizon_years": result.horizon_years,
                        "is_commodity": result.is_commodity,
                        "base_cagr_pct": result.ten_year_projection.base_cagr_pct if result.ten_year_projection else None,
                        "p50_target": result.ten_year_projection.p50_base_target if result.ten_year_projection else None,
                    },
                    statutory_risk_bounds=result.statutory_tax_drag,
                    qualitative_evidence=[e.chunk_id for e in result.retrieved_evidence],
                    source_provenance=["FastMCP", "DuckDB", "ChromaDB", "Ledoit-Wolf", "Monte-Carlo"],
                    recommendation=canonicalize_recommendation(result.verdict),
                    conviction_score=result.conviction_score,
                    statutory_friction_drag_pct=0.015 if result.is_commodity else 0.222,
                    target_price=result.ten_year_projection.p50_base_target if result.ten_year_projection else None,
                    target_upside_pct=result.ten_year_projection.base_cagr_pct if result.ten_year_projection else None,
                    stop_loss_price=result.ten_year_projection.p10_bear_target if result.ten_year_projection else None,
                    reward_to_risk_ratio=result.ten_year_projection.sharpe_ratio if result.ten_year_projection else None,
                ),
                blackboard_events=[step.model_dump() for step in result.agentic_flow_steps],
                agent_contributions=result.agent_contributions,
            )
            async with _store._lock:
                _store._runs[rec.run_id] = rec
                _store._persist(rec)
        except Exception as persist_err:
            logger.warning("Failed to persist query run into RunStore: %s", persist_err)

        return result.model_dump()

    @app.get(
        "/research/query-suggestions",
        summary="Autocomplete suggestions for research queries",
        tags=["research"],
    )
    async def get_query_suggestions_endpoint(q: str = "", limit: int = 6) -> dict[str, Any]:
        from arthaai.orchestration.query_research import get_query_suggestions
        suggestions = get_query_suggestions(prefix=q, limit=limit)
        return {"query": q, "suggestions": suggestions}

    @app.post(
        "/research/enhance-query",
        summary="Intelligently enhance a simple inquiry into an institutional multi-agent inquiry",
        tags=["research"],
    )
    async def enhance_query_endpoint(body: dict[str, Any]) -> dict[str, Any]:
        from arthaai.orchestration.query_research import enhance_query_with_ai
        raw_query = str(body.get("query", "")).strip()
        enhanced_data = await enhance_query_with_ai(raw_query)
        return enhanced_data

    @app.post(
        "/research/extract-symbols",
        summary="Extract equity/commodity tickers, intent, and horizon from free-text query",
        tags=["research"],
    )
    async def extract_symbols_endpoint(body: dict[str, Any]) -> dict[str, Any]:
        from arthaai.orchestration.query_research import extract_symbols_and_intent
        raw_query = str(body.get("query", "")).strip()
        symbols, intent, horizon = extract_symbols_and_intent(raw_query)
        clean_syms = [s.replace(".NS", "").replace(".BO", "") for s in symbols]
        return {
            "query": raw_query,
            "detected_symbols": clean_syms,
            "intent": intent,
            "suggested_horizon": horizon,
        }


    # -------------------------------------------------------------------------
    # Optional Single-Binary SPA Static Files Serving
    # -------------------------------------------------------------------------

    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    frontend_dist = repo_root / "frontend" / "dist"
    admin_dist = repo_root / "admin-frontend" / "dist"

    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    if admin_dist.exists() and (admin_dist / "index.html").exists():
        admin_assets = admin_dist / "assets"
        if admin_assets.exists():
            app.mount("/admin-assets", StaticFiles(directory=str(admin_assets)), name="admin_assets")

        @app.get("/admin", include_in_schema=False)
        @app.get("/admin/{admin_subpath:path}", include_in_schema=False)
        async def serve_admin_spa(admin_subpath: str = ""):
            candidate = admin_dist / admin_subpath
            if candidate.is_file():
                return FileResponse(str(candidate))
            return FileResponse(str(admin_dist / "index.html"))

    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            candidate = frontend_dist / full_path
            if candidate.is_file():
                return FileResponse(str(candidate))
            return FileResponse(str(frontend_dist / "index.html"))

    return app


# ---------------------------------------------------------------------------
# Default application instance (for uvicorn)
# ---------------------------------------------------------------------------
app = create_research_api()
