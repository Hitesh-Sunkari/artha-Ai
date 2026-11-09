import React, { useState } from 'react';
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
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Cpu,
  Layers,
  RefreshCw,
  Sun,
  Moon,
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

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthSuccess,
  onBack,
  initialMode = 'LOGIN',
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
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

  // Dynamic Theme Palette Map
  const palette = isDark
    ? {
        bgCanvas: '#070A0F',
        bgGradient: `
          radial-gradient(circle at 15% 20%, rgba(0, 208, 156, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 85% 75%, rgba(6, 182, 212, 0.08) 0%, transparent 40%),
          linear-gradient(180deg, #070A0F 0%, #0B0E17 100%)
        `,
        navBg: 'rgba(7, 10, 15, 0.78)',
        navBorder: 'rgba(255, 255, 255, 0.08)',
        navBtnBg: 'rgba(255, 255, 255, 0.05)',
        navBtnBorder: 'rgba(255, 255, 255, 0.1)',
        navBtnText: '#94A3B8',
        cardBg: 'rgba(16, 21, 30, 0.92)',
        cardBorder: 'rgba(0, 208, 156, 0.25)',
        cardShadow: '0 30px 80px rgba(0, 0, 0, 0.8), 0 0 50px rgba(0, 208, 156, 0.12)',
        heroTitleGrad: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
        textPrimary: '#FFFFFF',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        heroPillarBg: 'rgba(19, 24, 34, 0.65)',
        heroPillarBorder: 'rgba(255, 255, 255, 0.08)',
        telemetryBg: 'rgba(255, 255, 255, 0.03)',
        telemetryBorder: 'rgba(255, 255, 255, 0.06)',
        telemetryDivider: 'rgba(255, 255, 255, 0.1)',
        tabBarBg: 'rgba(255, 255, 255, 0.05)',
        tabBarBorder: 'rgba(255, 255, 255, 0.08)',
        googleBtnBg: '#FFFFFF',
        googleBtnBorder: 'transparent',
        googleBtnText: '#1E293B',
        googleBtnHover: '#F1F5F9',
        googleBtnShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        superAdminBg: 'rgba(0, 208, 156, 0.08)',
        superAdminBorder: 'rgba(0, 208, 156, 0.35)',
        superAdminEmail: '#E2E8F0',
        dividerLine: 'rgba(255, 255, 255, 0.08)',
        inputBg: 'rgba(255, 255, 255, 0.04)',
        inputBorder: 'rgba(255, 255, 255, 0.12)',
        inputText: '#FFFFFF',
        chipDefaultBg: 'rgba(255, 255, 255, 0.02)',
        chipDefaultBorder: 'rgba(255, 255, 255, 0.1)',
        chipDefaultText: '#94A3B8',
        cardFooterBorder: 'rgba(255, 255, 255, 0.06)',
      }
    : {
        bgCanvas: '#F8FAFC',
        bgGradient: `
          radial-gradient(circle at 15% 20%, rgba(0, 208, 156, 0.12) 0%, transparent 45%),
          radial-gradient(circle at 85% 75%, rgba(6, 182, 212, 0.09) 0%, transparent 45%),
          linear-gradient(180deg, #F8FAFC 0%, #EDF2F7 100%)
        `,
        navBg: 'rgba(255, 255, 255, 0.88)',
        navBorder: '#E2E8F0',
        navBtnBg: '#FFFFFF',
        navBtnBorder: '#CBD5E1',
        navBtnText: '#475569',
        cardBg: '#FFFFFF',
        cardBorder: 'rgba(0, 208, 156, 0.35)',
        cardShadow: '0 20px 50px rgba(15, 23, 42, 0.09), 0 0 35px rgba(0, 208, 156, 0.09)',
        heroTitleGrad: 'linear-gradient(180deg, #0F172A 0%, #334155 100%)',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#64748B',
        heroPillarBg: '#FFFFFF',
        heroPillarBorder: '#E2E8F0',
        telemetryBg: '#FFFFFF',
        telemetryBorder: '#E2E8F0',
        telemetryDivider: '#E2E8F0',
        tabBarBg: '#F1F5F9',
        tabBarBorder: '#E2E8F0',
        googleBtnBg: '#FFFFFF',
        googleBtnBorder: '#CBD5E1',
        googleBtnText: '#0F172A',
        googleBtnHover: '#F8FAFC',
        googleBtnShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
        superAdminBg: 'rgba(0, 208, 156, 0.08)',
        superAdminBorder: 'rgba(0, 208, 156, 0.45)',
        superAdminEmail: '#0F172A',
        dividerLine: '#E2E8F0',
        inputBg: '#F8FAFC',
        inputBorder: '#CBD5E1',
        inputText: '#0F172A',
        chipDefaultBg: '#F8FAFC',
        chipDefaultBorder: '#CBD5E1',
        chipDefaultText: '#475569',
        cardFooterBorder: '#E2E8F0',
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
          ? 'Super-Admin clearance verified! Bi-directional switching unlocked.'
          : 'Authenticated successfully via Google.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        if (onBack) onBack();
      }, 1000);
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
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
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
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: palette.bgCanvas,
        backgroundImage: palette.bgGradient,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
        color: palette.textPrimary,
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* ── Top Ambient Navigation Bar ────────────────────────────── */}
      <nav
        style={{
          height: '64px',
          borderBottom: `1px solid ${palette.navBorder}`,
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(16px)',
          backgroundColor: palette.navBg,
          zIndex: 20,
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: palette.navBtnBg,
                border: `1px solid ${palette.navBtnBorder}`,
                color: palette.navBtnText,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Terminal</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00D09C 0%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '16px',
                color: '#070A0F',
                boxShadow: '0 0 16px rgba(0, 208, 156, 0.4)',
              }}
            >
              A
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: palette.textPrimary }}>
              Artha<span style={{ color: '#00D09C' }}>AI</span>
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(0, 208, 156, 0.12)',
                color: '#00D09C',
                fontWeight: 700,
                border: '1px solid rgba(0, 208, 156, 0.3)',
              }}
            >
              PROD GATEWAY
            </span>
          </div>
        </div>

        {/* Right Nav Utilities: Theme Toggle & Live Market Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Dynamic Theme Toggle Pill */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: palette.navBtnBg,
              border: `1px solid ${palette.navBtnBorder}`,
              color: palette.navBtnText,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isDark ? <Sun size={14} color="#FFB800" /> : <Moon size={14} color="#5367FF" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: palette.textMuted,
              fontFamily: 'monospace',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#00D09C',
                boxShadow: '0 0 8px #00D09C',
              }}
            />
            <span>NSE / BSE LIVE CLOCK: 16:15 IST</span>
          </div>
        </div>
      </nav>

      {/* ── Main Hero & Interactive Auth Split ────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 1.1fr) minmax(380px, 1fr)',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 32px',
          gap: '48px',
          alignItems: 'center',
          boxSizing: 'border-box',
          zIndex: 10,
        }}
      >
        {/* ── Left Hero Panel: Institutional Capabilities ────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(0, 208, 156, 0.1)',
                border: '1px solid rgba(0, 208, 156, 0.28)',
                color: '#00D09C',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              <Sparkles size={14} />
              <span>Multi-Agent Algorithmic Research Suite</span>
            </div>

            <h1
              style={{
                fontSize: '40px',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                margin: '0 0 16px 0',
                background: palette.heroTitleGrad,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Institutional Quantitative Intelligence for Indian Markets
            </h1>

            <p style={{ fontSize: '15px', color: palette.textSecondary, lineHeight: 1.6, margin: 0, maxWidth: '540px' }}>
              Autonomous 7-agent deliberative reasoning across NSE, BSE and MCX. Grounded in DuckDB SIMD Monte Carlo,
              Finance Act 2024 statutory taxation, and SEBI LODR regulatory enforcement.
            </p>
          </div>

          {/* 4 Architectural Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: palette.heroPillarBg,
                border: `1px solid ${palette.heroPillarBorder}`,
                boxShadow: isDark ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Cpu size={18} color="#00D09C" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary }}>7-Agent Fleet</span>
              </div>
              <p style={{ fontSize: '11px', color: palette.textSecondary, margin: 0, lineHeight: 1.4 }}>
                Google ADK + CrewAI connected via A2A JSON-RPC 2.0 with shared Blackboard consensus.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: palette.heroPillarBg,
                border: `1px solid ${palette.heroPillarBorder}`,
                boxShadow: isDark ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <TrendingUp size={18} color="#06B6D4" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary }}>FastMCP Tools</span>
              </div>
              <p style={{ fontSize: '11px', color: palette.textSecondary, margin: 0, lineHeight: 1.4 }}>
                21 registered financial tools with zero-copy DuckDB Parquet historical bar resolution.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: palette.heroPillarBg,
                border: `1px solid ${palette.heroPillarBorder}`,
                boxShadow: isDark ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ShieldCheck size={18} color="#F59E0B" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary }}>Statutory Tax Drag</span>
              </div>
              <p style={{ fontSize: '11px', color: palette.textSecondary, margin: 0, lineHeight: 1.4 }}>
                Exact Finance Act 2024 LTCG 12.5% above ₹1.25L and STT 2 bps delivery drag auditing.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: palette.heroPillarBg,
                border: `1px solid ${palette.heroPillarBorder}`,
                boxShadow: isDark ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Layers size={18} color="#A855F7" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary }}>Super-Admin Gate</span>
              </div>
              <p style={{ fontSize: '11px', color: palette.textSecondary, margin: 0, lineHeight: 1.4 }}>
                Seamless switching clearance between User Desk and Institutional Admin Console.
              </p>
            </div>
          </div>

          {/* Live Market Indicators Strip */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              backgroundColor: palette.telemetryBg,
              border: `1px solid ${palette.telemetryBorder}`,
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'monospace',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: palette.textMuted }}>NIFTY 50</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary }}>
                25,044.60 <span style={{ fontSize: '11px', color: '#00D09C' }}>+0.23%</span>
              </div>
            </div>
            <div style={{ height: '24px', width: '1px', backgroundColor: palette.telemetryDivider }} />
            <div>
              <div style={{ fontSize: '10px', color: palette.textMuted }}>SENSEX</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary }}>
                81,106.65 <span style={{ fontSize: '11px', color: '#00D09C' }}>+0.13%</span>
              </div>
            </div>
            <div style={{ height: '24px', width: '1px', backgroundColor: palette.telemetryDivider }} />
            <div>
              <div style={{ fontSize: '10px', color: palette.textMuted }}>INDIA VIX</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: palette.textPrimary }}>
                17.42 <span style={{ fontSize: '11px', color: '#EF4444' }}>-5.48%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Luxury Interactive Auth Card ──────────── */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: palette.cardBg,
              borderRadius: '20px',
              border: `1px solid ${palette.cardBorder}`,
              boxShadow: palette.cardShadow,
              backdropFilter: 'blur(20px)',
              padding: '32px 30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxSizing: 'border-box',
              transition: 'all 0.25s ease',
            }}
          >
            {/* Mode Switcher Segmented Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: '4px',
                borderRadius: '10px',
                backgroundColor: palette.tabBarBg,
                border: `1px solid ${palette.tabBarBorder}`,
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
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: mode === 'LOGIN' ? '#00D09C' : 'transparent',
                  color: mode === 'LOGIN' ? '#070A0F' : palette.textSecondary,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
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
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: mode === 'SIGNUP' ? '#00D09C' : 'transparent',
                  color: mode === 'SIGNUP' ? '#070A0F' : palette.textSecondary,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Create Account
              </button>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 208, 156, 0.12)',
                  border: '1px solid rgba(0, 208, 156, 0.3)',
                  color: '#00D09C',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
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
                  padding: '11px 18px',
                  borderRadius: '10px',
                  backgroundColor: palette.googleBtnBg,
                  color: palette.googleBtnText,
                  border: `1px solid ${palette.googleBtnBorder}`,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: palette.googleBtnShadow,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = palette.googleBtnHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = palette.googleBtnBg)}
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
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: palette.superAdminBg,
                  border: `1px dashed ${palette.superAdminBorder}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#00D09C" />
                  <span style={{ fontSize: '11px', color: '#00D09C', fontWeight: 600 }}>
                    Super-Admin Clearance:
                  </span>
                  <span style={{ fontSize: '11px', color: palette.superAdminEmail, fontFamily: 'monospace' }}>
                    {SUPER_ADMIN_EMAIL}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#00D09C', fontWeight: 700 }}>Auto-Fill ⚡</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: palette.dividerLine }} />
              <span style={{ fontSize: '11px', color: palette.textMuted, textTransform: 'uppercase' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: palette.dividerLine }} />
            </div>

            {/* ── Email / Password Form ───────────────────────────── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mode === 'SIGNUP' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: palette.textSecondary,
                      marginBottom: '6px',
                    }}
                  >
                    FULL NAME / INSTITUTION
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: palette.textMuted,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="e.g. Hitesh Sunkari"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: '8px',
                        backgroundColor: palette.inputBg,
                        border: `1px solid ${palette.inputBorder}`,
                        color: palette.inputText,
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
                    fontWeight: 600,
                    color: palette.textSecondary,
                    marginBottom: '6px',
                  }}
                >
                  INSTITUTIONAL EMAIL ADDRESS
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: palette.textMuted,
                    }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '8px',
                      backgroundColor: palette.inputBg,
                      border: `1px solid ${palette.inputBorder}`,
                      color: palette.inputText,
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
                    fontWeight: 600,
                    color: palette.textSecondary,
                    marginBottom: '6px',
                  }}
                >
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: palette.textMuted,
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
                      padding: '10px 36px 10px 36px',
                      borderRadius: '8px',
                      backgroundColor: palette.inputBg,
                      border: `1px solid ${palette.inputBorder}`,
                      color: palette.inputText,
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
                      color: palette.textMuted,
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
                      fontWeight: 600,
                      color: palette.textSecondary,
                      marginBottom: '6px',
                    }}
                  >
                    CONFIRM PASSWORD
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: palette.textMuted,
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
                        padding: '10px 12px 10px 36px',
                        borderRadius: '8px',
                        backgroundColor: palette.inputBg,
                        border: `1px solid ${palette.inputBorder}`,
                        color: palette.inputText,
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
                        fontWeight: 600,
                        color: palette.textSecondary,
                        marginBottom: '6px',
                      }}
                    >
                      PRIMARY RESEARCH OBJECTIVE
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
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: objective === item.id ? '#00D09C' : palette.chipDefaultBorder,
                            backgroundColor:
                              objective === item.id ? 'rgba(0, 208, 156, 0.15)' : palette.chipDefaultBg,
                            color: objective === item.id ? '#00D09C' : palette.chipDefaultText,
                            fontSize: '11px',
                            fontWeight: 600,
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
                        fontWeight: 600,
                        color: palette.textSecondary,
                        marginBottom: '6px',
                      }}
                    >
                      INITIAL PAPER DESK CAPITAL
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[100000, 500000, 1000000, 2500000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setStartingCapital(amt)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: startingCapital === amt ? '#00D09C' : palette.chipDefaultBorder,
                            backgroundColor:
                              startingCapital === amt ? 'rgba(0, 208, 156, 0.15)' : palette.chipDefaultBg,
                            color: startingCapital === amt ? '#00D09C' : palette.chipDefaultText,
                            fontSize: '11px',
                            fontWeight: 600,
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
                  marginTop: '8px',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#00D09C',
                  color: '#070A0F',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(0, 208, 156, 0.35)',
                  transition: 'all 0.15s ease',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'LOGIN' ? 'Sign In to Terminal' : 'Register Institutional Account'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Regulatory Footer Notice */}
            <div
              style={{
                fontSize: '11px',
                color: palette.textMuted,
                textAlign: 'center',
                lineHeight: 1.5,
                borderTop: `1px solid ${palette.cardFooterBorder}`,
                paddingTop: '14px',
              }}
            >
              Strictly non-custodial & non-trading. Point-in-time quantitative research verified under SEBI LODR 2015.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
