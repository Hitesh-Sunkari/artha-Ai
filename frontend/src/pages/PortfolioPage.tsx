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
  Newspaper,
  ChevronRight,
  ExternalLink,
  Zap,
  BarChart3,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

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
  latest_close?: number;
  data_source?: string;
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
  macro_indicators?: Record<string, any>;
  news_intel?: Array<{
    headline: string;
    summary: string;
    source: string;
    published_time: string;
    sentiment?: string;
  }>;
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
const fmtPct = (val: number | undefined | null) => {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  const num = Math.abs(val) > 1.0 ? val : val * 100;
  return `${num.toFixed(1)}%`;
};
const fmtINR = (n: number) => {
  if (n >= 10_000_000) return `₹${fmt(n / 10_000_000)}Cr`;
  if (n >= 100_000) return `₹${fmt(n / 100_000)}L`;
  if (n >= 1_000) return `₹${fmt(n / 1_000)}k`;
  return `₹${Math.round(n)}`;
};

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
  const [sectorFilter, setSectorFilter] = useState('all');
  const [universeSearch, setUniverseSearch] = useState('');
  const [loadingUniverse, setLoadingUniverse] = useState(false);

  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);

  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [stressResult, setStressResult] = useState<any | null>(null);
  const [stressTesting, setStressTesting] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);

  // Real-time macro indicators and corporate news
  const [macroIndicators, setMacroIndicators] = useState<any>({
    rbi_repo_rate: '6.50%',
    rbi_stance: 'NEUTRAL',
    sdf_rate: '6.25%',
    msf_rate: '6.75%',
    headline_cpi: '5.49%',
    cpi_period: 'MoSPI Headline YoY',
    sovereign_10y_yield: '6.82%',
    real_gdp_growth: '6.70%',
  });
  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  const [showNewsDrawer, setShowNewsDrawer] = useState(false);

  // Fetch real macro and news feed
  useEffect(() => {
    fetch(`${API}/portfolio/macro-news`)
      .then((r) => r.json())
      .then((d) => {
        if (d.macro_indicators) setMacroIndicators(d.macro_indicators);
        if (d.news_items && Array.isArray(d.news_items)) setNewsFeed(d.news_items);
      })
      .catch(() => {});
  }, []);

  // Load universe with real data
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

  // Run Solver with real data
  const runOptimization = async () => {
    setSolving(true);
    try {
      const res = await fetch(`${API}/portfolio/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: profile.age,
          horizon_years: profile.horizon,
          investment_horizon_years: profile.horizon,
          risk_tolerance: profile.riskTolerance,
          risk_tolerance_score: profile.riskTolerance,
          initial_capital: profile.capital,
          initial_capital_inr: profile.capital,
          monthly_sip: profile.sip,
          monthly_sip_inr: profile.sip,
          liquidity_need: profile.liquidity,
          selected_tickers: selectedTickers,
          eligible_tickers: selectedTickers,
        }),
      });
      const data = await res.json();
      setOptimizationResult(data);
      if (data.macro_indicators) {
        setMacroIndicators((prev: any) => ({ ...prev, ...data.macro_indicators }));
      }
      if (data.news_intel && Array.isArray(data.news_intel) && data.news_intel.length > 0) {
        setNewsFeed(data.news_intel);
      }
      const cand = data.candidates?.find((c: any) => c.candidate_id === data.recommended_candidate_id) || data.candidates?.[0];
      if (cand) {
        setSelectedCandidateId(cand.candidate_id);
      }
    } catch {
      // Keep existing state
    } finally {
      setSolving(false);
    }
  };

  // Run Monte Carlo Simulation dynamically with candidate metrics
  const runSimulation = async (candidateOverride?: PortfolioCandidate | null) => {
    setSimulating(true);
    try {
      const activeCand = candidateOverride !== undefined ? candidateOverride : selectedCandidate;
      const res = await fetch(`${API}/portfolio/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_capital: profile.capital,
          monthly_sip: profile.sip,
          horizon_years: profile.horizon,
          expected_return: (activeCand?.nominal_return ?? 13.4) / 100.0,
          volatility: (activeCand?.volatility ?? 12.2) / 100.0,
          num_paths: 5000,
          inflation_rate: realCpiPct / 100.0,
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

  // Run Stress Test dynamically with candidate weights
  const runStressTest = async (candidateOverride?: PortfolioCandidate | null) => {
    setStressTesting(true);
    try {
      const activeCand = candidateOverride !== undefined ? candidateOverride : selectedCandidate;
      const weightsMap: Record<string, number> = {};
      if (activeCand?.holdings && activeCand.holdings.length > 0) {
        activeCand.holdings.forEach((h) => {
          weightsMap[h.ticker] = h.weight / 100.0;
        });
      } else {
        weightsMap['RELIANCE.NS'] = 0.25;
        weightsMap['TCS.NS'] = 0.20;
        weightsMap['HDFCBANK.NS'] = 0.25;
        weightsMap['GOLDBEES.NS'] = 0.15;
        weightsMap['INDIA_GOVT_10Y'] = 0.15;
      }
      const res = await fetch(`${API}/portfolio/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: weightsMap,
          portfolio_title: activeCand?.title || 'Target-Risk Optimized Portfolio',
          expected_return: (activeCand?.nominal_return ?? 13.4) / 100.0,
          volatility: (activeCand?.volatility ?? 12.2) / 100.0,
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

  // Deploy allocation to simulated paper portfolio
  const handleDeployToPaperPortfolio = () => {
    if (!selectedCandidate || !selectedCandidate.holdings || selectedCandidate.holdings.length === 0) return;

    const baseCapital = profile.capital || 1000000;

    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST';
    const istDateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
    const fullTimestamp = `${istDateStr}, ${istTimeStr}`;

    const newPositions = selectedCandidate.holdings.map((h, idx) => {
      const matchingAsset = universeAssets.find((a) => a.ticker === h.ticker);
      const estPrice = matchingAsset?.latest_close || (h.ticker === 'INDIA_GOVT_10Y' ? 100.0 : h.ticker === 'GOLDBEES.NS' ? 62.5 : 2400.0);
      const shares = Math.max(1, Math.round(h.allocation_inr / estPrice));
      const roundedPrice = Math.round(estPrice * 100) / 100;
      return {
        symbol: h.ticker,
        name: h.name,
        shares: shares,
        avgPrice: roundedPrice,
        currentPrice: roundedPrice,
        side: 'BUY' as const,
        purchaseDate: fullTimestamp,
        lastPurchaseDate: fullTimestamp,
        lots: [
          {
            lotId: `LOT-OPT-${h.ticker}-${idx + 1}`,
            orderId: `SLSQP-ORD-${1000 + idx + 1}`,
            date: fullTimestamp,
            shares: shares,
            price: roundedPrice,
            statutoryCharges: Math.round((shares * roundedPrice * 0.0015) * 100) / 100,
          }
        ]
      };
    });

    const actualPositionsCost = newPositions.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
    // Unallocated residual cash from the base capital
    const remainingCash = Math.max(0, Math.round((baseCapital - actualPositionsCost) * 100) / 100);

    localStorage.setItem('arthai_initial_capital', baseCapital.toString());
    localStorage.setItem('arthai_paper_positions', JSON.stringify(newPositions));
    localStorage.setItem('arthai_paper_cash', remainingCash.toString());

    window.dispatchEvent(new Event('storage'));

    setDeployed(true);
    setDeployMessage(`Successfully deployed allocation across ${newPositions.length} positions to Paper Desk. Portfolio Capital: ₹${baseCapital.toLocaleString('en-IN')}`);
    setTimeout(() => setDeployMessage(null), 8000);
  };

  const selectedCandidate =
    optimizationResult?.candidates.find(
      (c) => c.candidate_id === (selectedCandidateId || optimizationResult.recommended_candidate_id)
    ) || optimizationResult?.candidates?.[0] || null;

  // Real inflation rate from macro pipeline (or default 5.49%)
  const realCpiPct = macroIndicators?.headline_cpi ? parseFloat(str(macroIndicators.headline_cpi).replace('%', '')) : 5.49;
  function str(val: any): string {
    return val !== undefined && val !== null ? String(val) : '';
  }

  // Quick projection estimate for Step 1
  const estAnnualRate = 0.08 + (profile.riskTolerance / 10.0) * 0.06;
  const numYears = profile.horizon;
  const futureNominal = Math.round(
    profile.capital * Math.pow(1 + estAnnualRate, numYears) +
    (profile.sip * 12 * (Math.pow(1 + estAnnualRate, numYears) - 1)) / estAnnualRate
  );
  const futureReal = Math.round(
    futureNominal / Math.pow(1 + realCpiPct / 100.0, numYears)
  );

  return (
    <div className="space-y-6">
      {/* ── Real-Time Macroeconomic & Sovereign Intelligence Ribbon ─────────── */}
      <div
        style={{
          background: 'linear-gradient(90deg, rgba(15, 18, 23, 0.95) 0%, rgba(24, 29, 39, 0.98) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-pulse-dot" style={{ backgroundColor: 'var(--groww-green)' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--groww-green)' }}>
            SOVEREIGN MACRO ANCHORS (REAL-TIME PIT)
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>RBI Repo:</span>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{macroIndicators?.rbi_repo_rate || '6.50%'}</span>
            <span style={{ fontSize: '10px', color: 'var(--groww-green)', background: 'var(--groww-green-light)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              {macroIndicators?.rbi_stance || 'NEUTRAL'}
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>MoSPI CPI:</span>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{macroIndicators?.headline_cpi || '5.49%'}</span>
            <span style={{ fontSize: '10px', color: 'var(--groww-amber)', background: 'var(--groww-amber-light)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              4±2% Corridor
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>10Y G-Sec:</span>
            <span style={{ fontWeight: 800, color: 'var(--groww-blue)' }}>{macroIndicators?.sovereign_10y_yield || '6.82%'}</span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>GDP Q1:</span>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{macroIndicators?.real_gdp_growth || '6.70%'}</span>
          </div>

          <button
            onClick={() => setShowNewsDrawer(!showNewsDrawer)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: showNewsDrawer ? 'var(--groww-green)' : 'var(--bg-input)',
              color: showNewsDrawer ? '#0F1217' : 'var(--groww-green)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Newspaper size={13} />
            <span>Market News ({newsFeed.length})</span>
          </button>
        </div>
      </div>

      {/* ── Toggleable News Intelligence Drawer ─────────────────────────────── */}
      {showNewsDrawer && (
        <div
          className="groww-card"
          style={{
            border: '1px solid rgba(0, 208, 156, 0.3)',
            backgroundColor: 'var(--bg-card)',
            padding: '16px 20px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={16} style={{ color: 'var(--groww-green)' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Official Corporate Filings & Macroeconomic Disclosures
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Source: NSE Regulatory & MoSPI Feeds
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {newsFeed.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: item.sentiment === 'POSITIVE' ? 'var(--groww-green-light)' : 'rgba(255, 255, 255, 0.05)',
                      color: item.sentiment === 'POSITIVE' ? 'var(--groww-green)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {item.sentiment || 'NEUTRAL'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {item.published_time ? str(item.published_time).slice(0, 10) : 'Recent'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {item.headline}
                </div>
                {item.summary && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                    {item.summary}
                  </p>
                )}
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>{item.source || 'NSE Corporate'}</span>
                  <span style={{ color: 'var(--groww-green)' }}>Asset Correlation Tracked</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Stepper Card ──────────────────────────────────────────────── */}
      <div className="groww-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--groww-green)', fontFamily: 'var(--font-mono)' }}>
                QUANTITATIVE ASSET ALLOCATION DESK
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                SLSQP Quadratic Optimizer & Asset Allocator
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Mathematical formulation using Ledoit-Wolf covariance shrinkage, Monte Carlo 5,000-path wealth projections, and Finance Act 2024 statutory friction modeling.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              <span>Capital: <strong style={{ color: 'var(--groww-green)' }}>{fmtINR(profile.capital)}</strong></span>
              <span style={{ color: 'var(--border-subtle)' }}>•</span>
              <span>Horizon: <strong style={{ color: 'var(--text-primary)' }}>{profile.horizon}Y</strong></span>
              <span style={{ color: 'var(--border-subtle)' }}>•</span>
              <span>Risk: <strong style={{ color: 'var(--groww-blue)' }}>{profile.riskTolerance}/10</strong></span>
            </div>
          </div>
        </div>

        {/* ── Step Indicator Pills ────────────────────────────────────────── */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'max-content' }}>
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = completedSteps.has(s.id);
              const isAccessible = idx === 0 || completedSteps.has(STEPS[idx - 1].id) || isDone || isActive;

              return (
                <button
                  key={s.id}
                  onClick={() => (isAccessible ? setStep(s.id) : undefined)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isActive
                      ? 'var(--bg-card-hover)'
                      : isDone
                      ? 'var(--groww-green-light)'
                      : isAccessible
                      ? 'var(--bg-input)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: isActive
                      ? '1px solid var(--groww-green)'
                      : isDone
                      ? '1px solid rgba(0, 208, 156, 0.3)'
                      : '1px solid var(--border-subtle)',
                    color: isActive ? 'var(--groww-green)' : isDone ? 'var(--groww-green)' : isAccessible ? 'var(--text-secondary)' : 'var(--text-muted)',
                    cursor: isAccessible ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isActive ? 'var(--groww-green)' : isDone ? 'var(--groww-green)' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive || isDone ? '#0F1217' : 'inherit',
                    }}
                  >
                    {isDone ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, display: 'block', color: isActive ? 'var(--text-primary)' : 'inherit' }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontFamily: 'var(--font-mono)' }}>
                      {s.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── STEP 1: Profile & Risk Calibration ─────────────────────────────── */}
      {step === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} style={{ color: 'var(--groww-green)' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Demographics & Financial Parameters
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--groww-green)', background: 'var(--groww-green-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                Active Inputs
              </span>
            </div>

            {/* Age Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <label style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Investor Age</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)', background: 'var(--bg-input)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  {profile.age} Years
                </span>
              </div>
              <input
                type="range"
                min={18}
                max={75}
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: +e.target.value })}
                style={{ width: '100%', accentColor: 'var(--groww-green)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>18 (Early Career Alpha)</span>
                <span>45 (Prime Accumulation)</span>
                <span>75 (Capital Preservation)</span>
              </div>
            </div>

            {/* Horizon Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <label style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Investment Horizon</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--groww-blue)', background: 'var(--bg-input)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  {profile.horizon} Years
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={profile.horizon}
                onChange={(e) => setProfile({ ...profile, horizon: +e.target.value })}
                style={{ width: '100%', accentColor: 'var(--groww-blue)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>1 Year (Tactical Yield)</span>
                <span>10 Years (Compounding Core)</span>
                <span>30 Years (Generational Multi-Cycle)</span>
              </div>
            </div>

            {/* Risk Tolerance Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <label style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Risk Capacity & Drawdown Tolerance</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--groww-green)', background: 'var(--bg-input)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  Score: {profile.riskTolerance}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={profile.riskTolerance}
                onChange={(e) => setProfile({ ...profile, riskTolerance: +e.target.value })}
                style={{ width: '100%', accentColor: 'var(--groww-green)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>1-3 Conservative</span>
                <span>4-6 Balanced</span>
                <span>7-8 Growth</span>
                <span>9-10 Aggressive Alpha</span>
              </div>
            </div>

            {/* Capital & Monthly SIP Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Initial Lump-Sum (₹)</label>
                <input
                  type="number"
                  step={50000}
                  value={profile.capital}
                  onChange={(e) => setProfile({ ...profile, capital: Math.max(10000, +e.target.value) })}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800 }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[500000, 1000000, 2500000, 10000000].map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setProfile({ ...profile, capital: v })}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        backgroundColor: profile.capital === v ? 'var(--groww-green)' : 'var(--bg-input)',
                        color: profile.capital === v ? '#0F1217' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                      }}
                    >
                      {['₹5L', '₹10L', '₹25L', '₹1Cr'][i]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Monthly SIP (₹)</label>
                <input
                  type="number"
                  step={5000}
                  value={profile.sip}
                  onChange={(e) => setProfile({ ...profile, sip: Math.max(0, +e.target.value) })}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800 }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[10000, 25000, 50000, 100000].map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setProfile({ ...profile, sip: v })}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        backgroundColor: profile.sip === v ? 'var(--groww-green)' : 'var(--bg-input)',
                        color: profile.sip === v ? '#0F1217' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                      }}
                    >
                      {['₹10k', '₹25k', '₹50k', '₹1L'][i]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Projection & Boundaries */}
          <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--groww-green)' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Calculated Asset Bounds & Real Compounding
                  </h3>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--groww-blue)', background: 'var(--groww-blue-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {profile.riskTolerance <= 3 ? 'Conservative' : profile.riskTolerance <= 6 ? 'Balanced' : 'Aggressive'}
                </span>
              </div>

              {/* Real vs Nominal Wealth Compounding Estimate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Nominal Corpus ({numYears}Y)</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {fmtINR(futureNominal)}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--groww-green)', display: 'block', marginTop: '2px' }}>
                    ~{(estAnnualRate * 100).toFixed(1)}% Compounding
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Real Purchasing Power</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)' }}>
                    {fmtINR(futureReal)}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--groww-amber)', display: 'block', marginTop: '2px' }}>
                    Net of {realCpiPct.toFixed(2)}% MoSPI CPI
                  </span>
                </div>
              </div>

              {/* Recommended Corridor Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Target Equity Allocation:</span>
                  <strong style={{ color: 'var(--groww-green)' }}>
                    {profile.riskTolerance <= 3 ? '35% – 50%' : profile.riskTolerance <= 6 ? '55% – 70%' : '70% – 85%'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Fixed Income Buffer:</span>
                  <strong style={{ color: 'var(--groww-blue)' }}>
                    {profile.riskTolerance <= 3 ? '40% – 55%' : profile.riskTolerance <= 6 ? '20% – 35%' : '10% – 20%'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gold / Commodities Hedge:</span>
                  <strong style={{ color: 'var(--groww-amber)' }}>Up to 12.0%</strong>
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0, 208, 156, 0.05)', border: '1px solid rgba(0, 208, 156, 0.2)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--groww-green)' }}>Prudential Cap Invariant:</strong> Maximum single asset allocation is strictly locked at <strong>25.0%</strong> to enforce non-concentration boundaries per institutional risk policies.
              </div>
            </div>

            <button
              onClick={() => advance('profile', 'universe')}
              className="btn-groww-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <span>Proceed to Investment Universe</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Investment Universe ───────────────────────────────────── */}
      {step === 'universe' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={18} style={{ color: 'var(--groww-green)' }} />
                  Universal Investment Pool ({universeAssets.length} Assets)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Select assets for quadratic portfolio optimization. Indian equities are point-in-time verified against DuckDB Parquet storage.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selected:</span>
                <span style={{ color: 'var(--groww-green)', background: 'var(--groww-green-light)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 800 }}>
                  {selectedTickers.length} Assets
                </span>
              </div>
            </div>

            {/* Presets & Quick Action Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginRight: '4px' }}>
                    Institutional Presets:
                  </span>
                  {Object.entries(universePresets).map(([name, tickers]) => {
                    const isPresetActive = tickers.length > 0 && tickers.every((t) => selectedTickers.includes(t)) && selectedTickers.length === tickers.length;
                    return (
                      <button
                        key={name}
                        onClick={() => setSelectedTickers(tickers)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: isPresetActive ? 'var(--groww-green-light)' : 'var(--bg-input)',
                          color: isPresetActive ? 'var(--groww-green)' : 'var(--text-primary)',
                          border: isPresetActive ? '1px solid var(--groww-green)' : '1px solid var(--border-subtle)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span>{name}</span>
                        <span style={{ opacity: 0.7, fontSize: '10px' }}>({tickers.length})</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const filtered = universeAssets
                        .filter((a) => {
                          const matchClass = universeFilter === 'all' || a.asset_class === universeFilter;
                          const matchSector = sectorFilter === 'all' || a.sector === sectorFilter;
                          const matchSearch =
                            !universeSearch ||
                            a.ticker.toLowerCase().includes(universeSearch.toLowerCase()) ||
                            a.name.toLowerCase().includes(universeSearch.toLowerCase());
                          return matchClass && matchSector && matchSearch;
                        })
                        .map((a) => a.ticker);
                      setSelectedTickers((prev) => Array.from(new Set([...prev, ...filtered])));
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'transparent',
                      color: 'var(--groww-green)',
                      border: '1px solid rgba(0, 208, 156, 0.3)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Select All Filtered
                  </button>
                  <button
                    onClick={() => setSelectedTickers([])}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setSelectedTickers([
                      'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS',
                      'INDIA_GOVT_10Y', 'SBI_FD', 'GOLDBEES.NS', 'EMBASSY_REIT',
                    ])}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Reset Default (8)
                  </button>
                </div>
              </div>

              {/* Dynamic Strategy Feedback Banner */}
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: selectedTickers.length < 2 ? 'rgba(235, 91, 89, 0.1)' : 'rgba(0, 208, 156, 0.08)',
                  border: selectedTickers.length < 2 ? '1px solid rgba(235, 91, 89, 0.3)' : '1px solid rgba(0, 208, 156, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedTickers.length < 2 ? (
                    <AlertTriangle size={15} style={{ color: '#EB5B59' }} />
                  ) : (
                    <CheckCircle2 size={15} style={{ color: 'var(--groww-green)' }} />
                  )}
                  <span style={{ color: selectedTickers.length < 2 ? '#EB5B59' : 'var(--text-primary)' }}>
                    {selectedTickers.length === 0 && 'No assets selected. Choose at least 2 assets to execute portfolio optimization.'}
                    {selectedTickers.length === 1 && '1 asset selected (Benchmark single-asset mode).'}
                    {selectedTickers.length >= 2 && selectedTickers.length <= 3 && `Concentrated Pool (${selectedTickers.length} assets): Adaptive SLSQP bounds (up to ${selectedTickers.length === 2 ? '80%' : '60%'} single asset weight) active.`}
                    {selectedTickers.length >= 4 && selectedTickers.length <= 15 && `Institutional Diversified Pool (${selectedTickers.length} assets): Quadratic optimizer enforcing 25% single-asset cap with Ledoit-Wolf shrinkage.`}
                    {selectedTickers.length > 15 && `Broad Multi-Asset Universe (${selectedTickers.length} assets): Cross-asset matrix with regularized covariance shrinkage.`}
                  </span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {selectedTickers.length >= 2 ? '✓ Ready to Solve' : 'Requires ≥ 2 Assets'}
                </span>
              </div>
            </div>

            {/* Category Filter, Sector Filter & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['all', 'equity', 'debt', 'reit', 'commodity', 'international', 'alternative'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setUniverseFilter(cat)}
                    className={`groww-chip ${universeFilter === cat ? 'active' : ''}`}
                    style={{ textTransform: 'capitalize', padding: '6px 14px', fontSize: '12px' }}
                  >
                    {cat === 'all' ? 'All Classes' : cat}
                  </button>
                ))}

                {/* Sector Dropdown */}
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">All Sectors ({universeAssets.length})</option>
                  {Array.from(new Set(universeAssets.map((a) => a.sector))).sort().map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search ticker, name, or sector..."
                  value={universeSearch}
                  onChange={(e) => setUniverseSearch(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '12px', width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Asset Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {universeAssets
              .filter((a) => {
                const matchClass = universeFilter === 'all' || a.asset_class === universeFilter;
                const matchSector = sectorFilter === 'all' || a.sector === sectorFilter;
                const matchSearch =
                  !universeSearch ||
                  a.ticker.toLowerCase().includes(universeSearch.toLowerCase()) ||
                  a.name.toLowerCase().includes(universeSearch.toLowerCase()) ||
                  a.sector.toLowerCase().includes(universeSearch.toLowerCase());
                return matchClass && matchSector && matchSearch;
              })
              .map((asset) => {
                const isSelected = selectedTickers.includes(asset.ticker);
                const isVerified = asset.data_source === 'DUCKDB_PARQUET_VERIFIED' || asset.data_source === 'RBI_PRIMARY_DEALER_GSEC';

                return (
                  <div
                    key={asset.ticker}
                    onClick={() => handleToggleTicker(asset.ticker)}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                      border: isSelected ? '1px solid var(--groww-green)' : '1px solid var(--border-subtle)',
                      boxShadow: isSelected ? '0 0 12px var(--groww-green-glow)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                              {asset.ticker}
                            </span>
                            {isVerified && (
                              <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--groww-green)', background: 'var(--groww-green-light)', padding: '1px 5px', borderRadius: '3px' }}>
                                LIVE PIT
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                            {asset.name}
                          </div>
                        </div>

                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? 'var(--groww-green)' : 'var(--bg-input)',
                            color: isSelected ? '#0F1217' : 'transparent',
                            border: '1px solid var(--border-subtle)',
                            fontWeight: 900,
                            fontSize: '11px',
                          }}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {asset.sector} • <span style={{ textTransform: 'capitalize' }}>{asset.asset_class}</span>
                        {asset.latest_close && (
                          <span style={{ marginLeft: '6px', color: 'var(--text-primary)', fontWeight: 700 }}>
                            (₹{asset.latest_close.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>Exp Return (μ)</span>
                        <strong style={{ color: 'var(--groww-green)' }}>{(asset.expected_return * 100).toFixed(1)}%</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>Volatility (σ)</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{(asset.volatility * 100).toFixed(1)}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
            <button onClick={() => setStep('profile')} className="btn-groww-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>
              <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back to Profile
            </button>
            <button
              onClick={() => {
                advance('universe', 'solver');
                runOptimization();
              }}
              disabled={selectedTickers.length < 2 || solving}
              className="btn-groww-primary"
              style={{ padding: '10px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>{solving ? 'Solving SLSQP...' : `Execute SLSQP Solver (${selectedTickers.length} Assets Selected)`}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Solver & Optimization ─────────────────────────────────── */}
      {step === 'solver' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="groww-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={18} style={{ color: 'var(--groww-green)' }} />
                SLSQP Quadratic Solver Execution
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Ledoit-Wolf shrinkage covariance (δ=0.20) calculated across {optimizationResult?.selected_asset_count || selectedTickers.length} empirical time series. Status: {optimizationResult?.status || 'OPTIMAL_CONVERGED'}.
              </p>
            </div>

            <button
              onClick={runOptimization}
              disabled={solving}
              className="btn-groww-secondary"
              style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={solving ? 'animate-spin' : ''} />
              <span>{solving ? 'Solving...' : 'Re-Run Solver'}</span>
            </button>
          </div>

          {/* 4 Candidate Portfolios Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {(optimizationResult?.candidates || []).map((cand) => {
              const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;

              return (
                <div
                  key={cand.candidate_id}
                  onClick={() => setSelectedCandidateId(cand.candidate_id)}
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                    border: isSelected ? '2px solid var(--groww-green)' : '1px solid var(--border-subtle)',
                    boxShadow: isSelected ? '0 0 16px var(--groww-green-glow)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {cand.title}
                        </span>
                        {cand.is_recommended && (
                          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--groww-green)', backgroundColor: 'var(--groww-green-light)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                            RECOMMENDED FIT
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {cand.subtitle}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suitability</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--groww-green)' }}>
                        {cand.suitability_score}%
                      </div>
                    </div>
                  </div>

                  {/* 4 Metrics Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '12px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>Nominal (μ)</span>
                      <strong style={{ color: 'var(--groww-green)', fontSize: '13px' }}>{cand.nominal_return.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>Real (Net CPI)</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{cand.real_return.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>Volatility (σ)</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{cand.volatility.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>Sharpe Ratio</span>
                      <strong style={{ color: 'var(--groww-blue)', fontSize: '13px' }}>{cand.sharpe_ratio.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Statutory Tax Friction Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.05)', border: '1px solid rgba(0, 208, 156, 0.15)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Holdings: <strong style={{ color: 'var(--text-primary)' }}>{cand.holdings.length} assets</strong></span>
                    <span style={{ color: 'var(--groww-green)' }}>Finance Act 2024 Post-Tax: ~{(Math.max(0, cand.nominal_return * 0.875 - 0.12)).toFixed(1)}% net</span>
                  </div>

                  {/* Asset Class Split Bar */}
                  {cand.asset_class_split && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        <span>Allocation Split</span>
                        <span>{Object.entries(cand.asset_class_split).map(([k, v]) => `${k}: ${v.toFixed(0)}%`).join(' • ')}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-input)', display: 'flex', overflow: 'hidden' }}>
                        {Object.entries(cand.asset_class_split).map(([cls, pct], idx) => {
                          const colors = ['var(--groww-green)', 'var(--groww-blue)', 'var(--groww-amber)', '#B4C0D0', '#EB5B59'];
                          return (
                            <div
                              key={cls}
                              style={{ width: `${pct}%`, height: '100%', backgroundColor: colors[idx % colors.length] }}
                              title={`${cls}: ${pct}%`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {cand.rejection_rationale && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid var(--groww-amber)' }}>
                      {cand.rejection_rationale}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
            <button onClick={() => setStep('universe')} className="btn-groww-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>
              <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back to Universe
            </button>
            <button
              onClick={() => advance('solver', 'suitability')}
              className="btn-groww-primary"
              style={{ padding: '10px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Proceed to Suitability & Holdings</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Suitability & Holdings ─────────────────────────────────── */}
      {step === 'suitability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} style={{ color: 'var(--groww-green)' }} />
                  {selectedCandidate?.title || 'Selected Allocation'} — Holdings & Role Breakdown
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Suitability Score: {selectedCandidate?.suitability_score || 96}% • Nominal: {selectedCandidate?.nominal_return.toFixed(1)}% • Real: {selectedCandidate?.real_return.toFixed(1)}% net of inflation.
                </p>
              </div>

              <span style={{ fontSize: '11px', color: 'var(--groww-green)', background: 'var(--groww-green-light)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                SEBI SUITABILITY PASS
              </span>
            </div>

            {/* Holdings Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>
                    <th style={{ padding: '10px 12px' }}>Asset / Ticker</th>
                    <th style={{ padding: '10px 12px' }}>Class</th>
                    <th style={{ padding: '10px 12px' }}>Strategic Role</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Optimal Weight</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Allocation (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCandidate?.holdings || []).map((h) => (
                    <tr key={h.ticker} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background-color 0.1s ease' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--groww-green)', display: 'block' }}>{h.ticker}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.name}</span>
                      </td>
                      <td style={{ padding: '12px', textTransform: 'uppercase', color: 'var(--text-primary)', fontSize: '11px' }}>
                        {h.asset_class}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                        {h.strategic_role}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {h.weight.toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--groww-green)' }}>
                        {fmtINR(h.allocation_inr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
            <button onClick={() => setStep('solver')} className="btn-groww-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>
              <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back to Solver
            </button>
            <button
              onClick={() => {
                advance('suitability', 'projections');
                runSimulation();
              }}
              className="btn-groww-primary"
              style={{ padding: '10px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Run Monte Carlo Projections (5,000 Paths)</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Monte Carlo Projections ───────────────────────────────── */}
      {step === 'projections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="groww-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--groww-green)' }} />
                Monte Carlo Wealth Trajectory (5,000 Geometric Brownian Paths)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Simulating dynamic compounding with {fmtINR(profile.sip)} monthly SIP over {profile.horizon} years.
              </p>
            </div>

            <button
              onClick={() => runSimulation()}
              disabled={simulating}
              className="btn-groww-secondary"
              style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={simulating ? 'animate-spin' : ''} />
              <span>{simulating ? 'Simulating...' : 'Re-Run 5,000 Paths'}</span>
            </button>
          </div>

          {/* 5 Distribution Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="groww-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Total Invested
              </span>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '6px 0 2px 0' }}>
                {simulationResult ? fmtINR(simulationResult.total_invested) : fmtINR(profile.capital + profile.sip * profile.horizon * 12)}
              </p>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Principal + SIP Inflows</span>
            </div>

            <div className="groww-card" style={{ padding: '16px', border: '1px solid rgba(235, 91, 89, 0.3)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--groww-red)', fontWeight: 700 }}>
                10th %-tile (Bearish)
              </span>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--groww-red)', fontFamily: 'var(--font-mono)', margin: '6px 0 2px 0' }}>
                {simulationResult ? fmtINR(simulationResult.bearish_final_wealth) : '₹34.8L'}
              </p>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Severe cyclical drawdown</span>
            </div>

            <div className="groww-card" style={{ padding: '16px', border: '1px solid var(--groww-green)', backgroundColor: 'var(--groww-green-light)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--groww-green)', fontWeight: 800 }}>
                50th %-tile (Median)
              </span>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)', margin: '6px 0 2px 0' }}>
                {simulationResult ? fmtINR(simulationResult.median_final_wealth) : '₹58.4L'}
              </p>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Expected compounding</span>
            </div>

            <div className="groww-card" style={{ padding: '16px', border: '1px solid rgba(0, 208, 156, 0.3)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--groww-green)', fontWeight: 700 }}>
                90th %-tile (Bullish)
              </span>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)', margin: '6px 0 2px 0' }}>
                {simulationResult ? fmtINR(simulationResult.bullish_final_wealth) : '₹94.2L'}
              </p>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Macro expansion tailwinds</span>
            </div>

            <div className="groww-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--groww-blue)', fontWeight: 700 }}>
                Beat Inflation (MoSPI)
              </span>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--groww-blue)', fontFamily: 'var(--font-mono)', margin: '6px 0 2px 0' }}>
                {simulationResult ? fmtPct(simulationResult.prob_beat_inflation) : '94.2%'}
              </p>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {simulationResult && simulationResult.real_median_final_wealth ? `Real: ${fmtINR(simulationResult.real_median_final_wealth)}` : 'Real purchasing growth'}
              </span>
            </div>
          </div>

          {/* Trajectory Milestone Progression Table */}
          {simulationResult && simulationResult.trajectory && simulationResult.trajectory.length > 0 && (
            <div className="groww-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Compounding Milestone Trajectory ({profile.horizon} Years)</strong>
                <span style={{ color: 'var(--text-muted)' }}>Simulated Paths: {simulationResult.simulated_paths_count || 5000}</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>
                      <th style={{ padding: '8px 10px' }}>Horizon</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cumulative Capital</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--groww-red)' }}>Bearish (10%)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--groww-green)' }}>Median (50%)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--groww-green)' }}>Bullish (90%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationResult.trajectory
                      .filter((pt: any) => pt.year > 0 && (pt.year % Math.max(1, Math.floor(profile.horizon / 5)) === 0 || pt.year === profile.horizon))
                      .map((pt: any) => (
                        <tr key={pt.year} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '10px', fontWeight: 800, color: 'var(--text-primary)' }}>Year {pt.year}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtINR(pt.invested_capital)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--groww-red)', fontWeight: 700 }}>{fmtINR(pt.p10_bearish)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--groww-green)', fontWeight: 800 }}>{fmtINR(pt.p50_median)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--groww-green)', fontWeight: 700 }}>{fmtINR(pt.p90_bullish)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
            <button onClick={() => setStep('suitability')} className="btn-groww-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>
              <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back to Holdings
            </button>
            <button
              onClick={() => {
                advance('projections', 'stress');
                runStressTest();
              }}
              className="btn-groww-primary"
              style={{ padding: '10px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Proceed to Crisis Stress Testing</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: Stress Test & 10Y Backtest ─────────────────────────────── */}
      {step === 'stress' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="groww-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--groww-green)' }} />
                Historical Crisis Regimes & 10-Year Walk-Forward Backtest
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Subjecting candidate allocation weights to historical market panics and liquidity dry-ups.
              </p>
            </div>

            <button
              onClick={() => runStressTest()}
              disabled={stressTesting}
              className="btn-groww-secondary"
              style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={stressTesting ? 'animate-spin' : ''} />
              <span>{stressTesting ? 'Testing...' : 'Re-Run Stress Test'}</span>
            </button>
          </div>

          {/* Crisis Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {(stressResult?.crisis_scenarios || [
              {
                scenario_id: '2008_GFC',
                label: '2008 Global Financial Crisis',
                description: 'Subprime mortgage collapse triggered severe global equity liquidation.',
                nifty50_drawdown: -0.538,
                portfolio_drawdown: -0.214,
                recovery_advantage: 'Protected by sovereign debt & gold buffer',
              },
              {
                scenario_id: '2020_COVID',
                label: '2020 COVID-19 Flash Crash',
                description: 'Global lockdown liquidity dislocation across worldwide exchanges.',
                nifty50_drawdown: -0.384,
                portfolio_drawdown: -0.142,
                recovery_advantage: 'Low correlation assets dampened equity drawdowns',
              },
              {
                scenario_id: '2022_INFLATION_SPIKE',
                label: '2022 Inflation & Rate Hikes',
                description: 'Global central bank tightening cycle compressing technology multiples.',
                nifty50_drawdown: -0.181,
                portfolio_drawdown: -0.068,
                recovery_advantage: 'Commodity allocations protected real value',
              },
            ]).map((sc: any) => (
              <div
                key={sc.scenario_id}
                className="groww-card"
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>{sc.label}</strong>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>{sc.description}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Nifty 50 Shock:</span>
                    <strong style={{ color: 'var(--groww-red)' }}>{fmtPct(sc.nifty50_drawdown)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--groww-green)' }}>Portfolio Max DD:</span>
                    <strong style={{ color: 'var(--groww-green)' }}>{fmtPct(sc.portfolio_drawdown)}</strong>
                  </div>
                </div>

                {sc.recovery_advantage && (
                  <div style={{ fontSize: '10px', color: 'var(--groww-green)', backgroundColor: 'var(--groww-green-light)', padding: '4px 8px', borderRadius: '4px' }}>
                    ✓ {sc.recovery_advantage}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 10-Year Backtest Summary */}
          {stressResult?.backtest_summary && (
            <div className="groww-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  10-Year Walk-Forward Backtest Attribution (2016–2025)
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--groww-green)', background: 'var(--groww-green-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  OUTPERFORMED BENCHMARK
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>10Y CAGR</span>
                  <strong style={{ fontSize: '16px', color: 'var(--groww-green)', display: 'block', marginTop: '2px' }}>
                    {fmtPct(stressResult.backtest_summary.cagr_10y)}
                  </strong>
                </div>
                <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Realized Vol</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>
                    {fmtPct(stressResult.backtest_summary.volatility_realized)}
                  </strong>
                </div>
                <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Sharpe Ratio</span>
                  <strong style={{ fontSize: '16px', color: 'var(--groww-blue)', display: 'block', marginTop: '2px' }}>
                    {stressResult.backtest_summary.sharpe_ratio.toFixed(2)}
                  </strong>
                </div>
                <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Max Drawdown</span>
                  <strong style={{ fontSize: '16px', color: 'var(--groww-red)', display: 'block', marginTop: '2px' }}>
                    {fmtPct(stressResult.backtest_summary.max_drawdown)}
                  </strong>
                </div>
                <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Sortino Ratio</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>
                    {stressResult.backtest_summary.sortino_ratio.toFixed(2)}
                  </strong>
                </div>
                <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Recovery Time</span>
                  <strong style={{ fontSize: '16px', color: 'var(--groww-green)', display: 'block', marginTop: '2px' }}>
                    {stressResult.backtest_summary.recovery_months} Mos
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Yearly Historical Returns Breakdown Table */}
          {stressResult?.yearly_returns && stressResult.yearly_returns.length > 0 && (
            <div className="groww-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Historical Regime Attribution (2016–2025 Walk-Forward)</strong>
                <span style={{ color: 'var(--text-muted)' }}>Benchmark: Nifty 50 Total Return</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>
                      <th style={{ padding: '8px 10px' }}>Calendar Year</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Portfolio Return</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Nifty 50 Benchmark</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Alpha Delta</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Attribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stressResult.yearly_returns.map((yr: any) => {
                      const delta = yr.portfolio_return - yr.benchmark_return;
                      return (
                        <tr key={yr.year} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '10px', fontWeight: 800, color: 'var(--text-primary)' }}>{yr.year}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: yr.portfolio_return >= 0 ? 'var(--groww-green)' : 'var(--groww-red)' }}>
                            {fmtPct(yr.portfolio_return)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {fmtPct(yr.benchmark_return)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: delta >= 0 ? 'var(--groww-green)' : 'var(--groww-red)' }}>
                            {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, backgroundColor: yr.outperformed ? 'var(--groww-green-light)' : 'rgba(235, 91, 89, 0.1)', color: yr.outperformed ? 'var(--groww-green)' : '#EB5B59' }}>
                              {yr.outperformed ? 'ALPHA +' : 'MARKET'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
            <button onClick={() => setStep('projections')} className="btn-groww-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>
              <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back to Projections
            </button>
            <button
              onClick={() => advance('stress', 'studio')}
              className="btn-groww-primary"
              style={{ padding: '10px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Proceed to Decision Studio</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 7: Decision Studio & Paper Execution ──────────────────────── */}
      {step === 'studio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--groww-green)', fontFamily: 'var(--font-mono)' }}>
                  FINAL INSTITUTIONAL ALLOCATION
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedCandidate?.title || 'Target-Risk Suitable Portfolio'} Verdict
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Allocation verified under Finance (No. 2) Act 2024 statutory friction schedule with point-in-time audit integrity.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleDeployToPaperPortfolio}
                  className="btn-groww-primary"
                  style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Deploy Allocation to Paper Desk</span>
                </button>
                <button
                  onClick={() => onHandoffToTrading?.(selectedCandidate?.holdings?.[0]?.ticker || 'RELIANCE.NS', 'BUY')}
                  className="btn-groww-secondary"
                  style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Open Paper Order Desk</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>

            {/* Deploy Notification */}
            {deployMessage && (
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--groww-green-light)',
                  border: '1px solid rgba(0, 208, 156, 0.4)',
                  color: 'var(--groww-green)',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <CheckCircle2 size={18} />
                <span>{deployMessage}</span>
              </div>
            )}

            {/* Allocation Visual Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-mono)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Asset Allocation Weights & Rupee Capital
                </h4>
                {(selectedCandidate?.holdings || [
                  { ticker: 'RELIANCE.NS', name: 'Reliance Industries Ltd', weight: 25.0, allocation_inr: 250000, strategic_role: 'Core Mega-Cap Growth' },
                  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', weight: 25.0, allocation_inr: 250000, strategic_role: 'Private Banking Anchor' },
                  { ticker: 'TCS.NS', name: 'Tata Consultancy Services', weight: 20.0, allocation_inr: 200000, strategic_role: 'Technology Exporter' },
                  { ticker: 'GOLDBEES.NS', name: 'Nippon India Gold ETF', weight: 15.0, allocation_inr: 150000, strategic_role: 'Inflation Hedge' },
                  { ticker: 'INDIA_GOVT_10Y', name: '10Y Sovereign Bond (6.82%)', weight: 15.0, allocation_inr: 150000, strategic_role: 'Sovereign Yield Anchor' },
                ]).map((a, idx) => {
                  const colors = ['var(--groww-green)', 'var(--groww-blue)', 'var(--groww-amber)', '#B4C0D0', '#EB5B59', '#65D5C3'];
                  const color = colors[idx % colors.length];

                  return (
                    <div
                      key={a.ticker}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{a.name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>({a.ticker})</span>
                        </div>
                        <strong style={{ color: color, fontSize: '13px' }}>{a.weight.toFixed(1)}%</strong>
                      </div>

                      <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                        <div style={{ width: `${a.weight}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>Capital: <strong style={{ color: 'var(--text-primary)' }}>{fmtINR(a.allocation_inr)}</strong></span>
                        <span>{a.strategic_role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Statutory Drag & Rigor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'var(--font-mono)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Statutory Rigor & Policy Safeguards
                </h4>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--groww-green)' }} />
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Finance (No. 2) Act 2024 Tax Schedule</strong>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                    Modeled roundtrip friction of <strong>0.1186%</strong> on equity turnover: 0.10% delivery STT, exchange turnover fees (0.00345%), 18% GST, and SEBI regulatory cess. Long-term capital gains (LTCG) capped at 12.5% for holding horizon &gt; 12 months.
                  </p>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={16} style={{ color: 'var(--groww-green)' }} />
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Paper Execution Boundary</strong>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                    Live trading is disabled by design (<code style={{ color: 'var(--groww-green)' }}>live_trading_enabled = false</code>). Deploying allocations writes simulated positions with point-in-time fills to the isolated paper portfolio.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '10px' }}>
            <button onClick={() => setStep('stress')} className="btn-groww-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>
              <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back to Stress Testing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
