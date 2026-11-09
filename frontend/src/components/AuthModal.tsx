import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Maximize2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../api/client';
import { setActiveAuthUser } from '../utils/telemetryReporter';
import { useTheme } from '../utils/useTheme';
import type { AuthUser } from '../api/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
  onOpenFullPage?: () => void;
}

const SUPER_ADMIN_EMAIL = 'hitesh.sunkari.23cse@bmu.edu.in';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onOpenFullPage,
}) => {
  const { isDark } = useTheme();
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const palette = isDark
    ? {
        backdrop: 'rgba(0, 0, 0, 0.85)',
        cardBg: '#111520',
        cardBorder: 'rgba(0, 208, 156, 0.25)',
        cardShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 208, 156, 0.12)',
        headerBg: '#111520',
        headerGrad: 'linear-gradient(135deg, rgba(0, 208, 156, 0.12) 0%, transparent 100%)',
        headerBorder: 'rgba(255, 255, 255, 0.08)',
        headerTitle: '#FFFFFF',
        headerSubtitle: '#94A3B8',
        fullPageBtnBg: 'rgba(255, 255, 255, 0.06)',
        fullPageBtnBorder: 'rgba(255, 255, 255, 0.12)',
        fullPageBtnText: '#94A3B8',
        closeBtnText: '#94A3B8',
        tabBarBg: 'rgba(255, 255, 255, 0.05)',
        tabBarBorder: 'rgba(255, 255, 255, 0.08)',
        tabBarInactiveText: '#94A3B8',
        googleBtnBg: '#FFFFFF',
        googleBtnBorder: 'transparent',
        googleBtnText: '#1E293B',
        googleBtnShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        superAdminBg: 'rgba(0, 208, 156, 0.08)',
        superAdminBorder: 'rgba(0, 208, 156, 0.3)',
        superAdminEmail: '#CBD5E1',
        dividerLine: 'rgba(255, 255, 255, 0.08)',
        dividerText: '#64748B',
        labelColor: '#94A3B8',
        inputBg: 'rgba(255, 255, 255, 0.04)',
        inputBorder: 'rgba(255, 255, 255, 0.12)',
        inputText: '#FFFFFF',
        policyBg: 'rgba(255, 255, 255, 0.03)',
        policyBorder: 'rgba(255, 255, 255, 0.06)',
        policyText: '#64748B',
        policyStrong: '#94A3B8',
      }
    : {
        backdrop: 'rgba(15, 23, 42, 0.45)',
        cardBg: '#FFFFFF',
        cardBorder: 'rgba(0, 208, 156, 0.35)',
        cardShadow: '0 24px 64px rgba(15, 23, 42, 0.16), 0 0 36px rgba(0, 208, 156, 0.1)',
        headerBg: '#FFFFFF',
        headerGrad: 'linear-gradient(135deg, rgba(0, 208, 156, 0.1) 0%, transparent 100%)',
        headerBorder: '#E2E8F0',
        headerTitle: '#0F172A',
        headerSubtitle: '#64748B',
        fullPageBtnBg: '#F1F5F9',
        fullPageBtnBorder: '#CBD5E1',
        fullPageBtnText: '#475569',
        closeBtnText: '#64748B',
        tabBarBg: '#F1F5F9',
        tabBarBorder: '#E2E8F0',
        tabBarInactiveText: '#64748B',
        googleBtnBg: '#FFFFFF',
        googleBtnBorder: '#CBD5E1',
        googleBtnText: '#0F172A',
        googleBtnShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
        superAdminBg: 'rgba(0, 208, 156, 0.08)',
        superAdminBorder: 'rgba(0, 208, 156, 0.45)',
        superAdminEmail: '#0F172A',
        dividerLine: '#E2E8F0',
        dividerText: '#94A3B8',
        labelColor: '#475569',
        inputBg: '#F8FAFC',
        inputBorder: '#CBD5E1',
        inputText: '#0F172A',
        policyBg: '#F8FAFC',
        policyBorder: '#E2E8F0',
        policyText: '#64748B',
        policyStrong: '#334155',
      };

  const handleGoogleSignIn = async (overrideEmail?: string, overrideName?: string) => {
    setLoading(true);
    setError(null);
    const targetEmail = overrideEmail || email.trim() || SUPER_ADMIN_EMAIL;
    const targetName = overrideName || (targetEmail.includes('hitesh') ? 'Hitesh Sunkari' : 'Institutional Investor');

    try {
      const authUser = await api.loginWithGoogle(targetEmail, targetName);
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Super-Admin clearance verified! Switching privileges unlocked.'
          : 'Signed in successfully via Google.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const authUser = await api.loginWithEmail(email.trim(), password, name.trim());
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Welcome, Super-Administrator. Switching privileges active.'
          : 'Signed in successfully.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: palette.backdrop,
        backdropFilter: 'blur(12px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        transition: 'background-color 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          margin: 'auto',
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'min(92vh, 760px)',
          overflowY: 'auto',
          backgroundColor: palette.cardBg,
          borderRadius: '18px',
          border: `1px solid ${palette.cardBorder}`,
          boxShadow: palette.cardShadow,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'all 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Sticky so title and close button are permanently visible) */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: '18px 24px',
            borderBottom: `1px solid ${palette.headerBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: palette.headerBg,
            backgroundImage: palette.headerGrad,
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 208, 156, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00D09C',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: palette.headerTitle }}>
                ArthaAI Institutional Access
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: palette.headerSubtitle }}>
                Multi-Agent Quantitative Terminal
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenFullPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullPage();
                }}
                title="Open Dedicated Full Page"
                style={{
                  background: palette.fullPageBtnBg,
                  border: `1px solid ${palette.fullPageBtnBorder}`,
                  color: palette.fullPageBtnText,
                  cursor: 'pointer',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                <Maximize2 size={12} />
                <span>Full Page</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: palette.closeBtnText,
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Segmented Mode Switcher */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              padding: '3px',
              borderRadius: '8px',
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
                padding: '7px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: mode === 'LOGIN' ? '#00D09C' : 'transparent',
                color: mode === 'LOGIN' ? '#070A0F' : palette.tabBarInactiveText,
                fontSize: '12px',
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
                padding: '7px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: mode === 'SIGNUP' ? '#00D09C' : 'transparent',
                color: mode === 'SIGNUP' ? '#070A0F' : palette.tabBarInactiveText,
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Register Account
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
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
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
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
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google One-Click SSO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleGoogleSignIn()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                backgroundColor: palette.googleBtnBg,
                border: `1px solid ${palette.googleBtnBorder}`,
                color: palette.googleBtnText,
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: palette.googleBtnShadow,
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Quick Super-Admin Instant Google Auth Pill */}
            <div
              onClick={() => handleGoogleSignIn(SUPER_ADMIN_EMAIL, 'Hitesh Sunkari')}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                backgroundColor: palette.superAdminBg,
                border: `1px dashed ${palette.superAdminBorder}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={13} color="#00D09C" />
                <span style={{ fontSize: '11px', color: '#00D09C', fontWeight: 600 }}>
                  Super-Admin Access:
                </span>
                <span style={{ fontSize: '10.5px', color: palette.superAdminEmail, fontFamily: 'monospace' }}>
                  {SUPER_ADMIN_EMAIL}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#00D09C', fontWeight: 700 }}>Quick Login ⚡</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: palette.dividerLine }} />
            <span style={{ fontSize: '10px', color: palette.dividerText, textTransform: 'uppercase' }}>
              or email
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: palette.dividerLine }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mode === 'SIGNUP' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: palette.labelColor, marginBottom: '4px', fontWeight: 600 }}>
                  FULL NAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: palette.dividerText }} />
                  <input
                    type="text"
                    placeholder="Institutional Trader Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 32px',
                      borderRadius: '8px',
                      backgroundColor: palette.inputBg,
                      border: `1px solid ${palette.inputBorder}`,
                      color: palette.inputText,
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: palette.labelColor, marginBottom: '4px', fontWeight: 600 }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: palette.dividerText }} />
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 32px',
                    borderRadius: '8px',
                    backgroundColor: palette.inputBg,
                    border: `1px solid ${palette.inputBorder}`,
                    color: palette.inputText,
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: palette.labelColor, marginBottom: '4px', fontWeight: 600 }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: palette.dividerText }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 32px 9px 32px',
                    borderRadius: '8px',
                    backgroundColor: palette.inputBg,
                    border: `1px solid ${palette.inputBorder}`,
                    color: palette.inputText,
                    fontSize: '12px',
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
                    color: palette.dividerText,
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                backgroundColor: '#00D09C',
                border: 'none',
                color: '#070A0F',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 208, 156, 0.35)',
              }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : mode === 'LOGIN' ? (
                <span>Sign In to Terminal</span>
              ) : (
                <span>Create Institutional Account</span>
              )}
            </button>
          </form>

          {/* Super Admin Notice */}
          <div
            style={{
              padding: '9px 12px',
              borderRadius: '8px',
              backgroundColor: palette.policyBg,
              border: `1px solid ${palette.policyBorder}`,
              fontSize: '11px',
              color: palette.policyText,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: palette.policyStrong }}>Super-Admin Access Policy:</strong> Switching between User and Admin Dashboards is strictly protected and verified for <code>{SUPER_ADMIN_EMAIL}</code>.
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
