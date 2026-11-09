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
  target_price?: number | null;
  target_upside_pct?: number | null;
  stop_loss_price?: number | null;
  stop_loss_pct?: number | null;
  reward_to_risk_ratio?: number | null;
  target_methodology?: string | null;
  audit_hash?: string | null;
  agent_contributions?: AgentContribution[];
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
  blackboard_events?: any[];
  query_research_result?: any;
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
  conviction_score?: number | null;
  executive_thesis?: string | null;
  target_price?: number | null;
  stop_loss_price?: number | null;
  target_upside_pct?: number | null;
  reward_to_risk_ratio?: number | null;
  statutory_friction_drag_pct?: number | null;
  events_count: number;
  error?: string | null;
  query_research_result?: any;
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

export interface MarketSessionState {
  is_open: boolean;
  status: 'OPEN' | 'CLOSED';
  status_label: string;
  current_time_ist: string;
  time_ist: string;
  date_ist: string;
  open_time: string;
  close_time: string;
  next_session: string;
  message: string;
}

export interface AuthUser {
  token: string;
  email: string;
  name: string;
  picture?: string | null;
  role: 'SUPER_ADMIN' | 'USER';
  is_super_admin: boolean;
  can_switch_to_admin: boolean;
  can_switch_to_user: boolean;
  auth_provider: 'GOOGLE' | 'EMAIL';
}

export interface SwitchClearanceResponse {
  allowed: boolean;
  is_super_admin: boolean;
  email: string;
  message: string;
}

export interface TrafficTelemetry {
  total_requests: number;
  rpm: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  status_counts: {
    status_2xx: number;
    status_4xx: number;
    status_5xx: number;
  };
  top_endpoints: Array<{ endpoint: string; hits: number }>;
  recent_requests: Array<{
    id: string;
    timestamp: string;
    method: string;
    path: string;
    status_code: number;
    latency_ms: number;
    client_ip: string;
  }>;
}

export interface UserSession {
  session_id: string;
  user_email: string;
  user_name: string;
  role: string;
  is_super_admin: boolean;
  current_page: string;
  current_tab: string;
  client_ip: string;
  user_agent: string;
  started_at: string;
  last_heartbeat: string;
  last_heartbeat_ts: number;
  queries_executed: number;
  paper_cash: number;
  paper_positions_count: number;
  paper_aum: number;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  idle_seconds?: number;
}

export interface HoldingSummary {
  symbol: string;
  shares: number;
  avg_price: number;
  current_price: number;
  invested_amount: number;
  current_value: number;
  unrealized_pnl: number;
  pnl_pct: number;
  weight_pct: number;
}

export interface InvestmentsSurveillance {
  total_users_tracked: number;
  aggregate_aum: number;
  total_cash_available: number;
  total_equity_invested: number;
  total_cost_basis: number;
  overall_unrealized_pnl: number;
  overall_pnl_pct: number;
  holdings_breakdown: HoldingSummary[];
  recent_orders: Array<{
    orderId: string;
    symbol: string;
    action: string;
    shares: number;
    price: number;
    status: string;
    timestamp: string;
    user_email?: string;
  }>;
}

export interface ClientErrorReport {
  id: string;
  timestamp: string;
  user_email: string;
  source: string;
  error_type: string;
  message: string;
  stack?: string | null;
  component?: string | null;
  status: 'DETECTED' | 'RECTIFIED' | 'INVESTIGATING';
  rectification_action?: string | null;
  rectified_at?: string | null;
}

// ── Master Canonical Benchmark & Continuous Evaluation Types ─────────

export interface BenchmarkScenario {
  scenario_id: string;
  title?: string;
  name?: string;
  category?: 'Query-Based' | 'Single-Asset Deep Dive' | string;
  workflow_type?: string;
  query_text?: string;
  question?: string;
  target_assets?: string[];
  target_symbols?: string[];
  horizon?: string;
  difficulty: 'STANDARD' | 'HARD' | 'CHALLENGE' | string;
  required_subtasks: string[];
  numerical_invariants: {
    as_of_date?: string;
    close_price_tolerance_pct?: number;
    statutory_stt_rate_bps?: number;
    expected_primary_stance?: string;
    [key: string]: any;
  };
}

export interface BenchmarkSystemSummary {
  total_runs: number;
  mean_composite: number;
  mean_accuracy: number;
  mean_grounding: number;
  mean_completion: number;
  mean_consistency: number;
  mean_reliability: number;
  mean_traceability: number;
  mean_latency_sec: number;
}

export interface BenchmarkPairedComparison {
  scenario_id: string;
  scenario_name?: string;
  repetition_index: number;
  arthai_composite: number;
  baseline_composite: number;
  delta?: number;
  delta_composite?: number;
  arthai_latency_sec?: number;
  arthai_latency?: number;
  baseline_latency_sec?: number;
  baseline_latency?: number;
  delta_latency_sec?: number;
  arthai_accuracy?: number;
  baseline_accuracy?: number;
  arthai_grounding?: number;
  baseline_grounding?: number;
}

export interface BenchmarkStatisticalSignificance {
  sample_pairs_n: number;
  mean_quality_delta: number;
  std_dev_delta: number;
  std_error: number;
  cohens_d_effect_size: number;
  effect_size_interpretation: string;
  confidence_interval_95_pct: [number, number];
  t_statistic: number;
  p_value: string;
  is_statistically_significant: boolean;
  null_hypothesis_rejected: boolean;
}

export interface BenchmarkRadarPoint {
  dimension: string;
  ArthaAI: number;
  Baseline: number;
}

export interface BenchmarkExecution {
  run_id?: string;
  execution_id?: string;
  scenario_id: string;
  scenario_name?: string;
  workflow_type?: string;
  system_type: 'ARTHAAI_FLEET' | 'ARTHAAI_MULTI_AGENT' | 'SINGLE_AGENT_BASELINE' | string;
  repetition_index: number;
  status: string;
  started_at: string;
  completed_at: string;
  latency_sec?: number;
  latency_seconds?: number;
  recommendation?: string;
  conviction_score?: number;
  accuracy_score?: number;
  grounding_score?: number;
  completion_score?: number;
  consistency_score?: number;
  reliability_score?: number;
  traceability_score?: number;
  composite_quality_index?: number;
  findings_text?: string;
  output?: string;
  metrics?: {
    composite_quality_score?: number;
    analytical_accuracy?: number;
    evidence_grounding?: number;
    task_completion?: number;
    consistency_stability?: number;
    statistical_reliability?: number;
    audit_traceability?: number;
    [key: string]: any;
  };
  subtasks_completed?: string[];
  invariants_checked?: Record<string, boolean>;
  tools_called_count?: number;
  tool_calls_count?: number;
  failed_tool_calls_count?: number;
  agent_handshake_events?: number;
  blackboard_events_count?: number;
}

export interface BenchmarkReport {
  experiment_id: string;
  name: string;
  dataset_version: string;
  status: string;
  started_at: string;
  completed_at: string;
  total_scheduled: number;
  completed_count: number;
  failed_count: number;
  arthai_summary: BenchmarkSystemSummary;
  baseline_summary: BenchmarkSystemSummary;
  paired_comparisons: BenchmarkPairedComparison[];
  statistical_significance: BenchmarkStatisticalSignificance;
  radar_data: BenchmarkRadarPoint[];
  executions: BenchmarkExecution[];
}


