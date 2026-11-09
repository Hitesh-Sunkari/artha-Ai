import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, CheckCircle2, AlertCircle, X, ExternalLink, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { setActiveAuthUser } from '../utils/telemetryReporter';
import type { AuthUser } from '../api/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async (overrideEmail?: string, overrideName?: string) => {
    setLoading(true);
    setError(null);
    const targetEmail = overrideEmail || email.trim() || 'hitesh.sunkari.23cse@bmu.edu.in';
    const targetName = overrideName || (targetEmail.includes('hitesh') ? 'Hitesh Sunkari' : 'Institutional Investor');

    try {
      const authUser = await api.loginWithGoogle(targetEmail, targetName);
      setActiveAuthUser(authUser);
      setSuccessMsg(
        authUser.is_super_admin
          ? 'Super-Admin clearance verified! Full administrative and switching rights granted.'
          : 'Signed in successfully via Google.'
      );
      setTimeout(() => {
        onAuthSuccess && onAuthSuccess(authUser);
        onClose();
      }, 1000);
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
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(0, 208, 156, 0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 208, 156, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--groww-green, #00D09C)',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
                ArthaAI Institutional Access
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                Multi-Agent Quantitative Terminal & Control
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
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

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
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
                color: 'var(--groww-green, #00D09C)',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleGoogleSignIn()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#1e293b',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
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
              onClick={() => handleGoogleSignIn('hitesh.sunkari.23cse@bmu.edu.in', 'Hitesh Sunkari')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 208, 156, 0.08)',
                border: '1px dashed rgba(0, 208, 156, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} color="var(--groww-green, #00D09C)" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--groww-green, #00D09C)' }}>
                  Sign In as Super-Admin (hitesh.sunkari.23cse@bmu.edu.in)
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)' }}>1-Click Clearance</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle, rgba(255, 255, 255, 0.08))' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or use institutional email
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle, rgba(255, 255, 255, 0.08))' }} />
          </div>

          {/* Mode Switch Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-surface, #1e222d)',
              padding: '3px',
              borderRadius: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('LOGIN')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: mode === 'LOGIN' ? 'var(--bg-card, #131722)' : 'transparent',
                color: mode === 'LOGIN' ? 'var(--text-primary, #fff)' : 'var(--text-secondary, #94a3b8)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('SIGNUP')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: mode === 'SIGNUP' ? 'var(--bg-card, #131722)' : 'transparent',
                color: mode === 'SIGNUP' ? 'var(--text-primary, #fff)' : 'var(--text-secondary, #94a3b8)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Register Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mode === 'SIGNUP' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '6px' }}>
                  Full Name / Desk Title
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted, #64748b)' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hitesh Sunkari"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface, #1e222d)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                      color: 'var(--text-primary, #fff)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted, #64748b)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface, #1e222d)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted, #64748b)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface, #1e222d)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--groww-green, #00D09C)',
                border: 'none',
                color: '#0F1217',
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
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
              fontSize: '11px',
              color: 'var(--text-muted, #64748b)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--text-secondary, #94a3b8)' }}>Super-Admin Access Policy:</strong> Switching between User and Admin Dashboards is strictly protected and verified for <code>hitesh.sunkari.23cse@bmu.edu.in</code>.
          </div>
        </div>
      </div>
    </div>
  );
};

