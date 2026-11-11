"""ArthaAI Persistent Evaluation Storage and Data Models.

Dual-persists benchmark experiments, execution records, trace summaries,
human reviews, and failure categorizations to JSON files and an embedded DuckDB database.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RESULTS_DIR = REPO_ROOT / "experiments" / "results"
DUCKDB_PATH = REPO_ROOT / "data" / "evaluation.duckdb"
REVIEWS_FILE = REPO_ROOT / "experiments" / "results" / "human_reviews.json"
FAILURES_FILE = REPO_ROOT / "experiments" / "results" / "failure_records.json"


# ===========================================================================
# Human Review & Failure Models
# ===========================================================================

class HumanReviewRecord(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev-{uuid.uuid4().hex[:8]}")
    execution_id: str
    scenario_id: str
    reviewer: str = "Chief Quantitative Officer"
    verdict_rating: int = Field(ge=1, le=5, default=5)
    factual_accuracy_rating: int = Field(ge=1, le=5, default=5)
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FailureRecord(BaseModel):
    failure_id: str = Field(default_factory=lambda: f"fail-{uuid.uuid4().hex[:8]}")
    execution_id: str
    scenario_id: str
    system_type: str
    category: str  # NUMERICAL_DRIFT | SCHEMA_MISMATCH | TOOL_TIMEOUT | EVIDENCE_GAP | HALLUCINATED_CLAIM | SAFETY_VIOLATION | ROLE_DEVIATION
    root_cause: str
    mitigation_action: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ===========================================================================
# Persistence Repository
# ===========================================================================

class EvaluationRepository:
    """Manages disk persistence and DuckDB analytical queries for benchmark evaluations."""

    def __init__(self):
        RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        DUCKDB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._init_duckdb()

    def _get_duckdb_conn(self):
        import duckdb
        return duckdb.connect(str(DUCKDB_PATH))

    def _init_duckdb(self) -> None:
        try:
            con = self._get_duckdb_conn()
            con.execute("""
                CREATE TABLE IF NOT EXISTS benchmark_experiments (
                    experiment_id VARCHAR PRIMARY KEY,
                    name VARCHAR,
                    dataset_version VARCHAR,
                    status VARCHAR,
                    started_at VARCHAR,
                    completed_at VARCHAR,
                    total_scheduled INTEGER,
                    completed_count INTEGER,
                    failed_count INTEGER,
                    summary_json VARCHAR
                );
            """)
            con.execute("""
                CREATE TABLE IF NOT EXISTS benchmark_executions (
                    execution_id VARCHAR PRIMARY KEY,
                    experiment_id VARCHAR,
                    scenario_id VARCHAR,
                    scenario_name VARCHAR,
                    workflow_type VARCHAR,
                    repetition_index INTEGER,
                    system_type VARCHAR,
                    status VARCHAR,
                    started_at VARCHAR,
                    completed_at VARCHAR,
                    latency_seconds DOUBLE,
                    composite_score DOUBLE,
                    accuracy_score DOUBLE,
                    grounding_score DOUBLE,
                    task_completion_score DOUBLE,
                    consistency_score DOUBLE,
                    reliability_score DOUBLE,
                    traceability_score DOUBLE,
                    failure_category VARCHAR,
                    error_message VARCHAR,
                    output_json VARCHAR
                );
            """)
            con.execute("""
                CREATE TABLE IF NOT EXISTS benchmark_reviews (
                    review_id VARCHAR PRIMARY KEY,
                    execution_id VARCHAR,
                    scenario_id VARCHAR,
                    reviewer VARCHAR,
                    verdict_rating INTEGER,
                    factual_accuracy_rating INTEGER,
                    notes VARCHAR,
                    created_at VARCHAR
                );
            """)
            con.execute("""
                CREATE TABLE IF NOT EXISTS benchmark_failures (
                    failure_id VARCHAR PRIMARY KEY,
                    execution_id VARCHAR,
                    scenario_id VARCHAR,
                    system_type VARCHAR,
                    category VARCHAR,
                    root_cause VARCHAR,
                    mitigation_action VARCHAR,
                    created_at VARCHAR
                );
            """)
            con.close()
        except Exception as e:
            logger.warning("Could not initialize DuckDB tables: %s (JSON storage will be used)", e)

    def save_experiment_report(self, report_data: dict[str, Any]) -> None:
        exp_id = report_data.get("experiment_id", f"exp-{uuid.uuid4().hex[:8]}")
        # 1. JSON file
        json_path = RESULTS_DIR / f"{exp_id}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        # 2. DuckDB insert
        try:
            con = self._get_duckdb_conn()
            con.execute("""
                INSERT OR REPLACE INTO benchmark_experiments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                exp_id,
                report_data.get("name", "ArthaAI Benchmark"),
                report_data.get("dataset_version", "1.0.0"),
                report_data.get("status", "COMPLETED"),
                report_data.get("started_at", ""),
                report_data.get("completed_at", ""),
                report_data.get("total_scheduled", 0),
                report_data.get("completed_count", 0),
                report_data.get("failed_count", 0),
                json.dumps(report_data.get("arthai_summary", {})),
            ])

            for ex in report_data.get("executions", []):
                metrics = ex.get("metrics", {})
                con.execute("""
                    INSERT OR REPLACE INTO benchmark_executions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [
                    ex.get("execution_id", ""),
                    exp_id,
                    ex.get("scenario_id", ""),
                    ex.get("scenario_name", ""),
                    ex.get("workflow_type", ""),
                    ex.get("repetition_index", 1),
                    ex.get("system_type", ""),
                    ex.get("status", "SUCCESS"),
                    ex.get("started_at", ""),
                    ex.get("completed_at", ""),
                    ex.get("latency_seconds", 0.0),
                    metrics.get("composite_quality_index", 0.0),
                    metrics.get("analytical_accuracy", 0.0),
                    metrics.get("evidence_grounding", 0.0),
                    metrics.get("task_completion", 0.0),
                    metrics.get("consistency_stability", 0.0),
                    metrics.get("operational_reliability", 0.0),
                    metrics.get("traceability_provenance", 0.0),
                    ex.get("failure_category"),
                    ex.get("error"),
                    json.dumps(ex.get("output", {})),
                ])
            con.close()
        except Exception as e:
            logger.warning("DuckDB experiment persistence skipped: %s", e)

        # 3. PostgreSQL / Supabase sync if configured
        try:
            from arthaai.core.postgres_sync import persist_benchmark_execution_pg
            for ex in report_data.get("executions", []):
                ex_copy = dict(ex)
                ex_copy["experiment_id"] = exp_id
                persist_benchmark_execution_pg(ex_copy)
        except Exception as pg_err:
            logger.debug(f"[PostgreSQL] Benchmark sync skipped: {pg_err}")

    def list_experiments(self) -> list[dict[str, Any]]:
        results = []
        files = sorted(RESULTS_DIR.glob("exp-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        for f in files:
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    results.append({
                        "experiment_id": data.get("experiment_id"),
                        "name": data.get("name"),
                        "status": data.get("status"),
                        "started_at": data.get("started_at"),
                        "completed_at": data.get("completed_at"),
                        "total_scheduled": data.get("total_scheduled", 0),
                        "completed_count": data.get("completed_count", 0),
                        "arthai_composite": data.get("arthai_summary", {}).get("mean_composite", 0.0),
                        "baseline_composite": data.get("baseline_summary", {}).get("mean_composite", 0.0),
                    })
            except Exception:
                pass
        return results

    def get_experiment(self, experiment_id: str) -> dict[str, Any] | None:
        json_path = RESULTS_DIR / f"{experiment_id}.json"
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error("Error reading experiment file %s: %s", json_path, e)
        return None

    def add_human_review(self, review: HumanReviewRecord) -> None:
        # Save to JSON
        existing_reviews = self.get_all_reviews()
        existing_reviews.append(review.model_dump())
        with open(REVIEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(existing_reviews, f, indent=2)

        # Save to DuckDB
        try:
            con = self._get_duckdb_conn()
            con.execute("""
                INSERT OR REPLACE INTO benchmark_reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                review.review_id,
                review.execution_id,
                review.scenario_id,
                review.reviewer,
                review.verdict_rating,
                review.factual_accuracy_rating,
                review.notes,
                review.created_at,
            ])
            con.close()
        except Exception:
            pass

    def get_all_reviews(self) -> list[dict[str, Any]]:
        if REVIEWS_FILE.exists():
            try:
                with open(REVIEWS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def record_failure(self, failure: FailureRecord) -> None:
        existing = self.get_all_failures()
        existing.append(failure.model_dump())
        with open(FAILURES_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)

        try:
            con = self._get_duckdb_conn()
            con.execute("""
                INSERT OR REPLACE INTO benchmark_failures VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                failure.failure_id,
                failure.execution_id,
                failure.scenario_id,
                failure.system_type,
                failure.category,
                failure.root_cause,
                failure.mitigation_action,
                failure.created_at,
            ])
            con.close()
        except Exception:
            pass

    def get_all_failures(self) -> list[dict[str, Any]]:
        if FAILURES_FILE.exists():
            try:
                with open(FAILURES_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []


evaluation_repository = EvaluationRepository()

