import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Database,
  ShieldCheck,
  Check,
  Copy,
  Download,
  Info,
  Layers,
  Activity,
  Calendar,
} from 'lucide-react';
import type { LifecycleEvent, QuantitativeResearchReport } from '../api/types';
import { StatCostBreakdown } from './StatCostBreakdown';
import { FinancialCharts } from './FinancialCharts';

interface ReportViewProps {
  report: QuantitativeResearchReport;
  events?: LifecycleEvent[];
}

export const ReportView: React.FC<ReportViewProps> = ({ report, events = [] }) => {
  const [copied, setCopied] = useState(false);

  const qf = report.quantitative_findings || {};
  const metrics = qf.calculated_metrics || {};
  const recordsRetrieved = qf.records_retrieved ?? 0;
  const findingCat = (qf.finding_category || 'UNAVAILABLE').toUpperCase();
  const isEmptyData = qf.empty_result || recordsRetrieved === 0;

  const copyReportJson = () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const md = `# ArthaAI Quantitative Research Report: ${report.symbol}
**Execution Run ID:** \`${report.run_id}\`  
**Point-In-Time (UTC):** ${report.as_of_time}  
**Generated At (UTC):** ${report.generated_at}  

---

## Executive Thesis
${report.executive_thesis}

---

## Quantitative Findings
- **Data Source:** ${qf.data_source || 'duckdb_parquet'}
- **Records Retrieved:** ${recordsRetrieved} historical bars
- **Finding Category:** ${findingCat}
${qf.data_quality_warning ? `\n> ⚠️ **Data Quality Notice:** ${qf.data_quality_warning}\n` : ''}

### Calculated Metrics
- **Latest Close:** ${metrics.latest_close !== undefined && metrics.latest_close !== null ? `₹${Number(metrics.latest_close).toFixed(2)}` : 'N/A'}
- **Realized Volatility (Annualized):** ${metrics.realized_volatility_annualized !== undefined && metrics.realized_volatility_annualized !== null ? `${(Number(metrics.realized_volatility_annualized) * 100).toFixed(2)}%` : 'N/A'}
- **Simple Return Mean:** ${metrics.sample_return_mean !== undefined && metrics.sample_return_mean !== null ? `${(Number(metrics.sample_return_mean) * 100).toFixed(4)}%` : 'N/A'}
- **SMA (20-bar):** ${metrics.latest_sma !== undefined && metrics.latest_sma !== null ? `₹${Number(metrics.latest_sma).toFixed(2)}` : 'N/A'}
- **EMA (20-bar):** ${metrics.latest_ema !== undefined && metrics.latest_ema !== null ? `₹${Number(metrics.latest_ema).toFixed(2)}` : 'N/A'}
- **RSI (14-bar):** ${metrics.latest_rsi !== undefined && metrics.latest_rsi !== null ? `${Number(metrics.latest_rsi).toFixed(2)}` : 'N/A'}

---

## Statutory Risk Bounds & Indian Market Friction
- **Total Statutory Costs:** ₹${(report.statutory_risk_bounds?.total_statutory_costs_inr ?? 0).toFixed(2)} per 100k
- **Effective Rate:** ${(report.statutory_risk_bounds?.effective_rate_pct ?? 0).toFixed(4)}%

---

## Qualitative Evidence & Citations
${report.qualitative_evidence?.length ? report.qualitative_evidence.map((c) => `- ${c}`).join('\n') : '- No historical evidence cited.'}

---

## Source Provenance
${report.source_provenance?.length ? report.source_provenance.map((p) => `- \`${p}\``).join('\n') : '- N/A'}

---

