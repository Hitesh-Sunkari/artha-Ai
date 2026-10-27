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
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Search,
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

  // Watchlist with verified representative Indian large caps
  const watchlist = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Tech', lastPrice: '₹1,285.50', chg: '+0.85%' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services', lastPrice: '₹4,120.00', chg: '+1.12%' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited', sector: 'Banking & Financials', lastPrice: '₹1,682.40', chg: '-0.30%' },
    { ticker: 'INFY.NS', name: 'Infosys Limited', sector: 'IT Services', lastPrice: '₹1,850.15', chg: '+0.45%' },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Limited', sector: 'Automotive & EV', lastPrice: '₹885.60', chg: '+2.10%' },
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

  return (
    <div className="space-y-6">
      {/* ── Compact Institutional Hero ─────────────────────────────────────── */}
      <div className="terminal-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#65D5C3]/15 text-[#65D5C3] border border-[#65D5C3]/30">
              COMMAND CENTER
            </span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#8CA8FF]/15 text-[#8CA8FF] border border-[#8CA8FF]/30">
              INDIAN CAPITAL MARKETS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Institutional Financial Intelligence Workstation
          </h1>
          <p className="text-xs text-[#B4C0D0] max-w-2xl leading-relaxed">
            Multi-agent research engine orchestrating Google ADK coordinator, CrewAI specialists, ChromaDB RAG, and Finance Act 2024 statutory friction modeling.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#8998AC] pt-1">
            <span className="flex items-center gap-1.5 text-[#43C99A]">
              <ShieldCheck size={14} /> Strict Simulation Mode (Zero Live Risk)
            </span>
            <span>•</span>
            <span className="text-[#8CA8FF]">Google ADK + CrewAI (A2A JSON-RPC)</span>
            <span>•</span>
            <span className="text-[#E8B866]">Finance Act 2024 Compliance</span>
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('research')}
            className="btn btn-primary text-xs py-2.5 px-4 shadow-lg shadow-[#65D5C3]/20"
          >
            <BrainCircuit size={15} />
            <span>Launch New Research</span>
          </button>
          <button
            onClick={() => onNavigate('portfolio')}
            className="btn btn-secondary text-xs py-2.5 px-4"
          >
            <Briefcase size={15} />
            <span>Portfolio & Paper Trading</span>
          </button>
        </div>
      </div>

      {/* ── Market Intelligence Centerpiece ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-[#65D5C3]" />
            Indian Market Benchmarks & Implied Volatility
          </h2>
          <span className="text-[11px] font-mono text-[#8998AC]">
            Source: Yahoo Finance Pipeline • Parquet Cached
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketIndices.map((idx) => (
            <div
              key={idx.symbol}
              className="terminal-card p-4 space-y-2 hover:border-[#37465B] transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-white block">{idx.name}</span>
                  <span className="text-[10px] font-mono text-[#8998AC] block">{idx.symbol}</span>
                </div>
                <div
                  className={`flex items-center gap-0.5 text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    idx.positive
                      ? 'bg-emerald-500/10 text-[#43C99A] border border-emerald-500/20'
                      : 'bg-rose-500/10 text-[#F07883] border border-rose-500/20'
                  }`}
                >
                  {idx.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span>{idx.changePct}</span>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  {idx.price}
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8998AC] mt-1">
                  <span>Change: <strong className={idx.positive ? 'text-[#43C99A]' : 'text-[#F07883]'}>{idx.change}</strong></span>
                  <span className="truncate max-w-[130px]">{idx.provenance}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Research & Portfolio Snapshot Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="terminal-card p-4 space-y-1">
          <span className="text-xs font-mono uppercase text-[#8998AC] flex items-center gap-1.5">
            <Zap size={14} className="text-[#65D5C3]" /> Total Research Runs
          </span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{runs.length}</p>
          <span className="text-[10px] font-mono text-[#43C99A]">
            {completedCount} Successfully Synthesized
          </span>
        </div>

        <div className="terminal-card p-4 space-y-1">
          <span className="text-xs font-mono uppercase text-[#8998AC] flex items-center gap-1.5">
            <Activity size={14} className="text-[#8CA8FF]" /> In-Flight Pipeline Runs
          </span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{activeCount}</p>
          <span className="text-[10px] font-mono text-[#8998AC]">
            {activeCount > 0 ? 'Active research pipeline execution' : 'Idle — ready for dispatch'}
          </span>
        </div>

        <div className="terminal-card p-4 space-y-1">
          <span className="text-xs font-mono uppercase text-[#8998AC] flex items-center gap-1.5">
            <Briefcase size={14} className="text-[#43C99A]" /> Simulated Portfolio Value
          </span>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <span className={`text-[10px] font-mono ${unrealizedPnL >= 0 ? 'text-[#43C99A]' : 'text-[#F07883]'}`}>
            {unrealizedPnL >= 0 ? '+' : ''}₹{unrealizedPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% Simulated P&L)
          </span>
        </div>

        <div className="terminal-card p-4 space-y-1">
          <span className="text-xs font-mono uppercase text-[#8998AC] flex items-center gap-1.5">
            <Clock size={14} className="text-[#E8B866]" /> Available Paper Cash
          </span>
          <p className="text-2xl font-bold font-mono text-[#65D5C3] mt-1">
            ₹{paperCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-[#8998AC]">Baseline Capital: ₹10,00,000</span>
        </div>
      </div>

      {/* ── Split Layout: Recent Decisions & Watchlist ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Research Decisions Table */}
        <div className="lg:col-span-8 terminal-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#2A3748] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BrainCircuit size={16} className="text-[#65D5C3]" />
                Recent Research Decisions & Handoffs
              </h3>
              <p className="text-xs text-[#8998AC] mt-0.5">
                Explainable BUY/HOLD/SELL decisions generated by multi-agent deliberation.
              </p>
            </div>
            <button
              onClick={() => onNavigate('operations')}
              className="text-xs font-mono text-[#65D5C3] hover:underline flex items-center gap-1"
            >
              <span>View Full Audit</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#2A3748] text-[#8998AC] uppercase">
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-3">Recommendation</th>
                  <th className="py-2 px-3">Conviction</th>
                  <th className="py-2 px-3">Tax Friction</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3748]">
                {runs.slice(0, 6).map((run) => (
                  <tr key={run.run_id} className="hover:bg-[#1C293A]/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">{run.symbol}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          run.recommendation === 'BUY'
                            ? 'badge-buy'
                            : run.recommendation === 'SELL'
                            ? 'badge-sell'
                            : run.recommendation === 'HOLD'
                            ? 'badge-hold'
                            : 'badge-insufficient'
                        }`}
                      >
                        {run.recommendation || 'HOLD'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#B4C0D0]">
                      {run.conviction_score ? `${run.conviction_score}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-[#8998AC]">
                      {run.statutory_friction_drag_pct ? `${run.statutory_friction_drag_pct}%` : '0.1186%'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[#43C99A] font-bold text-[10px] uppercase">
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('research', run.run_id)}
                        className="btn btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 text-[#65D5C3] border-[#65D5C3]/30 hover:bg-[#65D5C3]/10"
                      >
                        <span>Open Run</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Institutional Watchlist */}
        <div className="lg:col-span-4 terminal-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-[#2A3748] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-[#8CA8FF]" />
                Institutional Watchlist
              </h3>
              <span className="text-[10px] font-mono text-[#8998AC]">NSE Large Caps</span>
            </div>

            <div className="space-y-2">
              {watchlist.map((item) => (
                <div
                  key={item.ticker}
                  className="p-3 rounded-lg bg-[#101722] border border-[#2A3748] flex justify-between items-center hover:border-[#37465B] transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-white">{item.ticker}</div>
                    <div className="text-[10px] text-[#8998AC]">{item.name}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white">{item.lastPrice}</div>
                    <button
                      onClick={() => onNavigate('research')}
                      className="text-[10px] text-[#65D5C3] hover:underline flex items-center gap-0.5 ml-auto mt-0.5"
                    >
                      <span>Analyze</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('research')}
            className="btn btn-primary w-full py-2.5 text-xs font-bold"
          >
            <span>Analyze New Instrument</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
