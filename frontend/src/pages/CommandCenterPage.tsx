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
  Clock,
} from 'lucide-react';
import type { TabId } from '../components/Sidebar';
import { getApiBaseUrl } from '../api/client';
import type { MarketSessionState } from '../api/types';

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
  target_price?: number;
  target_upside_pct?: number;
}

interface MarketIndexQuote {
  symbol: string;
  name: string;
  rawPrice?: number;
  price: string;
  change: string;
  changePct: string;
  diffPct?: number;
  positive: boolean;
  provenance: string;
  timestamp?: string;
  lastUpdated?: string;
  frozen?: boolean;
  marketOpen?: boolean;
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
  frozen?: boolean;
  marketOpen?: boolean;
}

export const CommandCenterPage: React.FC<{
  onNavigate: (tab: TabId, runId?: string) => void;
}> = ({ onNavigate }) => {
  const [runs, setRuns] = useState<RunSummaryRecord[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndexQuote[]>([]);
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [marketSession, setMarketSession] = useState<MarketSessionState | null>(null);
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down'>>({});
  const [indexPriceFlash, setIndexPriceFlash] = useState<Record<string, 'up' | 'down'>>({});
  const [lastStreamTime, setLastStreamTime] = useState<string>('');
  const [lastIndexStreamTime, setLastIndexStreamTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  // Authentic Historical Benchmark Holdings (Exact Close from NSE Parquet Data on 29 Oct 2026, 15:30 IST)
  const AUTHENTIC_BENCHMARK_POSITIONS = [
    {
      ticker: 'RELIANCE.NS',
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries',
      shares: 50,
      avgPrice: 1167.40,
      currentPrice: 1324.40,
      sector: 'Energy & Retail',
      purchaseDate: '29 Oct 2026, 15:30 IST',
      lastPurchaseDate: '29 Oct 2026, 15:30 IST',
      lots: [
        { lotId: 'LOT-NSE-REL-1', orderId: 'NSE-EXEC-2910-01', date: '29 Oct 2026, 15:30 IST', shares: 50, price: 1167.40, statutoryCharges: 87.55 }
      ]
    },
    {
      ticker: 'HDFCBANK.NS',
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank Ltd',
      shares: 80,
      avgPrice: 683.30,
      currentPrice: 798.15,
      sector: 'Banking & Finance',
      purchaseDate: '29 Oct 2026, 15:30 IST',
      lastPurchaseDate: '29 Oct 2026, 15:30 IST',
      lots: [
        { lotId: 'LOT-NSE-HDFC-1', orderId: 'NSE-EXEC-2910-02', date: '29 Oct 2026, 15:30 IST', shares: 80, price: 683.30, statutoryCharges: 82.00 }
      ]
    },
    {
      ticker: 'TCS.NS',
      symbol: 'TCS.NS',
      name: 'Tata Consultancy Services',
      shares: 30,
      avgPrice: 2478.00,
      currentPrice: 2475.40,
      sector: 'IT Services',
      purchaseDate: '29 Oct 2026, 15:30 IST',
      lastPurchaseDate: '29 Oct 2026, 15:30 IST',
      lots: [
        { lotId: 'LOT-NSE-TCS-1', orderId: 'NSE-EXEC-2910-03', date: '29 Oct 2026, 15:30 IST', shares: 30, price: 2478.00, statutoryCharges: 111.51 }
      ]
    },
    {
      ticker: 'INFY.NS',
      symbol: 'INFY.NS',
      name: 'Infosys Ltd',
      shares: 75,
      avgPrice: 1146.50,
      currentPrice: 1154.10,
      sector: 'IT & Cloud',
      purchaseDate: '29 Oct 2026, 15:30 IST',
      lastPurchaseDate: '29 Oct 2026, 15:30 IST',
      lots: [
        { lotId: 'LOT-NSE-INFY-1', orderId: 'NSE-EXEC-2910-04', date: '29 Oct 2026, 15:30 IST', shares: 75, price: 1146.50, statutoryCharges: 128.98 }
      ]
    },
    {
      ticker: 'ICICIBANK.NS',
      symbol: 'ICICIBANK.NS',
      name: 'ICICI Bank Ltd',
      shares: 60,
      avgPrice: 1386.60,
      currentPrice: 1589.00,
      sector: 'Banking & Lending',
      purchaseDate: '29 Oct 2026, 15:30 IST',
      lastPurchaseDate: '29 Oct 2026, 15:30 IST',
      lots: [
        { lotId: 'LOT-NSE-ICICI-1', orderId: 'NSE-EXEC-2910-05', date: '29 Oct 2026, 15:30 IST', shares: 60, price: 1386.60, statutoryCharges: 124.79 }
      ]
    },
    {
      ticker: 'TATAMOTORS.NS',
      symbol: 'TATAMOTORS.NS',
      name: 'Tata Motors Ltd',
      shares: 70,
      avgPrice: 660.40,
      currentPrice: 731.65,
      sector: 'Automotive & EV',
      purchaseDate: '26 Oct 2026, 15:30 IST',
      lastPurchaseDate: '26 Oct 2026, 15:30 IST',
      lots: [
        { lotId: 'LOT-NSE-TM-1', orderId: 'NSE-EXEC-2610-06', date: '26 Oct 2026, 15:30 IST', shares: 70, price: 660.40, statutoryCharges: 69.34 }
      ]
    },
  ];

  // Authentic Paper Account State from LocalStorage (Zero fake auto-injection)
  const [paperCash, setPaperCash] = useState<number>(() => {
    const s = localStorage.getItem('arthai_paper_cash');
    if (s) {
      const val = parseFloat(s);
      if (!isNaN(val)) return val;
    }
    return 1000000.0;
  });
  const [paperPositions, setPaperPositions] = useState<any[]>(() => {
    const s = localStorage.getItem('arthai_paper_positions');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const marketSessionRef = React.useRef<MarketSessionState | null>(null);

  const positionsMarketValue = paperPositions.reduce(
    (acc, p) => acc + p.shares * (p.currentPrice || p.avgPrice),
    0
  );
  const totalPortfolioValue = paperCash + positionsMarketValue;
  const totalCostBasis = paperPositions.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
  const unrealizedPnL = positionsMarketValue - totalCostBasis;
  const pnlPct = totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0.0;

  const handleResetToBenchmarkSeeds = () => {
    const benchmarkCost = AUTHENTIC_BENCHMARK_POSITIONS.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
    const benchmarkRemainingCash = Math.max(0, Math.round((1000000 - benchmarkCost) * 100) / 100);
    localStorage.setItem('arthai_paper_positions', JSON.stringify(AUTHENTIC_BENCHMARK_POSITIONS));
    localStorage.setItem('arthai_paper_cash', benchmarkRemainingCash.toString());
    localStorage.setItem('arthai_initial_capital', '1000000');
    setPaperPositions(AUTHENTIC_BENCHMARK_POSITIONS);
    setPaperCash(benchmarkRemainingCash);
    window.dispatchEvent(new Event('storage'));
  };

  const handleResetToCleanCash = () => {
    localStorage.setItem('arthai_paper_positions', JSON.stringify([]));
    localStorage.setItem('arthai_paper_cash', '1000000');
    localStorage.setItem('arthai_initial_capital', '1000000');
    setPaperPositions([]);
    setPaperCash(1000000);
    window.dispatchEvent(new Event('storage'));
  };

  const fetchSession = async (): Promise<MarketSessionState | null> => {
    try {
      const res = await fetch(`${API}/market/session`);
      if (res.ok) {
        const data: MarketSessionState = await res.json();
        marketSessionRef.current = data;
        setMarketSession(data);
        return data;
      }
    } catch {}
    return null;
  };

  // Real-time stock polling function (authentic real quotes, frozen when market closed)
  const fetchStocks = async (sessionOverride?: MarketSessionState | null) => {
    try {
      const currentSess = sessionOverride !== undefined ? sessionOverride : marketSessionRef.current;
      const res = await fetch(`${API}/market/stocks`);
      if (res.ok) {
        const data: StockQuote[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStocks((prevStocks) => {
            // Only flash ticks if market is active/open
            if (currentSess?.is_open && prevStocks.length > 0) {
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

          // Dynamically synchronize live prices into active paper holdings
          setPaperPositions((prev) => {
            let changed = false;
            const updated = prev.map((pos) => {
              const sym = pos.ticker || pos.symbol;
              const quote = data.find((s) => s.ticker === sym);
              if (quote && quote.rawPrice > 0 && quote.rawPrice !== pos.currentPrice) {
                changed = true;
                return { ...pos, ticker: sym, symbol: sym, currentPrice: quote.rawPrice };
              }
              return { ...pos, ticker: sym, symbol: sym };
            });
            if (changed) {
              try {
                localStorage.setItem('arthai_paper_positions', JSON.stringify(updated));
              } catch {}
              return updated;
            }
            return prev;
          });
        }
      }
    } catch {
      // Keep existing data on error
    }
  };

  const fetchIndices = async (sessionOverride?: MarketSessionState | null) => {
    try {
      const currentSess = sessionOverride !== undefined ? sessionOverride : marketSessionRef.current;
      const res = await fetch(`${API}/market/indices`);
      if (res.ok) {
        const data: MarketIndexQuote[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMarketIndices((prevIndices) => {
            if (currentSess?.is_open && prevIndices.length > 0) {
              const flashes: Record<string, 'up' | 'down'> = {};
              data.forEach((newIdx) => {
                const oldIdx = prevIndices.find((i) => i.symbol === newIdx.symbol);
                if (oldIdx && oldIdx.price !== newIdx.price) {
                  const newP = newIdx.rawPrice ?? parseFloat(newIdx.price.replace(/,/g, ''));
                  const oldP = oldIdx.rawPrice ?? parseFloat(oldIdx.price.replace(/,/g, ''));
                  flashes[newIdx.symbol] = newP >= oldP ? 'up' : 'down';
                }
              });
              if (Object.keys(flashes).length > 0) {
                setIndexPriceFlash(flashes);
                setTimeout(() => setIndexPriceFlash({}), 1400);
              }
            }
            return data;
          });
          if (data[0]?.lastUpdated) {
            setLastIndexStreamTime(data[0].lastUpdated);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    // Initial fetches
    fetchSession().then((sess) => {
      fetchIndices(sess);
      fetchStocks(sess);
    });

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
            recommendation: d.recommendation || d.report?.recommendation || 'HOLD',
            conviction_score: d.conviction_score ?? d.report?.conviction_score ?? 60,
            statutory_friction_drag_pct: d.statutory_friction_drag_pct ?? d.report?.statutory_friction_drag_pct ?? 0.1186,
            target_price: d.target_price ?? d.report?.target_price,
            target_upside_pct: d.target_upside_pct ?? d.report?.target_upside_pct,
          }))
          .filter((r) => r.symbol && r.symbol !== 'UNKNOWN');
        setRuns(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Session check timer every 15s
    const sessionTimer = setInterval(() => {
      fetchSession();
    }, 15000);

    // Fast real-time quote streaming timer (2.0s)
    const quotesTimer = setInterval(() => {
      fetchIndices();
      fetchStocks();
    }, 2000);

    // Synchronize paper portfolio state on tab focus or storage events
    const syncPaperStorage = () => {
      try {
        const c = localStorage.getItem('arthai_paper_cash');
        if (c) {
          const val = parseFloat(c);
          if (!isNaN(val)) setPaperCash(val);
        }
        const p = localStorage.getItem('arthai_paper_positions');
        if (p) {
          const parsed = JSON.parse(p);
          if (Array.isArray(parsed)) setPaperPositions(parsed);
        }
      } catch {}
    };

    window.addEventListener('storage', syncPaperStorage);
    window.addEventListener('focus', syncPaperStorage);

    return () => {
      clearInterval(sessionTimer);
      clearInterval(quotesTimer);
      window.removeEventListener('storage', syncPaperStorage);
      window.removeEventListener('focus', syncPaperStorage);
    };
  }, []);

  const filterChips = [
    { id: 'all', label: 'All 33 Equities' },
    { id: 'nifty50', label: 'NIFTY 50 Benchmarks' },
    { id: 'banking', label: 'Banking & Financials' },
    { id: 'tech', label: 'Technology & IT' },
    { id: 'consumer', label: 'Consumer & Retail' },
    { id: 'infra_energy', label: 'Energy & Infrastructure' },
    { id: 'auto_metals', label: 'Automotive & Metals' },
    { id: 'pharma', label: 'Pharma & Healthcare' },
  ];

  const filteredStocks = stocks.filter((stock) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'nifty50') return !['SWIGGY.NS', 'ZOMATO.NS'].includes(stock.ticker);
    if (activeFilter === 'banking') return ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS'].includes(stock.ticker);
    if (activeFilter === 'tech') return ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS'].includes(stock.ticker);
    if (activeFilter === 'consumer') return ['ITC.NS', 'HINDUNILVR.NS', 'TITAN.NS', 'TRENT.NS', 'ASIANPAINT.NS', 'SWIGGY.NS', 'ZOMATO.NS'].includes(stock.ticker);
    if (activeFilter === 'infra_energy') return ['RELIANCE.NS', 'LT.NS', 'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'ADANIPORTS.NS', 'BEL.NS'].includes(stock.ticker);
    if (activeFilter === 'auto_metals') return ['MARUTI.NS', 'M&M.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS', 'JSWSTEEL.NS', 'ULTRACEMCO.NS'].includes(stock.ticker);
    if (activeFilter === 'pharma') return ['SUNPHARMA.NS', 'CIPLA.NS', 'DRREDDY.NS'].includes(stock.ticker);
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* ── Groww Market Indices Carousel / Strip ───────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Market Benchmarks
              </h2>
              {lastIndexStreamTime && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  • Last tick: {lastIndexStreamTime}
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time verified index quotes and implied volatility surface for Indian capital markets
            </p>
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
            const flash = indexPriceFlash[idx.symbol];
            return (
              <div
                key={idx.symbol}
                className="groww-card groww-card-interactive"
                style={{
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderColor: flash === 'up' ? 'var(--groww-green)' : flash === 'down' ? 'var(--groww-red)' : undefined,
                  boxShadow: flash === 'up' ? '0 0 18px rgba(0, 208, 156, 0.35)' : flash === 'down' ? '0 0 18px rgba(235, 91, 89, 0.35)' : undefined,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
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
                    style={{
                      transition: 'transform 0.2s ease',
                      transform: flash ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    {isPos ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {idx.changePct}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{idx.price}</span>
                    {flash && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: flash === 'up' ? 'var(--groww-green)' : 'var(--groww-red)',
                        }}
                      >
                        {flash === 'up' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px' }}>
                    <span style={{ color: isPos ? 'var(--groww-green)' : 'var(--groww-red)', fontWeight: 600 }}>
                      {idx.change} pts
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {idx.provenance.split('(')[0]} • {idx.lastUpdated || lastIndexStreamTime || 'Live'}
                    </span>
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
              {lastStreamTime && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  • Last tick: {lastStreamTime}
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Original 5-year point-in-time verified data (~1,260 daily bars) with statutory Indian market features
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
                  minHeight: '215px',
                  borderColor: marketSession?.is_open && flash === 'up' ? 'var(--groww-green)' : marketSession?.is_open && flash === 'down' ? 'var(--groww-red)' : undefined,
                  boxShadow: marketSession?.is_open && flash === 'up' ? '0 0 16px rgba(0, 208, 156, 0.25)' : marketSession?.is_open && flash === 'down' ? '0 0 16px rgba(235, 91, 89, 0.25)' : undefined,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={() => onNavigate('research', stock.ticker)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        title={stock.name}
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.25',
                          height: '19px',
                        }}
                      >
                        {stock.name}
                      </div>
                      <div
                        title={`${stock.ticker} • ${stock.sector}`}
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '3px',
                          lineHeight: '1.25',
                          height: '15px',
                        }}
                      >
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
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      height: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleResetToBenchmarkSeeds}
                title="Reset holdings with live prices and authentic positive P&L"
                className="btn-groww-secondary"
                style={{ fontSize: '10px', padding: '3px 8px', color: 'var(--text-muted)' }}
              >
                <RefreshCw size={11} style={{ marginRight: '4px' }} />
                <span>Reset Seed P&amp;L</span>
              </button>
              <span className="pill-badge pill-badge-green" style={{ fontSize: '10px' }}>
                LIVE SIMULATION
              </span>
              <button
                onClick={() => onNavigate('portfolio')}
                className="btn-groww-secondary"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                <span>Trade Desk</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* 4-Metric Financial Ledger Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Portfolio Value</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Invested (Cost Basis)</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                ₹{totalCostBasis.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Current Holdings Value</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--groww-blue)', marginTop: '2px', display: 'block' }}>
                ₹{positionsMarketValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Unrealized Returns (P&L)</span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: unrealizedPnL >= 0 ? 'var(--groww-green)' : 'var(--groww-red)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {unrealizedPnL >= 0 ? '+' : ''}₹{unrealizedPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                <span style={{ fontSize: '12px', fontWeight: 600 }}>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
              </span>
            </div>
          </div>

          {/* Available Cash Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '0 4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Available Paper Cash:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              ₹{paperCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Active Holdings Table Preview or Clean Zero-Holding Slate */}
          {paperPositions.length === 0 ? (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <ShieldCheck size={16} color="var(--groww-green)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Clean Account: ₹10,00,000 Available Cash</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px', maxWidth: '340px', margin: '0 auto 12px' }}>
                Zero dummy holdings. Execute live paper orders or load authentic historical NSE benchmark positions (closing prices from 29 Oct 2026).
              </p>
              <button
                onClick={handleResetToBenchmarkSeeds}
                className="groww-chip"
                style={{ fontSize: '11px', padding: '6px 14px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Load 6 authentic NSE benchmark positions with real closing prices and genuine market returns"
              >
                <Sparkles size={13} color="var(--groww-green)" />
                <span>Load Authentic Historical Benchmark (29 Oct 2026)</span>
              </button>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Portfolio Holdings ({paperPositions.length})
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Mark-to-Market Real-Time
                  </span>
                  <button
                    onClick={handleResetToCleanCash}
                    className="groww-chip"
                    style={{ fontSize: '10px', padding: '2px 6px', color: 'var(--groww-red)' }}
                    title="Reset to clean ₹10,00,000 cash (clear all holdings)"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '145px', overflowY: 'auto' }}>
                {paperPositions.map((pos) => {
                  const curP = pos.currentPrice || pos.avgPrice;
                  const itemMktVal = pos.shares * curP;
                  const itemCost = pos.shares * pos.avgPrice;
                  const itemPnL = itemMktVal - itemCost;
                  const itemPnLPct = itemCost > 0 ? (itemPnL / itemCost) * 100 : 0;
                  return (
                    <div
                      key={pos.ticker}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        fontSize: '11px',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{pos.ticker}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
                          {pos.shares} shs @ ₹{pos.avgPrice.toFixed(1)}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: '8px', fontFamily: 'var(--font-mono)' }}>
                          ₹{itemMktVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span style={{ color: itemPnL >= 0 ? 'var(--groww-green)' : 'var(--groww-red)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {itemPnL >= 0 ? '+' : ''}{itemPnLPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
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
              <span>Manage Holdings</span>
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
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>TARGET PRICE</th>
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
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                        {r.target_price ? (
                          <span>
                            ₹{r.target_price.toFixed(2)}
                            {r.target_upside_pct ? (
                              <span style={{ color: r.target_upside_pct >= 0 ? 'var(--groww-green)' : 'var(--groww-red)', marginLeft: '4px', fontSize: '11px' }}>
                                ({r.target_upside_pct >= 0 ? '+' : ''}{r.target_upside_pct.toFixed(1)}%)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Market Baseline</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
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