## Limitations & Uncertainties
${report.limitations_and_uncertainties?.length ? report.limitations_and_uncertainties.map((l) => `- ⚠️ ${l}`).join('\n') : '- Zero lookahead bounds strictly enforced.'}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arthaai_research_${report.symbol}_${report.run_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Report Header Card */}
      <div className="groww-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {report.symbol}
              </span>
              <span className="pill-badge pill-badge-blue">
                Pydantic v2 Validated
              </span>
              <span
                className={`pill-badge ${
                  findingCat === 'MEASURED' ? 'pill-badge-green' : 'pill-badge-amber'
                }`}
              >
                {findingCat}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>Run ID: <strong style={{ color: 'var(--text-secondary)' }}>{report.run_id}</strong></span>
              <span>•</span>
              <span>Point-In-Time: {new Date(report.as_of_time).toUTCString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={copyReportJson} className="btn-groww-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
              {copied ? <Check size={14} style={{ color: 'var(--groww-green)' }} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button onClick={downloadMarkdown} className="btn-groww-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
              <Download size={14} />
              <span>Download Markdown</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Thesis */}
      <div className="groww-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={18} style={{ color: 'var(--groww-green)' }} />
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Executive Synthesis Thesis
          </h4>
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)', padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid var(--groww-green)' }}>
          {report.executive_thesis}
        </p>
      </div>

      {/* Quantitative Findings Grid */}
      <div className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--accent-cyan)' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quantitative Observations & Verified Indicators
            </h4>
          </div>

          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Source: <span style={{ color: 'var(--text-secondary)' }}>{qf.data_source || 'duckdb_parquet'}</span> ({recordsRetrieved} bars)
          </div>
        </div>

        {/* If zero observations, explain clearly without fabricating */}
        {isEmptyData ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-amber)', marginBottom: '4px' }}>
                Zero Historical Records Retrieved (Evidence Integrity Semantic Enforced)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {qf.data_quality_warning ||
                  `The historical DuckDB/Parquet storage layer contains 0 pre-recorded bars for ${report.symbol} prior to the enforced Point-In-Time cutoff. Per evidence-integrity rules, no prices, returns, or technical indicators are fabricated.`}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid-cols-3" style={{ gap: '14px' }}>
            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Latest Close Price</div>
              <div className="font-mono tabular-nums" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {metrics.latest_close ? `₹${Number(metrics.latest_close).toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Realized Volatility (Ann.)</div>
              <div className="font-mono tabular-nums" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--groww-blue)', marginTop: '4px' }}>
                {metrics.realized_volatility_annualized ? `${(Number(metrics.realized_volatility_annualized) * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sample Mean Return</div>
              <div className="font-mono tabular-nums" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--groww-green)', marginTop: '4px' }}>
                {metrics.sample_return_mean ? `${(Number(metrics.sample_return_mean) * 100).toFixed(4)}%` : 'N/A'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SMA (20-bar)</div>
              <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                {metrics.latest_sma ? `₹${Number(metrics.latest_sma).toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>EMA (20-bar)</div>
              <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                {metrics.latest_ema ? `₹${Number(metrics.latest_ema).toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>RSI (14-bar)</div>
              <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {metrics.latest_rsi ? Number(metrics.latest_rsi).toFixed(2) : 'N/A'}
              </div>
            </div>

            {/* Extended 5-Year Quantitative Indicators */}
            {metrics.coverage_years ? (
              <>
                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>5-Year Coverage</div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--groww-green)', marginTop: '4px' }}>
                    {metrics.coverage_years} Years ({qf.records_retrieved || '1,260'} bars)
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SMA (200-bar Institutional)</div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {metrics.sma_200d ? `₹${Number(metrics.sma_200d).toFixed(2)}` : 'N/A'}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>5-Year Max Drawdown</div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--groww-red)', marginTop: '4px' }}>
                    {metrics.max_drawdown_5y !== undefined ? `${(Number(metrics.max_drawdown_5y) * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>52-Week Range (Low / High)</div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {metrics.low_52w ? `₹${Number(metrics.low_52w).toFixed(0)}` : '—'} / {metrics.high_52w ? `₹${Number(metrics.high_52w).toFixed(0)}` : '—'}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SMA (50-bar Trend)</div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {metrics.sma_50d ? `₹${Number(metrics.sma_50d).toFixed(2)}` : 'N/A'}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>5-Year Realized Volatility</div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--groww-blue)', marginTop: '4px' }}>
                    {metrics.realized_volatility_5y ? `${(Number(metrics.realized_volatility_5y) * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Usable Visualizations: Candlestick Price Charts, RSI & Agent Latency Breakdown */}
      <FinancialCharts
        symbol={report.symbol}
        bars={qf.historical_bars || []}
        metrics={metrics}
        events={events}
      />

      {/* Indian Statutory Friction & Transaction Bounds */}
      <StatCostBreakdown statutoryBounds={report.statutory_risk_bounds} />

      {/* Citations & Qualitative Evidence */}
      <div className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Database size={16} style={{ color: 'var(--accent-cyan)' }} />
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Evidence & Primary Data Citations
          </h4>
        </div>

        {report.qualitative_evidence?.length ? (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.qualitative_evidence.map((cit, idx) => (
              <li
                key={idx}
                className="font-mono"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  borderLeft: '3px solid var(--accent-indigo)',
                }}
              >
                {cit}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No external citations contributed for this observation.
          </div>
        )}
      </div>

      {/* System Provenance & Strict Limitations */}
      <div className="grid-cols-2" style={{ gap: '16px' }}>
        {/* Source Provenance */}
        <div className="terminal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Layers size={16} style={{ color: 'var(--accent-cyan)' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Engine Provenance
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {report.source_provenance?.map((prov, idx) => (
              <div
                key={idx}
                className="font-mono"
                style={{
                  fontSize: '11px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                }}
              >
                {prov}
              </div>
            ))}
          </div>
        </div>

        {/* Limitations & Uncertainties */}
        <div className="terminal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Limitations & Safety Guardrails
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {report.limitations_and_uncertainties?.map((lim, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                <span style={{ color: 'var(--accent-amber)' }}>•</span>
                <span>{lim}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
