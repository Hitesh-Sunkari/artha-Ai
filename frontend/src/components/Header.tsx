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
      {/* Left: Active Workspace Breadcrumb & Market Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {activeWorkspace === 'command-center' && 'Market Watchlist & Explore'}
              {activeWorkspace === 'portfolio' && 'Paper Trading Desk'}
              {activeWorkspace === 'research' && 'Research & AI Studio'}
              {activeWorkspace === 'operations' && 'Terminal & Multi-Agent Ops'}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--groww-green-light)',
                color: 'var(--groww-green)',
                border: '1px solid rgba(0, 208, 156, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--groww-green)',
                }}
                className="animate-pulse"
              />
              NSE / BSE LIVE
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '1px' }}>
            {activeWorkspace === 'command-center' && 'Real-time equity indices, live ticks & 5-year point-in-time verified data'}
            {activeWorkspace === 'portfolio' && 'Simulated execution engine with SLSQP mean-variance optimization'}
            {activeWorkspace === 'research' && 'Google ADK + CrewAI 7-specialist multi-agent research fleet'}
            {activeWorkspace === 'operations' && 'A2A Protocol, FastMCP diagnostics & system telemetry'}
          </div>
        </div>
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

      {/* Right: Groww Actions (Wallet, Theme, Refresh, Profile) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

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
