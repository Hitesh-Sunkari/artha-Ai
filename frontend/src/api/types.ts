/**
 * ArthaAI Institutional Terminal — Canonical API and Domain Types.
 * Strictly aligned with backend Pydantic schemas in src/arthaai/schemas and api.
 */

export type OrchestrationPattern = 'SEQUENTIAL' | 'PARALLEL' | 'HIERARCHICAL';

export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type AgentFramework = 'GOOGLE_ADK' | 'CREWAI' | 'SYSTEM';

export type LifecycleEventType =
  | 'AGENT_START'
  | 'AGENT_COMPLETE'
  | 'TOOL_INVOCATION'
  | 'TOOL_COMPLETE'
  | 'BLACKBOARD_WRITE'
  | 'SKEPTIC_CHALLENGE'
  | 'RISK_VALIDATION'
  | 'A2A_MESSAGE_SENT'
  | 'A2A_MESSAGE_RECEIVED'
  | 'RAG_RETRIEVAL'
  | 'LLM_INVOCATION'
  | 'ERROR';

export interface LifecycleEvent {
  event_id: string;
  run_id: string;
  event_type: LifecycleEventType;
  agent_id: string;
  framework: AgentFramework;
  orchestration_pattern: OrchestrationPattern | string;
  status: 'SUCCESS' | 'FAILED' | 'CHALLENGED';
  duration_ms: number | null;
  payload: Record<string, any>;
  timestamp: string;
}

export interface ResearchRequestBody {
  symbol: string;
  as_of_time: string; // ISO 8601 UTC
  orchestration_pattern: OrchestrationPattern;
  scope?: string[];
  timeframe?: string;
}

export interface ResearchSubmitResponse {
  run_id: string;
  request_id: string;
  status: RunStatus;
  message: string;
  submitted_at: string;
}

export interface CalculatedMetrics {
  latest_close?: number | null;
  sample_return_mean?: number | null;
  realized_volatility_annualized?: number | null;
  realized_volatility_20d?: number | null;
  latest_sma?: number | null;
  sma_20d?: number | null;
  latest_ema?: number | null;
  ema_20d?: number | null;
  latest_rsi?: number | null;
  rsi_14d?: number | null;
  simple_returns?: number[] | null;
  [key: string]: any;
}

export interface QuantitativeFindings {
  records_retrieved: number;
  empty_result: boolean;
  finding_category: 'MEASURED' | 'UNAVAILABLE' | 'INFERRED' | string;
  data_source: string;
  calculated_metrics: CalculatedMetrics;
  data_quality_warning?: string;
  [key: string]: any;
}

export interface StatutoryFrictionBreakdown {
  stt?: number;
  sebi_turnover_fee?: number;
  exchange_turnover_fee?: number;
  stamp_duty?: number;
  gst?: number;
  [key: string]: any;
}

export interface StatutoryRiskBounds {
  total_statutory_costs_inr: number;
  effective_rate_pct: number;
  breakdown?: StatutoryFrictionBreakdown;
  statutory_provenance?: Record<string, any>;
  [key: string]: any;
}

export interface QuantitativeResearchReport {
  run_id: string;
  symbol: string;
  as_of_time: string;
  executive_thesis: string;
  quantitative_findings: QuantitativeFindings;
  statutory_risk_bounds: StatutoryRiskBounds;
  qualitative_evidence: string[];
  source_provenance: string[];
  limitations_and_uncertainties: string[];
  recommendation?: 'BUY' | 'HOLD' | 'SELL' | 'INSUFFICIENT_EVIDENCE' | string;
  conviction_score?: number;
  statutory_friction_drag_pct?: number;
  rag_citations?: string[];
  audit_hash?: string | null;
  generated_at: string;
}

export interface AgentContribution {
  agent_id: string;
  framework: AgentFramework;
  task_name: string;
  status: 'SUCCESS' | 'FAILED';
  findings: Record<string, any>;
  evidence_citations: string[];
  warnings: string[];
  timestamp: string;
}

