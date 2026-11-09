import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Settings,
  Activity,
  FileText,
  Database,
  Users,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Search,
  Layers,
  X,
  Globe,
  Sparkles,
  TrendingUp,
  PieChart,
  BarChart2,
  ArrowUpRight,
  Percent,
  Sliders,
} from 'lucide-react';
import { LiveTimeline } from '../components/LiveTimeline';
import { ReportView } from '../components/ReportView';
import { EventStream } from '../components/EventStream';
import { QueryStudioView } from '../components/QueryStudioView';
import type { TabId } from '../components/Sidebar';
import type { QuantitativeResearchReport, AgentContribution, LifecycleEvent } from '../api/types';
import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

type ResearchSubTab = 'overview' | 'query' | 'journey' | 'report' | 'evidence' | 'committee';

interface QueryStockSummary {
  ticker: string;
  name: string;
  sector: string;
  ltp: number;
  day_change: number;
  day_change_perc: number;
  pe_ratio: number | null;
  roe_pct: number | null;
  debt_equity: number | null;
  expected_return_pct: number;
  volatility_pct: number;
  beta: number;
  max_drawdown_pct: number;
  order_flow_sentiment: string;
}

interface QueryTenYearProjection {
  horizon_years: number;
  current_price: number;
  p10_bear_target: number;
  p50_base_target: number;
  p90_bull_target: number;
  base_cagr_pct: number;
  bull_cagr_pct: number;
  bear_cagr_pct: number;
  prob_beat_inflation: number;
  trajectory_points: Array<{
    year: number;
    bear_p10: number;
    median_p50: number;
    bull_p90: number;
  }>;
  growth_catalysts: string[];
  downside_risks: string[];
}

interface QueryMultiStockCombination {
  tickers: string[];
  weights: Record<string, number>;
  combined_expected_return_pct: number;
  combined_volatility_pct: number;
  weighted_avg_single_volatility_pct: number;
  volatility_reduction_pct: number;
  combined_max_drawdown_pct: number;
  individual_avg_drawdown_pct: number;
  drawdown_reduction_pct: number;
  diversification_ratio: number;
  correlation_matrix: Record<string, Record<string, number>>;
  recommendation_rationale: string;
}

interface QueryResearchResponse {
  query: string;
  intent: string;
  detected_symbols: string[];
  horizon_years: number;
  executive_synthesis: string;
  verdict: string;
  conviction_score: number;
  stocks_analyzed: QueryStockSummary[];
  ten_year_projection?: QueryTenYearProjection | null;
  multi_stock_combination?: QueryMultiStockCombination | null;
  regulatory_audit: any;
  statutory_tax_drag: any;
  agent_contributions: any[];
  timestamp: string;
}

interface ResearchWorkspaceProps {
  initialRunId?: string | null;
  initialSymbol?: string | null;
  onNavigateToPortfolio?: (ticker?: string, side?: 'BUY' | 'SELL') => void;
}

