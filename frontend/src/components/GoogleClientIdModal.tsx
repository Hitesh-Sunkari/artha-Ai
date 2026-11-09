import React, { useState } from 'react';
import { ShieldCheck, X, ExternalLink, KeyRound, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../utils/useTheme';
import { setStoredGoogleClientId } from '../utils/googleOAuth';

interface GoogleClientIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured: (clientId: string) => void;
}

export const GoogleClientIdModal: React.FC<GoogleClientIdModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
}) => {
  const { isDark } = useTheme();
  const [clientIdInput, setClientIdInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = clientIdInput.trim();
    if (!clean) {
      setInputError('Please enter a valid Google OAuth Client ID.');
      return;
    }
    if (!clean.includes('.googleusercontent.com') && !clean.includes('google')) {
      setInputError('Expected a Google OAuth Client ID ending in .apps.googleusercontent.com');
      return;
    }

    setStoredGoogleClientId(clean);
    onConfigured(clean);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: isDark ? '#111520' : '#FFFFFF',
          border: isDark ? '1px solid rgba(0, 208, 156, 0.3)' : '1px solid rgba(0, 208, 156, 0.4)',
          borderRadius: '16px',
          boxShadow: isDark
            ? '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(0, 208, 156, 0.12)'
            : '0 24px 64px rgba(15, 23, 42, 0.18)',
          padding: '28px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: isDark ? '#94A3B8' : '#64748B',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close dialog"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 208, 156, 0.12)',
              border: '1px solid rgba(0, 208, 156, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00D09C',
            }}
          >
            <KeyRound size={22} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: isDark ? '#FFFFFF' : '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Google OAuth 2.0 Client ID
            </h2>
            <div style={{ fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
              Official Google Identity Services (GIS) Web Integration
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: isDark ? '#CBD5E1' : '#334155',
            lineHeight: 1.55,
            margin: '0 0 16px 0',
          }}
        >
          To launch Google&apos;s authentic account chooser popup (<code style={{ color: '#00D09C' }}>accounts.google.com</code>), your Google Cloud OAuth 2.0 Web Client ID is required.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: isDark ? '#94A3B8' : '#64748B',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Google Cloud Client ID
            </label>
            <input
              type="text"
              value={clientIdInput}
              onChange={(e) => {
                setClientIdInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(8, 12, 19, 0.8)' : '#F8FAFC',
                border: inputError ? '1px solid #EF4444' : isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
                color: isDark ? '#FFFFFF' : '#0F172A',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
              autoFocus
            />
            {inputError && (
              <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px' }}>
                {inputError}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '10px',
              backgroundColor: '#00D09C',
              border: 'none',
              color: '#0F172A',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.15s ease',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Save & Launch Google Account Picker</span>
          </button>
        </form>

        <div
          style={{
            marginTop: '18px',
            paddingTop: '16px',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            fontSize: '12px',
            color: isDark ? '#94A3B8' : '#64748B',
            lineHeight: 1.5,
          }}
        >
          <div>
            <strong>Persistent Setting:</strong> You can also set <code style={{ color: '#00D09C' }}>VITE_GOOGLE_CLIENT_ID=your_client_id</code> directly in your root <code style={{ color: '#00D09C' }}>.env</code> file.
          </div>
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(0, 208, 156, 0.06)' : '#F0FDF4',
              border: isDark ? '1px solid rgba(0, 208, 156, 0.25)' : '1px solid #BBF7D0',
              fontSize: '11.5px',
              color: isDark ? '#CBD5E1' : '#166534',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>
              ⚠️ To prevent &quot;no registered origin (Error 401: invalid_client)&quot;:
            </div>
            <div>In Google Cloud Console &gt; OAuth Client ID, add these under <strong>Authorized JavaScript origins</strong>:</div>
            <div style={{ marginTop: '6px', fontFamily: 'monospace', color: isDark ? '#00D09C' : '#059669', fontWeight: 600, userSelect: 'all' }}>
              http://localhost:5173<br />
              http://127.0.0.1:5173<br />
              http://localhost:5174<br />
              http://127.0.0.1:5174
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

