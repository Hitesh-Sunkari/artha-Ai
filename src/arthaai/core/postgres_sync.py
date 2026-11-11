"""ArthaAI PostgreSQL & Supabase Persistent Data Synchronization.

Dual-persists research runs, user authentication records, and benchmark evaluation
results to PostgreSQL/Supabase when DATABASE_URL is configured, with zero-downtime
graceful fallback to DuckDB and local disk storage if unconfigured or unreachable.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_PG_POOL = None
_PG_INITIALIZED = False


def get_database_url() -> str | None:
    """Retrieves PostgreSQL connection string from environment."""
    url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL")
    if url and url.strip():
        # Handle Render or Supabase postgres:// -> postgresql:// dialect conversion if needed
        clean_url = url.strip()
        if clean_url.startswith("postgres://"):
            clean_url = clean_url.replace("postgres://", "postgresql://", 1)
        return clean_url
    
    # Check separate credentials
    host = os.getenv("ARTHAAI_DB_HOST")
    if host and host != "localhost":
        user = os.getenv("ARTHAAI_DB_USER", "postgres")
        pwd = os.getenv("ARTHAAI_DB_PASSWORD", "")
        port = os.getenv("ARTHAAI_DB_PORT", "5432")
        db = os.getenv("ARTHAAI_DB_NAME", "postgres")
        return f"postgresql://{user}:{pwd}@{host}:{port}/{db}?sslmode=require"
    return None


def init_postgres() -> bool:
    """Initializes tables in PostgreSQL/Supabase if connection string is configured."""
    global _PG_INITIALIZED
    if _PG_INITIALIZED:
        return True

    db_url = get_database_url()
    if not db_url:
        logger.info("[PostgreSQL] DATABASE_URL not set; using local DuckDB + disk persistence.")
        return False

    try:
        import psycopg2

        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS registered_users (
                    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'USER',
                    auth_provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
                );
                CREATE TABLE IF NOT EXISTS research_runs (
                    run_id VARCHAR(128) PRIMARY KEY,
                    symbol VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    orchestration_pattern VARCHAR(50) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
                    completed_at TIMESTAMPTZ,
                    total_elapsed_seconds DOUBLE PRECISION DEFAULT 0.0,
                    recommendation VARCHAR(50),
                    conviction_score DOUBLE PRECISION,
                    report_json JSONB,
                    trace_json JSONB
                );
                CREATE TABLE IF NOT EXISTS benchmark_experiments (
                    experiment_id VARCHAR(128) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    dataset_version VARCHAR(64) DEFAULT 'v1',
                    status VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
                    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
                    completed_at TIMESTAMPTZ,
                    total_scheduled INTEGER DEFAULT 0,
                    completed_count INTEGER DEFAULT 0,
                    failed_count INTEGER DEFAULT 0,
                    summary_json JSONB
                );
                CREATE TABLE IF NOT EXISTS benchmark_executions (
                    execution_id VARCHAR(128) PRIMARY KEY,
                    experiment_id VARCHAR(128) REFERENCES benchmark_experiments(experiment_id) ON DELETE CASCADE,
                    scenario_id VARCHAR(64) NOT NULL,
                    scenario_name VARCHAR(512),
                    workflow_type VARCHAR(64),
                    repetition_index INTEGER DEFAULT 0,
                    system_type VARCHAR(64) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
                    completed_at TIMESTAMPTZ,
                    latency_seconds DOUBLE PRECISION DEFAULT 0.0,
                    composite_score DOUBLE PRECISION DEFAULT 0.0,
                    accuracy_score DOUBLE PRECISION DEFAULT 0.0,
                    grounding_score DOUBLE PRECISION DEFAULT 0.0,
                    completeness_score DOUBLE PRECISION DEFAULT 0.0,
                    hallucination_score DOUBLE PRECISION DEFAULT 0.0,
                    conviction_score DOUBLE PRECISION DEFAULT 0.0,
                    metrics_json JSONB,
                    report_json JSONB
                );
            """)
        conn.close()
        _PG_INITIALIZED = True
        logger.info("[PostgreSQL] Connected and verified schema in PostgreSQL/Supabase.")
        return True
    except Exception as e:
        logger.warning(f"[PostgreSQL] Could not connect to PostgreSQL/Supabase ({e}); operating in local DuckDB mode.")
        return False


