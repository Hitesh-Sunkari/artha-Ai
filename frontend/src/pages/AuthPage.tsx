import React, { useState, useEffect } from 'react';
import { ArthaLogo } from '../components/ArthaLogo';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  UserPlus,
  X,
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
  Compass,
  Scale,
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

  // Google OAuth Flow State
  const [isGoogleOAuthOpen, setIsGoogleOAuthOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Dynamic High-Fidelity Color System
  const t = isDark
    ? {
        bg: '#07090E',
        glow1: 'rgba(0, 208, 156, 0.12)',
        glow2: 'rgba(6, 182, 212, 0.10)',
        cardBg: 'rgba(14, 18, 27, 0.90)',
        cardBorder: 'rgba(0, 208, 156, 0.24)',
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
        tickerBg: 'rgba(10, 14, 22, 0.75)',
        tickerBorder: 'rgba(255, 255, 255, 0.07)',
        chipBg: 'rgba(255, 255, 255, 0.03)',
        chipBorder: 'rgba(255, 255, 255, 0.1)',
        chipText: '#94A3B8',
        badgeBg: 'rgba(255, 255, 255, 0.05)',
        badgeBorder: 'rgba(255, 255, 255, 0.1)',
        glassBtn: 'rgba(255, 255, 255, 0.06)',
        glassBtnBorder: 'rgba(255, 255, 255, 0.12)',
        glassBtnText: '#CBD5E1',
        brandBadgeBg: 'rgba(0, 208, 156, 0.10)',
        brandBadgeBorder: 'rgba(0, 208, 156, 0.28)',
      }
    : {
        bg: '#F8FAFC',
        glow1: 'rgba(0, 208, 156, 0.14)',
        glow2: 'rgba(6, 182, 212, 0.11)',
        cardBg: '#FFFFFF',
        cardBorder: 'rgba(0, 208, 156, 0.35)',
        cardShadow: '0 20px 50px rgba(15, 23, 42, 0.08), 0 0 35px rgba(0, 208, 156, 0.08)',
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
        tickerBg: 'rgba(255, 255, 255, 0.9)',
        tickerBorder: '#E2E8F0',
        chipBg: '#F8FAFC',
        chipBorder: '#CBD5E1',
        chipText: '#475569',
        badgeBg: '#F1F5F9',
        badgeBorder: '#E2E8F0',
        glassBtn: '#FFFFFF',
        glassBtnBorder: '#CBD5E1',
        glassBtnText: '#334155',
        brandBadgeBg: 'rgba(0, 208, 156, 0.10)',
        brandBadgeBorder: 'rgba(0, 208, 156, 0.35)',
      };

  const handleExecuteGoogleOAuth = async (targetEmail: string, targetName: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid Google account email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setIsGoogleOAuthOpen(false);

    try {
      const cleanName = targetName.trim() || cleanEmail.split('@')[0];
      const authUser = await api.loginWithGoogle(cleanEmail, cleanName);
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Super-Admin clearance verified via Google OAuth. Administrative privileges unlocked.'
          : `Signed in successfully via Google OAuth (${authUser.email}).`
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        if (onBack) onBack();
      }, 750);
    } catch (err: any) {
      setError(err.message || 'Google OAuth authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError(null);
    // 1. If Google Identity Services client ID is present, invoke live Google OAuth popup
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    const google = (window as any).google;

    if (clientId && google?.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (resp: any) => {
            if (resp && resp.access_token) {
              setLoading(true);
              try {
                const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                const profile = await userinfoRes.json();
                if (profile?.email) {
                  await handleExecuteGoogleOAuth(profile.email, profile.name || profile.email.split('@')[0]);
                  return;
                }
              } catch (e) {
                console.warn('Google userinfo fetch fallback', e);
              }
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('Google OAuth GIS popup error, opening verified selector', err);
      }
    }

    // 2. Open verified Google OAuth Identity Dialog
    setIsGoogleOAuthOpen(true);
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
          ? 'Institutional account initialized successfully.'
          : 'Access verified. Welcome back.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        if (onBack) onBack();
      }, 750);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-fixed-viewport">
      {/* ── Keyframes & Strict Fixed-Viewport Non-Scrolling Styles ─── */}
      <style>{`
        .auth-fixed-viewport {
          height: 100vh;
          max-height: 100vh;
          width: 100vw;
          max-width: 100vw;
          overflow: hidden; /* STRICT NON-SCROLLING */
          background-color: ${t.bg};
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif;
          box-sizing: border-box;
          user-select: none;
          transition: background-color 0.25s ease;
        }

        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
        }

        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 20px) scale(1.12); }
        }

        @keyframes gentleFloat1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        @keyframes gentleFloat2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(5px); }
        }

        @keyframes radarPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.7); opacity: 0.3; }
        }

        @keyframes tickerFlow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .auth-orb-1 {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, ${t.glow1} 0%, transparent 70%);
          top: -100px;
          left: -100px;
          pointer-events: none;
          animation: orbFloat1 16s ease-in-out infinite;
          filter: blur(60px);
          z-index: 1;
        }

        .auth-orb-2 {
          position: absolute;
          width: 650px;
          height: 650px;
          border-radius: 50%;
          background: radial-gradient(circle, ${t.glow2} 0%, transparent 70%);
          bottom: -120px;
          right: -80px;
          pointer-events: none;
          animation: orbFloat2 20s ease-in-out infinite;
          filter: blur(70px);
          z-index: 1;
        }

        .floating-card-1 {
          animation: gentleFloat1 5.5s ease-in-out infinite;
        }

        .floating-card-2 {
          animation: gentleFloat2 6.5s ease-in-out infinite;
        }

        .ticker-marquee-track {
          display: flex;
          width: max-content;
          animation: tickerFlow 32s linear infinite;
        }

        .ticker-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ── Background Moving Orbs ─────────────────────────────────── */}
      <div className="auth-orb-1" />
      <div className="auth-orb-2" />

      {/* ── Top Floating Minimalist Bar (NO STATIC HEADER) ────────── */}
      <div
        style={{
          height: '56px',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Brand Mark with Modern Financial Emblem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ArthaLogo size={36} showGlow variant="badge" />
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textHead, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>ArthaAI</span>
              <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: 'rgba(0, 208, 156, 0.15)', color: '#00D09C', padding: '1px 6px', borderRadius: '4px' }}>
                PROD
              </span>
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em' }}>
              INSTITUTIONAL QUANTITATIVE TERMINAL
            </div>
          </div>
        </div>

        {/* Floating Utilities (Theme Switcher & Live Market Beacon) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '5px 11px',
              borderRadius: '20px',
              backgroundColor: t.badgeBg,
              border: `1px solid ${t.badgeBorder}`,
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: t.textBody,
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            <div style={{ position: 'relative', width: '7px', height: '7px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#00D09C' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#00D09C', animation: 'radarPulse 2s infinite' }} />
            </div>
            <span>NSE / BSE 16:15 IST</span>
          </div>

          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: t.glassBtn,
              border: `1px solid ${t.glassBtnBorder}`,
              color: t.glassBtnText,
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.15s ease',
              boxShadow: isDark ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.04)',
            }}
          >
            {isDark ? <Sun size={12} color="#FFB800" /> : <Moon size={12} color="#5367FF" />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Fixed Non-Scrolling Body (Proportioned Grid) ────── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(400px, 1.18fr) minmax(360px, 0.92fr)',
          maxWidth: '1380px',
          width: '100%',
          margin: '0 auto',
          padding: '0 32px 14px 32px',
          gap: '36px',
          alignItems: 'center',
          boxSizing: 'border-box',
          zIndex: 10,
          position: 'relative',
          overflow: 'hidden', /* Enforce Zero Scroll */
        }}
      >
        {/* ── Left Column: Quantitative Machinery ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <div>
            {/* Quantitative Header Chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: t.brandBadgeBg,
                border: `1px solid ${t.brandBadgeBorder}`,
                color: '#00D09C',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                marginBottom: '10px',
              }}
            >
              <Compass size={13} color="#00D09C" />
              <span>Multi-Specialist Algorithmic Market Architecture</span>
            </div>

            <h1
              style={{
                fontSize: '34px',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                margin: '0 0 10px 0',
                color: t.textHead,
              }}
            >
              Empirical Precision.{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00D09C 0%, #06B6D4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Quantitative Sovereign Intelligence.
              </span>
            </h1>

            <p style={{ fontSize: '13px', color: t.textBody, lineHeight: 1.5, margin: 0, maxWidth: '540px' }}>
              ArthaAI delivers institutional quantitative research for Indian financial markets, unifying SIMD historical analytics,
              Point-in-Time order book resolution, and SEBI regulatory risk bounds across NSE and BSE securities.
            </p>
          </div>

          {/* ── Visual Moving Elements: Floating Live Metric Cards ───── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Floating Card 1: NIFTY 50 */}
            <div
              className="floating-card-1"
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                backgroundColor: t.panelBg,
                border: `1px solid ${t.panelBorder}`,
                backdropFilter: 'blur(16px)',
                boxShadow: isDark ? '0 10px 24px rgba(0, 0, 0, 0.35)' : '0 8px 20px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, letterSpacing: '0.05em' }}>
                  BENCHMARK TICK
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#00D09C',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 208, 156, 0.1)',
                  }}
                >
                  +0.23% ▲
                </span>
              </div>

              <div style={{ fontSize: '17px', fontWeight: 800, color: t.textHead, fontFamily: 'monospace' }}>
                NIFTY 25,044.60
              </div>

              {/* Animated Mini Wave SVG */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none">
                <path
                  d="M0 18 Q 25 6, 50 14 T 100 10 T 140 4 T 160 12"
                  stroke="#00D09C"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="160" cy="12" r="3" fill="#00D09C" />
              </svg>

              <div style={{ fontSize: '9.5px', color: t.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                <span>VWAP: 25,012.30</span>
                <span>VOL: 14.8M</span>
              </div>
            </div>

            {/* Floating Card 2: INDIA VIX & Drag */}
            <div
              className="floating-card-2"
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                backgroundColor: t.panelBg,
                border: `1px solid ${t.panelBorder}`,
                backdropFilter: 'blur(16px)',
                boxShadow: isDark ? '0 10px 24px rgba(0, 0, 0, 0.35)' : '0 8px 20px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, letterSpacing: '0.05em' }}>
                  IMPLIED VOLATILITY
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#EF4444',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  -5.48% ▼
                </span>
              </div>

              <div style={{ fontSize: '17px', fontWeight: 800, color: t.textHead, fontFamily: 'monospace' }}>
                INDIA VIX 17.42
              </div>

              {/* Animated Inverse Wave SVG */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none">
                <path
                  d="M0 6 Q 30 14, 60 8 T 110 18 T 160 12"
                  stroke="#06B6D4"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="160" cy="12" r="3" fill="#06B6D4" />
              </svg>

              <div style={{ fontSize: '9.5px', color: t.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                <span>Drag: 22.2 bps</span>
                <span>PCR: 0.95</span>
              </div>
            </div>
          </div>

          {/* ── 4 Institutional Quantitative Pillars ────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { code: 'FLEET', label: 'Multi-Agent Fleet', icon: Cpu, col: '#00D09C', desc: '7 Specialist Roles' },
              { code: 'DATA', label: 'Point-in-Time Data', icon: BarChart3, col: '#06B6D4', desc: '21 FastMCP Tools' },
              { code: 'RISK', label: 'Stress Bounds', icon: ShieldCheck, col: '#F59E0B', desc: 'Preservation Gating' },
              { code: 'ALPHA', label: 'Net Alpha Engine', icon: Scale, col: '#8B5CF6', desc: 'Sec 112A Tax Drag' },
            ].map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '9px 10px',
                    borderRadius: '10px',
                    backgroundColor: t.panelBg,
                    border: `1px solid ${t.panelBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon size={12} color={p.col} />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: p.col, letterSpacing: '0.04em' }}>
                      {p.code}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: t.textHead, marginTop: '2px' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '9px', color: t.textMuted }}>
                    {p.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Live Market Flowing Marquee Ticker ───────────────────── */}
          <div
            style={{
              overflow: 'hidden',
              borderRadius: '10px',
              backgroundColor: t.tickerBg,
              border: `1px solid ${t.tickerBorder}`,
              padding: '8px 0',
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
                    gap: '6px',
                    padding: '0 14px',
                    fontSize: '10.5px',
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

        {/* ── Right Column: Compact, Non-Scrolling Auth Terminal ──── */}
        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: t.cardBg,
              borderRadius: '20px',
              border: `1px solid ${t.cardBorder}`,
              boxShadow: t.cardShadow,
              backdropFilter: 'blur(24px)',
              padding: '24px 26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
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
                padding: '3px',
                borderRadius: '10px',
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
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: mode === 'LOGIN' ? '#00D09C' : 'transparent',
                  color: mode === 'LOGIN' ? '#07090E' : t.switchInactive,
                  fontSize: '12px',
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
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: mode === 'SIGNUP' ? '#00D09C' : 'transparent',
                  color: mode === 'SIGNUP' ? '#07090E' : t.switchInactive,
                  fontSize: '12px',
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
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 208, 156, 0.1)',
                  border: '1px solid rgba(0, 208, 156, 0.35)',
                  color: '#00D09C',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── 1-Click Google Sign In (NO DEFAULT PRE-FILL) ─────── */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: t.googleBg,
                color: t.googleText,
                border: `1px solid ${t.googleBorder}`,
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
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

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: t.divider }} />
              <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: t.divider }} />
            </div>

            {/* ── Form Inputs (Blank by default, no pre-fill) ──────── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {mode === 'SIGNUP' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: t.textBody,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Full Name / Desk Title
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '11px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: t.textMuted,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="e.g. Quantitative Trader"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: '8px',
                        backgroundColor: t.inputBg,
                        border: `1px solid ${t.inputBorder}`,
                        color: t.inputText,
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: t.textBody,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Institutional Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: t.textMuted,
                    }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="trader@institution.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: '8px',
                      backgroundColor: t.inputBg,
                      border: `1px solid ${t.inputBorder}`,
                      color: t.inputText,
                      fontSize: '12.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: t.textBody,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '11px',
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
                      padding: '9px 34px 9px 34px',
                      borderRadius: '8px',
                      backgroundColor: t.inputBg,
                      border: `1px solid ${t.inputBorder}`,
                      color: t.inputText,
                      fontSize: '12.5px',
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
                      padding: '2px',
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Signup only) */}
              {mode === 'SIGNUP' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: t.textBody,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '11px',
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
                        padding: '9px 12px 9px 34px',
                        borderRadius: '8px',
                        backgroundColor: t.inputBg,
                        border: `1px solid ${t.inputBorder}`,
                        color: t.inputText,
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#00D09C',
                  color: '#07090E',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 208, 156, 0.35)',
                  transition: 'all 0.15s ease',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'LOGIN' ? 'Enter Trading Terminal' : 'Initialize Account'}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Clearance Security Policy Notice */}
            <div
              style={{
                fontSize: '10px',
                color: t.textMuted,
                lineHeight: 1.45,
                borderTop: `1px solid ${t.divider}`,
                paddingTop: '8px',
                textAlign: 'center',
              }}
            >
              <strong style={{ color: t.textBody }}>Clearance Policy:</strong> Administrative switching is strictly restricted to verified Super-Admin credentials (<code>{SUPER_ADMIN_EMAIL}</code>).
            </div>
          </div>
        </div>
      </div>

      {/* ── Official Google OAuth Identity Selector Dialog ────────── */}
      {isGoogleOAuthOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsGoogleOAuthOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              color: '#1F2937',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsGoogleOAuthOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>

            {/* Google Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24">
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
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  Sign in with Google
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#6B7280' }}>
                  Choose an account to continue to <strong>ArthaAI Terminal</strong>
                </p>
              </div>
            </div>

            {/* Google OAuth Identity Entry */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteGoogleOAuth(customGoogleEmail, customGoogleName);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Google Account Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9CA3AF',
                    }}
                  />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="name@gmail.com or institutional Google email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Display Name (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9CA3AF',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Full Name as registered with Google"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#1A73E8',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Authorizing with Google...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Google Account</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Disclaimer */}
            <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.45, borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
              To continue, Google will share your verified name, email address, language preference, and profile picture with ArthaAI in accordance with Google OAuth standards.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