export interface RunDetailsResponse {
  run_id: string;
  status: RunStatus;
  symbol: string;
  orchestration_pattern: OrchestrationPattern | string;
  submitted_at: string;
  completed_at?: string | null;
  latency_seconds?: number | null;
  report?: QuantitativeResearchReport | null;
  agent_contributions?: AgentContribution[];
  error?: string | null;
}

export interface RunTraceResponse {
  run_id: string;
  status: RunStatus;
  events: LifecycleEvent[];
  events_count: number;
}

export interface RunListItem {
  run_id: string;
  request_id: string;
  symbol: string;
  orchestration_pattern: OrchestrationPattern | string;
  status: RunStatus;
  submitted_at: string;
  completed_at?: string | null;
  latency_seconds?: number | null;
  has_report: boolean;
  recommendation?: string | null;
  events_count: number;
  error?: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface ReadinessResponse {
  ready: boolean;
  mcp_available: boolean;
  a2a_available: boolean;
  live_trading_blocked: boolean;
  timestamp: string;
}

export interface EvaluationSummaryResponse {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  mean_latency_seconds: number;
  p95_latency_seconds: number;
  unsupported_claim_rate_pct: number;
  schema_valid_pct: number;
  orchestration_pattern_counts: Record<string, number>;
  symbols_analyzed: string[];
  timestamp?: string; // Optional: computed on demand from backend
  total_experiments?: number;
  total_cases_in_dataset?: number;
  latest_experiment?: {
    accuracy: number;
    [key: string]: any;
  } | null;
}

export interface EvaluationCase {
  case_id: string;
  category: string;
  symbol: string;
  orchestration_pattern: string;
  expected_outcome: string;
  description: string;
  assertion_tags: string[];
}

export interface EvaluationDatasetResponse {
  dataset_version: string;
  total_cases: number;
  summary: Record<string, any>;
  cases: EvaluationCase[];
}

export interface CaseResult {
  case_id: string;
  category: string;
  symbol: string;
  orchestration_pattern: string;
  expected_outcome: string;
  actual_outcome: string;
  passed: boolean;
  latency_seconds: number;
  assertion_tags_checked: string[];
  assertion_failures: string[];
  error?: string | null;
}

export interface ExperimentReport {
  experiment_id: string;
  started_at: string;
  completed_at: string;
  total_cases: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  pass_rate_pct: number;
  mean_latency_seconds: number;
  p50_latency_seconds: number;
  p95_latency_seconds: number;
  max_latency_seconds: number;
  unsupported_claim_violations: number;
  schema_validation_failures: number;
  results: CaseResult[];
  dataset_version: string;
  config: Record<string, any>;
}

export interface SpecialistInfo {
  name: string;
  framework: string;
  id: string;
  role: string;
}

export interface SystemStatusResponse {
  api_version: string;
  environment: string;
  live_trading_guardrail: {
    live_trading_enabled: boolean;
    status: string;
    policy: string;
  };
  adk_orchestration: {
    coordinator: string;
    framework: string;
    specialists: SpecialistInfo[];
    patterns_supported: string[];
  };
  crewai_specialists: {
    framework: string;
    protocol: string;
    suite_service: string;
    specialists: SpecialistInfo[];
    routes: string[];
    healthy: boolean;
  };
  fastmcp_server: {
    service: string;
    protocol: string;
    discovered_tools: string[];
    healthy: boolean;
  };
  data_engine: {
    engine: string;
    storage: string;
    lookahead_bias_guard: string;
  };
    evaluation_engine: {
    dataset_version: string;
    total_cases: number;
    statutory_cases: number;
    zero_data_cases: number;
    adversarial_cases: number;
    runner_budget_seconds: number;
  };
  llm_providers?: {
    default_provider: string;
    openai: {
      configured: boolean;
      model: string;
      status: string;
    };
    gemini: {
      configured: boolean;
      model: string;
      status: string;
    };
    guardrails: {
      max_calls_per_run: number;
      max_budget_per_run_usd: number;
      timeout_seconds: number;
      max_retries: number;
    };
  };
  rag_knowledge_base?: {
    status: string;
    total_chunks: number;
    categories: string[];
    supported_benchmark_symbols: string[];
    zero_lookahead_enforced: boolean;
  };
  timestamp: string;
}
