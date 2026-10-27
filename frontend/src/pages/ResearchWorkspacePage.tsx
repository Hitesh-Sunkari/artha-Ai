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
  ExternalLink,
  Search,
} from 'lucide-react';
import { LiveTimeline } from '../components/LiveTimeline';
import { ReportView } from '../components/ReportView';
import { EventStream } from '../components/EventStream';
import type { TabId } from '../components/Sidebar';
import type { QuantitativeResearchReport, AgentContribution, LifecycleEvent } from '../api/types';
import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

type ResearchSubTab = 'overview' | 'journey' | 'report' | 'evidence' | 'committee';

interface ResearchWorkspaceProps {
  initialRunId?: string | null;
  onNavigateToPortfolio?: (ticker?: string, side?: 'BUY' | 'SELL') => void;
}

export const ResearchWorkspacePage: React.FC<ResearchWorkspaceProps> = ({
  initialRunId,
  onNavigateToPortfolio,
}) => {
  const [activeTab, setActiveTab] = useState<ResearchSubTab>(initialRunId ? 'journey' : 'overview');
  const [activeRunId, setActiveRunId] = useState<string | null>(initialRunId || null);

  useEffect(() => {
    if (initialRunId && initialRunId !== activeRunId) {
      setActiveRunId(initialRunId);
      setActiveTab('journey');
    }
  }, [initialRunId]);

  // Configuration Form State
  const [symbol, setSymbol] = useState('RELIANCE.NS');
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

  // Popular NSE Tickers
  const tickerPresets = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS', 'ICICIBANK.NS'];

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
                      className={`groww-chip ${symbol === t ? 'active' : ''}`}
                      style={{ padding: '3px 10px', fontSize: '11px' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
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
                disabled={submitting}
                className="btn-groww-primary"
                style={{ padding: '12px 20px', fontSize: '14px', marginTop: '8px', width: '100%' }}
              >
                <Play size={16} />
                {submitting ? 'Submitting to ADK Coordinator...' : 'Execute Research Pipeline'}
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
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Investment Committee Chamber
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Simulated multi-persona debate featuring Macro, Quant, Adversarial Red-Team, and Chief Investment Officer.
                </p>
              </div>
              <button
                onClick={handleRunCommittee}
                disabled={committeeLoading}
                className="btn-groww-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                <Users size={15} /> {committeeLoading ? 'Deliberating...' : 'Convene Committee Session'}
              </button>
            </div>
          </div>

          {committeeResult && (
            <div className="terminal-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Session ID: {committeeResult.session_id}
                </span>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    backgroundColor:
                      committeeResult.official_verdict === 'APPROVED'
                        ? 'rgba(52, 211, 153, 0.2)'
                        : 'rgba(251, 191, 36, 0.2)',
                    color:
                      committeeResult.official_verdict === 'APPROVED'
                        ? 'var(--accent-emerald)'
                        : 'var(--accent-amber)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Verdict: {committeeResult.official_verdict}
                </span>
              </div>

              {/* Debate Transcript */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {committeeResult.transcript?.map((st: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {st.role_title} ({st.member_name})
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: st.vote === 'APPROVE' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        }}
                      >
                        Vote: {st.vote} • Stance: {st.stance}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                      {st.argument}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchWorkspacePage;
