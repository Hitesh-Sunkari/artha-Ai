import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Wallet,
  Sun,
  Moon,
  RefreshCw,
  Bell,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import type { ReadinessResponse } from '../api/types';
import type { PrimaryWorkspace } from './Sidebar';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeWorkspace?: PrimaryWorkspace;
  onSelectWorkspace?: (ws: PrimaryWorkspace) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  activeWorkspace = 'command-center',
  onSelectWorkspace,
}) => {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [paperCash, setPaperCash] = useState<number>(1000000);

  useEffect(() => {
    // Check saved cash balance
    const saved = localStorage.getItem('arthai_paper_cash');
    if (saved) setPaperCash(parseFloat(saved));

    // Check saved theme
    const savedTheme = localStorage.getItem('arthai_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('arthai_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        const res = await api.getReadiness();
        setReadiness(res);
      } catch {
        setReadiness({
          ready: false,
          mcp_available: false,
          a2a_available: false,
          live_trading_blocked: true,
          timestamp: new Date().toISOString(),
        });
      }
    };

    checkReadiness();
    const interval = setInterval(checkReadiness, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'command-center' as PrimaryWorkspace, label: 'Explore' },
    { id: 'portfolio' as PrimaryWorkspace, label: 'Investments' },
    { id: 'research' as PrimaryWorkspace, label: 'Research & AI' },
    { id: 'operations' as PrimaryWorkspace, label: 'Terminal' },
  ];

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-chrome)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        zIndex: 20,
        position: 'sticky',
        top: 0,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: Groww Brand Logo & Product Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        {/* Logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => onSelectWorkspace && onSelectWorkspace('command-center')}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00D09C 0%, #009e75 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 208, 156, 0.4)',
              color: '#0F1217',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            <TrendingUp size={22} color="#0F1217" strokeWidth={2.6} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                Artha<span style={{ color: 'var(--groww-green)' }}>AI</span>
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--groww-green-light)',
                  color: 'var(--groww-green)',
                  border: '1px solid rgba(0, 208, 156, 0.3)',
                }}
              >
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Top Product Tabs (Groww Style) */}
        {onSelectWorkspace && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {navItems.map((item) => {
              const active = activeWorkspace === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectWorkspace(item.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '13px',
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? 'var(--groww-green-light)' : 'transparent',
                    color: active ? 'var(--groww-green)' : 'var(--text-secondary)',
                    border: active ? '1px solid rgba(0, 208, 156, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Center: Groww-Style Search Bar */}
      <div
        style={{
          flex: '0 1 420px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '14px',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="search"
          placeholder="What are you looking for today? (e.g. RELIANCE, TCS, NIFTY 50)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 70px 9px 38px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: '12px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card-hover)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            pointerEvents: 'none',
          }}
        >
          Ctrl K
        </span>
      </div>

      {/* Right: Groww Actions (Live Status, Wallet, Theme, Refresh, Profile) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Live Market Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--groww-green-light)',
            border: '1px solid rgba(0, 208, 156, 0.25)',
            color: 'var(--groww-green)',
            fontSize: '12px',
            fontWeight: 700,
          }}
          title="National Stock Exchange & BSE live data feed connected"
        >
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--groww-green)',
              boxShadow: '0 0 8px #00D09C',
            }}
            className="animate-pulse"
          />
          <span>NSE / BSE LIVE</span>
        </div>

        {/* Paper Wallet Balance Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Virtual Paper Trading Balance"
          onClick={() => onSelectWorkspace && onSelectWorkspace('portfolio')}
        >
          <Wallet size={15} color="var(--groww-green)" />
          <span>₹{paperCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Refresh Terminal Data"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* User Profile Avatar */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #181D27 0%, #2A3346 100%)',
            border: '2px solid rgba(0, 208, 156, 0.4)',
            color: 'var(--groww-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
          }}
          title="Terminal User Profile"
        >
          HS
        </div>
      </div>
    </header>
  );
};
