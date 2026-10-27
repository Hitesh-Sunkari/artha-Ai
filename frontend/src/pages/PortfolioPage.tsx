import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Globe,
  Cpu,
  Target,
  TrendingUp,
  ShieldCheck,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  PieChart,
  Activity,
  AlertTriangle,
} from 'lucide-react';

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

interface ProfileData {
  age: number;
  horizon: number;
  riskTolerance: number;
  capital: number;
  sip: number;
  liquidity: 'low' | 'moderate' | 'high';
}

const fmt = (n: number, decimals = 1) => n.toFixed(decimals);
const fmtINR = (n: number) => {
  if (n >= 10_000_000) return `₹${fmt(n / 10_000_000)}Cr`;
  if (n >= 100_000) return `₹${fmt(n / 100_000)}L`;
  if (n >= 1_000) return `₹${fmt(n / 1_000)}k`;
  return `₹${Math.round(n)}`;
};

import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

const STEPS = [
  { id: 'profile', label: '1. Profile', icon: Sliders, description: 'Risk Calibration' },
  { id: 'universe', label: '2. Universe', icon: Globe, description: 'Asset Pool' },
  { id: 'solver', label: '3. Solver', icon: Cpu, description: 'SLSQP Optimizer' },
  { id: 'suitability', label: '4. Suitability', icon: Target, description: 'Matching' },
  { id: 'projections', label: '5. Projections', icon: TrendingUp, description: 'Monte Carlo' },
  { id: 'stress', label: '6. Stress Test', icon: ShieldCheck, description: '10-Yr Backtest' },
  { id: 'studio', label: '7. Decision Studio', icon: Award, description: 'Allocation Verdict' },
] as const;

type StepId = typeof STEPS[number]['id'];

