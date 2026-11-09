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
        <ArthaLogo size={64} showGlow variant="badge" style={{ marginBottom: '20px' }} />

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

        {/* 1-Click Google Sign-in as Super-Admin */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => handleGoogleSignIn(SUPER_ADMIN_EMAIL, 'Hitesh Sunkari')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 20px',
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
            <span>Sign In with Google as Super-Admin (1-Click)</span>
          </button>

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