export const ResearchWorkspacePage: React.FC<ResearchWorkspaceProps> = ({
  initialRunId,
  initialSymbol,
  onNavigateToPortfolio,
}) => {
  const [activeTab, setActiveTab] = useState<ResearchSubTab>(initialRunId ? 'journey' : 'overview');
  const [activeRunId, setActiveRunId] = useState<string | null>(initialRunId || null);

  // Configuration Form State
  const [symbol, setSymbol] = useState(initialSymbol || 'RELIANCE.NS');

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  useEffect(() => {
    if (initialRunId && initialRunId !== activeRunId) {
      setActiveRunId(initialRunId);
      setActiveTab('journey');
    }
  }, [initialRunId]);
  const [orchestrationPattern, setOrchestrationPattern] = useState<'SEQUENTIAL' | 'PARALLEL' | 'HIERARCHICAL'>('SEQUENTIAL');
  const [horizon, setHorizon] = useState('1Y');
  const [thesisQuestion, setThesisQuestion] = useState('Evaluate valuation, regulatory risks under SEBI LODR, and statutory friction under Finance Act 2024.');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active Run Polling State
  const [runStatus, setRunStatus] = useState<string>('IDLE');
  const [report, setReport] = useState<QuantitativeResearchReport | null>(null);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [contributions, setContributions] = useState<AgentContribution[]>([]);
  const [auditHash, setAuditHash] = useState<string>('');

  // Committee State
  const [committeeResult, setCommitteeResult] = useState<any | null>(null);
  const [committeeLoading, setCommitteeLoading] = useState(false);

  // Evidence Search State
  const [evidenceManifest, setEvidenceManifest] = useState<any[]>([]);
  const [evidenceStats, setEvidenceStats] = useState<any | null>(null);
  const [evidenceQuery, setEvidenceQuery] = useState('SEBI LODR Regulation 30');
  const [evidenceResults, setEvidenceResults] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  // Comparison State (Phase 6 — User-Triggered Only)
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparePatterns, setComparePatterns] = useState<string[]>(['SEQUENTIAL', 'PARALLEL', 'HIERARCHICAL']);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareRecord, setCompareRecord] = useState<any | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Security Resolution Interface & State
  interface SecurityResolution {
    resolved: boolean;
    canonical_id: string;
    symbol: string;
    exchange: string;
    yahoo_ticker: string;
    company_name: string;
    listing_status: string;
    is_valid_for_research: boolean;
    has_local_parquet: boolean;
    is_sme?: boolean;
    has_derivatives?: boolean;
    message?: string;
  }

  const [securityResolution, setSecurityResolution] = useState<SecurityResolution | null>(null);
  const [resolvingSecurity, setResolvingSecurity] = useState(false);

  // Popular Indian Ticker Presets (Large-Cap, Mid-Cap, SME, Dual-Listed)
  const POPULAR_PRESETS = [
    'RELIANCE.NS',
    'TCS.NS',
    'HDFCBANK.NS',
    'INFY.NS',
    'TATAMOTORS.NS',
    'ICICIBANK.NS',
    'SBIN.NS',
    'ITC.NS',
    'WIPRO.NS',
    'ZOMATO.NS',
    'SWIGGY.NS',
    'TRENT.NS',
  ];
  const tickerPresets = POPULAR_PRESETS;
  const cleanSym = symbol.trim().toUpperCase();

  // Dynamic security resolution via Security Master API
  useEffect(() => {
    if (!cleanSym) {
      setSecurityResolution(null);
      return;
    }
    let isCurrent = true;
    const timer = setTimeout(async () => {
      setResolvingSecurity(true);
      try {
        const res = await fetch(`${API}/securities/${encodeURIComponent(cleanSym)}`);
        if (res.ok) {
          const data = await res.json();
          if (isCurrent) setSecurityResolution(data);
        }
      } catch {
        // silent
      } finally {
        if (isCurrent) setResolvingSecurity(false);
      }
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [cleanSym]);

  const hasLocalParquet = securityResolution?.has_local_parquet ?? false;
  const isDelisted = securityResolution?.listing_status === 'DELISTED';
  const isSuspended = securityResolution?.listing_status === 'SUSPENDED';
  const canExecute = cleanSym.length > 0 && !isDelisted;

  // Poll active run
  useEffect(() => {
    if (!activeRunId) return;

    let isMounted = true;
    const fetchRun = async () => {
      try {
        const res = await fetch(`${API}/runs/${activeRunId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        setRunStatus(data.status || 'UNKNOWN');
        if (data.report) {
          setReport(data.report);
          setAuditHash(data.report.audit_hash || '');
        }
        if (data.blackboard_events) {
          setEvents(data.blackboard_events);
        }
        if (data.agent_contributions) {
          setContributions(data.agent_contributions);
        }
      } catch (err) {
        // silent retry
      }
    };

    fetchRun();
    const interval = setInterval(fetchRun, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeRunId]);

  // Load RAG manifest
  useEffect(() => {
    fetch(`${API}/rag/manifest`)
      .then((r) => r.json())
      .then((d) => {
        setEvidenceManifest(d.manifest || []);
        setEvidenceStats(d.statistics || null);
      })
      .catch(() => {});
  }, []);

  const handleExecuteResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    if (isDelisted) {
      setSubmitError(
        `Safety Gate: ${securityResolution?.company_name || symbol} is marked DELISTED on exchange registries. ` +
        `Active quantitative recommendations are restricted for delisted securities.`
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.trim(),
          as_of_time: new Date().toISOString(),
          orchestration_pattern: orchestrationPattern,
          scope: ['quant', 'compliance', 'adversarial'],
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Research submission rejected by API');
      }

      const data = await res.json();
      setActiveRunId(data.run_id);
      setRunStatus('RUNNING');
      setReport(null);
      setEvents([]);
      setContributions([]);
      setActiveTab('journey'); // Switch automatically to the Agent Journey view
    } catch (err: any) {
      setSubmitError(err.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteComparison = async () => {
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch(`${API}/research/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.trim(),
          timeframe: '5Y',
          patterns: comparePatterns,
          idempotency_key: `comp-${symbol.trim()}-${Date.now()}`,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Comparison initiation failed.');
      }
      const initialData = await res.json();
      setCompareRecord(initialData);

      // Poll until terminal state
      const compId = initialData.comparison_id;
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`${API}/research/compare/${compId}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            setCompareRecord(pollData);
            if (pollData.status === 'COMPLETED' || pollData.status === 'FAILED') {
              clearInterval(pollInterval);
              setCompareLoading(false);
            }
          }
        } catch {
          // silent retry
        }
      }, 1500);
    } catch (err: any) {
      setCompareError(err.message || 'Failed to start comparison.');
      setCompareLoading(false);
    }
  };

  const handleRunCommittee = async () => {
    setCommitteeLoading(true);
    try {
      const res = await fetch(`${API}/committee/deliberate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_subject: symbol,
          report: report || {},
        }),
      });
      const data = await res.json();
      setCommitteeResult(data);
    } catch (err) {
      // committee error
    } finally {
      setCommitteeLoading(false);
    }
  };

  // ── Natural Language Query Studio State & Handler ───────────────────────
  const [nlQuery, setNlQuery] = useState('how could be the trend of reliance in next 10years');
  const [nlSelectedSymbols, setNlSelectedSymbols] = useState<string[]>(['RELIANCE.NS']);
  const [nlSymbolInput, setNlSymbolInput] = useState('');
  const [nlHorizon, setNlHorizon] = useState<number>(10);
  const [nlRiskTolerance, setNlRiskTolerance] = useState<number>(5);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlResult, setNlResult] = useState<QueryResearchResponse | null>(null);

  const handleExecuteNlQuery = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : nlQuery).trim();
    if (!q) return;
    setNlLoading(true);
    setNlError(null);
    try {
      const res = await fetch(`${API}/research/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          symbols: nlSelectedSymbols.length > 0 ? nlSelectedSymbols : undefined,
          horizon_years: nlHorizon,
          risk_tolerance: nlRiskTolerance,
          initial_capital: 1000000.0,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data: QueryResearchResponse = await res.json();
      setNlResult(data);
      if (data.detected_symbols && data.detected_symbols.length > 0) {
        setNlSelectedSymbols(data.detected_symbols);
      }
      if (data.horizon_years) {
        setNlHorizon(data.horizon_years);
      }
    } catch (err: any) {
      setNlError(err?.message || 'Failed to execute query research.');
    } finally {
      setNlLoading(false);
    }
  };

  const handleSearchEvidence = async () => {
    if (!evidenceQuery.trim()) return;
    setEvidenceLoading(true);
    try {
      const res = await fetch(`${API}/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: evidenceQuery, limit: 4 }),
      });
      const data = await res.json();
      setEvidenceResults(data.results || []);
    } catch {
      // search error
    } finally {
      setEvidenceLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Workspace Header with Integrated Sub-Nav ──────────────────── */}
      <div
        className="groww-card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="pill-badge pill-badge-green">
                <BrainCircuit size={13} /> RESEARCH STUDIO
              </span>
              {activeRunId && (
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Run ID: <strong style={{ color: 'var(--text-primary)' }}>{activeRunId}</strong>
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 0 0' }}>
              Multi-Agent Quantitative Pipeline: {symbol}
            </h1>
          </div>

          {/* Persistent Context Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className={`pill-badge ${
                runStatus === 'COMPLETED'
                  ? 'pill-badge-green'
                  : runStatus === 'RUNNING'
                  ? 'pill-badge-blue'
                  : 'pill-badge-neutral'
              }`}
            >
              <Activity size={13} className={runStatus === 'RUNNING' ? 'animate-spin' : ''} />
              {runStatus}
            </span>

            {report && (
              <span
                className={`pill-badge ${
                  report.recommendation === 'BUY'
                    ? 'pill-badge-green'
                    : report.recommendation === 'SELL'
                    ? 'pill-badge-red'
                    : 'pill-badge-amber'
                }`}
                style={{ fontSize: '13px', padding: '5px 12px' }}
              >
                {report.recommendation} ({report.conviction_score}/100)
              </span>
            )}
          </div>
        </div>

        {/* ── Sub-Navigation Bar (Groww Style) ───────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`groww-chip ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <Settings size={15} style={{ marginRight: '6px' }} /> Overview & Config
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`groww-chip ${activeTab === 'query' ? 'active' : ''}`}
            style={activeTab === 'query' ? { borderColor: 'var(--groww-green)', color: 'var(--groww-green)', fontWeight: 700 } : {}}
          >
            <Sparkles size={15} style={{ marginRight: '6px', color: '#a78bfa' }} /> Query Studio (10Y Trend & Multi-Stock)
          </button>
          <button
            onClick={() => setActiveTab('journey')}
            className={`groww-chip ${activeTab === 'journey' ? 'active' : ''}`}
          >
            <Activity size={15} style={{ marginRight: '6px' }} /> Agent Journey
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`groww-chip ${activeTab === 'report' ? 'active' : ''}`}
          >
            <FileText size={15} style={{ marginRight: '6px' }} /> Final Report & Decision
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`groww-chip ${activeTab === 'evidence' ? 'active' : ''}`}
          >
            <Database size={15} style={{ marginRight: '6px' }} /> Evidence Explorer
          </button>
          <button
            onClick={() => setActiveTab('committee')}
            className={`groww-chip ${activeTab === 'committee' ? 'active' : ''}`}
          >
            <Users size={15} style={{ marginRight: '6px' }} /> Investment Committee
          </button>
        </div>
      </div>

      {/* ── View 1: Overview & Research Configuration ─────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
          <div className="terminal-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Configure Research Execution
            </h3>

            {submitError && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(251, 113, 133, 0.1)',
                  border: '1px solid var(--accent-rose)',
                  color: 'var(--accent-rose)',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                {submitError}
              </div>
            )}

            <form onSubmit={handleExecuteResearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Instrument Ticker */}
              <div>
                <label className="form-label">Indian Equity Instrument (NSE/BSE)</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. RELIANCE.NS, TCS.BO"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  required
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Select:</span>
                  {tickerPresets.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSymbol(t)}
                      className={`groww-chip ${cleanSym === t || cleanSym === t.replace('.NS', '') ? 'active' : ''}`}
                      style={{ padding: '3px 10px', fontSize: '11px' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Dynamic Resolution Status Badges */}
                {cleanSym.length > 0 && securityResolution && (
                  <div style={{ marginTop: '10px' }}>
                    {hasLocalParquet ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--groww-green)' }}>
                        <CheckCircle2 size={13} />
                        <span>Verified 5-Year Point-In-Time Dataset (~1,260 bars) active for {securityResolution.canonical_id || cleanSym}</span>
                      </div>
                    ) : isDelisted ? (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(235, 91, 89, 0.1)',
                          border: '1px solid var(--groww-red)',
                          color: 'var(--groww-red)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertTriangle size={15} />
                        <span>DELISTED Equity ({securityResolution.canonical_id}) — Actionable quantitative research and recommendations locked.</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: 'var(--accent-cyan)',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Globe size={14} />
                        <span>
                          <strong>Dynamic Listed Equity ({securityResolution.exchange}):</strong> {securityResolution.company_name} ({securityResolution.canonical_id}). Multi-source dynamic market ingest and point-in-time quality gates active.
                          {securityResolution.is_sme && ' [SME Series SM — Illiquidity guardrails active]'}
                          {isSuspended && ' [Trading Suspended — Historical data only]'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Orchestration Pattern */}
              <div>
                <label className="form-label">Multi-Agent Orchestration Architecture</label>
                <select
                  value={orchestrationPattern}
                  onChange={(e) => setOrchestrationPattern(e.target.value as any)}
                  className="form-select"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <option value="SEQUENTIAL">SEQUENTIAL — Strict Pipeline (Manager → Quant → News → Adversarial → Risk)</option>
                  <option value="PARALLEL">PARALLEL — Concurrent Specialist Execution across A2A Bridge</option>
                  <option value="HIERARCHICAL">HIERARCHICAL — Dynamic Committee Deliberation & Rubric Arbitration</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Governed by Google ADK Research Manager with CrewAI specialist delegation.
                </span>
              </div>

              {/* Specific Question / Thesis */}
              <div>
                <label className="form-label">Research Thesis & Regulatory Directives</label>
                <textarea
                  rows={3}
                  value={thesisQuestion}
                  onChange={(e) => setThesisQuestion(e.target.value)}
                  className="form-input"
                  style={{ resize: 'vertical', lineHeight: '1.4' }}
                />
              </div>

              {/* Execution Action Button */}
              <button
                type="submit"
                disabled={submitting || !canExecute}
                className={canExecute ? 'btn-groww-primary' : 'btn-groww-secondary'}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  marginTop: '8px',
                  width: '100%',
                  opacity: canExecute ? 1 : 0.6,
                  cursor: canExecute ? 'pointer' : 'not-allowed',
                }}
              >
                <Play size={16} />
                {submitting
                  ? 'Submitting to ADK Coordinator...'
                  : isDelisted
                  ? 'Research Blocked (Delisted Security)'
                  : !cleanSym
                  ? 'Enter Indian Stock Symbol to Proceed'
                  : 'Execute Research Pipeline'}
              </button>

              {/* Secondary Comparison Action (User-Triggered Only) */}
              <button
                type="button"
                disabled={submitting || !canExecute}
                onClick={() => {
                  setCompareError(null);
                  setShowCompareModal(true);
                }}
                className="btn-groww-secondary"
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: canExecute ? 'pointer' : 'not-allowed',
                }}
              >
                <Layers size={15} />
                <span>Compare Orchestration Patterns (Sequential vs Parallel vs Hierarchical)</span>
              </button>
            </form>
          </div>

          {/* Pipeline Specifications & Active Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="terminal-card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                Pipeline Architecture & Guards
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Coordinator:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Google ADK Research Manager</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Specialists:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>CrewAI Specialist Suite</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Interoperability:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>A2A Protocol (JSON-RPC 2.0)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tool Integration:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Official FastMCP SDK</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>RAG Store:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ChromaDB Persistent (13 Chunks)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Trading Mode:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>STRICT PAPER SIMULATION</span>
                </div>
              </div>
            </div>

            {report && (
              <div className="terminal-card" style={{ padding: '20px', borderColor: 'var(--border-cyan)' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  CURRENT ACTIVE RUN REPORT
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  Recommendation: {report.recommendation}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  Conviction score: {report.conviction_score}/100 • Statutory friction drag: {report.statutory_friction_drag_pct?.toFixed(4)}%
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => setActiveTab('report')}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    View Report & Explainability →
                  </button>
                  {onNavigateToPortfolio && (
                    <button
                      onClick={() => onNavigateToPortfolio(symbol, report.recommendation === 'SELL' ? 'SELL' : 'BUY')}
                      className="btn btn-primary"
                      style={{ fontSize: '11px', padding: '6px 12px' }}
                    >
                      Trade in Paper Studio
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View 1.5: Query-Based Quantitative Research Studio ───────────── */}
      {activeTab === 'query' && (
        <QueryStudioView
          onNavigateToPortfolio={onNavigateToPortfolio}
          defaultSymbol={symbol}
        />
      )}

      {/* ── View 2: Agent Journey & Live Timeline ─────────────────────────── */}
      {activeTab === 'journey' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <LiveTimeline
            pattern={orchestrationPattern}
            events={events}
            runStatus={runStatus}
            contributions={contributions}
          />

          {/* Blackboard Monotonic State & A2A Event Stream */}
          <div className="terminal-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
              Blackboard Monotonic State & A2A Handoff Stream
            </h3>
            <EventStream events={events} />
          </div>
        </div>
      )}

      {/* ── View 3: Final Report & Explainability ─────────────────────────── */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {report ? (
            <>
              <ReportView report={report} events={events} />

              {/* Direct Paper-Trading Handoff Action Bar */}
              <div
                className="groww-card"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--groww-green-light)',
                  border: '1px solid rgba(0, 208, 156, 0.35)',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Validate Decision via Simulated Paper Trading
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Handoff {symbol} with recommendation <strong style={{ color: 'var(--groww-green)' }}>{report.recommendation}</strong> to the Paper Trading Terminal.
                  </div>
                </div>

                {onNavigateToPortfolio && (
                  <button
                    onClick={() => onNavigateToPortfolio(symbol, report.recommendation === 'SELL' ? 'SELL' : 'BUY')}
                    className="btn-groww-primary"
                    style={{ padding: '10px 22px', fontSize: '13px' }}
                  >
                    Configure Paper Order →
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="terminal-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No finalized report found for this run yet. Run the pipeline in <strong>Overview & Config</strong> and monitor progress in <strong>Agent Journey</strong>.
            </div>
          )}
        </div>
      )}

      {/* ── View 4: Evidence Explorer (Persistent ChromaDB) ──────────────── */}
      {activeTab === 'evidence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Corpus Statistics */}
          <div className="terminal-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
              Persistent ChromaDB Regulatory Corpus
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              Ingested on local E: drive with zero-download deterministic 384-dimensional lexical/semantic embeddings.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Indexed Chunks</span>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {evidenceStats?.total_indexed_chunks || 13}
                </div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Authoritative Sources</span>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {evidenceStats?.manifest_sources_count || 10}
                </div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Embedding Vector Type</span>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  384-D Deterministic
                </div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ChromaDB Status</span>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                  ● OPERATIONAL
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Semantic Search */}
          <div className="terminal-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
              Query Regulatory Knowledge Base
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={evidenceQuery}
                onChange={(e) => setEvidenceQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchEvidence()}
                placeholder="Search SEBI LODR, Finance Act 2024, RBI monetary policy..."
                className="form-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleSearchEvidence}
                disabled={evidenceLoading}
                className="btn-groww-primary"
                style={{ padding: '0 20px' }}
              >
                <Search size={14} /> Search
              </button>
            </div>

            {/* Results */}
            {evidenceResults.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {evidenceResults.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--groww-green)' }}>{m.title}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Relevance: {m.relevance_score ? m.relevance_score.toFixed(4) : 'N/A'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                      Authority: <strong>{m.source_authority}</strong> • Date: {m.effective_date}
                    </div>
                    <pre
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-deep)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                      }}
                    >
                      {m.sanitized_snippet || m.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View 5: Investment Committee Chamber ──────────────────────────── */}
      {activeTab === 'committee' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="terminal-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="pill-badge pill-badge-blue">
                    INSTITUTIONAL GOVERNANCE
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Target: <strong style={{ color: 'var(--text-primary)' }}>{symbol}</strong>
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Investment Committee Chamber
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Formal multi-persona deliberation featuring Google ADK &amp; CrewAI agents: Chief Investment Officer, Quantitative Strategist, Macro Director, and Adversarial Red-Team Lead.
                </p>
              </div>
              <button
                onClick={handleRunCommittee}
                disabled={committeeLoading}
                className="btn-groww-primary"
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                <Users size={16} /> {committeeLoading ? 'Deliberating Council Session...' : 'Convene Committee Session'}
              </button>
            </div>
          </div>

          {committeeResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Executive Resolution Banner */}
              <div
                className="groww-card"
                style={{
                  padding: '24px',
                  backgroundColor:
                    committeeResult.official_verdict === 'APPROVED'
                      ? 'var(--groww-green-light)'
                      : committeeResult.official_verdict === 'REJECTED'
                      ? 'var(--groww-red-light)'
                      : 'rgba(251, 191, 36, 0.08)',
                  borderColor:
                    committeeResult.official_verdict === 'APPROVED'
                      ? 'var(--groww-green)'
                      : committeeResult.official_verdict === 'REJECTED'
                      ? 'var(--groww-red)'
                      : 'var(--groww-amber)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '4px 14px',
                          borderRadius: 'var(--radius-pill)',
                          fontWeight: 800,
                          fontSize: '12px',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          backgroundColor:
                            committeeResult.official_verdict === 'APPROVED'
                              ? 'var(--groww-green)'
                              : committeeResult.official_verdict === 'REJECTED'
                              ? 'var(--groww-red)'
                              : 'var(--groww-amber)',
                          color: '#0B0F17',
                        }}
                      >
                        OFFICIAL VERDICT: {committeeResult.official_verdict}
                      </span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Session: {committeeResult.session_id}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Deliberated under Chairperson: <strong style={{ color: 'var(--text-primary)' }}>{committeeResult.chairperson || 'Chief Investment Officer'}</strong>
                    </div>
                  </div>

                  {/* Vote Breakdown Pills */}
                  {committeeResult.votes_summary && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>COUNCIL TALLY:</span>
                      <span className="pill-badge pill-badge-green" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {committeeResult.votes_summary.approve ?? 0} Approve
                      </span>
                      <span className="pill-badge pill-badge-amber" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {committeeResult.votes_summary.conditional ?? 0} Conditional
                      </span>
                      <span className="pill-badge pill-badge-red" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {committeeResult.votes_summary.reject ?? 0} Reject
                      </span>
                    </div>
                  )}
                </div>

                {/* Consensus Rationale Box */}
                {committeeResult.consensus_rationale && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      lineHeight: '1.5',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                      Executive Council Rationale &amp; Synthesis
                    </div>
                    {committeeResult.consensus_rationale}
                  </div>
                )}
              </div>

              {/* Council Debate Transcript (Persona Cards) */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Deliberating Persona Testimonies &amp; Arguments
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '14px' }}>
                  {committeeResult.transcript?.map((st: any, idx: number) => {
                    const isApprove = st.vote === 'APPROVE';
                    const isReject = st.vote === 'REJECT';
                    return (
                      <div
                        key={idx}
                        className="groww-card"
                        style={{
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          borderLeftWidth: '4px',
                          borderLeftColor: isApprove ? 'var(--groww-green)' : isReject ? 'var(--groww-red)' : 'var(--groww-amber)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {st.member_name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {st.role_title}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-pill)',
                                  backgroundColor: 'var(--bg-elevated)',
                                  color: 'var(--groww-blue)',
                                  border: '1px solid var(--border-subtle)',
                                  fontWeight: 700,
                                }}
                              >
                                {st.framework || 'Google ADK'}
                              </span>
                              <span
                                className={`pill-badge ${
                                  isApprove ? 'pill-badge-green' : isReject ? 'pill-badge-red' : 'pill-badge-amber'
                                }`}
                                style={{ fontSize: '10px', fontWeight: 800 }}
                              >
                                VOTE: {st.vote}
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                              Stance: <strong>{st.stance}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Argument Text */}
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                          {st.argument}
                        </p>

                        {/* Key Caveat / Condition */}
                        {st.key_caveat && (
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--bg-input)',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              borderLeft: '2px solid var(--groww-amber)',
                            }}
                          >
                            <strong style={{ color: 'var(--groww-amber)' }}>Mandatory Caveat: </strong>
                            <span>{st.key_caveat}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Binding Committee Risk Constraints */}
              {Array.isArray(committeeResult.binding_constraints) && committeeResult.binding_constraints.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Binding Committee Risk Constraints &amp; Governance Limits
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {committeeResult.binding_constraints.map((bc: any) => (
                      <div
                        key={bc.id}
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-lg)',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--groww-green)' }}>
                            {bc.id}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--groww-blue)',
                            }}
                          >
                            {bc.enforcement_level}
                          </span>
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {bc.category?.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                            {bc.mandate}
                          </div>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Actionable Limit: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{bc.actionable_boundary}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Paper-Trading Handoff Action Bar */}
              <div
                className="groww-card"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Execute Approved Institutional Constraints in Paper Desk
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Carry forward {symbol} verdict with binding stop-loss and position sizing controls.
                  </div>
                </div>

                {onNavigateToPortfolio && (
                  <button
                    onClick={() => onNavigateToPortfolio(symbol, committeeResult.official_verdict === 'REJECTED' ? 'SELL' : 'BUY')}
                    className="btn-groww-primary"
                    style={{ padding: '8px 18px', fontSize: '12px' }}
                  >
                    <span>Configure Order in Paper Desk →</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 6: Orchestration Comparison Modal ──────────────────────── */}
      {showCompareModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="groww-card"
            style={{
              width: '740px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: 'var(--bg-chrome)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="pill-badge pill-badge-blue">
                    <Layers size={12} /> ORCHESTRATION BENCHMARK
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Target: <strong style={{ color: 'var(--text-primary)' }}>{symbol}</strong>
                  </span>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Compare Multi-Agent Orchestration Patterns
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Execute isolated child research runs across Sequential, Parallel, and Hierarchical schedulers with identical point-in-time market data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!compareLoading) {
                    setShowCompareModal(false);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: compareLoading ? 'not-allowed' : 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {compareError && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(235, 91, 89, 0.1)',
                  border: '1px solid var(--groww-red)',
                  color: 'var(--groww-red)',
                  fontSize: '12px',
                }}
              >
                {compareError}
              </div>
            )}

            {/* Modal Body */}
            {!compareRecord && !compareLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Select Patterns to Include:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {[
                      { id: 'SEQUENTIAL', title: 'Sequential Mode', desc: 'Strict stage ordering; downstream starts only after upstream JSON is validated.' },
                      { id: 'PARALLEL', title: 'Parallel Mode', desc: 'Concurrently executes Quant, Microstructure, News & Filings; joins before Skeptic.' },
                      { id: 'HIERARCHICAL', title: 'Hierarchical Mode', desc: 'Manager decomposes objectives, delegates tasks dynamically, and coordinates final synthesis.' },
                    ].map((p) => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={comparePatterns.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setComparePatterns((prev) => [...prev, p.id]);
                            } else if (comparePatterns.length > 1) {
                              setComparePatterns((prev) => prev.filter((x) => x !== p.id));
                            }
                          }}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{p.title}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--groww-green-light)', border: '1px solid rgba(0, 208, 156, 0.3)', fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--groww-green)' }}>Safety &amp; Isolation Guarantee:</strong> Child runs receive isolated Blackboard namespaces and use identical point-in-time market snapshots. This benchmark never runs automatically and only executes upon your explicit confirmation below.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCompareModal(false)}
                    className="btn-groww-secondary"
                    style={{ padding: '10px 18px', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteComparison}
                    className="btn-groww-primary"
                    style={{ padding: '10px 18px', fontSize: '13px' }}
                  >
                    Confirm &amp; Execute Comparison
                  </button>
                </div>
              </div>
            )}

            {/* Loading Spinner */}
            {compareLoading && (
              <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <Activity size={32} className="animate-spin" style={{ color: 'var(--groww-green)' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Executing Isolated Multi-Agent Comparison...
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
                  Running child executions across {comparePatterns.join(', ')} schedulers with genuine DuckDB/Parquet market data. Please wait.
                </div>
              </div>
            )}

            {/* Results Display */}
            {compareRecord && compareRecord.status === 'COMPLETED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Summary Banner */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Fastest Architecture</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--groww-green)', marginTop: '2px' }}>
                      {compareRecord.summary?.fastest_pattern}
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Consensus Consistency</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--groww-blue)', marginTop: '2px' }}>
                      {compareRecord.summary?.consistency_verified ? 'Uniform Consensus' : 'Divergent Stance'}
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Isolation Audit</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--groww-green)', marginTop: '2px' }}>
                      100% Isolated
                    </div>
                  </div>
                </div>

                {/* Comparative Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(compareRecord.results || {}).map(([pat, res]: [string, any]) => (
                    <div
                      key={pat}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{pat}</strong>
                          <span className="pill-badge pill-badge-neutral" style={{ fontSize: '10px' }}>
                            {res.concurrency_level} Concurrent Max
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Child Run ID: <code style={{ color: 'var(--text-primary)' }}>{res.run_id}</code>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wall-Clock Duration</div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--groww-green)' }}>
                            {res.duration_seconds}s
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Decision</div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {res.recommendation} ({res.conviction_score}/100)
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveRunId(res.run_id);
                            setShowCompareModal(false);
                            setActiveTab('journey');
                          }}
                          className="btn-groww-secondary"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                        >
                          Inspect Run
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCompareRecord(null);
                    }}
                    className="btn-groww-secondary"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Configure Another Comparison
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompareModal(false)}
                    className="btn-groww-primary"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Close Benchmark
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchWorkspacePage;