def persist_research_run_pg(record: dict[str, Any]) -> None:
    """Persists a research run record to PostgreSQL/Supabase if available."""
    db_url = get_database_url()
    if not db_url:
        return

    try:
        import psycopg2

        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.autocommit = True
        with conn.cursor() as cur:
            rep = record.get("report") or {}
            rec = rep.get("recommendation") or rep.get("final_recommendation") or "HOLD"
            conviction = float(rep.get("conviction_score") or rep.get("conviction") or 50.0)

            cur.execute("""
                INSERT INTO research_runs (
                    run_id, symbol, status, orchestration_pattern, created_at, completed_at,
                    total_elapsed_seconds, recommendation, conviction_score, report_json, trace_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (run_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    completed_at = EXCLUDED.completed_at,
                    total_elapsed_seconds = EXCLUDED.total_elapsed_seconds,
                    recommendation = EXCLUDED.recommendation,
                    conviction_score = EXCLUDED.conviction_score,
                    report_json = EXCLUDED.report_json,
                    trace_json = EXCLUDED.trace_json;
            """, (
                record.get("run_id"),
                record.get("symbol", "NIFTY50"),
                record.get("status", "COMPLETED"),
                record.get("orchestration_pattern", "SEQUENTIAL"),
                record.get("created_at") or datetime.now(timezone.utc).isoformat(),
                record.get("completed_at") or datetime.now(timezone.utc).isoformat(),
                float(record.get("total_elapsed_seconds") or 0.0),
                str(rec),
                conviction,
                json.dumps(record.get("report") or {}),
                json.dumps(record.get("trace") or [])
            ))
        conn.close()
    except Exception as e:
        logger.warning(f"[PostgreSQL] Failed to persist research run to PostgreSQL: {e}")


def persist_benchmark_execution_pg(record: dict[str, Any]) -> None:
    """Persists a benchmark execution record to PostgreSQL/Supabase if available."""
    db_url = get_database_url()
    if not db_url:
        return

    try:
        import psycopg2

        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.autocommit = True
        with conn.cursor() as cur:
            metrics = record.get("metrics") or {}
            cur.execute("""
                INSERT INTO benchmark_executions (
                    execution_id, experiment_id, scenario_id, scenario_name, workflow_type,
                    repetition_index, system_type, status, started_at, completed_at,
                    latency_seconds, composite_score, accuracy_score, grounding_score,
                    completeness_score, hallucination_score, conviction_score,
                    metrics_json, report_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (execution_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    completed_at = EXCLUDED.completed_at,
                    latency_seconds = EXCLUDED.latency_seconds,
                    composite_score = EXCLUDED.composite_score,
                    metrics_json = EXCLUDED.metrics_json,
                    report_json = EXCLUDED.report_json;
            """, (
                record.get("execution_id"),
                record.get("experiment_id"),
                record.get("scenario_id", "Q-01"),
                record.get("scenario_name", ""),
                record.get("workflow_type", "SEQUENTIAL"),
                int(record.get("repetition_index", 0)),
                record.get("system_type", "ARTHAAI"),
                record.get("status", "COMPLETED"),
                record.get("started_at") or datetime.now(timezone.utc).isoformat(),
                record.get("completed_at") or datetime.now(timezone.utc).isoformat(),
                float(record.get("latency_seconds", 0.0)),
                float(record.get("composite_score", 0.0)),
                float(record.get("accuracy_score", 0.0)),
                float(record.get("grounding_score", 0.0)),
                float(record.get("completeness_score", 0.0)),
                float(record.get("hallucination_score", 0.0)),
                float(record.get("conviction_score", 0.0)),
                json.dumps(metrics),
                json.dumps(record.get("report") or {})
            ))
        conn.close()
    except Exception as e:
        logger.warning(f"[PostgreSQL] Failed to persist benchmark execution to PostgreSQL: {e}")
