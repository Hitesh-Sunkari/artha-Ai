import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  ticker: string;
  name: string;
  asset_class: string;
  sector: string;
  currency: string;
  expected_return: number;
  volatility: number;
  max_drawdown: number;
  sharpe_baseline: number;
  description: string;
}

interface HoldingAllocation {
  ticker: string;
  name: string;
  asset_class: string;
  weight: number;
  allocation_inr: number;
  strategic_role: string;
}

interface PortfolioCandidate {
  candidate_id: string;
  title: string;
  subtitle: string;
  is_recommended: boolean;
  suitability_score: number;
  nominal_return: number;
  real_return: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  asset_class_split: Record<string, number>;
  holdings: HoldingAllocation[];
  rejection_rationale?: string;
}

interface OptimizationResult {
  status: string;
  selected_asset_count: number;
  risk_free_rate: number;
  inflation_rate: number;
  recommended_candidate_id: string;
  candidates: PortfolioCandidate[];
  solver_iterations: number;
  timestamp: string;
}

interface MonteCarloPoint {
  year: number;
  invested_capital: number;
  p10_bearish: number;
  p50_median: number;
  p90_bullish: number;
}

interface MonteCarloResult {
  total_invested: number;
  median_final_wealth: number;
  bearish_final_wealth: number;
  bullish_final_wealth: number;
  trajectory: MonteCarloPoint[];
  prob_loss_5y: number;
  prob_beat_inflation: number;
}

interface StressTestResult {
  backtest_summary: {
    cagr_10y: number;
    volatility_realized: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    calmar_ratio: number;
    recovery_months: number;
  };
  yearly_returns: Array<{ year: number; portfolio_return: number; benchmark_return: number; outperformed: boolean }>;
  crisis_scenarios: Array<{ scenario_id: string; label: string; description: string; portfolio_drawdown: number; nifty50_drawdown: number; recovery_advantage: string }>;
  benchmarks: Array<{ name: string; cagr_10y: number; max_drawdown: number; sharpe_ratio: number; recovery_months: number }>;
}

// ── Utility helpers ──────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 1) => n.toFixed(decimals);
const fmtINR = (n: number) => {
  if (n >= 10_000_000) return `₹${fmt(n / 10_000_000)}Cr`;
  if (n >= 100_000) return `₹${fmt(n / 100_000)}L`;
  if (n >= 1_000) return `₹${fmt(n / 1_000)}k`;
  return `₹${Math.round(n)}`;
};
const API = 'http://127.0.0.1:8000';

const CLASS_COLORS: Record<string, string> = {
  equity: '#191B1D',
  debt: '#0F766E',
  reit: '#B45309',
  commodity: '#C2850C',
  international: '#6D0E5A',
  alternative: '#DC2626',
};

const CLASS_LABELS: Record<string, string> = {
  equity: 'Equity', debt: 'Fixed Income / Debt',
  reit: 'Real Estate (REIT)', commodity: 'Commodities',
  international: 'Global ETFs', alternative: 'Digital Assets',
};

// ── Step Wizard ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'profile', label: 'Profile', icon: '👤', description: 'Risk Calibration' },
  { id: 'universe', label: 'Universe', icon: '🌐', description: '74-Asset Pool' },
  { id: 'solver', label: 'Solver', icon: '⚡', description: 'SLSQP Optimizer' },
  { id: 'suitability', label: 'Suitability', icon: '🎯', description: 'Candidate Matching' },
  { id: 'projections', label: 'Projections', icon: '📈', description: 'Monte Carlo 5,000 Paths' },
  { id: 'stress', label: 'Stress Test', icon: '🛡️', description: '10-Year Backtest' },
  { id: 'studio', label: 'Decision Studio', icon: '✦', description: 'Audit & Export' },
];

type StepId = typeof STEPS[number]['id'];

// ── Profile Step ─────────────────────────────────────────────────────────────

interface ProfileData {
  age: number;
  horizon: number;
  riskTolerance: number;
  capital: number;
  sip: number;
  liquidity: 'low' | 'moderate' | 'high';
}

