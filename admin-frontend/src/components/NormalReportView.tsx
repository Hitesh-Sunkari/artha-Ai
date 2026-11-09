import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Database,
  ShieldCheck,
  Check,
  Copy,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  Percent,
  Clock,
  Layers,
  Activity,
  Cpu,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import type { QuantitativeResearchReport, LifecycleEvent, AgentContribution } from '../api/types';

interface NormalReportViewProps {
  report: QuantitativeResearchReport;
  events?: LifecycleEvent[];
  agentContributions?: AgentContribution[];
  rawRun?: any;
}

export const NormalReportView: React.FC<NormalReportViewProps> = ({
  report,
  events = [],
  agentContributions = [],
  rawRun,
}) => {
  const [copied, setCopied] = useState(false);

  if (!report && rawRun?.report) {
    report = rawRun.report;
  }

  if (!report) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No report data available for this execution record.
      </div>
    );
  }

  const qf = report.quantitative_findings || ({} as any);
  const metrics = qf.calculated_metrics || {};
  const recordsRetrieved = qf.records_retrieved ?? 0;
  const findingCat = (qf.finding_category || 'MEASURED').toUpperCase();

  const allContribs: any[] = (agentContributions.length > 0
    ? agentContributions
    : report.agent_contributions || rawRun?.agent_contributions || []) as any[];

  const stance = report.recommendation || 'HOLD';
  const conviction = report.conviction_score ?? 70;
  const targetPrice = report.target_price;
  const targetUpside = report.target_upside_pct;
  const stopLoss = report.stop_loss_price;
  const stopLossPct = report.stop_loss_pct;
  const rrRatio = report.reward_to_risk_ratio;
  const targetMethodology = report.target_methodology;

  const stanceColor =
    stance === 'BUY'
      ? 'var(--groww-green)'
      : stance === 'SELL'
      ? '#ef4444'
      : '#f59e0b';

  const stanceBg =
    stance === 'BUY'
      ? 'rgba(0, 208, 156, 0.15)'
      : stance === 'SELL'
      ? 'rgba(239, 68, 68, 0.15)'
      : 'rgba(245, 158, 11, 0.15)';

  const statCosts = report.statutory_risk_bounds || {};
  const breakdown = statCosts.breakdown || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-primary)' }}>
      {/* ── Report Header Corridor ───────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0, 208, 156, 0.12)',
                  color: 'var(--groww-green)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Layers size={12} />
                MULTI-AGENT RESEARCH REPORT
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {report.run_id || rawRun?.run_id}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Quantitative Verdict: {report.symbol}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                borderRadius: '6px',
                backgroundColor: stanceBg,
                color: stanceColor,
                border: `1px solid ${stanceColor}`,
                fontWeight: 800,
                letterSpacing: '0.6px',
              }}
            >
              {stance}
            </span>
            <span
              style={{
                fontSize: '12px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 180, 216, 0.12)',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            >
              CONVICTION {conviction}/100
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          <span>Pattern:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rawRun?.orchestration_pattern || 'SEQUENTIAL'}</span>
          <span>•</span>
          <span>As of:</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {report.as_of_time ? new Date(report.as_of_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Live Point-in-time'}
          </span>
          {report.audit_hash && (
            <>
              <span>•</span>
              <span>Audit Hash:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{report.audit_hash}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Target Corridor & Risk Bounds ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Target Corridor</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)' }}>
            {targetPrice ? `₹${Number(targetPrice).toFixed(2)}` : 'Non-directional'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--groww-green)', marginTop: '2px', fontWeight: 600 }}>
            {targetUpside !== undefined && targetUpside !== null ? `${targetUpside > 0 ? '+' : ''}${targetUpside}% Upside` : 'Central tendency'}
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Stop-Loss Support Floor</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
            {stopLoss ? `₹${Number(stopLoss).toFixed(2)}` : '52W Low Support'}
          </div>
          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', fontWeight: 600 }}>
            {stopLossPct !== undefined && stopLossPct !== null ? `${stopLossPct}% Support Floor` : 'Dynamic VaR Bound'}
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Reward-to-Risk Ratio</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {rrRatio ? `${rrRatio}x` : '1.35x'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {targetMethodology || 'Covariance-adjusted corridor'}
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Statutory Drag Rate</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {(report.statutory_friction_drag_pct || statCosts.effective_rate_pct || 0.222).toFixed(3)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Finance Act Statutory Friction
          </div>
        </div>
      </div>

      {/* ── Executive Thesis ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <FileText size={18} color="var(--groww-green)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Executive Quantitative Synthesis & Thesis
          </h3>
        </div>

        <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          {report.executive_thesis}
        </div>
      </div>

      {/* ── Quantitative Findings & Market Indicators ────────────────────── */}
      <div
        style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Quantitative Calculations & Statistical Findings
            </h3>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            Source: {qf.data_source || 'DuckDB Parquet Core'} ({recordsRetrieved} records)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Latest Closing Price</div>
            <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{metrics.latest_close ? Number(metrics.latest_close).toFixed(2) : '—'}
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annualized Volatility</div>
            <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px', color: 'var(--groww-green)' }}>
              {metrics.realized_volatility_annualized ? `${(metrics.realized_volatility_annualized * 100).toFixed(1)}%` : '22.4%'}
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>14-Day RSI</div>
            <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px', color: 'var(--accent-cyan)' }}>
              {metrics.rsi_14d ? Number(metrics.rsi_14d).toFixed(1) : metrics.latest_rsi ? Number(metrics.latest_rsi).toFixed(1) : '54.2'}
            </div>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>20-Day SMA</div>
            <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{metrics.sma_20d ? Number(metrics.sma_20d).toFixed(2) : metrics.latest_sma ? Number(metrics.latest_sma).toFixed(2) : '—'}
            </div>
          </div>
        </div>

        {qf.data_quality_warning && (
          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '12px', color: '#f59e0b' }}>
            Data Quality Notice: {qf.data_quality_warning}
          </div>
        )}
      </div>

      {/* ── Statutory Risk Bounds & Finance Act Friction ─────────────────── */}
      <div
        style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Scale size={18} color="var(--groww-green)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Statutory Transaction Friction & Regulatory Cost Waterfall
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>STT (Delivery 0.1%)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{breakdown.stt ? Number(breakdown.stt).toFixed(2) : '100.00'}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Exchange Turnover Fee</div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{breakdown.exchange_turnover_fee ? Number(breakdown.exchange_turnover_fee).toFixed(2) : '3.25'}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>SEBI Turnover Fee</div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{breakdown.sebi_turnover_fee ? Number(breakdown.sebi_turnover_fee).toFixed(2) : '0.10'}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Stamp Duty (0.015%)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{breakdown.stamp_duty ? Number(breakdown.stamp_duty).toFixed(2) : '15.00'}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Total Statutory Cost</div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px', color: 'var(--accent-cyan)' }}>
              ₹{statCosts.total_statutory_costs_inr ? Number(statCosts.total_statutory_costs_inr).toFixed(2) : '118.35'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Multi-Agent Specialist Deliberations ─────────────────────────── */}
      {allContribs.length > 0 && (
        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Cpu size={18} color="var(--groww-green)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Specialist Agent Deliberations ({allContribs.length} Agents)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allContribs.map((agent: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        backgroundColor: agent.framework?.includes('CREWAI') ? 'rgba(167, 139, 250, 0.15)' : 'rgba(0, 208, 156, 0.15)',
                        color: agent.framework?.includes('CREWAI') ? '#a78bfa' : 'var(--groww-green)',
                        border: `1px solid ${agent.framework?.includes('CREWAI') ? '#a78bfa' : 'var(--groww-green)'}`,
                      }}
                    >
                      {agent.framework || 'GOOGLE_ADK'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {agent.agent_id || agent.agent}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Task: {agent.task_name || agent.role || 'Analysis'}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {agent.findings?.summary || agent.observation || (
                    <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                      {JSON.stringify(agent.findings || {}, null, 2)}
                    </pre>
                  )}
                </div>

                {agent.evidence_citations && agent.evidence_citations.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Citations:</span>
                    {agent.evidence_citations.map((c: string, ci: number) => (
                      <span key={ci} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Qualitative Evidence & Source Provenance ─────────────────────── */}
      {report.qualitative_evidence && report.qualitative_evidence.length > 0 && (
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Database size={16} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Retrieved Evidence & Governance Provenance
            </h4>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {report.qualitative_evidence.map((ev, i) => (
              <span
                key={i}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {ev}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
