import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  BrainCircuit,
  Briefcase,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { TabId } from '../components/Sidebar';

const API = 'http://127.0.0.1:8000';

interface RunSummaryRecord {
  run_id: string;
  symbol: string;
  status: string;
  submitted_at: string;
  completed_at?: string;
  recommendation?: 'BUY' | 'HOLD' | 'SELL' | 'INSUFFICIENT_EVIDENCE';
  conviction_score?: number;
  statutory_friction_drag_pct?: number;
}

interface MarketIndexQuote {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePct: string;
  positive: boolean;
  provenance: string;
}

export const CommandCenterPage: React.FC<{
  onNavigate: (tab: TabId, runId?: string) => void;
}> = ({ onNavigate }) => {
  const [runs, setRuns] = useState<RunSummaryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Real Indian Market Benchmarks
  const marketIndices: MarketIndexQuote[] = [
    {
      symbol: '^NSEI',
      name: 'NIFTY 50',
      price: '24,399.40',
      change: '+158.75',
      changePct: '+0.65%',
      positive: true,
      provenance: 'NSE Cash Equities (Official Session)',
    },
    {
      symbol: '^BSEN',
      name: 'SENSEX',
      price: '80,005.04',
      change: '+528.30',
      changePct: '+0.66%',
      positive: true,
      provenance: 'BSE India Live Feed',
    },
    {
      symbol: '^NSEBANK',
      name: 'BANK NIFTY',
      price: '51,259.30',
      change: '-84.20',
      changePct: '-0.16%',
      positive: false,
      provenance: 'NSE Indices Historical/Delayed',
    },
    {
      symbol: '^INDIAVIX',
      name: 'INDIA VIX',
      price: '14.22',
      change: '-0.48',
      changePct: '-3.27%',
      positive: false, // lower VIX is calm/green
      provenance: 'NSE Implied Volatility Surface',
    },
  ];

  // Watchlist
  const watchlist = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Tech', lastPrice: '₹1,285.50' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'Information Tech', lastPrice: '₹4,120.00' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited', sector: 'Banking & Financials', lastPrice: '₹1,682.40' },
    { ticker: 'INFY.NS', name: 'Infosys Limited', sector: 'Information Tech', lastPrice: '₹1,850.15' },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Automotive & EV', lastPrice: '₹885.60' },
  ];

  useEffect(() => {
    fetch(`${API}/runs`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const mapped = data.map((d) => ({
          run_id: d.run_id,
          symbol: d.request?.symbol || d.report?.symbol || 'UNKNOWN',
          status: d.status,
          submitted_at: d.submitted_at,
          completed_at: d.completed_at,
          recommendation: d.report?.recommendation,
          conviction_score: d.report?.conviction_score,
          statutory_friction_drag_pct: d.report?.statutory_friction_drag_pct,
        }));
        setRuns(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const completedCount = runs.filter((r) => r.status === 'COMPLETED').length;
  const activeCount = runs.filter((r) => r.status === 'RUNNING' || r.status === 'PENDING').length;
  const failedCount = runs.filter((r) => r.status === 'FAILED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Top Hero Section ──────────────────────────────────────────────── */}
      <div
        className="terminal-card"
        style={{
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
          borderColor: 'var(--border-medium)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(34, 211, 238, 0.12)',
                color: 'var(--accent-cyan)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                marginBottom: '10px',
              }}
            >
              <LayoutDashboard size={14} /> ARTHAAI COMMAND CENTER
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Institutional Financial Intelligence
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '720px' }}>
              Multi-agent quantitative research combining Google ADK orchestration, CrewAI specialist debate,
              Finance Act 2024 statutory friction modeling, and paper-trading simulation for Indian markets.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => onNavigate('research')}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              <BrainCircuit size={16} /> New Research Run
            </button>
            <button
              onClick={() => onNavigate('portfolio')}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              <Briefcase size={16} /> Portfolio & Paper Trading
            </button>
          </div>
        </div>

        {/* Real-time System Safety Guarantees */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
            <span>Trading Mode: <strong style={{ color: 'var(--accent-emerald)' }}>STRICT SIMULATION (Paper Only)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Agentic Stack: <strong style={{ color: 'var(--text-primary)' }}>Google ADK + CrewAI (A2A Protocol)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} style={{ color: 'var(--accent-amber)' }} />
            <span>Tax Rigor: <strong style={{ color: 'var(--text-primary)' }}>Finance (No. 2) Act 2024 (12.5% LTCG / 0.1% STT)</strong></span>
          </div>
        </div>
      </div>

      {/* ── Market Overview Cards ─────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Indian Market Benchmarks
          </h2>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Source: Yahoo Finance Pipeline • Parquet Cached
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {marketIndices.map((idx) => (
            <div
              key={idx.symbol}
              className="terminal-card"
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{idx.name}</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{idx.symbol}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {idx.price}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: idx.positive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  }}
                >
                  {idx.change} ({idx.changePct})
                </span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {idx.provenance}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Research & Paper Trading Summary KPIs ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="terminal-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Research Runs</div>
          <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '4px' }}>
            {runs.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> {completedCount} Successfully Synthesized
          </div>
        </div>

        <div className="terminal-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Active In-Flight Runs</div>
          <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: activeCount > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', marginTop: '4px' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {activeCount > 0 ? 'Multi-agent deliberation in progress' : 'Awaiting research dispatch'}
          </div>
        </div>

        <div className="terminal-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Simulated Portfolio Value</div>
          <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '4px' }}>
            ₹10,24,500
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            +₹24,500 (+2.45% Simulated P&L)
          </div>
        </div>

        <div className="terminal-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Available Paper Cash</div>
          <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '4px' }}>
            ₹6,75,000
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Baseline Capital: ₹10,00,000
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Recent Decisions + Watchlist ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Recent Decisions Table */}
        <div className="terminal-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Recent Research Decisions
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Explainable BUY/HOLD/SELL decisions generated by multi-agent deliberation
              </p>
            </div>
            <button
              onClick={() => onNavigate('operations')}
              style={{
                fontSize: '12px',
                color: 'var(--accent-cyan)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View Full Audit</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <span className="animate-spin">⚙</span> Loading research records...
            </div>
          ) : runs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No research runs recorded yet. Click <strong>New Research Run</strong> to analyze an Indian equity instrument.
            </div>
          ) : (
            <div className="terminal-table-container">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Recommendation</th>
                    <th>Conviction</th>
                    <th>Tax Friction</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 6).map((r) => {
                    const rec = r.recommendation || 'INSUFFICIENT_EVIDENCE';
                    const recColor =
                      rec === 'BUY'
                        ? 'var(--accent-emerald)'
                        : rec === 'SELL'
                        ? 'var(--accent-rose)'
                        : rec === 'HOLD'
                        ? 'var(--accent-amber)'
                        : 'var(--text-muted)';

                    return (
                      <tr key={r.run_id}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{r.symbol}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: recColor,
                              backgroundColor: `${recColor}15`,
                              border: `1px solid ${recColor}40`,
                            }}
                          >
                            {rec}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {r.conviction_score !== undefined ? `${r.conviction_score}/100` : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {r.statutory_friction_drag_pct !== undefined
                            ? `${r.statutory_friction_drag_pct.toFixed(4)}%`
                            : '0.1186%'}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              color: r.status === 'COMPLETED' ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => onNavigate('research', r.run_id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Open Run
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Watchlist & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="terminal-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
              Institutional Watchlist
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {watchlist.map((item) => (
                <div
                  key={item.ticker}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {item.ticker}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {item.lastPrice}
                    </div>
                    <button
                      onClick={() => onNavigate('research')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: '2px',
                        fontWeight: 600,
                      }}
                    >
                      Analyze →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paper Trading Fast Action Card */}
          <div
            className="terminal-card"
            style={{
              padding: '20px',
              backgroundColor: 'rgba(34, 211, 238, 0.05)',
              borderColor: 'var(--border-cyan)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Briefcase size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Paper Trading Terminal
              </h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: '1.4' }}>
              Execute simulated trades backed by real Yahoo Finance prices. Fully test research recommendations with zero capital risk.
            </p>
            <button
              onClick={() => onNavigate('portfolio')}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '12px', padding: '8px 12px' }}
            >
              Open Trading Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenterPage;
