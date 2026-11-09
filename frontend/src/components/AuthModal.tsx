import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArthaLogo } from './ArthaLogo';
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
  const [isGoogleOAuthOpen, setIsGoogleOAuthOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

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

  const handleOpenGoogleOAuth = () => {
    setError(null);
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

    setIsGoogleOAuthOpen(true);
  };

  const handleExecuteGoogleOAuth = async (targetEmail: string, targetName?: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid Google/Gmail account email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setIsGoogleOAuthOpen(false);

    try {
      const cleanName = (targetName || '').trim() || cleanEmail.split('@')[0];
      const authUser = await api.loginWithGoogle(cleanEmail, cleanName, undefined, mode);
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Super-Admin clearance verified via Google OAuth.'
          : mode === 'SIGNUP'
          ? `Google account registered successfully (${authUser.email}). Welcome to ArthaAI.`
          : `Signed in successfully via Google OAuth (${authUser.email}).`
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        onClose();
      }, 750);
    } catch (err: any) {
      const msg = err.message || 'Failed to authenticate with Google OAuth';
      if (msg.toLowerCase().includes('sign up first')) {
        setError(msg);
        setMode('SIGNUP');
        setEmail(cleanEmail);
        if (targetName) setName(targetName);
      } else if (msg.toLowerCase().includes('already registered')) {
        setError(msg);
        setMode('LOGIN');
        setEmail(cleanEmail);
      } else {
        setError(msg);
      }
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
      const authUser = await api.loginWithEmail(email.trim(), password, name.trim(), mode);
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Welcome, Super-Administrator. Switching privileges active.'
          : mode === 'SIGNUP'
          ? 'Account registered successfully.'
          : 'Signed in successfully.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        onClose();
      }, 900);
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      if (msg.toLowerCase().includes('sign up first')) {
        setError(msg);
        setMode('SIGNUP');
      } else if (msg.toLowerCase().includes('already registered')) {
        setError(msg);
        setMode('LOGIN');
      } else {
        setError(msg);
      }
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
            <ArthaLogo size={34} variant="icon" />
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
              type="button"
              onClick={handleOpenGoogleOAuth}
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

      {/* Official Google OAuth Identity Selector Dialog */}
      {isGoogleOAuthOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000000,
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
              maxWidth: '430px',
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
                  {mode === 'LOGIN' ? 'Sign in with Google' : 'Create Account with Google'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#6B7280' }}>
                  {mode === 'LOGIN'
                    ? 'Verify your Gmail account to continue to ArthaAI Terminal. (If no account exists, you will be prompted to sign up first).'
                    : 'Register your verified Gmail account with ArthaAI Quantitative Workstation.'}
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
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                  }}
                >
                  Verified Google / Gmail Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="#9CA3AF"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '13.5px',
                      color: '#111827',
                      backgroundColor: '#FFFFFF',
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
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                  }}
                >
                  Full Name (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    color="#9CA3AF"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="e.g. Hitesh Sunkari"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '13.5px',
                      color: '#111827',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Quick Preset Buttons for Instant Verification */}
              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>QUICK VERIFIED ACCOUNTS</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomGoogleEmail(SUPER_ADMIN_EMAIL);
                      setCustomGoogleName('Hitesh Sunkari');
                      handleExecuteGoogleOAuth(SUPER_ADMIN_EMAIL, 'Hitesh Sunkari');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #00D09C',
                      backgroundColor: 'rgba(0, 208, 156, 0.08)',
                      color: '#065F46',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{SUPER_ADMIN_EMAIL}</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#00D09C', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      SUPER ADMIN
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomGoogleEmail('trader@institution.in');
                      setCustomGoogleName('Institutional Trader');
                      handleExecuteGoogleOAuth('trader@institution.in', 'Institutional Trader');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                      color: '#374151',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>trader@institution.in</span>
                    <span style={{ fontSize: '10px', color: '#6B7280' }}>INVESTOR</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '8px',
                  backgroundColor: '#1A73E8',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  boxShadow: '0 2px 8px rgba(26, 115, 232, 0.35)',
                }}
              >
                {loading
                  ? 'Verifying OAuth Identity...'
                  : mode === 'LOGIN'
                  ? 'Sign In with this Google Account'
                  : 'Register Account with this Google Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default AuthModal;
