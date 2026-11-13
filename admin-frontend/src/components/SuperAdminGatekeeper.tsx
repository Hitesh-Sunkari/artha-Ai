import React, { useState } from 'react';
import { ArthaLogo } from './ArthaLogo';
import { ShieldCheck, Lock, AlertTriangle, Key, ExternalLink, HelpCircle } from 'lucide-react';
import { api } from '../api/client';
import type { AuthUser } from '../api/types';

interface SuperAdminGatekeeperProps {
  onAuthorized: (user: AuthUser) => void;
}

const DEFAULT_GOOGLE_CLIENT_ID = '483107522680-m1trtj79rshru0cea0kq14jsgc1d9g35.apps.googleusercontent.com';

export const SuperAdminGatekeeper: React.FC<SuperAdminGatekeeperProps> = ({ onAuthorized }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [showKeyAuth, setShowKeyAuth] = useState(false);

  // Authenticate using Google OAuth 2.0 / Google Identity Services
  const handleLaunchGoogleAuth = async () => {
    setLoading(true);
    setError(null);

    let clientId =
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem('arthai_google_client_id') ||
      DEFAULT_GOOGLE_CLIENT_ID;

    if (!clientId || !clientId.trim()) {
      try {
        const cfg = await api.getGoogleOAuthConfig();
        if (cfg?.client_id) clientId = cfg.client_id;
      } catch {}
    }

    if (!clientId || !clientId.trim()) {
      setError(
        'Google OAuth 2.0 Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in Vercel and GOOGLE_CLIENT_ID in Render. Direct unauthenticated access is permanently disabled per SEBI cybersecurity standards.'
      );
      setLoading(false);
      return;
    }

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      setError('Google Identity Services SDK is not loaded. Please verify your internet connection.');
      setLoading(false);
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (resp: any) => {
          if (resp && resp.access_token) {
            try {
              // Transmit token to backend for server-side verification and Super-Admin allowlist check
              const authUser = await api.verifyGoogleIdToken(resp.access_token);
              if (authUser && authUser.is_super_admin) {
                localStorage.setItem('arthai_admin_token', authUser.token);
                localStorage.setItem('arthai_admin_user', JSON.stringify(authUser));
                onAuthorized(authUser);
                return;
              } else {
                setError(
                  `ACCESS FORBIDDEN (HTTP 403): Account [${authUser?.email || 'unknown'}] is not authorized for ArthaAI Control Plane. Clearance restricted exclusively to configured Super-Administrators.`
                );
              }
            } catch (err: any) {
              setError(err.message || 'Server-side Google token verification failed.');
            } finally {
              setLoading(false);
            }
          } else if (resp?.error) {
            setError(`Google OAuth error: ${resp.error_description || resp.error}`);
            setLoading(false);
          }
        },
        error_callback: (err: any) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174';
          setError(
            `Google OAuth initialization failed: Make sure '${origin}' is added to 'Authorized JavaScript origins' in your Google Cloud Console OAuth Credentials.`
          );
          setLoading(false);
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (e: any) {
      setError(`Failed to trigger Google OAuth popup: ${e?.message || e}`);
      setLoading(false);
    }
  };

  // Authenticate using Server Master Secret Key (for CI/CD automation & emergency access)
  const handleKeyAuth = async () => {
    if (!adminKeyInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Temporarily store token so api.getMe() sends it in Authorization: Bearer
      localStorage.setItem('arthai_admin_token', adminKeyInput.trim());
      const verifiedUser = await api.getMe();
      if (verifiedUser && verifiedUser.is_super_admin) {
        localStorage.setItem('arthai_admin_user', JSON.stringify(verifiedUser));
        onAuthorized(verifiedUser);
      } else {
        localStorage.removeItem('arthai_admin_token');
        setError('ACCESS FORBIDDEN (HTTP 403): Provided secret key does not grant Super-Administrator authorization.');
      }
    } catch (err: any) {
      localStorage.removeItem('arthai_admin_token');
      setError(err.message || 'AUTHENTICATION FAILED (HTTP 401): Invalid or unauthorized Admin Secret Key.');
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
        <ArthaLogo size={64} showGlow variant="icon" style={{ marginBottom: '20px' }} />

        <span
          style={{
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '9999px',
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
          Access is restricted strictly to authorized Institutional Super-Administrators.
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

        {/* Action Controls */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Button 1: Official Verified Google OAuth */}
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
            <span>{loading ? 'Verifying with Google Authority...' : 'Continue with Google OAuth (Official)'}</span>
          </button>

          {/* Collapsible Admin Secret Key Option */}
          <div style={{ marginTop: '4px' }}>
            <button
              onClick={() => setShowKeyAuth(!showKeyAuth)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                margin: '0 auto',
                padding: '4px 8px',
              }}
            >
              <Key size={12} />
              <span>{showKeyAuth ? 'Hide Secret Key Option' : 'Authenticate with Server Secret Key'}</span>
            </button>

            {showKeyAuth && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="Enter ARTHAAI_ADMIN_SECRET_KEY..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1e222d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={handleKeyAuth}
                  disabled={loading || !adminKeyInput.trim()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 208, 156, 0.15)',
                    border: '1px solid rgba(0, 208, 156, 0.35)',
                    color: '#00D09C',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: loading || !adminKeyInput.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Authorize
                </button>
              </div>
            )}
          </div>

          <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

          {/* Return to User Trading Desk */}
          <a
            href="/"
            style={{
              width: '100%',
              padding: '11px 18px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 208, 156, 0.06)',
              border: '1px solid rgba(0, 208, 156, 0.25)',
              color: '#00D09C',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxSizing: 'border-box',
            }}
          >
            <span>Return to User Trading Desk</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};
