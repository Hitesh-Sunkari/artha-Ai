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
  RefreshCw,
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

interface StockQuote {
  ticker: string;
  name: string;
  sector: string;
  rawPrice: number;
  price: string;
  change: string;
  chg: string;
  diffPct: number;
  positive: boolean;
  high52w: string;
  low52w: string;
  volume: string;
  color: string;
  tag: string;
  lastUpdated: string;
}

export const CommandCenterPage: React.FC<{
  onNavigate: (tab: TabId, runId?: string) => void;
}> = ({ onNavigate }) => {
  const [runs, setRuns] = useState<RunSummaryRecord[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndexQuote[]>([]);
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down'>>({});
  const [lastStreamTime, setLastStreamTime] = useState<string>('');
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

  // Real-time stock polling function (reads authentic DuckDB Parquet data)
  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API}/market/stocks`);
      if (res.ok) {
        const data: StockQuote[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStocks((prevStocks) => {
            if (prevStocks.length > 0) {
              const flashes: Record<string, 'up' | 'down'> = {};
              data.forEach((newStock) => {
                const oldStock = prevStocks.find((s) => s.ticker === newStock.ticker);
                if (oldStock && oldStock.rawPrice !== newStock.rawPrice) {
                  flashes[newStock.ticker] = newStock.rawPrice > oldStock.rawPrice ? 'up' : 'down';
                }
              });
              if (Object.keys(flashes).length > 0) {
                setPriceFlash(flashes);
                setTimeout(() => setPriceFlash({}), 1400);
              }
            }
            return data;
          });
          if (data[0]?.lastUpdated) {
            setLastStreamTime(data[0].lastUpdated);
          }
        }
      }
    } catch {
      // Keep existing data on error
    }
  };

  const fetchIndices = async () => {
    try {
      const res = await fetch(`${API}/market/indices`);
      if (res.ok) {
        const data: MarketIndexQuote[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMarketIndices(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    // Initial fetches
    fetchIndices();
    fetchStocks();

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

    // Polling interval: 3 seconds for dynamic real-time live stock prices
    const stockTimer = setInterval(fetchStocks, 3000);
    const indexTimer = setInterval(fetchIndices, 5000);

    return () => {
      clearInterval(stockTimer);
      clearInterval(indexTimer);
    };
  }, []);

  const filterChips = [
    { id: 'all', label: 'All Stocks' },
    { id: 'nifty50', label: 'NIFTY 50' },
    { id: '5y-leaders', label: '5-Year Leaders' },
    { id: 'banking', label: 'Banking & Lending' },
    { id: 'tech', label: 'Technology' },
    { id: 'statutory', label: 'Finance Act 2024 Drag' },
  ];

  const filteredStocks = stocks.filter((stock) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'nifty50') return true;
    if (activeFilter === '5y-leaders') return ['RELIANCE.NS', 'TCS.NS', 'TATAMOTORS.NS'].includes(stock.ticker);
    if (activeFilter === 'banking') return ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS'].includes(stock.ticker);
    if (activeFilter === 'tech') return ['TCS.NS', 'INFY.NS', 'WIPRO.NS'].includes(stock.ticker);
    if (activeFilter === 'statutory') return ['RELIANCE.NS', 'HDFCBANK.NS', 'ITC.NS'].includes(stock.ticker);
    return true;
  });

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
            <span className="pill-badge pill-badge-green" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--groww-green)', display: 'inline-block' }} />
              <span>● NSE/BSE LIVE</span>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Explore Stocks on ArthaAI
              </h2>
              <span className="pill-badge pill-badge-green" style={{ fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--groww-green)',
                    boxShadow: '0 0 6px var(--groww-green)',
                  }}
                />
                <span>LIVE STREAMING (~3s TICK)</span>
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Original 5-year point-in-time verified data (~1,260 bars) with real-time automatic price updates • {lastStreamTime ? `Last tick: ${lastStreamTime}` : 'Connecting stream...'}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredStocks.map((stock) => {
            const initial = stock.name.charAt(0);
            const flash = priceFlash[stock.ticker];
            return (
              <div
                key={stock.ticker}
                className="groww-card groww-card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  gap: '14px',
                  borderColor: flash === 'up' ? 'var(--groww-green)' : flash === 'down' ? 'var(--groww-red)' : undefined,
                  boxShadow: flash === 'up' ? '0 0 16px rgba(0, 208, 156, 0.25)' : flash === 'down' ? '0 0 16px rgba(235, 91, 89, 0.25)' : undefined,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={() => onNavigate('research', stock.ticker)}
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
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stock.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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

                {/* 52W High / Low & Volume Strip */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div>
                    <span>52W H: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{stock.high52w}</strong>
                  </div>
                  <div>
                    <span>52W L: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{stock.low52w}</strong>
                  </div>
                  <div>
                    <span>Vol: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{stock.volume}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{stock.price}</span>
                      {flash && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            color: flash === 'up' ? 'var(--groww-green)' : 'var(--groww-red)',
                            backgroundColor: flash === 'up' ? 'var(--groww-green-light)' : 'var(--groww-red-light)',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-pill)',
                          }}
                        >
                          {flash === 'up' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: stock.positive ? 'var(--groww-green)' : 'var(--groww-red)' }}>
                      {stock.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>{stock.change} ({stock.chg})</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('research', stock.ticker);
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

export default CommandCenterPage;
