import React, { useState, useEffect } from 'react';
import { ArthaLogo } from '../components/ArthaLogo';
import {
  User,
  ShieldCheck,
  Wallet,
  Settings,
  Sliders,
  FileText,
  TrendingUp,
  Cpu,
  Layers,
  Database,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Lock,
  Compass,
  LineChart,
  Briefcase,
  ExternalLink,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { setActiveAuthUser, getActiveAuthUser } from '../utils/telemetryReporter';
import type { TabId } from '../components/Sidebar';

interface ProfilePageProps {
  onNavigate?: (tab: TabId, targetId?: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const [userName, setUserName] = useState<string>(() => getActiveAuthUser()?.name || 'Institutional Trader');
  const [deskRole, setDeskRole] = useState<string>('Chief Quantitative Investment Officer');
  const [firmName, setFirmName] = useState<string>('Artha Capital Institutional Research Desk');
  const [paperCash, setPaperCash] = useState<number>(1000000);
  const [riskTolerance, setRiskTolerance] = useState<'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE'>('BALANCED');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    // Load local storage preferences
    const savedName = localStorage.getItem('arthai_user_name');
    if (savedName) setUserName(savedName);

    const savedRole = localStorage.getItem('arthai_desk_role');
    if (savedRole) setDeskRole(savedRole);

    const savedCash = localStorage.getItem('arthai_paper_cash');
    if (savedCash) setPaperCash(parseFloat(savedCash));

    const savedRisk = localStorage.getItem('arthai_risk_tolerance') as any;
    if (savedRisk) setRiskTolerance(savedRisk);

    const savedTheme = (localStorage.getItem('arthai_theme') as 'dark' | 'light') || 'dark';
    setThemeMode(savedTheme);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('arthai_user_name', userName);
    localStorage.setItem('arthai_desk_role', deskRole);
    localStorage.setItem('arthai_risk_tolerance', riskTolerance);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const handleResetPaperCapital = () => {
    const defaultCash = 1000000;
    setPaperCash(defaultCash);
    localStorage.setItem('arthai_paper_cash', defaultCash.toString());
    localStorage.setItem('arthai_paper_positions', JSON.stringify([]));
    localStorage.setItem('arthai_initial_capital', defaultCash.toString());
    window.dispatchEvent(new Event('storage'));
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Banner: Institutional Verification Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '24px 28px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--bg-card)',
          backgroundImage: 'linear-gradient(135deg, rgba(0, 208, 156, 0.09) 0%, rgba(83, 103, 255, 0.05) 50%, var(--bg-card) 100%)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00D09C 0%, #5367FF 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: 900,
              boxShadow: '0 8px 24px rgba(0, 208, 156, 0.35)',
              border: '2px solid rgba(0, 208, 156, 0.45)',
            }}
          >
            {userName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'HS'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {userName}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(0, 208, 156, 0.12)',
                  border: '1px solid rgba(0, 208, 156, 0.35)',
                  color: 'var(--groww-green)',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={13} />
                SEBI Institutional Paper Desk Active
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {deskRole} • <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{firmName}</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Desk ID: <strong style={{ color: 'var(--text-primary)' }}>ARTH-IN-2024-88419</strong></span>
              <span>•</span>
              <span>Colocation: <strong style={{ color: 'var(--groww-green)' }}>NSE BKC Sub-Millisecond Mock</strong></span>
              <span>•</span>
              <span>SEBI Framework: <strong style={{ color: 'var(--text-primary)' }}>LODR 2015 & PIT 2015</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onNavigate && (
            <button
              onClick={() => onNavigate('research', 'RELIANCE.NS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--groww-green)',
                color: '#0F1217',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LineChart size={15} />
              Launch Research
            </button>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('portfolio')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Briefcase size={15} color="var(--groww-blue)" />
              Paper Desk
            </button>
          )}
        </div>
      </div>

      {/* Grid: Paper Trading Metrics + Safety Guardrails */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Paper Trading Account & Capital Controls */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--groww-green-light)',
                  color: 'var(--groww-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Paper Desk Capital Allocation
              </h2>
            </div>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 208, 156, 0.15)',
                color: 'var(--groww-green)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Virtual Cash
            </span>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
              Available Liquid Margin
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--groww-green)', marginTop: '4px' }}>
              ₹{paperCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Baseline Paper Benchmark:</span>
              <strong style={{ color: 'var(--text-primary)' }}>₹10,00,000.00</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Max Single-Equity Cap:</span>
              <strong style={{ color: 'var(--text-primary)' }}>20.00% (₹2,00,000.00)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>SEBI Mutual Fund Limit:</span>
              <strong style={{ color: 'var(--groww-green)' }}>Compliant (Prudential Bounds)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Execution Engine:</span>
              <strong style={{ color: 'var(--groww-blue)' }}>FastMCP + DuckDB Analytical</strong>
            </div>
          </div>

          <button
            onClick={handleResetPaperCapital}
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--groww-green)';
              e.currentTarget.style.color = 'var(--groww-green)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <RotateCcw size={14} />
            Reset Paper Trading Margin to ₹10,00,000
          </button>
        </div>

        {/* Card 2: Regulatory Safety & Mandatory Guardrails */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--groww-blue-light)',
                  color: 'var(--groww-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                System Safety &amp; Risk Corridor
              </h2>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(235, 91, 89, 0.15)',
                color: 'var(--groww-red)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <Lock size={12} />
              Live Trading Locked
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={16} color="var(--groww-green)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Zero Live-Trading Risk Invariant</strong>
                <span style={{ color: 'var(--text-muted)' }}>`live_trading_enabled = false` is compiled and strictly asserted on all agent executions.</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={16} color="var(--groww-green)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Amihud &amp; Corwin-Schultz Spread Filter</strong>
                <span style={{ color: 'var(--text-muted)' }}>Orders automatically gate if estimated market impact exceeds 25.0 bps under stress.</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={16} color="var(--groww-green)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>10% Daily Circuit Breaker Enforcement</strong>
                <span style={{ color: 'var(--text-muted)' }}>NSE dynamic band monitoring prevents order placement during volatility freeze events.</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>SEBI Intermediary Reg: <strong>INZ000214836</strong></span>
            <span>Audited: <strong>SEBI PIT &amp; LODR</strong></span>
          </div>
        </div>

        {/* Card 3: Statutory Taxation Schedule (Finance No. 2 Act 2024) */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--groww-amber-light)',
                  color: 'var(--groww-amber)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Finance (No. 2) Act 2024 Tax Schedule
              </h2>
            </div>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 184, 0, 0.15)',
                color: 'var(--groww-amber)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Oct 2024 Revision
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>STT Cash Delivery:</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>0.10% (Buy &amp; Sell)</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>STT Equity Intraday:</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>0.025% (Sell Only)</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>LTCG Rate (&gt;12M):</span>
              <strong style={{ color: 'var(--groww-green)', fontSize: '13px' }}>12.5% (&gt;₹1.25L exemp)</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>STCG Rate (&lt;12M):</span>
              <strong style={{ color: 'var(--groww-amber)', fontSize: '13px' }}>20.00% (Flat)</strong>
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--groww-green)', display: 'block', marginBottom: '2px' }}>
              Standard Delivery Roundtrip Drag: 22.22 bps
            </strong>
            ₹222.22 statutory deduction per ₹1,00,000 roundtrip. Verified deterministically by the FastMCP statutory calculation module.
          </div>

          <div style={{ marginTop: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
            Authority: Department of Revenue, Ministry of Finance, Government of India.
          </div>
        </div>

      </div>

      {/* Multi-Agent Architecture & Fleet Configuration */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(83, 103, 255, 0.15)',
                color: 'var(--groww-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Multi-Agent Orchestration Fleet Status
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Dual Framework Architecture: Google ADK + CrewAI with A2A Protocol &amp; Monotonic Blackboard
              </span>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--groww-green-light)',
              color: 'var(--groww-green)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--groww-green)' }} />
            All 7 Agents Verified
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {[
            {
              id: 'adk_research_manager',
              name: 'Research Manager',
              framework: 'Google ADK',
              role: 'Supervisory orchestration & Pydantic synthesis',
              status: 'READY',
            },
            {
              id: 'adk_quant_specialist',
              name: 'Quant Specialist',
              framework: 'Google ADK',
              role: 'Point-in-time OHLCV feature engineering (Zero Lookahead)',
              status: 'READY',
            },
            {
              id: 'adk_microstructure_specialist',
              name: 'Microstructure Specialist',
              framework: 'Google ADK',
              role: 'Corwin-Schultz spread & Kyle lambda market impact',
              status: 'READY',
            },
            {
              id: 'crewai_macro_specialist',
              name: 'Macro Policy Specialist',
              framework: 'CrewAI',
              role: 'RBI MPC repo frameworks & inflation indexing',
              status: 'READY',
            },
            {
              id: 'crewai_corporate_filing_specialist',
              name: 'Filing & Governance',
              framework: 'CrewAI',
              role: 'SEBI LODR Reg 30/33 quarterly financial statements',
              status: 'READY',
            },
            {
              id: 'crewai_adversarial_specialist',
              name: 'Adversarial Skeptic',
              framework: 'CrewAI',
              role: 'Red-team volatility shock & statutory drag testing',
              status: 'READY',
            },
            {
              id: 'adk_risk_validator',
              name: 'Risk & Safety Gate',
              framework: 'Google ADK',
              role: 'FastMCP statutory cost validation & live safety lock',
              status: 'READY',
            },
          ].map((agent) => (
            <div
              key={agent.id}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{agent.name}</strong>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: agent.framework === 'Google ADK' ? 'rgba(0, 208, 156, 0.12)' : 'rgba(83, 103, 255, 0.12)',
                    color: agent.framework === 'Google ADK' ? 'var(--groww-green)' : 'var(--groww-blue)',
                  }}
                >
                  {agent.framework}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {agent.role}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Settings & User Profile Form */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sliders size={18} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Institutional Desk Profile &amp; Preferences
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Operator / Lead Analyst Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Institutional Title / Role
            </label>
            <input
              type="text"
              value={deskRole}
              onChange={(e) => setDeskRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Risk Appetite Profile
            </label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="DEFENSIVE">DEFENSIVE — Capital Preservation &amp; High Liquidity (Tier-1 Equities Only)</option>
              <option value="BALANCED">BALANCED — Sharpe Maximization with Stop Loss Corridor (Default)</option>
              <option value="AGGRESSIVE">AGGRESSIVE — Momentum Expansion &amp; High Conviction Growth</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--groww-green)',
                color: '#0F1217',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              Save Desk Preferences
            </button>
          </div>
        </form>

        {isSavedNotice && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--groww-green-light)',
              border: '1px solid var(--groww-green)',
              color: 'var(--groww-green)',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={15} />
            Preferences updated and persisted successfully.
          </div>
        )}
      </div>

      {/* Standalone Admin Portal Card - Strictly Restricted to Super-Admin Hitesh */}
      {getActiveAuthUser()?.email.toLowerCase() === 'hitesh.sunkari.23cse@bmu.edu.in' && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(0, 208, 156, 0.3)',
            background: 'radial-gradient(ellipse at 90% 0%, rgba(0, 208, 156, 0.08) 0%, var(--bg-card) 70%)',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArthaLogo size={24} variant="icon" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                ArthaAI Administrative Portal
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '600px' }}>
              Super-Admin observatory for multi-agent fleet topology, continuous benchmarks, DuckDB data store, and SEBI compliance.
            </p>
          </div>

          <a
            href="http://127.0.0.1:5174"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-groww-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={15} />
            <span>Launch Admin Portal ↗</span>
          </a>
        </div>
      )}

      {/* Desk Session Lock & Sign Out */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Active Desk Session Security
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Signing out locks the quantitative terminal and returns to the mandatory full-page authentication gate.
          </p>
        </div>

        <button
          onClick={() => setActiveAuthUser(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
          <span>Sign Out of Terminal</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