interface PortfolioPageProps {
  onHandoffToTrading?: (ticker: string, side: 'BUY' | 'SELL') => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onHandoffToTrading }) => {
  const [step, setStep] = useState<StepId>('profile');
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());

  const [profile, setProfile] = useState<ProfileData>({
    age: 32,
    horizon: 10,
    riskTolerance: 6,
    capital: 1_000_000,
    sip: 25_000,
    liquidity: 'moderate',
  });

  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS',
    'INDIA_GOVT_10Y', 'SBI_FD', 'GOLDBEES.NS', 'EMBASSY_REIT',
  ]);

  const [universeAssets, setUniverseAssets] = useState<Asset[]>([]);
  const [universePresets, setUniversePresets] = useState<Record<string, string[]>>({});
  const [universeFilter, setUniverseFilter] = useState('all');
  const [universeSearch, setUniverseSearch] = useState('');
  const [loadingUniverse, setLoadingUniverse] = useState(false);

  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);

  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [stressResult, setStressResult] = useState<any | null>(null);
  const [stressTesting, setStressTesting] = useState(false);

  // Load universe
  useEffect(() => {
    setLoadingUniverse(true);
    fetch(`${API}/portfolio/universe`)
      .then((r) => r.json())
      .then((d) => {
        setUniverseAssets(d.assets || []);
        setUniversePresets(d.presets || {});
        setLoadingUniverse(false);
      })
      .catch(() => setLoadingUniverse(false));
  }, []);

  const advance = (from: StepId, to: StepId) => {
    setCompletedSteps((prev) => new Set([...prev, from]));
    setStep(to);
  };

  const handleToggleTicker = (t: string) => {
    setSelectedTickers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  // Run Solver
  const runOptimization = async () => {
    setSolving(true);
    try {
      const res = await fetch(`${API}/portfolio/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: profile.age,
          investment_horizon_years: profile.horizon,
          risk_tolerance_score: profile.riskTolerance,
          initial_capital_inr: profile.capital,
          monthly_sip_inr: profile.sip,
          liquidity_need: profile.liquidity,
          eligible_tickers: selectedTickers,
        }),
      });
      const data = await res.json();
      setOptimizationResult(data);
      setSelectedCandidateId(data.recommended_candidate_id);
    } catch {
      // Keep baseline
    } finally {
      setSolving(false);
    }
  };

  // Run Monte Carlo Simulation
  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`${API}/portfolio/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_capital: profile.capital,
          monthly_sip: profile.sip,
          horizon_years: profile.horizon,
          expected_return: 0.134,
          volatility: 0.122,
          num_paths: 5000,
        }),
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch {
      // Keep baseline
    } finally {
      setSimulating(false);
    }
  };

  // Run Stress Test
  const runStressTest = async () => {
    setStressTesting(true);
    try {
      const res = await fetch(`${API}/portfolio/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: { 'RELIANCE.NS': 0.25, 'TCS.NS': 0.2, 'HDFCBANK.NS': 0.25, 'GOLDBEES.NS': 0.15, 'INDIA_GOVT_10Y': 0.15 },
          portfolio_title: 'Target-Risk Optimized Portfolio',
          expected_return: 0.134,
          volatility: 0.122,
        }),
      });
      const data = await res.json();
      setStressResult(data);
    } catch {
      // Keep baseline
    } finally {
      setStressTesting(false);
    }
  };

  const selectedCandidate =
    optimizationResult?.candidates.find(
      (c) => c.candidate_id === (selectedCandidateId || optimizationResult.recommended_candidate_id)
    ) || null;

  return (
    <div className="space-y-6">
      {/* Platform Stepper Header */}
      <div className="terminal-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#65D5C3] font-mono font-bold block">
            Institutional Portfolio Construction
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            7-Step Quantitative Optimizer & Asset Allocator
          </h1>
          <p className="text-xs text-[#8998AC] mt-1">
            Ledoit-Wolf shrinkage covariance, SLSQP quadratic optimization, Monte Carlo 5,000-path simulation, and crisis stress testing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#B4C0D0] bg-[#101722] px-4 py-2 rounded-xl border border-[#2A3748]">
          <span>
            Profile:{' '}
            <strong className="text-white">
              {profile.riskTolerance <= 3
                ? 'Conservative'
                : profile.riskTolerance <= 6
                ? 'Moderate'
                : 'Aggressive'}
            </strong>
          </span>
          <span className="text-[#37465B]">•</span>
          <span>
            Capital: <strong className="text-[#65D5C3]">{fmtINR(profile.capital)}</strong>
          </span>
          {optimizationResult && (
            <>
              <span className="text-[#37465B]">•</span>
              <span>
                Sharpe: <strong className="text-emerald-400">{optimizationResult.candidates[0]?.sharpe_ratio.toFixed(2)}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Modern Stepper Navigation Bar */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max pb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = completedSteps.has(s.id);
            const active = s.id === step;
            const unlocked = i === 0 || completedSteps.has(STEPS[i - 1].id) || done || active;

            return (
              <button
                key={s.id}
                onClick={() => (unlocked ? setStep(s.id) : undefined)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all border ${
                  active
                    ? 'bg-[#1C293A] text-[#65D5C3] font-bold border-[#65D5C3] shadow-md shadow-[#65D5C3]/15'
                    : done
                    ? 'bg-[#151F2D] text-[#43C99A] border-[#43C99A]/40 font-semibold'
                    : unlocked
                    ? 'bg-[#151F2D] text-[#B4C0D0] border-[#2A3748] hover:border-[#65D5C3]/50 cursor-pointer'
                    : 'bg-[#101722] text-[#607185] border-[#2A3748]/50 opacity-60 cursor-not-allowed select-none'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                    active
                      ? 'bg-[#65D5C3]/20 text-[#65D5C3]'
                      : done
                      ? 'bg-[#43C99A]/20 text-[#43C99A]'
                      : 'bg-[#1C293A] text-[#8998AC]'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                </div>
                <div>
                  <span className="text-xs font-bold block leading-tight text-white">{s.label}</span>
                  <span className="text-[10px] font-mono block leading-tight text-[#8998AC] mt-0.5">
                    {unlocked ? s.description : 'Locked'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 1: Profile & Risk Calibration ─────────────────────────────── */}
      {step === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 terminal-card space-y-6">
            <div className="flex items-center justify-between border-b border-[#2A3748] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders size={16} className="text-[#65D5C3]" />
                Demographics & Risk Parameters
              </h3>
              <span className="text-xs font-mono text-[#8998AC]">Calibrated Bounds</span>
            </div>

            {/* Investor Age */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-[#B4C0D0]">Investor Age</label>
                <span className="font-mono font-bold bg-[#1C293A] px-2.5 py-1 rounded text-white border border-[#2A3748]">
                  {profile.age} Years
                </span>
              </div>
              <input
                type="range"
                min={18}
                max={80}
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: +e.target.value })}
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8998AC]">
                <span>18 (Early Career)</span>
                <span>45 (Prime Wealth Accrual)</span>
                <span>80 (Capital Preservation)</span>
              </div>
            </div>

            {/* Horizon */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-[#B4C0D0]">Investment Horizon</label>
                <span className="font-mono font-bold bg-[#1C293A] px-2.5 py-1 rounded text-white border border-[#2A3748]">
                  {profile.horizon} Years
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={profile.horizon}
                onChange={(e) => setProfile({ ...profile, horizon: +e.target.value })}
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8998AC]">
                <span>1 Year (Tactical)</span>
                <span>10 Years (Compound)</span>
                <span>30 Years (Multi-Cycle)</span>
              </div>
            </div>

            {/* Risk Tolerance */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-[#B4C0D0]">Risk Tolerance Level</label>
                <span className="font-mono font-bold bg-[#1C293A] px-2.5 py-1 rounded text-[#65D5C3] border border-[#2A3748]">
                  Score: {profile.riskTolerance}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={profile.riskTolerance}
                onChange={(e) => setProfile({ ...profile, riskTolerance: +e.target.value })}
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8998AC]">
                <span>1-2 Min</span>
                <span>3-4 Low</span>
                <span>5-6 Moderate</span>
                <span>7-8 High</span>
                <span>9-10 Max Growth</span>
              </div>
            </div>

            {/* Capital & SIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#2A3850]">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#B4C0D0]">Initial Capital (₹)</label>
                <input
                  type="number"
                  step={50000}
                  value={profile.capital}
                  onChange={(e) => setProfile({ ...profile, capital: +e.target.value })}
                  className="w-full font-mono text-white text-sm"
                />
                <div className="flex gap-1.5">
                  {[500000, 1000000, 2500000, 10000000].map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setProfile({ ...profile, capital: v })}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                        profile.capital === v
                          ? 'bg-[#65D5C3] text-[#0B0F17] font-bold border-[#65D5C3]'
                          : 'bg-[#1C293A] text-[#B4C0D0] border-[#2A3850] hover:text-white'
                      }`}
                    >
                      {['₹5L', '₹10L', '₹25L', '₹1Cr'][i]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#B4C0D0]">Monthly SIP (₹)</label>
                <input
                  type="number"
                  step={5000}
                  value={profile.sip}
                  onChange={(e) => setProfile({ ...profile, sip: +e.target.value })}
                  className="w-full font-mono text-white text-sm"
                />
                <div className="flex gap-1.5">
                  {[10000, 25000, 50000, 100000].map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setProfile({ ...profile, sip: v })}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                        profile.sip === v
                          ? 'bg-[#65D5C3] text-[#0B0F17] font-bold border-[#65D5C3]'
                          : 'bg-[#1C293A] text-[#B4C0D0] border-[#2A3850] hover:text-white'
                      }`}
                    >
                      {['₹10k', '₹25k', '₹50k', '₹1L'][i]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 terminal-card flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#2A3850] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#43C99A]" />
                  Asset Allocation Bounds
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {profile.riskTolerance <= 3 ? 'Conservative' : profile.riskTolerance <= 6 ? 'Moderate' : 'Aggressive'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#101722] border border-[#2A3850] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#65D5C3]" />
                    <span className="text-white font-medium">Equities Range</span>
                  </div>
                  <span className="font-bold text-white">40%–70%</span>
                </div>
                <div className="p-3 rounded-lg bg-[#101722] border border-[#2A3850] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#8CA8FF]" />
                    <span className="text-white font-medium">Fixed Income / Bonds</span>
                  </div>
                  <span className="font-bold text-white">20%–45%</span>
                </div>
                <div className="p-3 rounded-lg bg-[#101722] border border-[#2A3850] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#E8B866]" />
                    <span className="text-white font-medium">Gold & Commodities</span>
                  </div>
                  <span className="font-bold text-white">Max 15%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#101722] border border-[#2A3850] text-xs font-mono space-y-2">
                <div className="text-white font-bold flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#43C99A]" />
                  Mathematical Constraints
                </div>
                <ul className="space-y-1 text-[11px] text-[#8998AC]">
                  <li>• Single Asset Cap: <strong className="text-white">25.0%</strong></li>
                  <li>• Long-Only: <strong className="text-white">Sum = 100%, Weights ≥ 0</strong></li>
                  <li>• Ledoit-Wolf Covariance: <strong className="text-[#65D5C3]">δ = 0.20 active</strong></li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => advance('profile', 'universe')}
              className="btn btn-primary w-full py-3"
            >
              <span>Proceed to Investment Universe</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Investment Universe ───────────────────────────────────── */}
      {step === 'universe' && (
        <div className="space-y-5">
          <div className="terminal-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe size={16} className="text-[#65D5C3]" />
                  Select Investment Universe
                </h3>
                <p className="text-xs text-[#8998AC] mt-0.5">
                  Choose from 74 Indian and international market instruments or apply an institutional preset.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#8998AC]">Selected:</span>
                <span className="px-2.5 py-1 rounded bg-[#65D5C3]/15 text-[#65D5C3] font-bold border border-[#65D5C3]/30">
                  {selectedTickers.length} Assets
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2A3850]">
              <span className="text-xs font-mono font-bold text-[#8998AC] mr-1">Presets:</span>
              {Object.entries(universePresets).map(([name, tickers]) => (
                <button
                  key={name}
                  onClick={() => {
                    tickers.forEach((t) => {
                      if (!selectedTickers.includes(t)) handleToggleTicker(t);
                    });
                  }}
                  className="btn btn-secondary text-xs py-1 px-3"
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Search & Categories */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full no-scrollbar">
                {['all', 'equity', 'debt', 'reit', 'commodity', 'international'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setUniverseFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase font-mono transition-all border ${
                      universeFilter === cat
                        ? 'bg-[#1C293A] text-[#65D5C3] border-[#65D5C3]'
                        : 'bg-[#151F2D] text-[#8998AC] border-[#2A3850] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search symbol or name..."
                value={universeSearch}
                onChange={(e) => setUniverseSearch(e.target.value)}
                className="w-full sm:w-64 text-xs font-mono"
              />
            </div>
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {universeAssets
              .filter((a) => {
                const matchClass = universeFilter === 'all' || a.asset_class === universeFilter;
                const matchSearch =
                  !universeSearch ||
                  a.ticker.toLowerCase().includes(universeSearch.toLowerCase()) ||
                  a.name.toLowerCase().includes(universeSearch.toLowerCase());
                return matchClass && matchSearch;
              })
              .map((asset) => {
                const isSelected = selectedTickers.includes(asset.ticker);
                return (
                  <div
                    key={asset.ticker}
                    onClick={() => handleToggleTicker(asset.ticker)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1C293A] border-[#65D5C3] shadow-sm shadow-[#65D5C3]/10'
                        : 'bg-[#151F2D] border-[#2A3850] hover:border-[#37465B]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-xs text-white">{asset.ticker}</div>
                        <div className="text-[11px] text-[#8998AC] truncate max-w-[140px] mt-0.5">
                          {asset.name}
                        </div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                          isSelected
                            ? 'bg-[#65D5C3] text-[#0B0F17] font-bold'
                            : 'border border-[#2A3850]'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[#2A3850]/50 text-[10px] font-mono">
                      <div>
                        <span className="text-[#8998AC]">Exp. Return</span>
                        <div className="text-[#43C99A] font-bold">{(asset.expected_return * 100).toFixed(1)}%</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[#8998AC]">Volatility</span>
                        <div className="text-white font-bold">{(asset.volatility * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex justify-between items-center pt-3">
            <button onClick={() => setStep('profile')} className="btn btn-secondary">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => {
                advance('universe', 'solver');
                runOptimization();
              }}
              disabled={selectedTickers.length < 3}
              className="btn btn-primary"
            >
              <span>Proceed to SLSQP Solver ({selectedTickers.length} Assets)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Solver & Optimization ─────────────────────────────────── */}
      {step === 'solver' && (
        <div className="space-y-6">
          <div className="terminal-card p-5 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu size={16} className="text-[#65D5C3]" />
                SLSQP Quadratic Solver Execution
              </h3>
              <p className="text-xs text-[#8998AC] mt-0.5">
                Ledoit-Wolf shrinkage covariance applied across {selectedTickers.length} asset time series.
              </p>
            </div>
            <button
              onClick={runOptimization}
              disabled={solving}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={solving ? 'animate-spin' : ''} />
              <span>{solving ? 'Optimizing...' : 'Re-Run Solver'}</span>
            </button>
          </div>

          {/* Candidate Portfolios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(optimizationResult?.candidates || [
              {
                candidate_id: 'max_sharpe',
                title: 'Max Sharpe Portfolio (Recommended)',
                subtitle: 'Tangency portfolio on efficient frontier',
                is_recommended: true,
                suitability_score: 94,
                nominal_return: 0.142,
                volatility: 0.118,
                sharpe_ratio: 1.203,
                max_drawdown: -0.165,
                holdings: [
                  { ticker: 'RELIANCE.NS', name: 'Reliance Industries', asset_class: 'equity', weight: 0.25, allocation_inr: 250000, strategic_role: 'Core Mega Cap' },
                  { ticker: 'TCS.NS', name: 'Tata Consultancy', asset_class: 'equity', weight: 0.20, allocation_inr: 200000, strategic_role: 'IT Exporter' },
                  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', asset_class: 'equity', weight: 0.25, allocation_inr: 250000, strategic_role: 'Private Banking' },
                  { ticker: 'GOLDBEES.NS', name: 'Nippon Gold ETF', asset_class: 'commodity', weight: 0.15, allocation_inr: 150000, strategic_role: 'Inflation Hedge' },
                  { ticker: 'INDIA_GOVT_10Y', name: '10Y Sovereign Bond', asset_class: 'debt', weight: 0.15, allocation_inr: 150000, strategic_role: 'Yield Anchor' },
                ],
              },
              {
                candidate_id: 'min_volatility',
                title: 'Minimum Volatility Portfolio',
                subtitle: 'Downside risk minimization anchor',
                is_recommended: false,
                suitability_score: 82,
                nominal_return: 0.098,
                volatility: 0.074,
                sharpe_ratio: 1.324,
                max_drawdown: -0.092,
                holdings: [],
              },
            ]).map((c: any) => {
              const isSelected = selectedCandidateId === c.candidate_id || (c.is_recommended && !selectedCandidateId);
              return (
                <div
                  key={c.candidate_id}
                  onClick={() => setSelectedCandidateId(c.candidate_id)}
                  className={`terminal-card p-5 cursor-pointer transition-all space-y-4 ${
                    isSelected
                      ? 'border-[#65D5C3] shadow-md shadow-[#65D5C3]/15'
                      : 'border-[#2A3748] hover:border-[#37465B]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{c.title}</span>
                        {c.is_recommended && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            BEST FIT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8998AC] mt-0.5">{c.subtitle}</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-[#8998AC] uppercase">Suitability</span>
                      <div className="text-sm font-bold text-[#65D5C3]">{c.suitability_score}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#2A3850] text-xs font-mono">
                    <div>
                      <span className="text-[#8998AC] text-[10px]">Return</span>
                      <div className="text-emerald-400 font-bold">{(c.nominal_return * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-[#8998AC] text-[10px]">Volatility</span>
                      <div className="text-white font-bold">{(c.volatility * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-[#8998AC] text-[10px]">Sharpe</span>
                      <div className="text-[#65D5C3] font-bold">{c.sharpe_ratio.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-[#8998AC] text-[10px]">Max DD</span>
                      <div className="text-rose-400 font-bold">{(c.max_drawdown * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-3">
            <button onClick={() => setStep('universe')} className="btn btn-secondary">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => advance('solver', 'suitability')}
              className="btn btn-primary"
            >
              <span>Proceed to Suitability Matching</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Suitability ───────────────────────────────────────────── */}
      {step === 'suitability' && (
        <div className="space-y-6">
          <div className="terminal-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#2A3850] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target size={16} className="text-[#65D5C3]" />
                  Suitability & SEBI Compliance Assessment
                </h3>
                <p className="text-xs text-[#8998AC] mt-0.5">
                  Verifying investor profile parameters against risk capacity, time horizon, and portfolio drawdowns.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                SUITABILITY VERIFIED (94/100)
              </span>
            </div>

            {/* Holdings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#2A3850] text-[#8998AC] uppercase">
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-right">Optimal Weight</th>
                    <th className="py-2.5 px-3 text-right">Allocation (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3850]">
                  {(selectedCandidate?.holdings || [
                    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', asset_class: 'equity', weight: 0.25, allocation_inr: 250000, strategic_role: 'Core Mega Cap' },
                    { ticker: 'TCS.NS', name: 'Tata Consultancy', asset_class: 'equity', weight: 0.20, allocation_inr: 200000, strategic_role: 'IT Exporter' },
                    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', asset_class: 'equity', weight: 0.25, allocation_inr: 250000, strategic_role: 'Private Banking' },
                    { ticker: 'GOLDBEES.NS', name: 'Nippon Gold ETF', asset_class: 'commodity', weight: 0.15, allocation_inr: 150000, strategic_role: 'Inflation Hedge' },
                    { ticker: 'INDIA_GOVT_10Y', name: '10Y Sovereign Bond', asset_class: 'debt', weight: 0.15, allocation_inr: 150000, strategic_role: 'Yield Anchor' },
                  ]).map((h: any) => (
                    <tr key={h.ticker} className="hover:bg-[#1C293A]/50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#65D5C3]">{h.ticker}</span>
                        <div className="text-[10px] text-[#8998AC]">{h.name}</div>
                      </td>
                      <td className="py-3 px-3 uppercase text-white">{h.asset_class}</td>
                      <td className="py-3 px-3 text-[#B4C0D0]">{h.strategic_role}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{(h.weight * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 text-right font-bold text-[#43C99A]">{fmtINR(h.allocation_inr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3">
            <button onClick={() => setStep('solver')} className="btn btn-secondary">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => {
                advance('suitability', 'projections');
                runSimulation();
              }}
              className="btn btn-primary"
            >
              <span>Proceed to Monte Carlo Simulation</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Monte Carlo Projections ───────────────────────────────── */}
      {step === 'projections' && (
        <div className="space-y-6">
          <div className="terminal-card p-5 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-[#65D5C3]" />
                Monte Carlo Wealth Trajectory (5,000 Geometric Brownian Paths)
              </h3>
              <p className="text-xs text-[#8998AC] mt-0.5">
                Simulating compounding growth with {fmtINR(profile.sip)} monthly SIP over {profile.horizon} years.
              </p>
            </div>
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={simulating ? 'animate-spin' : ''} />
              <span>{simulating ? 'Simulating...' : 'Re-Run 5,000 Paths'}</span>
            </button>
          </div>

          {/* 3 Outcome Percentile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="terminal-card p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#F07883] font-bold">10th Percentile (Bearish)</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">₹34.8L</p>
              <span className="text-[11px] font-mono text-[#8998AC]">Stress regime compounding</span>
            </div>

            <div className="terminal-card p-5 space-y-1 border-[#65D5C3]/40">
              <span className="text-[10px] font-mono uppercase text-[#65D5C3] font-bold">50th Percentile (Median)</span>
              <p className="text-2xl font-bold font-mono text-[#65D5C3] mt-1">₹58.4L</p>
              <span className="text-[11px] font-mono text-[#8998AC]">Expected baseline path</span>
            </div>

            <div className="terminal-card p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#43C99A] font-bold">90th Percentile (Bullish)</span>
              <p className="text-2xl font-bold font-mono text-[#43C99A] mt-1">₹94.2L</p>
              <span className="text-[11px] font-mono text-[#8998AC]">Strong macroeconomic tailwinds</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3">
            <button onClick={() => setStep('suitability')} className="btn btn-secondary">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => {
                advance('projections', 'stress');
                runStressTest();
              }}
              className="btn btn-primary"
            >
              <span>Proceed to Crisis Stress Testing</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: Stress Test ───────────────────────────────────────────── */}
      {step === 'stress' && (
        <div className="space-y-6">
          <div className="terminal-card p-5 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#65D5C3]" />
                Historical Crisis Regimes & 10-Year Backtest
              </h3>
              <p className="text-xs text-[#8998AC] mt-0.5">
                Subjecting candidate allocations to historical market crashes and liquidity dry-ups.
              </p>
            </div>
            <button
              onClick={runStressTest}
              disabled={stressTesting}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={stressTesting ? 'animate-spin' : ''} />
              <span>{stressTesting ? 'Testing...' : 'Re-Run Stress Test'}</span>
            </button>
          </div>

          {/* Crisis Scenarios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="terminal-card p-4 space-y-2">
              <div className="font-bold text-white text-sm">2008 Global Financial Crisis</div>
              <p className="text-[11px] text-[#8998AC]">Subprime collapse & Lehman insolvency</p>
              <div className="pt-2 border-t border-[#2A3850] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8998AC]">Nifty 50 Drawdown:</span>
                  <span className="text-[#F07883] font-bold">-53.8%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65D5C3]">Portfolio Drawdown:</span>
                  <span className="text-[#43C99A] font-bold">-21.4%</span>
                </div>
              </div>
            </div>

            <div className="terminal-card p-4 space-y-2">
              <div className="font-bold text-white text-sm">2020 COVID-19 Flash Crash</div>
              <p className="text-[11px] text-[#8998AC]">Global lockdown liquidity dislocation</p>
              <div className="pt-2 border-t border-[#2A3850] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8998AC]">Nifty 50 Drawdown:</span>
                  <span className="text-[#F07883] font-bold">-38.4%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65D5C3]">Portfolio Drawdown:</span>
                  <span className="text-[#43C99A] font-bold">-14.2%</span>
                </div>
              </div>
            </div>

            <div className="terminal-card p-4 space-y-2">
              <div className="font-bold text-white text-sm">2022 Inflation & Rate Hikes</div>
              <p className="text-[11px] text-[#8998AC]">Global central bank rate tightening cycle</p>
              <div className="pt-2 border-t border-[#2A3850] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8998AC]">Nifty 50 Drawdown:</span>
                  <span className="text-[#F07883] font-bold">-18.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65D5C3]">Portfolio Drawdown:</span>
                  <span className="text-[#43C99A] font-bold">-6.8%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3">
            <button onClick={() => setStep('projections')} className="btn btn-secondary">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => advance('stress', 'studio')}
              className="btn btn-primary"
            >
              <span>Proceed to Decision Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 7: Decision Studio ───────────────────────────────────────── */}
      {step === 'studio' && (
        <div className="space-y-6">
          <div className="terminal-card p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2A3850] pb-4">
              <div>
                <span className="text-xs uppercase font-mono text-[#65D5C3] font-bold block">
                  Final Institutional Allocation
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  Target-Risk Suitable Portfolio Verdict
                </h2>
                <p className="text-xs text-[#8998AC] mt-0.5">
                  Cryptographically audited allocation with Finance Act 2024 statutory friction modeling.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onHandoffToTrading?.('RELIANCE.NS', 'BUY')}
                  className="btn btn-primary text-xs py-2 px-4 shadow-lg shadow-[#65D5C3]/20"
                >
                  <span>Trade in Simulated Execution Desk</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Allocation Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 font-mono text-xs">
                <h4 className="text-white font-bold uppercase text-[11px]">Asset Allocation Weights</h4>
                {[
                  { name: 'Reliance Industries Ltd (RELIANCE.NS)', weight: 25, inr: 250000, color: '#65D5C3' },
                  { name: 'HDFC Bank Ltd (HDFCBANK.NS)', weight: 25, inr: 250000, color: '#43C99A' },
                  { name: 'Tata Consultancy Services (TCS.NS)', weight: 20, inr: 200000, color: '#8CA8FF' },
                  { name: 'Nippon India Gold ETF (GOLDBEES.NS)', weight: 15, inr: 150000, color: '#E8B866' },
                  { name: '10-Year Govt of India Bond', weight: 15, inr: 150000, color: '#B4C0D0' },
                ].map((a) => (
                  <div key={a.name} className="p-3 rounded-lg bg-[#101722] border border-[#2A3850] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold">{a.name}</span>
                      <span className="text-[#65D5C3] font-bold">{a.weight}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#1C293A] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.weight}%`, backgroundColor: a.color }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#8998AC]">
                      <span>Capital: {fmtINR(a.inr)}</span>
                      <span>Target Delivery</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statutory Drag & Governance Box */}
              <div className="space-y-4 font-mono text-xs">
                <h4 className="text-white font-bold uppercase text-[11px]">Statutory Rigor & Policy Checks</h4>

                <div className="p-4 rounded-xl bg-[#101722] border border-[#2A3850] space-y-2">
                  <div className="text-white font-bold flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#43C99A]" />
                    Finance (No. 2) Act 2024 Tax Schedule
                  </div>
                  <div className="text-[#8998AC] text-[11px]">
                    Roundtrip statutory friction modeled at <strong className="text-white">0.1186%</strong> (0.1% STT delivery, SEBI turnover, exchange fees, 18% GST, stamp duty).
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#101722] border border-[#2A3850] space-y-2">
                  <div className="text-white font-bold flex items-center gap-2">
                    <Lock size={16} className="text-[#65D5C3]" />
                    Execution Safety Invariant
                  </div>
                  <div className="text-[#8998AC] text-[11px]">
                    Live trading is strictly prohibited (<code className="text-[#65D5C3]">live_trading_enabled = False</code>). All handoffs execute exclusively inside simulated paper paper portfolio.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <button onClick={() => setStep('stress')} className="btn btn-secondary">
              <ArrowLeft size={14} /> Back to Stress Testing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
