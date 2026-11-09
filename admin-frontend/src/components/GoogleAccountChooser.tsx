import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, ArrowRight, ShieldCheck, Mail, User, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

export interface GoogleAccountItem {
  email: string;
  name: string;
  role?: string;
  is_super_admin?: boolean;
  picture?: string;
}

const DEFAULT_ACCOUNTS: GoogleAccountItem[] = [
  {
    email: 'hitesh.sunkari.23cse@bmu.edu.in',
    name: 'Hitesh Sunkari',
    role: 'SUPER_ADMIN',
    is_super_admin: true,
  },
  {
    email: 'trader@institution.in',
    name: 'Institutional Trader',
    role: 'USER',
    is_super_admin: false,
  },
];

const STORAGE_SAVED_ACCOUNTS_KEY = 'arthai_saved_google_accounts';

export interface GoogleAccountChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name?: string) => Promise<void> | void;
  mode?: 'LOGIN' | 'SIGNUP';
  loading?: boolean;
}

export const GoogleAccountChooser: React.FC<GoogleAccountChooserProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  mode = 'LOGIN',
  loading = false,
}) => {
  const [accounts, setAccounts] = useState<GoogleAccountItem[]>(DEFAULT_ACCOUNTS);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowCustomInput(false);
      setSelectedEmail(null);
      return;
    }

    const loadAccounts = async () => {
      setFetchLoading(true);
      try {
        // 1. Fetch registered accounts from backend
        const serverAccounts = await api.getGoogleAccounts();
        
        // 2. Read locally remembered accounts
        let localAccounts: GoogleAccountItem[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_SAVED_ACCOUNTS_KEY);
          if (raw) localAccounts = JSON.parse(raw);
        } catch {}

        // Merge all unique accounts by email
        const map = new Map<string, GoogleAccountItem>();
        DEFAULT_ACCOUNTS.forEach((a) => map.set(a.email.toLowerCase(), a));
        if (Array.isArray(serverAccounts)) {
          serverAccounts.forEach((a) => {
            map.set(a.email.toLowerCase(), {
              email: a.email,
              name: a.name || a.email.split('@')[0],
              role: a.role,
              is_super_admin: a.is_super_admin,
            });
          });
        }
        if (Array.isArray(localAccounts)) {
          localAccounts.forEach((a) => {
            if (a.email && !map.has(a.email.toLowerCase())) {
              map.set(a.email.toLowerCase(), a);
            }
          });
        }

        const merged = Array.from(map.values());
        // Always place Super-Admin first
        merged.sort((a, b) => (b.is_super_admin ? 1 : 0) - (a.is_super_admin ? 1 : 0));
        setAccounts(merged);
      } catch (e) {
        // Fallback to default accounts
        setAccounts(DEFAULT_ACCOUNTS);
      } finally {
        setFetchLoading(false);
      }
    };

    loadAccounts();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChoose = async (item: GoogleAccountItem) => {
    setSelectedEmail(item.email);
    // Save to local recently selected
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_ACCOUNTS_KEY);
      const existing: GoogleAccountItem[] = raw ? JSON.parse(raw) : [];
      const updated = [item, ...existing.filter((x) => x.email.toLowerCase() !== item.email.toLowerCase())].slice(0, 5);
      localStorage.setItem(STORAGE_SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch {}

    await onSelectAccount(item.email, item.name);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    const cleanName = customName.trim() || cleanEmail.split('@')[0];
    const newItem: GoogleAccountItem = {
      email: cleanEmail,
      name: cleanName,
      is_super_admin: cleanEmail.toLowerCase() === 'hitesh.sunkari.23cse@bmu.edu.in',
    };

    await handleChoose(newItem);
  };

  const getInitials = (name: string, email: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (item: GoogleAccountItem) => {
    if (item.is_super_admin) return 'linear-gradient(135deg, #00D09C 0%, #009E77 100%)';
    const firstChar = (item.email[0] || 'a').toLowerCase();
    if (firstChar < 'g') return 'linear-gradient(135deg, #4285F4 0%, #2B66C5 100%)';
    if (firstChar < 'n') return 'linear-gradient(135deg, #EA4335 0%, #B3261E 100%)';
    if (firstChar < 'u') return 'linear-gradient(135deg, #FBBC05 0%, #D48806 100%)';
    return 'linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)';
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '448px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28), 0 0 1px rgba(0, 0, 0, 0.15)',
          padding: '32px 32px 28px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Google Sans", Helvetica, Arial, sans-serif',
          color: '#1F2937',
          boxSizing: 'border-box',
          border: '1px solid #E5E7EB',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={20} />
        </button>

        {/* Google Branding Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
          {/* Authentic Google Multi-Color Monogram */}
          <svg width="40" height="40" viewBox="0 0 24 24" style={{ marginBottom: '14px' }}>
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

          <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#1F2937', margin: 0, letterSpacing: '-0.01em' }}>
            Choose an account
          </h2>
          <p style={{ fontSize: '14px', color: '#5F6368', margin: '6px 0 0', fontWeight: 400 }}>
            to continue to <strong style={{ color: '#1F2937', fontWeight: 600 }}>ArthaAI Terminal</strong>
          </p>
        </div>

        {/* Account List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', maxHeight: '320px', overflowY: 'auto' }}>
          {accounts.map((item) => {
            const isCurrentlySelected = loading && selectedEmail === item.email;
            return (
              <div
                key={item.email}
                onClick={() => !loading && handleChoose(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 12px',
                  borderRadius: '10px',
                  cursor: loading ? 'wait' : 'pointer',
                  backgroundColor: isCurrentlySelected ? '#F0FDF4' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  border: isCurrentlySelected ? '1px solid #86EFAC' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!loading && !isCurrentlySelected) {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrentlySelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {/* Circular Avatar */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: getAvatarGradient(item),
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                    boxShadow: item.is_super_admin ? '0 2px 8px rgba(0, 208, 156, 0.4)' : 'none',
                  }}
                >
                  {getInitials(item.name, item.email)}
                </div>

                {/* Account Details */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                      {item.name}
                    </span>
                    {item.is_super_admin && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          backgroundColor: 'rgba(0, 208, 156, 0.15)',
                          color: '#059669',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(0, 208, 156, 0.4)',
                        }}
                      >
                        SUPER ADMIN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#5F6368', marginTop: '2px', wordBreak: 'break-all' }}>
                    {item.email}
                  </div>
                </div>

                {/* Status Indicator */}
                {isCurrentlySelected ? (
                  <RefreshCw size={18} className="animate-spin" color="#059669" />
                ) : (
                  <ArrowRight size={16} color="#9CA3AF" />
                )}
              </div>
            );
          })}

          {/* "Use another account" Row */}
          {!showCustomInput && (
            <div
              onClick={() => setShowCustomInput(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UserPlus size={18} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937', textAlign: 'left' }}>
                Use another account
              </span>
            </div>
          )}
        </div>

        {/* Custom Account Inline Entry */}
        {showCustomInput && (
          <form
            onSubmit={handleCustomSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '16px 0 6px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="#9CA3AF"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                autoFocus
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="Enter Google / Gmail address"
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

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={loading || !customEmail.trim()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#1A73E8',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {loading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <>
                    <span>Continue with this account</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowCustomInput(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Google Security & Privacy Disclaimer */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#5F6368', lineHeight: 1.4, margin: 0 }}>
            To continue, Google will verify your identity and share your profile clearance with{' '}
            <strong style={{ color: '#374151' }}>ArthaAI Quantitative Terminal</strong>.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GoogleAccountChooser;
