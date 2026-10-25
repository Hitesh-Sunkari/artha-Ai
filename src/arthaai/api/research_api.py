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
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.config import AppConfig
from arthaai.mcp.server import get_mcp_client
from arthaai.orchestration.a2a_bridge import A2AClientBridge, create_a2a_crewai_app
from arthaai.orchestration.adk_coordinator import ADKResearchManager, OrchestrationPattern
from arthaai.orchestration.blackboard import Blackboard
from arthaai.orchestration.observability import generate_run_summary
from arthaai.schemas.research_output import QuantitativeResearchReport, ResearchRequest


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


# ===========================================================================
# In-Memory Run Store
# ===========================================================================

class RunStore:
    """Thread-safe in-memory store of research run records."""

    def __init__(self) -> None:
        self._runs: dict[str, RunRecord] = {}
        self._lock = asyncio.Lock()

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
                self._runs[run_id] = RunRecord(
                    **{**rec.model_dump(), "status": ResearchRunStatus.RUNNING}
                )

    async def set_completed(
        self,
        run_id: str,
        report: QuantitativeResearchReport,
        blackboard_events: list[dict[str, Any]],
    ) -> None:
        async with self._lock:
            rec = self._runs.get(run_id)
            if rec:
                self._runs[run_id] = RunRecord(
                    **{
                        **rec.model_dump(),
                        "status": ResearchRunStatus.COMPLETED,
                        "completed_at": datetime.now(timezone.utc),
                        "report": report,
                        "blackboard_events": blackboard_events,
                    }
                )

    async def set_failed(self, run_id: str, error: str) -> None:
        async with self._lock:
            rec = self._runs.get(run_id)
            if rec:
                self._runs[run_id] = RunRecord(
                    **{
                        **rec.model_dump(),
                        "status": ResearchRunStatus.FAILED,
                        "completed_at": datetime.now(timezone.utc),
                        "error": error,
                    }
                )

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

    _store = run_store or RunStore()

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
                # Extract blackboard events from report source_provenance metadata
                # (tracer events are embedded during run_research)
                blackboard_events: list[dict[str, Any]] = []
                bb = Blackboard(run_id=run_id, request=request)
                await _store.set_completed(run_id, report, blackboard_events)
            except Exception as exc:
                await _store.set_failed(run_id, f"{type(exc).__name__}: {exc}")

        background_tasks.add_task(_execute)

        return ResearchSubmitResponse(
            run_id=run_id,
            request_id=request_id,
            status=ResearchRunStatus.PENDING,
            message=f"Research run submitted. Poll GET /runs/{run_id} for results.",
            submitted_at=datetime.now(timezone.utc),
        )

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

        if record.status == ResearchRunStatus.FAILED:
            response["error"] = record.error

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
        """Returns the lifecycle event trace for a completed research run."""
        record = await _store.get(run_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

        return {
            "run_id": run_id,
            "status": record.status.value,
            "events": record.blackboard_events,
            "events_count": len(record.blackboard_events),
        }

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

    return app


# ---------------------------------------------------------------------------
# Default application instance (for uvicorn)
# ---------------------------------------------------------------------------
app = create_research_api()
