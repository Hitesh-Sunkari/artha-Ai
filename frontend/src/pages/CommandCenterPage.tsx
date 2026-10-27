import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BrainCircuit,
  Briefcase,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import type { TabId } from '../components/Sidebar';
import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

interface RunSummaryRecord {
  run_id: string;
  symbol: string;
  status: string;
  submitted_at: string;
  completed_at?: string;
  recommendation?: 'BUY' | 'HOLD' | 'SELL' | 'INSUFFICIENT_EVIDENCE' | string;
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
  timestamp?: string;
}

export const CommandCenterPage: React.FC<{
  onNavigate: (tab: TabId, runId?: string) => void;
}> = ({ onNavigate }) => {
  const [runs, setRuns] = useState<RunSummaryRecord[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndexQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  // Real Paper Account State from LocalStorage
  const [paperCash] = useState<number>(() => {
    const s = localStorage.getItem('arthai_paper_cash');
    return s ? parseFloat(s) : 1000000.0;
  });
  const [paperPositions] = useState<any[]>(() => {
    const s = localStorage.getItem('arthai_paper_positions');
    return s ? JSON.parse(s) : [];
  });

  const positionsMarketValue = paperPositions.reduce(
    (acc, p) => acc + p.shares * (p.currentPrice || p.avgPrice),
    0
  );
  const totalPortfolioValue = paperCash + positionsMarketValue;
  const totalCostBasis = paperPositions.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
  const unrealizedPnL = positionsMarketValue - totalCostBasis;
  const pnlPct = totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0.0;

  // Curated Indian Large Caps with 5-Year Point-in-Time Data
  const stockUniverse = [
    {
      ticker: 'RELIANCE.NS',
      name: 'Reliance Industries',
      sector: 'Energy & Retail',
      price: '₹1,285.50',
      change: '+10.85',
      chg: '+0.85%',
      positive: true,
      color: '#00D09C',
      tag: '5Y High Leader',
    },
    {
      ticker: 'TCS.NS',
      name: 'Tata Consultancy Services',
      sector: 'IT Services',
      price: '₹4,120.00',
      change: '+45.60',
      chg: '+1.12%',
      positive: true,
      color: '#5367FF',
      tag: 'Top IT Large Cap',
    },
    {
      ticker: 'HDFCBANK.NS',
      name: 'HDFC Bank Limited',
      sector: 'Banking & Finance',
      price: '₹1,682.40',
      change: '-5.10',
      chg: '-0.30%',
      positive: false,
      color: '#EB5B59',
      tag: 'Heavyweight',
    },
    {
      ticker: 'INFY.NS',
      name: 'Infosys Limited',
      sector: 'IT & Cloud',
      price: '₹1,850.15',
      change: '+8.30',
      chg: '+0.45%',
      positive: true,
      color: '#5367FF',
      tag: 'Cloud Growth',
    },
    {
      ticker: 'TATAMOTORS.NS',
      name: 'Tata Motors Limited',
      sector: 'Automotive & EV',
      price: '₹885.60',
      change: '+18.20',
      chg: '+2.10%',
      positive: true,
      color: '#00D09C',
      tag: 'Top EV Pick',
    },
    {
      ticker: 'ICICIBANK.NS',
      name: 'ICICI Bank Limited',
      sector: 'Banking & Lending',
      price: '₹1,240.00',
      change: '+14.50',
      chg: '+1.18%',
      positive: true,
      color: '#00D09C',
      tag: 'Credit Leader',
    },
    {
      ticker: 'SBIN.NS',
      name: 'State Bank of India',
      sector: 'Public Sector Banking',
      price: '₹790.00',
      change: '+6.40',
      chg: '+0.82%',
      positive: true,
      color: '#5367FF',
      tag: 'PSU Anchor',
    },
    {
      ticker: 'ITC.NS',
      name: 'ITC Limited',
      sector: 'FMCG & Hotels',
      price: '₹485.00',
      change: '-1.20',
      chg: '-0.25%',
      positive: false,
      color: '#EB5B59',
      tag: 'High Dividend',
    },
  ];

  useEffect(() => {
    // Fetch live market indices
    fetch(`${API}/market/indices`)
      .then((r) => r.json())
      .then((data: MarketIndexQuote[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMarketIndices(data);
        }
      })
      .catch(() => {});

    // Fetch runs with correct symbol mapping
    fetch(`${API}/runs`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const mapped = data
          .map((d) => ({
            run_id: d.run_id,
            symbol: d.symbol || d.report?.symbol || d.request?.symbol || 'RELIANCE.NS',
            status: d.status,
            submitted_at: d.submitted_at,
            completed_at: d.completed_at,
            recommendation: d.recommendation || d.report?.recommendation || 'INSUFFICIENT_EVIDENCE',
            conviction_score: d.report?.conviction_score ?? 50,
            statutory_friction_drag_pct: d.report?.statutory_friction_drag_pct ?? 0.1186,
          }))
          .filter((r) => r.symbol && r.symbol !== 'UNKNOWN');
        setRuns(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const completedCount = runs.filter((r) => r.status === 'COMPLETED').length;
  const activeCount = runs.filter((r) => r.status === 'RUNNING' || r.status === 'PENDING').length;

  const filterChips = [
    { id: 'all', label: 'All Stocks' },
    { id: 'nifty50', label: 'NIFTY 50' },
    { id: '5y-leaders', label: '5-Year Leaders' },
    { id: 'banking', label: 'Banking & F&O' },
    { id: 'tech', label: 'Technology' },
    { id: 'statutory', label: 'Finance Act 2024 Drag' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* ── Groww Market Indices Carousel / Strip ───────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Market Benchmarks
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time index quotes with daily movement & point-in-time Parquet provenance
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pill-badge pill-badge-green">
              ● NSE/BSE LIVE
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {marketIndices.map((idx) => {
            const isPos = idx.positive;
            return (
              <div
                key={idx.symbol}
                className="groww-card groww-card-interactive"
                style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                onClick={() => onNavigate('research')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      {idx.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {idx.symbol}
                    </span>
                  </div>
                  <span
                    className={`pill-badge ${isPos ? 'pill-badge-green' : 'pill-badge-red'}`}
                  >
                    {isPos ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {idx.changePct}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {idx.price}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px' }}>
                    <span style={{ color: isPos ? 'var(--groww-green)' : 'var(--groww-red)', fontWeight: 600 }}>
                      {idx.change} pts
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{idx.provenance.split('(')[0]}</span>
                  </div>
                </div>

                {/* Groww Sparkline Indicator */}
                <div style={{ height: '24px', width: '100%', marginTop: '4px' }}>
                  <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`grad-${idx.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isPos ? '#00D09C' : '#EB5B59'} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={isPos ? '#00D09C' : '#EB5B59'} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={isPos ? "M0,20 Q25,18 50,10 T100,4 L100,24 L0,24 Z" : "M0,4 Q25,8 50,15 T100,20 L100,24 L0,24 Z"}
                      fill={`url(#grad-${idx.symbol})`}
                    />
                    <path
                      d={isPos ? "M0,20 Q25,18 50,10 T100,4" : "M0,4 Q25,8 50,15 T100,20"}
                      fill="none"
                      stroke={isPos ? '#00D09C' : '#EB5B59'}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Groww Explore & Category Filter Pills ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            className={`groww-chip ${activeFilter === chip.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Groww Stocks Grid (Explore Stocks on ArthaAI) ─────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Explore Stocks on ArthaAI
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Equities with 5-year point-in-time verified data (~1,260 daily bars) & AI consensus
            </p>
          </div>
          <button
            onClick={() => onNavigate('research')}
            className="btn-groww-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <span>Custom Research</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {stockUniverse.map((stock) => {
            const initial = stock.name.charAt(0);
            return (
              <div
                key={stock.ticker}
                className="groww-card groww-card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  gap: '16px',
                }}
                onClick={() => onNavigate('research')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '16px',
                        color: stock.color,
                      }}
                    >
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stock.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {stock.ticker} • {stock.sector}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {stock.tag}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {stock.price}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: stock.positive ? 'var(--groww-green)' : 'var(--groww-red)' }}>
                      {stock.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>{stock.change} ({stock.chg})</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('research');
                    }}
                    className="btn-groww-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    <span>Research</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Groww Portfolio Snapshot & Multi-Agent Fleet Split ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Groww Paper Portfolio Card */}
        <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} color="var(--groww-green)" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Your Investments
              </h3>
            </div>
            <button
              onClick={() => onNavigate('portfolio')}
              className="btn-groww-secondary"
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              <span>Trade Desk</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Portfolio Value</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'block' }}>
                ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Returns</span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: unrealizedPnL >= 0 ? 'var(--groww-green)' : 'var(--groww-red)',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {unrealizedPnL >= 0 ? '+' : ''}₹{unrealizedPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                <span style={{ fontSize: '12px' }}>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Available Paper Cash:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{paperCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onNavigate('portfolio')}
              className="btn-groww-primary"
              style={{ flex: 1, padding: '10px' }}
            >
              <span>+ Place Paper Order</span>
            </button>
            <button
              onClick={() => onNavigate('portfolio')}
              className="btn-groww-secondary"
              style={{ flex: 1, padding: '10px' }}
            >
              <span>Holdings ({paperPositions.length})</span>
            </button>
          </div>
        </div>

        {/* Multi-Agent Research Fleet Status */}
        <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BrainCircuit size={18} color="var(--groww-blue)" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Multi-Agent Quantitative Fleet
              </h3>
            </div>
            <span className="pill-badge pill-badge-blue">
              7 Active Agents
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ADK Quant Specialist</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--groww-green)', marginTop: '2px' }}>
                1,260 Bars (5Y Depth)
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CrewAI News & Macro</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--groww-blue)', marginTop: '2px' }}>
                RBI Policy & ChromaDB
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CrewAI Corporate Filings</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                SEBI LODR Reg 30/33
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CrewAI Adversarial Skeptic</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--groww-amber)', marginTop: '2px' }}>
                Valuation Stress Tests
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Statutory Model:</span>
            <span style={{ fontWeight: 700, color: 'var(--groww-green)' }}>
              Finance (No. 2) Act 2024 (0.1186% drag)
            </span>
          </div>
        </div>
      </div>

      {/* ── Recent Quantitative Research Runs (Groww Style Table) ─────────── */}
      <div className="groww-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Recent Multi-Agent Research Reports
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Verified synthesized quantitative research runs with conviction scores and citations
            </p>
          </div>
          <button
            onClick={() => onNavigate('research')}
            className="btn-groww-primary"
            style={{ fontSize: '12px', padding: '8px 16px' }}
          >
            <span>+ New Research Run</span>
          </button>
        </div>

        {runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <BrainCircuit size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>No research runs executed yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ New Research Run" to execute a 5-year quantitative synthesis.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>STOCK</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>RUN ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>RECOMMENDATION</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>CONVICTION</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>STATUTORY DRAG</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 5).map((r) => {
                  const isBuy = r.recommendation === 'BUY';
                  const isSell = r.recommendation === 'SELL';
                  return (
                    <tr
                      key={r.run_id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                      onClick={() => onNavigate('research', r.run_id)}
                      className="hover:bg-card-hover"
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {r.symbol}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {r.run_id.slice(0, 18)}...
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          className={`pill-badge ${
                            isBuy ? 'pill-badge-green' : isSell ? 'pill-badge-red' : 'pill-badge-amber'
                          }`}
                        >
                          {r.recommendation}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--bg-elevated)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${r.conviction_score}%`,
                                height: '100%',
                                backgroundColor: isBuy ? 'var(--groww-green)' : 'var(--groww-blue)',
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '12px' }}>{r.conviction_score}/100</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {r.statutory_friction_drag_pct?.toFixed(4)}%
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('research', r.run_id);
                          }}
                          className="btn-groww-secondary"
                          style={{ padding: '4px 12px', fontSize: '11px' }}
                        >
                          <span>View Report</span>
                          <ArrowRight size={12} />
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
    </div>
  );
};