const ProfileStep: React.FC<{ data: ProfileData; onChange: (d: ProfileData) => void; onNext: () => void }> = ({ data, onChange, onNext }) => {
  const update = (k: keyof ProfileData, v: any) => onChange({ ...data, [k]: v });

  const equityBound = () => {
    const r = data.riskTolerance;
    const min = Math.max(30, Math.round((105 - data.age) * 0.6));
    const max = Math.min(85, Math.round((105 - data.age)));
    return `${min}%–${max}%`;
  };

  return (
    <div className="po-grid po-grid-cols-12 gap-6">
      <div className="po-col-span-7 po-card p-7 space-y-7">
        <div className="flex items-center justify-between border-b border-[#CDCECF] pb-4">
          <h3 className="text-base font-bold text-[#191B1D] flex items-center gap-2">
            <span className="text-[#0F766E]">🏅</span> Demographics & Risk Parameters
          </h3>
          <span className="text-xs text-[#5A5D61] font-mono">Calibrated Bounds</span>
        </div>

        {/* Age */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <label className="font-bold text-[#191B1D]">Investor Age</label>
            <span className="font-mono font-bold bg-[#F4F5F6] px-3 py-1 rounded-md border border-[#CDCECF]">{data.age} Years</span>
          </div>
          <input type="range" min={18} max={80} value={data.age} onChange={e => update('age', +e.target.value)} className="w-full po-slider" />
          <div className="flex justify-between text-xs text-[#5A5D61] font-mono">
            <span>18 (Early Career)</span><span>45 (Prime Wealth Accrual)</span><span>80 (Preservation)</span>
          </div>
        </div>

        {/* Horizon */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <label className="font-bold text-[#191B1D]">Investment Horizon</label>
            <span className="font-mono font-bold bg-[#F4F5F6] px-3 py-1 rounded-md border border-[#CDCECF]">{data.horizon} Years</span>
          </div>
          <input type="range" min={1} max={30} value={data.horizon} onChange={e => update('horizon', +e.target.value)} className="w-full po-slider" />
          <div className="flex justify-between text-xs text-[#5A5D61] font-mono">
            <span>1 Year</span><span>10 Years</span><span>30 Years (Multi-Cycle)</span>
          </div>
        </div>

        {/* Risk */}
        <div className="space-y-2 pt-2 border-t border-[#CDCECF]">
          <div className="flex justify-between items-center text-sm">
            <label className="font-bold text-[#191B1D]">Risk Tolerance Level</label>
            <span className="font-mono font-bold bg-[#0F766E]/10 px-3 py-1 rounded-md border border-[#0F766E]/30 text-[#0F766E]">Score: {data.riskTolerance}/10</span>
          </div>
          <input type="range" min={1} max={10} value={data.riskTolerance} onChange={e => update('riskTolerance', +e.target.value)} className="w-full po-slider" />
          <div className="grid grid-cols-5 gap-2 pt-1">
            {['1-2 Min', '3-4 Low', '5-6 Med', '7-8 High', '9-10 Max'].map((label, i) => {
              const active = Math.ceil(data.riskTolerance / 2) === i + 1;
              return (
                <button key={label}
                  onClick={() => update('riskTolerance', i * 2 + 1 + Math.floor(Math.random()))}
                  className={`py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${active ? 'bg-[#191B1D] text-white border-[#191B1D]' : 'bg-[#F4F5F6] text-[#5A5D61] border-[#CDCECF] hover:border-[#191B1D] hover:text-[#191B1D]'}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Capital & SIP */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#CDCECF]">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#191B1D]">Initial Capital (₹)</label>
            <input type="number" step={50000} value={data.capital} onChange={e => update('capital', +e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#CDCECF] rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-[#191B1D]" />
            <div className="flex gap-1.5">
              {[500000, 1000000, 2500000, 10000000].map((v, i) => (
                <button key={v} onClick={() => update('capital', v)}
                  className={`px-2 py-1 rounded text-xs font-mono border transition-all ${data.capital === v ? 'bg-[#191B1D] text-white border-[#191B1D]' : 'bg-[#F4F5F6] text-[#5A5D61] border-[#CDCECF] hover:text-[#191B1D]'}`}>
                  {['₹5L', '₹10L', '₹25L', '₹1Cr'][i]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#191B1D]">Monthly SIP (₹)</label>
            <input type="number" step={5000} value={data.sip} onChange={e => update('sip', +e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#CDCECF] rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-[#191B1D]" />
            <div className="flex gap-1.5">
              {[10000, 25000, 50000, 100000].map((v, i) => (
                <button key={v} onClick={() => update('sip', v)}
                  className={`px-2 py-1 rounded text-xs font-mono border transition-all ${data.sip === v ? 'bg-[#191B1D] text-white border-[#191B1D]' : 'bg-[#F4F5F6] text-[#5A5D61] border-[#CDCECF] hover:text-[#191B1D]'}`}>
                  {['₹10k', '₹25k', '₹50k', '₹1L'][i]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="po-col-span-5 po-card p-7 flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#CDCECF] pb-4">
            <div className="flex items-center gap-2">
              <span className="text-[#0F766E]">🛡️</span>
              <h3 className="text-base font-bold text-[#191B1D]">Portfolio Constraints</h3>
            </div>
            <span className={`text-xs font-mono px-3 py-1 rounded-md border ${data.riskTolerance <= 3 ? 'bg-blue-50 text-blue-700 border-blue-200' : data.riskTolerance <= 6 ? 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30' : 'bg-red-50 text-red-700 border-red-200'} font-bold`}>
              {data.riskTolerance <= 3 ? 'Conservative' : data.riskTolerance <= 6 ? 'Moderate' : data.riskTolerance <= 8 ? 'Aggressive' : 'Max Risk'}
            </span>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#5A5D61] uppercase tracking-wider font-mono">Asset Allocation Bounds</span>
            <div className="space-y-2.5">
              {[
                { label: 'Equities Range', color: '#191B1D', value: equityBound() },
                { label: 'Fixed Income / Bonds', color: '#0F766E', value: `${Math.max(15, 50 - data.riskTolerance * 3)}%–${Math.max(25, 60 - data.riskTolerance * 3)}%` },
                { label: 'Gold & Commodities', color: '#B45309', value: `Max ${Math.min(15, 5 + data.riskTolerance)}%` },
              ].map(b => (
                <div key={b.label} className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#CDCECF] flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: b.color }} />
                    <span className="text-[#191B1D] font-semibold">{b.label}</span>
                  </div>
                  <span className="font-mono font-bold text-[#191B1D]">{b.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F5F6] border border-[#CDCECF] text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#191B1D] font-bold text-sm">
              <span className="text-[#0F766E]">✓</span> Deterministic Rules
            </div>
            <ul className="space-y-1.5 text-xs text-[#5A5D61] font-mono">
              <li>• Single Asset Cap: <strong className="text-[#191B1D]">25.0%</strong></li>
              <li>• Long-Only: <strong className="text-[#191B1D]">Sum = 100.0%, Weights ≥ 0</strong></li>
              <li>• Dust Filter: <strong className="text-[#191B1D]">Allocations ≥ 1.5% or 0%</strong></li>
              <li>• Ledoit-Wolf Shrinkage: <strong className="text-[#191B1D]">δ = 0.20 active</strong></li>
            </ul>
          </div>
        </div>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm transition-all shadow-md shadow-[#6D0E5A]/25 hover:-translate-y-0.5">
          Proceed to Investment Universe →
        </button>
      </div>
    </div>
  );
};

// ── Universe Step ─────────────────────────────────────────────────────────────

const UniverseStep: React.FC<{
  selectedTickers: string[];
  onToggle: (t: string) => void;
  onNext: () => void;
}> = ({ selectedTickers, onToggle, onNext }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [presets, setPresets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/portfolio/universe`)
      .then(r => r.json())
      .then(d => { setAssets(d.assets || []); setPresets(d.presets || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = assets.filter(a => {
    const matchClass = filter === 'all' || a.asset_class === filter;
    const matchSearch = !search || a.ticker.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase());
    return matchClass && matchSearch;
  });

  const CATEGORIES = [
    { id: 'all', label: `All (${assets.length})` },
    { id: 'equity', label: `Equities (${assets.filter(a => a.asset_class === 'equity').length})` },
    { id: 'debt', label: `Debt (${assets.filter(a => a.asset_class === 'debt').length})` },
    { id: 'reit', label: `REITs (${assets.filter(a => a.asset_class === 'reit').length})` },
    { id: 'commodity', label: `Commodities (${assets.filter(a => a.asset_class === 'commodity').length})` },
    { id: 'international', label: `Global ETFs (${assets.filter(a => a.asset_class === 'international').length})` },
    { id: 'alternative', label: `Digital Assets (${assets.filter(a => a.asset_class === 'alternative').length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3.5 rounded-xl border border-[#CDCECF]">
        <span className="text-xs text-[#5A5D61] font-mono font-bold mr-1">Institutional Presets:</span>
        {Object.entries(presets).map(([name, tickers]) => (
          <button key={name} onClick={() => tickers.forEach(t => { if (!selectedTickers.includes(t)) onToggle(t); })}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#F4F5F6] text-[#191B1D] hover:bg-[#191B1D] hover:text-white transition-all border border-[#CDCECF]">
            {name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-[#CDCECF]">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${filter === c.id ? 'bg-[#191B1D] text-white border-[#191B1D]' : 'bg-[#F4F5F6] text-[#5A5D61] border-[#CDCECF] hover:border-[#191B1D]'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search assets or tickers..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-72 pl-3 pr-3 py-2 bg-white border border-[#CDCECF] rounded-lg text-sm focus:outline-none focus:border-[#191B1D]" />
      </div>

      <div className="flex items-center justify-between text-xs px-1 text-[#5A5D61] font-mono">
        <span>Displaying {filtered.length} assets · {selectedTickers.length} selected</span>
        <button className="text-[#6D0E5A] hover:underline font-bold"
          onClick={() => filtered.slice(0, 12).forEach(a => { if (!selectedTickers.includes(a.ticker)) onToggle(a.ticker); })}>
          + Select Top 12 Visible
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-[#5A5D61] font-mono text-sm">
          Loading institutional universe...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {filtered.map(a => {
            const selected = selectedTickers.includes(a.ticker);
            return (
              <div key={a.ticker} onClick={() => onToggle(a.ticker)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${selected ? 'border-[#6D0E5A] bg-white shadow-sm ring-1 ring-[#6D0E5A]' : 'border-[#CDCECF] bg-white hover:border-[#191B1D]'}`}>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#191B1D] truncate">{a.ticker}</span>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase shrink-0 ${selected ? 'bg-[#191B1D] text-white border-[#191B1D]' : 'bg-[#F4F5F6] text-[#5A5D61] border-[#CDCECF]'}`}>
                      {a.asset_class}
                    </span>
                  </div>
                  <p className="text-sm text-[#191B1D] font-medium line-clamp-1">{a.name}</p>
                  <div className="flex items-center gap-2 text-xs text-[#5A5D61] font-mono">
                    <span>{a.sector}</span><span>•</span><span>{a.currency}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono mt-1">
                    <span className="text-[#0F766E] font-bold">μ {fmt(a.expected_return * 100, 1)}%</span>
                    <span className="text-[#5A5D61]">σ {fmt(a.volatility * 100, 1)}%</span>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${selected ? 'bg-[#191B1D] text-white' : 'bg-[#F4F5F6] text-[#5A5D61] border border-[#CDCECF]'}`}>
                  {selected ? '✓' : '+'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-[#CDCECF] rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#191B1D]">Selected Pool:</span>
          <span className="font-mono text-sm font-bold px-3 py-1 rounded-md bg-[#F4F5F6] border border-[#CDCECF]">{selectedTickers.length} Assets</span>
        </div>
        <button onClick={onNext} disabled={selectedTickers.length < 3}
          className="flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm transition-all shadow-md shadow-[#6D0E5A]/25 disabled:opacity-40 hover:-translate-y-0.5">
          Proceed to Solver & Frontier →
        </button>
      </div>
    </div>
  );
};

// ── Solver Step ───────────────────────────────────────────────────────────────

const SolverStep: React.FC<{
  profile: ProfileData;
  tickers: string[];
  onResult: (r: OptimizationResult) => void;
  onNext: () => void;
}> = ({ profile, tickers, onResult, onNext }) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${API}/portfolio/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: profile.age,
          horizon_years: profile.horizon,
          risk_tolerance: profile.riskTolerance,
          initial_capital: profile.capital,
          monthly_sip: profile.sip,
          liquidity_need: profile.liquidity,
          selected_tickers: tickers,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      onResult(data);
    } catch (e: any) {
      setError(e.message || 'Solver failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="po-card p-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F4F5F6] border border-[#CDCECF] text-xs font-mono font-bold text-[#191B1D]">
            ⚡ Deterministic SLSQP Solver
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#191B1D] mt-2">Efficient Frontier & Max-Sharpe Optimization</h2>
          <p className="text-sm text-[#5A5D61] mt-1 max-w-xl">
            Solves multi-start SLSQP across {tickers.length} candidate assets with Ledoit-Wolf covariance shrinkage (δ=0.20). Generates 4 candidate allocations.
          </p>
        </div>
        <button onClick={execute} disabled={running}
          className="flex items-center gap-2 py-3.5 px-6 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm transition-all shadow-md shadow-[#6D0E5A]/25 disabled:opacity-50 hover:-translate-y-0.5">
          {running ? (
            <><span className="animate-spin inline-block">⚙</span> Solving...</>
          ) : (
            <>⚡ Execute SLSQP Optimizer</>
          )}
        </button>
      </div>

      {error && (
        <div className="po-card p-5 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 font-mono">{error}</p>
        </div>
      )}

      {!result && !running && (
        <div className="border border-dashed border-[#CDCECF] rounded-2xl p-12 text-center space-y-4 bg-white">
          <div className="w-12 h-12 rounded-full bg-[#F7EBF4] border border-[#6D0E5A]/30 flex items-center justify-center mx-auto text-2xl">🥧</div>
          <h3 className="font-bold text-base text-[#191B1D]">Ready to Calculate Optimal Frontier</h3>
          <p className="text-sm text-[#5A5D61] max-w-md mx-auto">
            Execute the solver to compute log-returns, Ledoit-Wolf shrinkage covariance, and post-tax real Sharpe weights.
          </p>
          <button onClick={execute}
            className="px-6 py-3 rounded-full bg-[#6D0E5A] text-white text-sm font-bold hover:bg-[#580B48] transition-all hover:-translate-y-0.5">
            Launch Solver Now
          </button>
        </div>
      )}

      {result && (
        <div className="po-card p-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-[#5A5D61] font-mono">
            <span className="text-[#0F766E] font-bold">✓ OPTIMAL_CONVERGED</span>
            <span>·</span>
            <span>{result.solver_iterations} iterations</span>
            <span>·</span>
            <span>{result.selected_asset_count} assets</span>
            <span>·</span>
            <span>Rf={fmt(result.risk_free_rate * 100, 2)}%</span>
          </div>
          <p className="text-sm text-[#191B1D]">
            SLSQP successfully converged generating <strong>4 candidate allocations</strong>. Proceed to Suitability Matching to evaluate the best fit for your risk profile.
          </p>
          <button onClick={onNext}
            className="mt-4 flex items-center gap-2 py-3 px-6 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm transition-all shadow-md hover:-translate-y-0.5">
            Proceed to Candidate Evaluation →
          </button>
        </div>
      )}
    </div>
  );
};

// ── Suitability Step ──────────────────────────────────────────────────────────

const SuitabilityStep: React.FC<{
  result: OptimizationResult | null;
  profile: ProfileData;
  selectedCandidate: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}> = ({ result, profile, selectedCandidate, onSelect, onNext }) => {
  if (!result) return (
    <div className="po-card p-12 text-center">
      <p className="text-[#5A5D61]">Complete the SLSQP Solver step first.</p>
    </div>
  );

  const selected = selectedCandidate || result.recommended_candidate_id;
  const candidate = result.candidates.find(c => c.candidate_id === selected);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {result.candidates.map(c => (
          <div key={c.candidate_id} onClick={() => onSelect(c.candidate_id)}
            className={`rounded-2xl p-6 border cursor-pointer transition-all relative ${selected === c.candidate_id ? 'bg-white border-[#191B1D] shadow-sm ring-1 ring-[#191B1D]' : 'bg-white border-[#CDCECF] hover:border-[#191B1D]'}`}>
            {c.is_recommended && (
              <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-[#191B1D] text-white text-xs font-mono font-bold tracking-wide">★ RECOMMENDED</div>
            )}
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base text-[#191B1D]">{c.title}</h3>
                <p className="text-xs text-[#5A5D61] mt-0.5 line-clamp-1">{c.subtitle}</p>
              </div>
              <div className="space-y-2.5 py-3 border-y border-[#CDCECF] font-mono text-sm">
                {[
                  ['Nominal Return', `${fmt(c.nominal_return)}%`, 'text-[#191B1D]'],
                  ['Real Return', `${fmt(c.real_return)}%`, 'text-[#0F766E]'],
                  ['Volatility (σ)', `${fmt(c.volatility)}%`, 'text-[#191B1D]'],
                  ['Sharpe Ratio', `${c.sharpe_ratio}`, 'text-[#0F766E]'],
                  ['Max Drawdown', `${fmt(c.max_drawdown)}%`, 'text-[#DC2626]'],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="flex justify-between items-center">
                    <span className="text-[#5A5D61] text-xs">{label}</span>
                    <span className={`font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A5D61] font-mono">Suitability Score:</span>
                  <span className="font-bold font-mono text-[#0F766E]">{c.suitability_score}%</span>
                </div>
                <div className="w-full h-2 bg-[#F4F5F6] rounded-full overflow-hidden border border-[#CDCECF]">
                  <div className="h-full rounded-full bg-[#191B1D] transition-all" style={{ width: `${c.suitability_score}%` }} />
                </div>
              </div>
              {/* Asset class bar */}
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-[#F4F5F6] border border-[#CDCECF]">
                {Object.entries(c.asset_class_split).map(([cls, pct]) => (
                  <div key={cls} style={{ width: `${pct}%`, background: CLASS_COLORS[cls] || '#999' }} title={`${CLASS_LABELS[cls] || cls}: ${pct}%`} />
                ))}
              </div>
            </div>
            <button onClick={() => onSelect(c.candidate_id)}
              className={`w-full mt-4 py-2.5 rounded-lg text-xs font-mono font-bold border transition-all ${selected === c.candidate_id ? 'bg-[#6D0E5A] text-white border-[#6D0E5A]' : 'bg-[#F4F5F6] text-[#191B1D] border-[#CDCECF] hover:bg-[#F7EBF4] hover:text-[#6D0E5A] hover:border-[#6D0E5A]'}`}>
              {selected === c.candidate_id ? 'Selected Candidate ✓' : 'Select Candidate'}
            </button>
          </div>
        ))}
      </div>

      {candidate && (
        <div className="po-card p-7 space-y-5">
          <div className="flex justify-between items-start border-b border-[#CDCECF] pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-[#0F766E] uppercase tracking-wider">Suitability Evaluation Report</span>
              <h3 className="text-xl font-black text-[#191B1D] mt-1">Why the {candidate.title} Fits Your Parameters</h3>
            </div>
            <span className="text-xs font-mono px-3.5 py-1.5 rounded-md bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/30 font-bold">
              Match Score: {candidate.suitability_score}/100
            </span>
          </div>

          {/* Holdings Breakdown */}
          <div>
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="font-bold text-[#191B1D]">Holdings Breakdown — {fmtINR(profile.capital)}</span>
              <span className="font-mono text-xs text-[#5A5D61]">{candidate.holdings.length} Assets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {candidate.holdings.map(h => (
                <div key={h.ticker} className="p-3.5 rounded-xl bg-white border border-[#CDCECF] flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-[#191B1D] block">{h.ticker.replace('.NS', '')}</span>
                    <span className="text-[#5A5D61] truncate block max-w-[110px] text-[10px]">{h.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#0F766E] block">{fmt(h.weight)}%</span>
                    <span className="font-mono text-[10px] text-[#5A5D61] block">{fmtINR(h.allocation_inr)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {candidate.rejection_rationale && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <span className="font-bold">Note: </span>{candidate.rejection_rationale}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onNext}
          className="flex items-center gap-2 py-3.5 px-6 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm transition-all shadow-md hover:-translate-y-0.5">
          Proceed to Monte Carlo Projections →
        </button>
      </div>
    </div>
  );
};

// ── Projections Step ──────────────────────────────────────────────────────────

const ProjectionsStep: React.FC<{
  candidate: PortfolioCandidate | null;
  profile: ProfileData;
  onNext: () => void;
}> = ({ candidate, profile, onNext }) => {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  const simulate = async () => {
    if (!candidate) return;
    setRunning(true);
    try {
      const res = await fetch(`${API}/portfolio/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_capital: profile.capital,
          monthly_sip: profile.sip,
          horizon_years: profile.horizon,
          expected_return: candidate.nominal_return / 100,
          volatility: candidate.volatility / 100,
          num_paths: 5000,
        }),
      });
      const data = await res.json();
      setResult(data);
    } finally { setRunning(false); }
  };

  return (
    <div className="space-y-6">
      <div className="po-card p-7 space-y-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-[#CDCECF] text-xs font-mono font-bold text-[#191B1D]">
            📈 Wealth Trajectory Simulation (5,000 Paths)
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#191B1D] mt-2">Monte Carlo Probability & Wealth Projections</h2>
          <p className="text-sm text-[#5A5D61] max-w-xl mt-1">
            Simulates 5,000 Geometric Brownian Motion paths under μ={candidate ? fmt(candidate.nominal_return) : '—'}% and σ={candidate ? fmt(candidate.volatility) : '—'}%.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-[#CDCECF]">
          <div className="flex items-center gap-5 text-sm text-[#5A5D61] font-mono">
            <span>Capital: <strong className="text-[#191B1D]">{fmtINR(profile.capital)}</strong></span>
            <span>SIP: <strong className="text-[#191B1D]">{fmtINR(profile.sip)}/mo</strong></span>
            <span>Horizon: <strong className="text-[#191B1D]">{profile.horizon}Y</strong></span>
          </div>
          <button onClick={simulate} disabled={running || !candidate}
            className="px-6 py-3 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm disabled:opacity-50 transition-all hover:-translate-y-0.5">
            {running ? '⚙ Simulating...' : 'Run 5,000-Path Monte Carlo'}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Median Final Wealth (p50)', value: fmtINR(result.median_final_wealth), color: 'text-[#0F766E]' },
              { label: 'Bear Case Final (p10)', value: fmtINR(result.bearish_final_wealth), color: 'text-[#191B1D]' },
              { label: 'Bull Case Final (p90)', value: fmtINR(result.bullish_final_wealth), color: 'text-[#6D0E5A]' },
              { label: 'Total Invested', value: fmtINR(result.total_invested), color: 'text-[#5A5D61]' },
            ].map(m => (
              <div key={m.label} className="po-card p-5 space-y-1">
                <span className="text-xs text-[#5A5D61] font-mono uppercase tracking-wider block">{m.label}</span>
                <p className={`text-2xl font-black font-mono ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="po-card p-6 space-y-4">
            <h3 className="font-bold text-[#191B1D]">Yearly Wealth Trajectory (5,000 Paths)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-[#CDCECF] text-xs text-[#5A5D61] uppercase">
                    <th className="py-2.5 text-left font-bold">Year</th>
                    <th className="py-2.5 text-right font-bold">Invested</th>
                    <th className="py-2.5 text-right font-bold text-[#DC2626]">p10 Bearish</th>
                    <th className="py-2.5 text-right font-bold text-[#0F766E]">p50 Median</th>
                    <th className="py-2.5 text-right font-bold text-[#6D0E5A]">p90 Bullish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CDCECF]">
                  {result.trajectory.slice(1).map(pt => (
                    <tr key={pt.year} className="hover:bg-[#F8F9FA]">
                      <td className="py-2.5 font-bold text-[#191B1D]">{pt.year}Y</td>
                      <td className="py-2.5 text-right text-[#5A5D61]">{fmtINR(pt.invested_capital)}</td>
                      <td className="py-2.5 text-right text-[#DC2626] font-bold">{fmtINR(pt.p10_bearish)}</td>
                      <td className="py-2.5 text-right text-[#0F766E] font-bold">{fmtINR(pt.p50_median)}</td>
                      <td className="py-2.5 text-right text-[#6D0E5A] font-bold">{fmtINR(pt.p90_bullish)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 pt-2 border-t border-[#CDCECF]">
              <div className="text-xs font-mono text-[#5A5D61]">
                Probability of capital loss: <strong className={result.prob_loss_5y > 15 ? 'text-red-600' : 'text-[#0F766E]'}>{result.prob_loss_5y}%</strong>
              </div>
              <div className="text-xs font-mono text-[#5A5D61]">
                Probability of beating 6% CPI: <strong className="text-[#0F766E]">{result.prob_beat_inflation}%</strong>
              </div>
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="flex justify-end">
          <button onClick={onNext}
            className="flex items-center gap-2 py-3.5 px-6 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm transition-all shadow-md hover:-translate-y-0.5">
            Proceed to Stress Testing →
          </button>
        </div>
      )}
    </div>
  );
};

// ── Stress Test Step ──────────────────────────────────────────────────────────

const StressTestStep: React.FC<{
  candidate: PortfolioCandidate | null;
  onNext: () => void;
}> = ({ candidate, onNext }) => {
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<'backtest' | 'crisis'>('backtest');

  const runTest = async () => {
    if (!candidate) return;
    setRunning(true);
    try {
      const weights: Record<string, number> = {};
      candidate.holdings.forEach(h => { weights[h.ticker] = h.weight / 100; });
      const res = await fetch(`${API}/portfolio/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights,
          portfolio_title: candidate.title,
          expected_return: candidate.nominal_return / 100,
          volatility: candidate.volatility / 100,
        }),
      });
      const data = await res.json();
      setResult(data);
    } finally { setRunning(false); }
  };

  return (
    <div className="space-y-6">
      <div className="po-card p-7 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-[#CDCECF] text-xs font-mono font-bold text-[#191B1D]">
          🛡️ Walk-Forward Backtest & Macro Stress Verification
        </div>
        <h2 className="text-2xl font-black tracking-tight text-[#191B1D]">Historical Verification & Extreme Crisis Stress</h2>
        <p className="text-sm text-[#5A5D61]">
          Validates portfolio resilience against 10 years of market history (2016–2025) and subjects allocations to historical crisis shocks.
        </p>
        <button onClick={runTest} disabled={running || !candidate}
          className="mt-4 px-6 py-3 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm disabled:opacity-50 transition-all hover:-translate-y-0.5">
          {running ? '⚙ Running Stress Tests...' : '🛡️ Run Historical Backtest & Stress Tests'}
        </button>
      </div>

      {result && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-[#CDCECF] gap-4">
            {(['backtest', 'crisis'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-all ${tab === t ? 'border-[#191B1D] text-[#191B1D]' : 'border-transparent text-[#5A5D61] hover:text-[#191B1D]'}`}>
                {t === 'backtest' ? '10-Year Historical Backtest' : 'Crisis Stress Scenarios'}
              </button>
            ))}
          </div>

          {tab === 'backtest' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-mono">
                {[
                  { label: '10Y CAGR', value: `${fmt(result.backtest_summary.cagr_10y)}%`, color: 'text-[#0F766E]' },
                  { label: 'Volatility', value: `${fmt(result.backtest_summary.volatility_realized)}%`, color: 'text-[#191B1D]' },
                  { label: 'Sharpe Ratio', value: `${result.backtest_summary.sharpe_ratio}`, color: 'text-[#0F766E]' },
                  { label: 'Sortino Ratio', value: `${result.backtest_summary.sortino_ratio}`, color: 'text-[#191B1D]' },
                  { label: 'Max Drawdown', value: `${fmt(result.backtest_summary.max_drawdown)}%`, color: 'text-[#DC2626]' },
                  { label: 'Calmar Ratio', value: `${result.backtest_summary.calmar_ratio}`, color: 'text-[#191B1D]' },
                ].map(m => (
                  <div key={m.label} className="po-card p-4 space-y-1">
                    <span className="text-xs text-[#5A5D61] font-mono uppercase tracking-wider block">{m.label}</span>
                    <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="po-card p-6 space-y-3">
                <h3 className="text-base font-bold text-[#191B1D]">Benchmark Comparison (2016–2025)</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#CDCECF] text-xs font-mono text-[#5A5D61]">
                      <th className="py-3 font-bold text-left">Strategy / Benchmark</th>
                      <th className="py-3 font-bold">10Y CAGR</th>
                      <th className="py-3 font-bold">Max Drawdown</th>
                      <th className="py-3 font-bold">Sharpe</th>
                      <th className="py-3 font-bold">Recovery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CDCECF] font-mono">
                    <tr className="bg-[#F8F9FA] font-bold">
                      <td className="py-3 text-[#0F766E]">★ Your ArthaAI Portfolio</td>
                      <td className="py-3 text-center text-[#0F766E]">{fmt(result.backtest_summary.cagr_10y)}%</td>
                      <td className="py-3 text-center text-[#DC2626]">{fmt(result.backtest_summary.max_drawdown)}%</td>
                      <td className="py-3 text-center text-[#0F766E]">{result.backtest_summary.sharpe_ratio}</td>
                      <td className="py-3 text-center">{result.backtest_summary.recovery_months} Months</td>
                    </tr>
                    {result.benchmarks.map(b => (
                      <tr key={b.name} className="text-[#191B1D]">
                        <td className="py-3">{b.name}</td>
                        <td className="py-3 text-center">{fmt(b.cagr_10y)}%</td>
                        <td className="py-3 text-center text-[#DC2626]">{fmt(b.max_drawdown)}%</td>
                        <td className="py-3 text-center">{b.sharpe_ratio}</td>
                        <td className="py-3 text-center text-[#5A5D61]">{b.recovery_months} Months</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="po-card p-6 space-y-3">
                <h3 className="font-bold text-[#191B1D]">Yearly Returns Attribution (2016–2025)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
                  {result.yearly_returns.map(yr => (
                    <div key={yr.year} className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#CDCECF] space-y-1.5">
                      <div className="flex justify-between text-[#5A5D61]">
                        <span className="font-bold text-[#191B1D]">{yr.year}</span>
                        {yr.outperformed && <span className="text-[#0F766E] font-bold">Beat ✓</span>}
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className={`text-sm font-bold ${yr.portfolio_return >= 0 ? 'text-[#0F766E]' : 'text-red-600'}`}>{fmt(yr.portfolio_return)}%</span>
                        <span className="text-[#5A5D61]">bm: {fmt(yr.benchmark_return)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'crisis' && (
            <div className="space-y-4">
              {result.crisis_scenarios.map(sc => (
                <div key={sc.scenario_id} className="po-card p-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[#191B1D]">{sc.label}</h3>
                      <p className="text-xs text-[#5A5D61] mt-1 max-w-2xl">{sc.description}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-xs font-mono text-[#5A5D61]">Portfolio Drawdown</div>
                      <div className="text-2xl font-black font-mono text-[#DC2626]">{fmt(sc.portfolio_drawdown)}%</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 bg-[#F8F9FA] border border-[#CDCECF] rounded-lg">
                      <span className="text-[#5A5D61]">Portfolio</span>
                      <p className="font-bold text-[#DC2626] text-base mt-1">{fmt(sc.portfolio_drawdown)}%</p>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] border border-[#CDCECF] rounded-lg">
                      <span className="text-[#5A5D61]">Nifty 50</span>
                      <p className="font-bold text-[#DC2626] text-base mt-1">{fmt(sc.nifty50_drawdown)}%</p>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] border border-[#CDCECF] rounded-lg">
                      <span className="text-[#5A5D61]">Advantage</span>
                      <p className="font-bold text-[#0F766E] text-sm mt-1">{sc.recovery_advantage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={onNext}
              className="flex items-center gap-2 py-3.5 px-6 rounded-full bg-[#6D0E5A] hover:bg-[#580B48] text-white font-bold text-sm transition-all shadow-md hover:-translate-y-0.5">
              Proceed to Decision Studio →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Decision Studio Step ──────────────────────────────────────────────────────

const StudioStep: React.FC<{
  candidate: PortfolioCandidate | null;
  profile: ProfileData;
}> = ({ candidate, profile }) => {
  if (!candidate) return (
    <div className="po-card p-12 text-center">
      <p className="text-[#5A5D61]">Complete all previous steps to access the Decision Studio.</p>
    </div>
  );

  const exportCSV = () => {
    const rows = ['Ticker,Name,Asset Class,Weight (%),Allocation (INR),Strategic Role'];
    candidate.holdings.forEach(h => rows.push(`${h.ticker},${h.name},${h.asset_class},${h.weight},${h.allocation_inr},${h.strategic_role}`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'arthaai-portfolio.csv'; a.click();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(candidate, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'arthaai-portfolio.json'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="po-card p-7 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F4F5F6] border border-[#CDCECF] text-xs font-mono font-bold text-[#191B1D]">
              ✦ Institutional Verdict & Decision Studio
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[#191B1D] mt-2">Recommended Investor Allocation & Audit Pack</h2>
            <p className="text-sm text-[#5A5D61] mt-1">Optimal weights derived from Ledoit-Wolf covariance shrinkage, post-tax inflation drag, and concentration caps.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportCSV} className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F4F5F6] text-[#191B1D] text-xs font-mono font-bold flex items-center gap-2 border border-[#CDCECF] transition-all">
              📊 Export CSV
            </button>
            <button onClick={exportJSON} className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F4F5F6] text-[#191B1D] text-xs font-mono font-bold flex items-center gap-2 border border-[#CDCECF] transition-all">
              ＜/＞ Export JSON
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
          {[
            { label: 'Nominal Return', value: `${fmt(candidate.nominal_return)}%`, color: 'text-[#0F766E]' },
            { label: 'Real Return', value: `${fmt(candidate.real_return)}%`, color: 'text-[#0F766E]' },
            { label: 'Volatility', value: `${fmt(candidate.volatility)}%`, color: 'text-[#191B1D]' },
            { label: 'Sharpe Ratio', value: `${candidate.sharpe_ratio}`, color: 'text-[#0F766E]' },
            { label: 'Suitability', value: `${candidate.suitability_score}%`, color: 'text-[#6D0E5A]' },
          ].map(m => (
            <div key={m.label} className="p-4 rounded-xl bg-[#F8F9FA] border border-[#CDCECF]">
              <span className="text-xs text-[#5A5D61] font-mono uppercase tracking-wider block">{m.label}</span>
              <p className={`text-xl font-black ${m.color} mt-1`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Holdings table */}
        <div className="overflow-x-auto rounded-xl border border-[#CDCECF]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F9FA] text-[#5A5D61] font-mono text-xs uppercase border-b border-[#CDCECF]">
              <tr>
                <th className="p-3.5 font-bold">Asset Name</th>
                <th className="p-3.5 font-bold">Class</th>
                <th className="p-3.5 font-bold">Weight</th>
                <th className="p-3.5 text-right font-bold">Allocation</th>
                <th className="p-3.5 font-bold">Strategic Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CDCECF] bg-white font-mono">
              {candidate.holdings.map(h => (
                <tr key={h.ticker} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-[#191B1D] text-sm">{h.name}</div>
                    <div className="text-xs text-[#5A5D61]">{h.ticker}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="text-xs font-mono uppercase font-semibold px-2 py-0.5 rounded bg-[#F4F5F6] border border-[#CDCECF] text-[#5A5D61]">{h.asset_class}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2 font-bold text-[#0F766E]">
                      <span>{fmt(h.weight)}%</span>
                      <div className="w-20 bg-[#F4F5F6] h-2 rounded-full overflow-hidden border border-[#CDCECF] hidden sm:block">
                        <div className="bg-[#191B1D] h-full rounded-full" style={{ width: `${(h.weight / 25) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-bold text-[#191B1D] text-sm">{fmtINR(h.allocation_inr)}</td>
                  <td className="p-3.5 text-[#5A5D61] text-xs">{h.strategic_role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-5 rounded-xl bg-[#F8F9FA] border border-[#CDCECF] space-y-2">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider font-mono">Transparent Audit: Regulatory Compliance (Finance Act 2024)</span>
          <ul className="space-y-1 text-xs text-[#5A5D61] font-mono">
            <li>• STT on equity delivery: <strong className="text-[#191B1D]">0.1% both legs</strong> (Finance Act 2024 statutory cost)</li>
            <li>• LTCG (12M+ holding): <strong className="text-[#191B1D]">12.5% flat above ₹1.25L annual exemption</strong></li>
            <li>• STCG (below 12M): <strong className="text-[#191B1D]">20% flat</strong> (Budget 2024 amendment)</li>
            <li>• Sovereign bonds, FDs, REITs: taxed at <strong className="text-[#191B1D]">applicable slab rates per SEBI LODR provisions</strong></li>
            <li>• Estimated real return net of 6% CPI & tax drag: <strong className="text-[#0F766E]">{fmt(candidate.real_return)}% p.a.</strong></li>
          </ul>
        </div>
      </div>

      <div className="po-card p-6 flex items-center justify-between">
        <div>
          <span className="text-[#0F766E] font-bold text-sm">✓ Portfolio Construction Complete</span>
          <p className="text-xs text-[#5A5D61] mt-1">Your institutionally-optimized allocation is ready. Export for broker execution.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black font-mono text-[#6D0E5A]">{fmtINR(profile.capital)}</div>
          <div className="text-xs text-[#5A5D61] font-mono">{candidate.holdings.length} assets · Suitability {candidate.suitability_score}%</div>
        </div>
      </div>
    </div>
  );
};

// ── Main Portfolio Page ───────────────────────────────────────────────────────

export const PortfolioPage: React.FC = () => {
  const [step, setStep] = useState<StepId>('profile');
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());

  const [profile, setProfile] = useState<ProfileData>({
    age: 32, horizon: 10, riskTolerance: 6,
    capital: 1_000_000, sip: 25_000, liquidity: 'moderate',
  });
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS',
    'INDIA_GOVT_10Y', 'SBI_FD', 'GOLDBEES.NS', 'EMBASSY_REIT',
  ]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const toggleTicker = (t: string) => {
    setSelectedTickers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const advance = (from: StepId, to: StepId) => {
    setCompletedSteps(prev => new Set([...prev, from]));
    setStep(to);
  };

  const selectedCandidate = optimizationResult?.candidates.find(
    c => c.candidate_id === (selectedCandidateId || optimizationResult.recommended_candidate_id)
  ) ?? null;

  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="po-page">
      {/* Header */}
      <div className="po-section-header">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#6D0E5A] font-mono font-bold block">Portfolio Construction Engine</span>
          <h1 className="text-2xl font-black tracking-tight text-[#191B1D] mt-1">Your Portfolio Construction Journey</h1>
        </div>
        <div className="flex items-center gap-3 text-sm font-mono text-[#5A5D61] bg-[#F8F9FA] px-4 py-2 rounded-xl border border-[#CDCECF]">
          <span>Profile: <strong className="text-[#191B1D]">{profile.riskTolerance <= 3 ? 'Conservative' : profile.riskTolerance <= 6 ? 'Moderate' : 'Aggressive'}</strong></span>
          <span>•</span>
          <span>Capital: <strong className="text-[#191B1D]">{fmtINR(profile.capital)}</strong></span>
          {optimizationResult && (
            <>
              <span>•</span>
              <span>Sharpe: <strong className="text-[#6D0E5A] font-bold">{optimizationResult.candidates[0]?.sharpe_ratio}</strong></span>
            </>
          )}
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max pb-1">
          {STEPS.map((s, i) => {
            const done = completedSteps.has(s.id);
            const active = s.id === step;
            const unlocked = i === 0 || completedSteps.has(STEPS[i - 1].id) || done || active;
            return (
              <button key={s.id}
                onClick={() => unlocked ? setStep(s.id) : undefined}
                title={unlocked ? s.description : 'Complete previous step to unlock'}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all border ${active ? 'bg-[#6D0E5A] text-white font-bold border-[#6D0E5A] shadow-md shadow-[#6D0E5A]/25' : done ? 'bg-white text-[#0F766E] border-[#0F766E]/40 font-semibold' : unlocked ? 'bg-[#F8F9FA] text-[#5A5D61] border-[#CDCECF] hover:border-[#191B1D] cursor-pointer' : 'bg-[#F8F9FA] text-[#85888C] border-[#CDCECF] opacity-55 cursor-not-allowed select-none'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${active ? 'bg-[#580B48]' : done ? 'bg-[#0F766E]/10' : 'bg-[#EAEBED]'}`}>
                  {done ? '✓' : s.icon}
                </div>
                <div>
                  <span className="text-sm block leading-tight">{s.label}</span>
                  <span className={`text-xs font-mono block leading-tight ${active ? 'text-purple-200' : done ? 'text-[#0F766E]' : 'text-[#85888C]'}`}>
                    {unlocked ? s.description : 'Locked 🔒'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="mt-4">
        {step === 'profile' && (
          <ProfileStep data={profile} onChange={setProfile} onNext={() => advance('profile', 'universe')} />
        )}
        {step === 'universe' && (
          <UniverseStep selectedTickers={selectedTickers} onToggle={toggleTicker} onNext={() => advance('universe', 'solver')} />
        )}
        {step === 'solver' && (
          <SolverStep
            profile={profile}
            tickers={selectedTickers}
            onResult={r => { setOptimizationResult(r); setSelectedCandidateId(r.recommended_candidate_id); }}
            onNext={() => advance('solver', 'suitability')}
          />
        )}
        {step === 'suitability' && (
          <SuitabilityStep
            result={optimizationResult}
            profile={profile}
            selectedCandidate={selectedCandidateId}
            onSelect={setSelectedCandidateId}
            onNext={() => advance('suitability', 'projections')}
          />
        )}
        {step === 'projections' && (
          <ProjectionsStep
            candidate={selectedCandidate}
            profile={profile}
            onNext={() => advance('projections', 'stress')}
          />
        )}
        {step === 'stress' && (
          <StressTestStep candidate={selectedCandidate} onNext={() => advance('stress', 'studio')} />
        )}
        {step === 'studio' && (
          <StudioStep candidate={selectedCandidate} profile={profile} />
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;
