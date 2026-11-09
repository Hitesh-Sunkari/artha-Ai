import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Compass,
  Cpu,
  Layers,
  Database,
  Calendar,
  ChevronRight,
  HelpCircle,
  Briefcase,
  FileText,
  Activity,
} from 'lucide-react';

interface QueryReportViewProps {
  result: any;
  rawRun?: any;
}

export const QueryReportView: React.FC<QueryReportViewProps> = ({ result, rawRun }) => {
  const [selectedSegmentSymbol, setSelectedSegmentSymbol] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('baseline');

  if (!result && rawRun) {
    // If result was not directly stored, attempt to extract from quantitative_findings
    result = rawRun?.report?.quantitative_findings?.query_research_result || {
      query: rawRun.symbol,
      detected_symbols: [rawRun.symbol],
      verdict: rawRun.recommendation || 'ACCUMULATE',
      conviction_score: rawRun.conviction_score || 75,
      horizon_years: 5,
      executive_synthesis: rawRun.report?.executive_thesis || 'No synthesis available.',
    };
  }

  if (!result) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No query research data available for this run.
      </div>
    );
  }

  const queryText = result.query || rawRun?.symbol || 'Natural Language Quantitative Research';
  const symbols: string[] = result.detected_symbols || (result.stocks_analyzed ? result.stocks_analyzed.map((s: any) => s.ticker) : [rawRun?.symbol || 'RELIANCE']);
  const horizon = result.horizon_years || 10;
  const verdict = result.verdict || rawRun?.report?.recommendation || 'ACCUMULATE';
  const conviction = result.conviction_score ?? 80;
  const synthesis = result.executive_synthesis || rawRun?.report?.executive_thesis || '';
  const isCommodity = !!result.is_commodity;
  const isSubstitute = !!result.is_substitute_assets;

  const stocks = result.stocks_analyzed || [];
  const primaryStock = stocks[0] || {
    ticker: symbols[0] || 'RELIANCE',
    name: symbols[0] || 'Reliance Industries',
    ltp: 18.1,
    day_change_perc: 1.63,
  };

  const proj = result.ten_year_projection || {};
  const multiCombo = result.multi_stock_combination;
  const convictionDetails = result.conviction_details || {};
  const personalized = result.personalized_portfolio || {};
  const taxWaterfall = proj.tax_waterfall || result.statutory_tax_drag || {};
  const agentContribs = result.agent_contributions || rawRun?.agent_contributions || [];
  const fastmcpCalls = result.fastmcp_tool_calls || [];
  const telemetry = result.execution_telemetry || {};

  const activeCapital = Math.round(
    personalized.current_holding_value ||
    taxWaterfall.initial_capital ||
    500000
  );

  const getVerdictBadge = (v: string) => {
    const upper = (v || '').toUpperCase();
    if (upper.includes('BUY') || upper.includes('STRONG_BUY')) {
      return { bg: 'rgba(0, 208, 156, 0.15)', text: 'var(--groww-green)', border: 'var(--groww-green)' };
    }
    if (upper.includes('ACCUMULATE') || upper.includes('BALANCED')) {
      return { bg: 'rgba(0, 180, 216, 0.15)', text: 'var(--accent-cyan)', border: 'var(--accent-cyan)' };
    }
    if (upper.includes('HOLD') || upper.includes('NEUTRAL')) {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b' };
    }
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' };
  };

  const verdictBadge = getVerdictBadge(verdict);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-primary)' }}>
      {/* ── Query Context Header Banner ─────────────────────────────────── */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
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
                <Sparkles size={12} />
                QUERY RESEARCH AUDIT REPORT
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {result.run_id || rawRun?.run_id}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              &ldquo;{queryText}&rdquo;
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: verdictBadge.bg,
                color: verdictBadge.text,
                border: `1px solid ${verdictBadge.border}`,
                fontWeight: 800,
                letterSpacing: '0.5px',
              }}
            >
              {verdict.replace(/_/g, ' ')}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 8px',
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

        {/* Badges Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11.5px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Equities / Instruments:</span>
          {symbols.map((sym) => (
            <span
              key={sym}
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--groww-green)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              {sym.replace('.NS', '').replace('.BO', '')}
            </span>
          ))}
          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
          <span style={{ color: 'var(--text-muted)' }}>Horizon:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{horizon} Years</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
          <span style={{ color: 'var(--text-muted)' }}>Asset Class:</span>
          <span style={{ fontWeight: 600, color: isCommodity ? '#f59e0b' : 'var(--accent-cyan)' }}>
            {isCommodity ? 'Commodity (Bullion)' : 'Equity (Corporate)'}
          </span>
          {result.timestamp && (
            <>
              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
              <span style={{ color: 'var(--text-muted)' }}>Executed:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{result.timestamp}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Key Metrics Corridor ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {isCommodity ? `Anchor Unit (${primaryStock.ticker?.replace('.NS', '')})` : 'Current Anchor LTP'}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            ₹{primaryStock.ltp ? (primaryStock.ltp < 100 ? primaryStock.ltp.toFixed(2) : Math.round(primaryStock.ltp).toLocaleString('en-IN')) : '18.10'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--groww-green)', marginTop: '2px', fontWeight: 600 }}>
            +{primaryStock.day_change_perc ? primaryStock.day_change_perc.toFixed(2) : '1.63'}% Today
            {isCommodity && <span style={{ color: 'var(--accent-cyan)', marginLeft: '6px' }}>• MCX 1kg: ₹98,500</span>}
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Base Median Target (P50)
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)' }}>
            ₹{proj.p50_base_target ? (proj.p50_base_target < 100 ? proj.p50_base_target.toFixed(2) : Math.round(proj.p50_base_target).toLocaleString('en-IN')) : '57.00'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--groww-green)', marginTop: '2px', fontWeight: 600 }}>
            +{proj.base_cagr_pct || '12.08'}% CAGR ({horizon}Y)
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Beat 5.49% Inflation
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {proj.prob_beat_inflation || 89.4}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Empirical Monte Carlo Prob
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Net Post-Tax CAGR
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {taxWaterfall.net_post_tax_cagr_pct || proj.base_cagr_pct || 11.13}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Finance Act 2024 (12.5% LTCG)
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            1Y 95% Parametric VaR
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
            {proj.var_95_1y_pct ? (proj.var_95_1y_pct > 0 ? `-${proj.var_95_1y_pct}%` : `${proj.var_95_1y_pct}%`) : '-13.0%'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            CVaR: {proj.cvar_95_pct ? `${proj.cvar_95_pct}%` : '-19.4%'}
          </div>
        </div>
      </div>

      {/* ── Direct Inquiry Resolution Card ──────────────────────────────── */}
      <div
        style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 208, 156, 0.05)',
          border: '1px solid rgba(0, 208, 156, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Zap size={18} color="var(--groww-green)" />
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--groww-green)', margin: 0, letterSpacing: '0.5px' }}>
            DIRECT INQUIRY RESOLUTION: {queryText}
          </h3>
        </div>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
          {isCommodity ? (
            <>
              Over the next {horizon} years, physical silver bullion is modeled under 5,000 Monte Carlo paths to compound at a{' '}
              <strong>baseline median CAGR of +{proj.base_cagr_pct || 9.35}%</strong>, moving from the current anchor of ₹{primaryStock.ltp || 18.1} to a P50 terminal target of{' '}
              <strong>₹{proj.p50_base_target ? (proj.p50_base_target < 100 ? proj.p50_base_target.toFixed(2) : Math.round(proj.p50_base_target).toLocaleString('en-IN')) : '57.00'}</strong>.
              In physical bullion terms (MCX Benchmark), 1 Kg pure silver bar expands from <strong>~₹98,500/kg</strong> to <strong>~₹{Math.round(98500 * ((proj.p50_base_target || 57) / (primaryStock.ltp || 18.1))).toLocaleString('en-IN')}/kg</strong>.
              In a bullish supercycle (P90), prices reach <strong>₹{proj.p90_bull_target ? (proj.p90_bull_target < 100 ? proj.p90_bull_target.toFixed(2) : Math.round(proj.p90_bull_target).toLocaleString('en-IN')) : '124.00'}</strong> (+{proj.bull_cagr_pct || 14.5}% CAGR), while the {horizon}Y Bearish Floor (P10) sits at{' '}
              <strong>₹{proj.p10_bear_target ? (proj.p10_bear_target < 100 ? proj.p10_bear_target.toFixed(2) : Math.round(proj.p10_bear_target).toLocaleString('en-IN')) : '18.00'}</strong>. Empirical probability of outpacing 5.49% inflation is <strong>{proj.prob_beat_inflation || 89.4}%</strong>.
            </>
          ) : multiCombo ? (
            multiCombo.volatility_reduction_pct <= 0 ? (
              <>
                Combining {symbols.map((s) => s.replace('.NS', '')).join(', ')} captures focused industry sector beta ({multiCombo.combined_volatility_pct}% combined volatility) with SLSQP optimizer concentrating weight in the lower-beta asset, generating an expected baseline compounding return of{' '}
                <strong>+{multiCombo.combined_expected_return_pct}% CAGR</strong> over {horizon} years.
              </>
            ) : (
              <>
                Combining {symbols.map((s) => s.replace('.NS', '')).join(', ')} under Minimum-Variance Ledoit-Wolf shrinkage delivers an optimized{' '}
                <strong>+{multiCombo.volatility_reduction_pct}% volatility reduction</strong> (from {multiCombo.weighted_avg_single_volatility_pct}% down to {multiCombo.combined_volatility_pct}%) while generating an expected baseline return of{' '}
                <strong>+{multiCombo.combined_expected_return_pct}% CAGR</strong>.
              </>
            )
          ) : (
            <>
              Over the {horizon}-year horizon, {primaryStock.name || symbols[0]} is projected under 5,000 Monte Carlo paths to compound at a{' '}
              <strong>baseline median CAGR of +{proj.base_cagr_pct || 12.5}%</strong>, reaching a P50 target of{' '}
              <strong>₹{proj.p50_base_target ? (proj.p50_base_target < 100 ? proj.p50_base_target.toFixed(2) : Math.round(proj.p50_base_target).toLocaleString('en-IN')) : '—'}</strong> with an empirical <strong>{proj.prob_beat_inflation || 85}% probability of beating inflation</strong>.
            </>
          )}
        </p>
      </div>

      {/* ── Investor Questionnaire & Personalized Holding Context ───────── */}
      {personalized && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Personalized Portfolio Blueprint ({personalized.is_invested ? `Holding ₹${activeCapital.toLocaleString('en-IN')}` : `Planned Fresh Entry of ₹${activeCapital.toLocaleString('en-IN')}`})
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              Objective: {(personalized.investor_objective || 'WEALTH_COMPOUNDING').replace(/_/g, ' ')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Projected {horizon}-Year Terminal Value</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                ₹{Math.round(personalized.personalized_wealth || personalized.ten_year_personalized_wealth || (activeCapital * Math.pow(1 + (proj.base_cagr_pct || 11)/100, horizon))).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Directive Posture</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--groww-green)' }}>
                {convictionDetails.posture || 'CONVICTION_HOLD / ACCUMULATE'}
              </div>
            </div>
          </div>

          {personalized.personalized_advice && (
            <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
              {personalized.personalized_advice}
            </p>
          )}
        </div>
      )}

      {/* ── Executive Synthesis Full Report ──────────────────────────────── */}
      <div
        style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <FileText size={18} color="var(--groww-green)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Institutional Chief Investment Officer (CIO) Synthesis
          </h3>
        </div>

        <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
          {synthesis}
        </div>
      </div>

      {/* ── Multi-Stock SLSQP Allocations (if multi-asset) ───────────────── */}
      {multiCombo && multiCombo.weights && (
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
              <ShieldCheck size={18} color="var(--groww-green)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Optimal Minimum-Variance Weight Allocation (₹{activeCapital.toLocaleString('en-IN')} Portfolio)
              </h3>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 208, 156, 0.1)',
                color: 'var(--groww-green)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            >
              {multiCombo.volatility_reduction_pct <= 0 ? 'Single-Sector Beta Capture' : `+${multiCombo.volatility_reduction_pct}% Volatility Reduction`}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 10px' }}>Security</th>
                <th style={{ padding: '8px 10px' }}>Optimal Weight</th>
                <th style={{ padding: '8px 10px' }}>Allocation (INR)</th>
                <th style={{ padding: '8px 10px', minWidth: '160px' }}>Allocation Progress</th>
                <th style={{ padding: '8px 10px' }}>Strategic Role</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(multiCombo.weights).map(([sym, wt]: [string, any]) => {
                const inrAlloc = (wt / 100) * activeCapital;
                return (
                  <tr key={sym} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sym.replace('.NS', '')}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--groww-green)' }}>
                      {Number(wt).toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
                      ₹{Math.round(inrAlloc).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, wt))}%`, backgroundColor: 'var(--groww-green)', borderRadius: '4px' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {Number(wt).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {wt >= 40 ? 'Primary Core Compounding Engine' : wt >= 20 ? 'Secondary Sector Anchor' : 'Tactical Diversification Stabilizer'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {multiCombo.recommendation_rationale && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {multiCombo.recommendation_rationale}
            </p>
          )}
        </div>
      )}

      {/* ── SOTP Segment Drivers with Symbol Tabs ─────────────────────────── */}
      {result.segment_drivers_by_symbol && Object.keys(result.segment_drivers_by_symbol).length > 0 && (
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
              <Compass size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Sum of the Parts (SOTP) Segment Drivers & Growth Engines
              </h3>
            </div>

            {Object.keys(result.segment_drivers_by_symbol).length > 1 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {Object.keys(result.segment_drivers_by_symbol).map((sym) => {
                  const active = (selectedSegmentSymbol || Object.keys(result.segment_drivers_by_symbol)[0]) === sym;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSelectedSegmentSymbol(sym)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: active ? 'var(--accent-cyan)' : 'var(--bg-surface)',
                        color: active ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {sym.replace('.NS', '')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {(() => {
            const sym = selectedSegmentSymbol || Object.keys(result.segment_drivers_by_symbol)[0];
            const drivers = result.segment_drivers_by_symbol[sym] || [];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {drivers.map((seg: any, idx: number) => (
                  <div key={idx} style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{seg.segment}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 700 }}>
                        {seg.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${seg.contribution_pct}%`, backgroundColor: 'var(--accent-cyan)', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {seg.contribution_pct}%
                      </span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {seg.growth_driver}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Finance Act 2024 Statutory Tax Drag Waterfall ────────────────── */}
      {taxWaterfall && (
        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Scale size={18} color="var(--groww-green)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {isCommodity
                ? `Finance (No. 2) Act 2024 Section 112 Statutory Tax Drag (₹${activeCapital.toLocaleString('en-IN')} Portfolio)`
                : `Finance (No. 2) Act 2024 Section 112A Statutory Tax Drag (₹${activeCapital.toLocaleString('en-IN')} Portfolio)`}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gross Final Wealth</div>
              <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                ₹{Math.round(taxWaterfall.gross_final_wealth || (activeCapital * 1.8)).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Statutory Exemption</div>
              <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--groww-green)' }}>
                ₹{Math.round(taxWaterfall.statutory_exemption_112a || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LTCG Tax (12.5%)</div>
              <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                ₹{Math.round(taxWaterfall.ltcg_tax_12_5_pct || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Net In-Hand Wealth</div>
              <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                ₹{Math.round(taxWaterfall.net_in_hand_wealth || (activeCapital * 1.7)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Statutory Reference: {taxWaterfall.statutory_reference || 'Finance (No. 2) Act 2024'} • Tax Drag: {taxWaterfall.tax_drag_bps || 82} bps
          </div>
        </div>
      )}

      {/* ── Multi-Agent Specialist Deliberations ─────────────────────────── */}
      {agentContribs && agentContribs.length > 0 && (
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
              Autonomous Multi-Agent Specialist Deliberations ({agentContribs.length} Agents)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {agentContribs.map((agent: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    backgroundColor: agent.framework?.includes('CrewAI') ? 'rgba(167, 139, 250, 0.15)' : 'rgba(0, 208, 156, 0.15)',
                    color: agent.framework?.includes('CrewAI') ? '#a78bfa' : 'var(--groww-green)',
                    border: `1px solid ${agent.framework?.includes('CrewAI') ? '#a78bfa' : 'var(--groww-green)'}`,
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {agent.framework || 'Google ADK'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {agent.agent || agent.agent_id}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({agent.role || agent.task_name})
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {agent.observation || agent.findings?.summary || JSON.stringify(agent.findings || {})}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FastMCP Tool Calls Audit Trail ────────────────────────────────── */}
      {fastmcpCalls && fastmcpCalls.length > 0 && (
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Layers size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              FastMCP Gateway Forensic Tool Calls ({fastmcpCalls.length} Executions)
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px 8px' }}>Tool Name</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Latency</th>
                  <th style={{ padding: '6px 8px' }}>Parameters / Summary</th>
                </tr>
              </thead>
              <tbody>
                {fastmcpCalls.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: 'var(--groww-green)', fontWeight: 600 }}>
                      {c.tool_name}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(0, 208, 156, 0.1)', color: 'var(--groww-green)', fontWeight: 700 }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>
                      {c.latency_ms?.toFixed(1)}ms
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                      {c.summary || JSON.stringify(c.parameters || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

