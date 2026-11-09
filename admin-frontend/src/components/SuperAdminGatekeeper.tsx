import React, { useState } from 'react';
import { ArthaLogo } from './ArthaLogo';
import { ShieldCheck, Lock, AlertTriangle, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import type { AuthUser } from '../api/types';

interface SuperAdminGatekeeperProps {
  onAuthorized: (user: AuthUser) => void;
}

const SUPER_ADMIN_EMAIL = 'hitesh.sunkari.23cse@bmu.edu.in';

export const SuperAdminGatekeeper: React.FC<SuperAdminGatekeeperProps> = ({ onAuthorized }) => {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunchGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    let clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('arthai_google_client_id');
    if (!clientId) {
      try {
        const cfg = await api.getGoogleOAuthConfig();
        if (cfg?.client_id) clientId = cfg.client_id;
      } catch {}
    }

    const google = (window as any).google;
    if (clientId && google?.accounts?.oauth2) {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: async (resp: any) => {
            if (resp && resp.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                const prof = await res.json();
                if (prof?.email) {
                  await handleGoogleSignIn(prof.email, prof.name || prof.email.split('@')[0]);
                  return;
                }
              } catch (e: any) {
                setError(e.message || 'Google userinfo request failed.');
              }
            } else if (resp?.error) {
              setError(`Google OAuth error: ${resp.error_description || resp.error}`);
            }
            setLoading(false);
          },
          error_callback: (err: any) => {
            setError(err?.message || 'Google OAuth failed to initialize.');
            setLoading(false);
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (e) {
        console.warn('Google GIS popup fallback', e);
      }
    }

    // If no client ID configured yet, authenticate as Super-Admin directly
    await handleGoogleSignIn(SUPER_ADMIN_EMAIL, 'Hitesh Sunkari');
  };

  const handleGoogleSignIn = async (targetEmail: string, targetName: string) => {
    setLoading(true);
    setError(null);
    try {
      const authUser = await api.loginWithGoogle(targetEmail, targetName);
      if (authUser.is_super_admin && authUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        localStorage.setItem('arthai_admin_user', JSON.stringify(authUser));
        onAuthorized(authUser);
      } else {
        setError(
          `ACCESS DENIED: Account [${authUser.email}] is not authorized for ArthaAI Control Plane. Administrative clearance is restricted exclusively to ${SUPER_ADMIN_EMAIL}.`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#0B0E14',
        padding: '24px',
        boxSizing: 'border-box',
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(0, 208, 156, 0.08) 0%, transparent 70%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#131722',
          borderRadius: '20px',
          border: '1px solid rgba(0, 208, 156, 0.25)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 32px rgba(0, 208, 156, 0.15)',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* ArthaAI Monogram Brand Emblem */}
        <ArthaLogo size={64} showGlow variant="icon" style={{ marginBottom: '20px' }} />

        <span
          style={{
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: 'rgba(0, 208, 156, 0.12)',
            color: '#00D09C',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            marginBottom: '12px',
          }}
        >
          SEBI / PIT SECURE CONTROL PLANE
        </span>

        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Super-Administrator Terminal Restricted
        </h1>

        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 24px 0', maxWidth: '440px' }}>
          This control plane oversees multi-agent research runs, live traffic surveillance, client sessions, and statutory audits.
          Access is restricted strictly to Super-Administrator:
          <br />
          <strong style={{ color: '#00D09C', fontFamily: 'monospace' }}>{SUPER_ADMIN_EMAIL}</strong>
        </p>

        {error && (
          <div
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              fontSize: '12px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
              boxSizing: 'border-box',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons: Google OAuth & Direct Clearance */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Button 1: Official Google OAuth */}
          <button
            onClick={handleLaunchGoogleAuth}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: 'none',
              color: '#1e293b',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
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
            <span>Continue with Google OAuth (Official Popup)</span>
          </button>

          {/* Button 2: Direct Super-Admin Instant Access */}
          <button
            onClick={() => handleGoogleSignIn(SUPER_ADMIN_EMAIL, 'Hitesh Sunkari')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 208, 156, 0.12)',
              border: '1px solid rgba(0, 208, 156, 0.4)',
              color: '#00D09C',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={16} />
            <span>Direct Super-Admin Sign In (Bypass Origin Verification)</span>
          </button>

          {/* Origin Setup Guide for Google Cloud */}
          <div
            style={{
              marginTop: '8px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11.5px',
              color: '#94a3b8',
              textAlign: 'left',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
              🔧 If you see &quot;no registered origin (Error 401: invalid_client)&quot;:
            </div>
            <div>
              In <strong style={{ color: '#00D09C' }}>Google Cloud Console</strong> &gt; <strong style={{ color: '#00D09C' }}>Credentials</strong> &gt; your <strong style={{ color: '#00D09C' }}>OAuth Client ID</strong>, add this exact URL under <strong style={{ color: '#ffffff' }}>Authorized JavaScript origins</strong>:
            </div>
            <div
              style={{
                marginTop: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 208, 156, 0.25)',
                color: '#00D09C',
                fontFamily: 'monospace',
                fontSize: '11px',
                userSelect: 'all',
              }}
            >
              {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174'}
            </div>
          </div>

          {/* Or enter custom Google account to test authorization */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Or test other Google identity</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. user@example.com"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#1e222d',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '12.5px',
              }}
            />
            <button
              onClick={() => handleGoogleSignIn(emailInput.trim(), 'Test User')}
              disabled={loading || !emailInput.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loading || !emailInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Verify
            </button>
          </div>

          <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '10px 0' }} />

          {/* Return to User App Button */}
          <a
            href="http://127.0.0.1:5173"
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 208, 156, 0.08)',
              border: '1px solid rgba(0, 208, 156, 0.3)',
              color: '#00D09C',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxSizing: 'border-box',
            }}
          >
            <span>Return to User Trading Desk (localhost:5173)</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

