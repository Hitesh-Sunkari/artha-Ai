import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Server,
  Layers,
  FlaskConical,
  PlusCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type { EvaluationSummaryResponse, ReadinessResponse, RunListItem, SystemStatusResponse } from '../api/types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardPageProps {
  onNavigate: (tab: any, runId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [evalSummary, setEvalSummary] = useState<EvaluationSummaryResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [sysStatus, setSysStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsData, evalData, readyData, statusData] = await Promise.allSettled([
        api.listRuns(),
        api.getEvaluationSummary(),
        api.getReadiness(),
        api.getSystemStatus(),
      ]);

      if (runsData.status === 'fulfilled') {
        setRuns(runsData.value);
      }
      if (evalData.status === 'fulfilled') {
        setEvalSummary(evalData.value);
      }
      if (readyData.status === 'fulfilled') {
        setReadiness(readyData.value);
      }
      if (statusData.status === 'fulfilled') {
        setSysStatus(statusData.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const completedCount = runs.filter((r) => r.status === 'COMPLETED').length;
  const runningCount = runs.filter((r) => r.status === 'RUNNING').length;
  const failedCount = runs.filter((r) => r.status === 'FAILED').length;
  const totalCount = runs.length;

  const validLatencies = runs
    .filter((r) => r.latency_seconds !== null && r.latency_seconds !== undefined)
    .map((r) => r.latency_seconds as number);

  const avgLatency =
    validLatencies.length > 0
      ? (validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length).toFixed(2)
      : evalSummary?.mean_latency_seconds
      ? evalSummary.mean_latency_seconds.toFixed(2)
      : '0.00';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            Institutional Research Command
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time status of multi-agent runs, execution latency, and statutory compliance
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => onNavigate('new-research')} className="btn btn-primary">
            <PlusCircle size={15} />
            <span>Submit New Research</span>
          </button>
          <button onClick={() => onNavigate('evaluation')} className="btn btn-secondary">
            <FlaskConical size={15} />
            <span>Run Benchmark Suite</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '6px',
            color: 'var(--accent-rose)',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid-cols-4">
        <MetricCard
          label="Total Session Runs"
          value={totalCount}
          subtext={`${completedCount} completed • ${runningCount} active • ${failedCount} failed`}
          icon={Activity}
          accentColor="var(--accent-cyan)"
        />
        <MetricCard
          label="Average Run Latency"
          value={`${avgLatency}s`}
          subtext={validLatencies.length ? `Across ${validLatencies.length} timed runs` : 'Session observation baseline'}
          icon={Clock}
          accentColor="#818cf8"
        />
        <MetricCard
          label="Schema Validity Rate"
          value={`${evalSummary?.schema_valid_pct ?? 100}%`}
          subtext="Pydantic v2 quantitative validation"
          icon={CheckCircle2}
          accentColor="var(--accent-emerald)"
        />
        <MetricCard
          label="Unsupported Claims"
          value={`${evalSummary?.unsupported_claim_rate_pct ?? 0.0}%`}
          subtext="Zero citation fabrication rule enforced"
          icon={ShieldAlert}
          accentColor="var(--accent-emerald)"
        />
      </div>

      {/* Fleet & Protocol Health Widget */}
      <div className="terminal-card">
        <div className="section-header">
          <div className="section-title">
            <Server size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Multi-Agent Fleet & Protocol Architecture Status</span>
          </div>
          <button onClick={() => onNavigate('architecture')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
            View Architecture Topology
            <ArrowRight size={12} />
          </button>
        </div>

        <div className="grid-cols-3" style={{ gap: '14px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>Google ADK Coordinator</span>
              <span
                className={`status-pill ${readiness ? 'status-completed' : 'status-pending'}`}
                style={{ fontSize: '10px' }}
              >
                {readiness ? 'Active' : 'Checking...'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {sysStatus?.adk_orchestration?.specialists?.length ?? 4} in-process specialists (Manager, Quant, Microstructure, Risk Validator)
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f472b6' }}>CrewAI A2A Specialists</span>
              <span className={`status-pill ${readiness?.a2a_available ? 'status-completed' : 'status-failed'}`} style={{ fontSize: '10px' }}>
                {readiness?.a2a_available ? 'Protocol Ready' : 'Connecting'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {sysStatus?.crewai_specialists?.specialists?.length ?? 3} A2A-dispatched specialists (News/Macro, Filings, Adversarial Skeptic)
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>FastMCP Tool Engine</span>
              <span className={`status-pill ${readiness?.mcp_available ? 'status-completed' : 'status-failed'}`} style={{ fontSize: '10px' }}>
                {readiness?.mcp_available ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {sysStatus?.fastmcp_server?.discovered_tools?.length ?? '?'} registered tools
              {sysStatus?.fastmcp_server?.discovered_tools?.length ? (
                <span className="font-mono"> ({sysStatus.fastmcp_server.discovered_tools.slice(0, 2).join(', ')}
                  {sysStatus.fastmcp_server.discovered_tools.length > 2 ? ` +${sysStatus.fastmcp_server.discovered_tools.length - 2} more` : ''})
                </span>
              ) : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Research Runs Table */}
      <div className="terminal-card">
        <div className="section-header">
          <div className="section-title">
            <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Recent Research Executions</span>
          </div>
          {runs.length > 5 && (
            <button onClick={() => onNavigate('history')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
              View All History
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {runs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '6px',
            }}
          >
            <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No research runs recorded in memory
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '420px', margin: '0 auto 16px' }}>
              Submit a quantitative research request for Indian assets (e.g. RELIANCE, TCS, INFY) to observe live multi-agent execution.
            </div>
            <button onClick={() => onNavigate('new-research')} className="btn btn-primary" style={{ fontSize: '12px' }}>
              <PlusCircle size={14} />
              <span>Submit First Research Run</span>
            </button>
          </div>
        ) : (
          <div className="terminal-table-container">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Symbol</th>
                  <th>Pattern</th>
                  <th>Status</th>
                  <th>Submitted (UTC)</th>
                  <th style={{ textAlign: 'right' }}>Latency</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 8).map((run) => (
                  <tr key={run.run_id}>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
                      {run.run_id}
                    </td>
                    <td style={{ fontWeight: 700 }}>{run.symbol}</td>
                    <td>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {run.orchestration_pattern}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={run.status} size="sm" />
                    </td>
                    <td className="font-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(run.submitted_at).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {run.latency_seconds !== null && run.latency_seconds !== undefined
                        ? `${run.latency_seconds.toFixed(2)}s`
                        : run.status === 'RUNNING'
                        ? 'Running...'
                        : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onNavigate('live-execution', run.run_id)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        Open Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
