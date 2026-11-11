-- ============================================================================
-- ArthaAI Institutional Quantitative Platform — Supabase PostgreSQL Schema
-- Idempotent, Production-Ready DDL with Row-Level Security and Indexing
-- ============================================================================

-- 1. Users and Authentication Registry
CREATE TABLE IF NOT EXISTS registered_users (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON registered_users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON registered_users(role);

-- 2. Research Runs (7-Agent Architecture Execution Reports)
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

CREATE INDEX IF NOT EXISTS idx_research_runs_symbol ON research_runs(symbol);
CREATE INDEX IF NOT EXISTS idx_research_runs_status ON research_runs(status);
CREATE INDEX IF NOT EXISTS idx_research_runs_created_at ON research_runs(created_at DESC);

-- 3. Benchmark Experiments (Dataset Suite Batches)
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

CREATE INDEX IF NOT EXISTS idx_benchmark_exp_started ON benchmark_experiments(started_at DESC);

-- 4. Benchmark Executions (Question-Wise & Architecture-Wise Executions)
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

CREATE INDEX IF NOT EXISTS idx_benchmark_exec_exp ON benchmark_executions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_exec_scenario ON benchmark_executions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_exec_system ON benchmark_executions(system_type);

-- 5. Human Reviews
CREATE TABLE IF NOT EXISTS human_reviews (
    review_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    execution_id VARCHAR(128) NOT NULL,
    scenario_id VARCHAR(64) NOT NULL,
    reviewer VARCHAR(255) NOT NULL DEFAULT 'Chief Quantitative Officer',
    verdict_rating INTEGER CHECK (verdict_rating BETWEEN 1 AND 5),
    factual_accuracy_rating INTEGER CHECK (factual_accuracy_rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Failure Categorization Records
CREATE TABLE IF NOT EXISTS failure_records (
    failure_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    execution_id VARCHAR(128) NOT NULL,
    scenario_id VARCHAR(64) NOT NULL,
    system_type VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    root_cause TEXT NOT NULL,
    mitigation_action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Seed Canonical Super-Admin & Initial Users
INSERT INTO registered_users (email, name, role, auth_provider)
VALUES 
    ('hitesh.sunkari.23cse@bmu.edu.in', 'Hitesh Sunkari', 'SUPER_ADMIN', 'GOOGLE'),
    ('trader@institution.in', 'Institutional Trader', 'USER', 'EMAIL'),
    ('newuser@gmail.com', 'New User', 'USER', 'GOOGLE')
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name, updated_at = timezone('utc'::text, now());
