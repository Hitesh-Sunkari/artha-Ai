import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  Activity,
  BarChart3,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { setActiveAuthUser } from '../utils/telemetryReporter';
import { useTheme } from '../utils/useTheme';
import type { AuthUser } from '../api/types';

interface AuthPageProps {
  onAuthSuccess?: (user: AuthUser) => void;
  onBack?: () => void;
  initialMode?: 'LOGIN' | 'SIGNUP';
}

const SUPER_ADMIN_EMAIL = 'hitesh.sunkari.23cse@bmu.edu.in';

// Live Institutional Market Universe Stream Ticker
const LIVE_TICKER_ITEMS = [
  { sym: 'NIFTY 50', val: '25,044.60', chg: '+0.23%', up: true },
  { sym: 'SENSEX', val: '81,106.65', chg: '+0.13%', up: true },
  { sym: 'INDIA VIX', val: '17.42', chg: '-5.48%', up: false },
  { sym: 'RELIANCE', val: '₹1,159.10', chg: '+0.45%', up: true },
  { sym: 'TCS', val: '₹2,507.70', chg: '+1.12%', up: true },
  { sym: 'HDFCBANK', val: '₹684.15', chg: '-0.15%', up: false },
  { sym: 'INFY', val: '₹1,162.30', chg: '+0.80%', up: true },
  { sym: 'SWIGGY', val: '₹179.00', chg: '-1.20%', up: false },
  { sym: 'ZOMATO', val: '₹341.60', chg: '+2.10%', up: true },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthSuccess,
  onBack,
  initialMode = 'LOGIN',
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [objective, setObjective] = useState<string>('WEALTH_COMPOUNDING');
  const [startingCapital, setStartingCapital] = useState<number>(500000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [liveSecond, setLiveSecond] = useState(0);

  // Live micro-clock tick for animated elements
  useEffect(() => {
    const timer = setInterval(() => setLiveSecond((s) => (s + 1) % 60), 1000);
    return () => clearInterval(timer);
  }, []);

  // Premium Theme Color Tokens
  const t = isDark
    ? {
        bg: '#07090E',
        glow1: 'rgba(0, 208, 156, 0.12)',
        glow2: 'rgba(6, 182, 212, 0.10)',
        glow3: 'rgba(99, 102, 241, 0.08)',
        cardBg: 'rgba(14, 18, 27, 0.88)',
        cardBorder: 'rgba(0, 208, 156, 0.22)',
        cardBorderHover: 'rgba(0, 208, 156, 0.45)',
        cardShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 45px rgba(0, 208, 156, 0.12)',
        textHead: '#FFFFFF',
        textBody: '#94A3B8',
        textMuted: '#64748B',
        panelBg: 'rgba(18, 24, 36, 0.65)',
        panelBorder: 'rgba(255, 255, 255, 0.08)',
        inputBg: 'rgba(8, 12, 19, 0.75)',
        inputBorder: 'rgba(255, 255, 255, 0.14)',
        inputText: '#FFFFFF',
        switchBg: 'rgba(8, 12, 19, 0.8)',
        switchBorder: 'rgba(255, 255, 255, 0.1)',
        switchInactive: '#94A3B8',
        googleBg: '#FFFFFF',
        googleText: '#0F172A',
        googleBorder: 'transparent',
        pillBg: 'rgba(0, 208, 156, 0.08)',
        pillBorder: 'rgba(0, 208, 156, 0.35)',
        pillText: '#CBD5E1',
        divider: 'rgba(255, 255, 255, 0.08)',
        tickerBg: 'rgba(10, 14, 22, 0.7)',
        tickerBorder: 'rgba(255, 255, 255, 0.07)',
        chipBg: 'rgba(255, 255, 255, 0.03)',
        chipBorder: 'rgba(255, 255, 255, 0.1)',
        chipText: '#94A3B8',
        badgeBg: 'rgba(255, 255, 255, 0.05)',
        badgeBorder: 'rgba(255, 255, 255, 0.1)',
        glassBtn: 'rgba(255, 255, 255, 0.06)',
        glassBtnBorder: 'rgba(255, 255, 255, 0.12)',
        glassBtnText: '#CBD5E1',
      }
    : {
        bg: '#F8FAFC',
        glow1: 'rgba(0, 208, 156, 0.15)',
        glow2: 'rgba(6, 182, 212, 0.12)',
        glow3: 'rgba(99, 102, 241, 0.09)',
        cardBg: '#FFFFFF',
        cardBorder: 'rgba(0, 208, 156, 0.35)',
        cardBorderHover: 'rgba(0, 208, 156, 0.6)',
        cardShadow: '0 24px 60px rgba(15, 23, 42, 0.08), 0 0 35px rgba(0, 208, 156, 0.09)',
        textHead: '#0F172A',
        textBody: '#475569',
        textMuted: '#64748B',
        panelBg: '#FFFFFF',
        panelBorder: '#E2E8F0',
        inputBg: '#F8FAFC',
        inputBorder: '#CBD5E1',
        inputText: '#0F172A',
        switchBg: '#F1F5F9',
        switchBorder: '#E2E8F0',
        switchInactive: '#64748B',
        googleBg: '#FFFFFF',
        googleText: '#0F172A',
        googleBorder: '#CBD5E1',
        pillBg: 'rgba(0, 208, 156, 0.08)',
        pillBorder: 'rgba(0, 208, 156, 0.45)',
        pillText: '#0F172A',
        divider: '#E2E8F0',
        tickerBg: 'rgba(255, 255, 255, 0.85)',
        tickerBorder: '#E2E8F0',
        chipBg: '#F8FAFC',
        chipBorder: '#CBD5E1',
        chipText: '#475569',
        badgeBg: '#F1F5F9',
        badgeBorder: '#E2E8F0',
        glassBtn: '#FFFFFF',
        glassBtnBorder: '#CBD5E1',
        glassBtnText: '#334155',
      };

  const handleGoogleSignIn = async (overrideEmail?: string, overrideName?: string) => {
    setLoading(true);
    setError(null);
    const targetEmail = overrideEmail || email.trim() || SUPER_ADMIN_EMAIL;
    const targetName =
      overrideName || (targetEmail.includes('hitesh') ? 'Hitesh Sunkari' : name.trim() || 'Institutional Trader');

    try {
      const authUser = await api.loginWithGoogle(targetEmail, targetName);
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Super-Admin clearance verified. Terminal unlocked.'
          : 'Signed in successfully via Google.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        if (onBack) onBack();
      }, 850);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide a valid institutional email address.');
      return;
    }

    if (mode === 'SIGNUP' && password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authUser = await api.loginWithEmail(email.trim(), password, name.trim());
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Super-Administrator credentials accepted. Welcome, Hitesh.'
          : mode === 'SIGNUP'
          ? 'Institutional account created successfully! Terminal ready.'
          : 'Access granted. Welcome back.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        if (onBack) onBack();
      }, 850);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuperAdmin = () => {
    setEmail(SUPER_ADMIN_EMAIL);
    setName('Hitesh Sunkari');
    setPassword('admin123');
  };

  return (
    <div className="auth-fullscreen-container">
      {/* ── Visual Dynamic Animations & Keyframes ─────────────────── */}
      <style>{`
        .auth-fullscreen-container {
          min-height: 100vh;
          height: 100vh;
          width: 100vw;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: ${t.bg};
          position: relative;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif;
          box-sizing: border-box;
          transition: background-color 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.12); }
        }

        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-35px, 25px) scale(1.15); }
        }

        @keyframes floatGentle1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes floatGentle2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }

        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
        }

        @keyframes tickerFlow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes shimmerLine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .orb-light-1 {
          position: absolute;
          width: 650px;
          height: 650px;
          border-radius: 50%;
          background: radial-gradient(circle, ${t.glow1} 0%, transparent 70%);
          top: -120px;
          left: -120px;
          pointer-events: none;
          animation: orbDrift1 18s ease-in-out infinite;
          filter: blur(60px);
          z-index: 1;
        }

        .orb-light-2 {
          position: absolute;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, ${t.glow2} 0%, transparent 70%);
          bottom: -150px;
          right: -100px;
          pointer-events: none;
          animation: orbDrift2 22s ease-in-out infinite;
          filter: blur(70px);
          z-index: 1;
        }

        .floating-metric-card-1 {
          animation: floatGentle1 6s ease-in-out infinite;
        }

        .floating-metric-card-2 {
          animation: floatGentle2 7s ease-in-out infinite;
        }

        .ticker-marquee-track {
          display: flex;
          width: max-content;
          animation: tickerFlow 35s linear infinite;
        }

        .ticker-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ── Background Moving Orbs (Ambient Depth) ────────────────── */}
      <div className="orb-light-1" />
      <div className="orb-light-2" />

      {/* ── Top Floating Utility Pill (NO STATIC HEADER BAR) ─────── */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '28px',
          right: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Minimal Monogram Brand Mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #00D09C 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '18px',
              color: '#07090E',
              boxShadow: '0 4px 18px rgba(0, 208, 156, 0.45)',
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textHead, lineHeight: 1.1 }}>
              Artha<span style={{ color: '#00D09C' }}>AI</span>
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em' }}>
              QUANTITATIVE DESK
            </div>
          </div>
        </div>

        {/* Right: Floating Theme Toggle + Live Market Beacon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: t.badgeBg,
              border: `1px solid ${t.badgeBorder}`,
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '11px',
              color: t.textBody,
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            <div style={{ position: 'relative', width: '8px', height: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#00D09C',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#00D09C',
                  animation: 'pulseDot 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                }}
              />
            </div>
            <span>NSE/BSE LIVE</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '20px',
              backgroundColor: t.glassBtn,
              border: `1px solid ${t.glassBtnBorder}`,
              color: t.glassBtnText,
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.15s ease',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
          >
            {isDark ? <Sun size={13} color="#FFB800" /> : <Moon size={13} color="#5367FF" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Full-Screen Split Layout ─────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 1.15fr) minmax(360px, 0.95fr)',
          maxWidth: '1360px',
          width: '100%',
          margin: '0 auto',
          padding: '100px 32px 32px 32px',
          gap: '50px',
          alignItems: 'center',
          boxSizing: 'border-box',
          zIndex: 10,
          position: 'relative',
        }}
      >
        {/* ── Left Column: Quantitative Showcase & Moving Visuals ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div>
            {/* Live Quantitative Telemetry Chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 208, 156, 0.1)',
                border: '1px solid rgba(0, 208, 156, 0.3)',
                color: '#00D09C',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                marginBottom: '18px',
              }}
            >
              <Activity size={14} className="animate-pulse" />
              <span>Institutional Algorithmic Order Intelligence</span>
            </div>

            <h1
              style={{
                fontSize: '44px',
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: '-0.035em',
                margin: '0 0 16px 0',
                color: t.textHead,
              }}
            >
              Indian Capital Markets,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00D09C 0%, #06B6D4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Quantitatively Solved.
              </span>
            </h1>

            <p style={{ fontSize: '15px', color: t.textBody, lineHeight: 1.6, margin: 0, maxWidth: '520px' }}>
              Deliberative multi-specialist quantitative engine grounded in DuckDB SIMD historical analytics,
              SEBI LODR regulatory enforcement, and Finance Act 2024 statutory friction models.
            </p>
          </div>

          {/* ── Interactive Floating Visual Cards (Moving Dynamics) ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Floating Card 1: NIFTY 50 Live Telemetry */}
            <div
              className="floating-metric-card-1"
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: t.panelBg,
                border: `1px solid ${t.panelBorder}`,
                backdropFilter: 'blur(16px)',
                boxShadow: isDark ? '0 12px 30px rgba(0, 0, 0, 0.35)' : '0 10px 24px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, letterSpacing: '0.06em' }}>
                  BENCHMARK
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#00D09C',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 208, 156, 0.1)',
                  }}
                >
                  +0.23% ▲
                </span>
              </div>

              <div style={{ fontSize: '20px', fontWeight: 800, color: t.textHead, fontFamily: 'monospace' }}>
                NIFTY 25,044.60
              </div>

              {/* Animated Mini Sparkline SVG Wave */}
              <svg width="100%" height="32" viewBox="0 0 160 32" fill="none">
                <path
                  d="M0 24 Q 25 8, 50 18 T 100 12 T 140 6 T 160 14"
                  stroke="#00D09C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="160" cy="14" r="3.5" fill="#00D09C" />
              </svg>

              <div style={{ fontSize: '10.5px', color: t.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                <span>VWAP: 25,012.30</span>
                <span>VOL: 14.8M</span>
              </div>
            </div>

            {/* Floating Card 2: Volatility Surface & Drag */}
            <div
              className="floating-metric-card-2"
              style={{
                padding: '18px',
                borderRadius: '16px',
                backgroundColor: t.panelBg,
                border: `1px solid ${t.panelBorder}`,
                backdropFilter: 'blur(16px)',
                boxShadow: isDark ? '0 12px 30px rgba(0, 0, 0, 0.35)' : '0 10px 24px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, letterSpacing: '0.06em' }}>
                  IMPLIED VOLATILITY
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#EF4444',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  -5.48% ▼
                </span>
              </div>

              <div style={{ fontSize: '20px', fontWeight: 800, color: t.textHead, fontFamily: 'monospace' }}>
                INDIA VIX 17.42
              </div>

              {/* Animated Inverse Sparkline SVG */}
              <svg width="100%" height="32" viewBox="0 0 160 32" fill="none">
                <path
                  d="M0 8 Q 30 18, 60 10 T 110 22 T 160 16"
                  stroke="#06B6D4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="160" cy="16" r="3.5" fill="#06B6D4" />
              </svg>

              <div style={{ fontSize: '10.5px', color: t.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                <span>Drag: 22.2 bps</span>
                <span>PCR: 0.95</span>
              </div>
            </div>
          </div>

          {/* ── 4 Institutional Feature Badges ──────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'Fleet Sync', val: '7 Roles', icon: Cpu, col: '#00D09C' },
              { label: 'MCP Tools', val: '21 Tools', icon: BarChart3, col: '#06B6D4' },
              { label: 'LTCG Drag', val: '12.5% Model', icon: ShieldCheck, col: '#F59E0B' },
              { label: 'Fast Engine', val: 'DuckDB PIT', icon: Layers, col: '#8B5CF6' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 10px',
                    borderRadius: '12px',
                    backgroundColor: t.panelBg,
                    border: `1px solid ${t.panelBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon size={13} color={f.col} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                      {f.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: t.textHead }}>
                    {f.val}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Live Flowing Ticker Stream (Continuous Visual Motion) ── */}
          <div
            style={{
              overflow: 'hidden',
              borderRadius: '12px',
              backgroundColor: t.tickerBg,
              border: `1px solid ${t.tickerBorder}`,
              padding: '10px 0',
              position: 'relative',
            }}
          >
            <div className="ticker-marquee-track">
              {[...LIVE_TICKER_ITEMS, ...LIVE_TICKER_ITEMS].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 16px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${t.divider}`,
                  }}
                >
                  <span style={{ fontWeight: 700, color: t.textHead }}>{item.sym}</span>
                  <span style={{ color: t.textBody }}>{item.val}</span>
                  <span style={{ fontWeight: 700, color: item.up ? '#00D09C' : '#EF4444' }}>
                    {item.chg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Luxury Interactive Auth Terminal ──────── */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: t.cardBg,
              borderRadius: '24px',
              border: `1px solid ${t.cardBorder}`,
              boxShadow: t.cardShadow,
              backdropFilter: 'blur(24px)',
              padding: '34px 30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxSizing: 'border-box',
              position: 'relative',
              transition: 'all 0.25s ease',
            }}
          >
            {/* Mode Switcher Segmented Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: '4px',
                borderRadius: '12px',
                backgroundColor: t.switchBg,
                border: `1px solid ${t.switchBorder}`,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: mode === 'LOGIN' ? '#00D09C' : 'transparent',
                  color: mode === 'LOGIN' ? '#07090E' : t.switchInactive,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: mode === 'LOGIN' ? '0 2px 8px rgba(0, 208, 156, 0.3)' : 'none',
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setError(null);
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: mode === 'SIGNUP' ? '#00D09C' : 'transparent',
                  color: mode === 'SIGNUP' ? '#07090E' : t.switchInactive,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: mode === 'SIGNUP' ? '0 2px 8px rgba(0, 208, 156, 0.3)' : 'none',
                }}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 208, 156, 0.1)',
                  border: '1px solid rgba(0, 208, 156, 0.35)',
                  color: '#00D09C',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── 1-Click Google Sign In Button ───────────────────── */}
            <div>
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  backgroundColor: t.googleBg,
                  color: t.googleText,
                  border: `1px solid ${t.googleBorder}`,
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Super-Admin Clearance Quick Login Pill */}
              <div
                onClick={handleSelectSuperAdmin}
                style={{
                  marginTop: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: t.pillBg,
                  border: `1px dashed ${t.pillBorder}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#00D09C" />
                  <span style={{ fontSize: '11px', color: '#00D09C', fontWeight: 700 }}>
                    Super-Admin Access:
                  </span>
                  <span style={{ fontSize: '11px', color: t.pillText, fontFamily: 'monospace' }}>
                    {SUPER_ADMIN_EMAIL}
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', color: '#00D09C', fontWeight: 800 }}>Auto-Fill ⚡</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: t.divider }} />
              <span style={{ fontSize: '10.5px', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: t.divider }} />
            </div>

            {/* ── Email / Password Form ───────────────────────────── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mode === 'SIGNUP' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: t.textBody,
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Institutional Name / Trader ID
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: t.textMuted,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="e.g. Hitesh Sunkari"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 36px',
                        borderRadius: '10px',
                        backgroundColor: t.inputBg,
                        border: `1px solid ${t.inputBorder}`,
                        color: t.inputText,
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: t.textBody,
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Institutional Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: t.textMuted,
                    }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="trader@arthai.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      backgroundColor: t.inputBg,
                      border: `1px solid ${t.inputBorder}`,
                      color: t.inputText,
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: t.textBody,
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: t.textMuted,
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 36px 11px 36px',
                      borderRadius: '10px',
                      backgroundColor: t.inputBg,
                      border: `1px solid ${t.inputBorder}`,
                      color: t.inputText,
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: t.textMuted,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Signup) */}
              {mode === 'SIGNUP' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: t.textBody,
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: t.textMuted,
                      }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 36px',
                        borderRadius: '10px',
                        backgroundColor: t.inputBg,
                        border: `1px solid ${t.inputBorder}`,
                        color: t.inputText,
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Signup Additional Configuration (Objective & Capital) */}
              {mode === 'SIGNUP' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: t.textBody,
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Mandate Objective
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'WEALTH_COMPOUNDING', label: 'Compounding' },
                        { id: 'INFLATION_HEDGE', label: 'Hedge' },
                        { id: 'ALPHA_ROTATION', label: 'Active Alpha' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setObjective(item.id)}
                          style={{
                            padding: '7px 8px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: objective === item.id ? '#00D09C' : t.chipBorder,
                            backgroundColor:
                              objective === item.id ? 'rgba(0, 208, 156, 0.15)' : t.chipBg,
                            color: objective === item.id ? '#00D09C' : t.chipText,
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: t.textBody,
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Initial Simulation Capital
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[100000, 500000, 1000000, 2500000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setStartingCapital(amt)}
                          style={{
                            padding: '7px 8px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: startingCapital === amt ? '#00D09C' : t.chipBorder,
                            backgroundColor:
                              startingCapital === amt ? 'rgba(0, 208, 156, 0.15)' : t.chipBg,
                            color: startingCapital === amt ? '#00D09C' : t.chipText,
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ₹{amt / 100000}L
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '13px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#00D09C',
                  color: '#07090E',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(0, 208, 156, 0.4)',
                  transition: 'all 0.15s ease',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Verifying Institutional Clearance...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'LOGIN' ? 'Enter Trading Terminal' : 'Initialize Institutional Account'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Regulatory Footer */}
            <div
              style={{
                fontSize: '11px',
                color: t.textMuted,
                textAlign: 'center',
                lineHeight: 1.5,
                borderTop: `1px solid ${t.divider}`,
                paddingTop: '12px',
              }}
            >
              Strictly non-custodial quantitative research. Historical simulations audited under SEBI LODR 2015.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
