import React, { useEffect, useState, useRef } from 'react';
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
  Clock,
  ArrowRight,
  User,
  LogOut,
  ChevronDown,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react';
import { getActiveAuthUser, setActiveAuthUser, isUserSuperAdmin } from '../utils/telemetryReporter';
import { AuthModal } from './AuthModal';
import { api, getApiBaseUrl } from '../api/client';
import { sanitizeAndMigrateHoldings } from '../utils/holdingsMigration';
import type { ReadinessResponse, MarketSessionState, AuthUser } from '../api/types';
import type { PrimaryWorkspace, TabId } from './Sidebar';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeWorkspace?: PrimaryWorkspace;
  onSelectWorkspace?: (ws: TabId, targetId?: string) => void;
}

const UNIVERSE_STOCKS = [
  { symbol: 'RELIANCE.NS', ticker: 'RELIANCE', name: 'Reliance Industries Limited', sector: 'Energy & Infrastructure', price: 1159.10 },
  { symbol: 'TCS.NS', ticker: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology & IT', price: 2507.70 },
  { symbol: 'HDFCBANK.NS', ticker: 'HDFCBANK', name: 'HDFC Bank Limited', sector: 'Banking & Financials', price: 684.15 },
  { symbol: 'INFY.NS', ticker: 'INFY', name: 'Infosys Limited', sector: 'Technology & IT', price: 1162.30 },
  { symbol: 'ICICIBANK.NS', ticker: 'ICICIBANK', name: 'ICICI Bank Limited', sector: 'Banking & Financials', price: 1393.80 },
  { symbol: 'SBIN.NS', ticker: 'SBIN', name: 'State Bank of India', sector: 'Banking & Financials', price: 965.75 },
  { symbol: 'AXISBANK.NS', ticker: 'AXISBANK', name: 'Axis Bank Limited', sector: 'Banking & Financials', price: 1222.80 },
  { symbol: 'KOTAKBANK.NS', ticker: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking & Financials', price: 460.70 },
  { symbol: 'BAJFINANCE.NS', ticker: 'BAJFINANCE', name: 'Bajaj Finance Limited', sector: 'Banking & Financials', price: 940.40 },
  { symbol: 'WIPRO.NS', ticker: 'WIPRO', name: 'Wipro Limited', sector: 'Technology & IT', price: 193.47 },
  { symbol: 'HCLTECH.NS', ticker: 'HCLTECH', name: 'HCL Technologies', sector: 'Technology & IT', price: 1422.20 },
  { symbol: 'ITC.NS', ticker: 'ITC', name: 'ITC Limited', sector: 'Consumer & Retail', price: 264.10 },
  { symbol: 'HINDUNILVR.NS', ticker: 'HINDUNILVR', name: 'Hindustan Unilever Limited', sector: 'Consumer & Retail', price: 1851.30 },
  { symbol: 'TITAN.NS', ticker: 'TITAN', name: 'Titan Company Limited', sector: 'Consumer & Retail', price: 4436.40 },
  { symbol: 'TRENT.NS', ticker: 'TRENT', name: 'Trent Limited', sector: 'Consumer & Retail', price: 3023.30 },
  { symbol: 'ASIANPAINT.NS', ticker: 'ASIANPAINT', name: 'Asian Paints Limited', sector: 'Consumer & Retail', price: 2305.00 },
  { symbol: 'LT.NS', ticker: 'LT', name: 'Larsen & Toubro Limited', sector: 'Energy & Infrastructure', price: 3826.90 },
  { symbol: 'NTPC.NS', ticker: 'NTPC', name: 'NTPC Limited', sector: 'Energy & Infrastructure', price: 311.30 },
  { symbol: 'POWERGRID.NS', ticker: 'POWERGRID', name: 'Power Grid Corporation', sector: 'Energy & Infrastructure', price: 262.35 },
  { symbol: 'ONGC.NS', ticker: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Energy & Infrastructure', price: 225.34 },
  { symbol: 'ADANIPORTS.NS', ticker: 'ADANIPORTS', name: 'Adani Ports & SEZ', sector: 'Energy & Infrastructure', price: 1856.10 },
  { symbol: 'BEL.NS', ticker: 'BEL', name: 'Bharat Electronics Limited', sector: 'Energy & Infrastructure', price: 365.60 },
  { symbol: 'MARUTI.NS', ticker: 'MARUTI', name: 'Maruti Suzuki India', sector: 'Automotive & Metals', price: 11429.00 },
  { symbol: 'M&M.NS', ticker: 'M&M', name: 'Mahindra & Mahindra', sector: 'Automotive & Metals', price: 2884.60 },
  { symbol: 'TATAMOTORS.NS', ticker: 'TATAMOTORS', name: 'Tata Motors Limited', sector: 'Automotive & Metals', price: 659.80 },
  { symbol: 'TATASTEEL.NS', ticker: 'TATASTEEL', name: 'Tata Steel Limited', sector: 'Automotive & Metals', price: 167.83 },
  { symbol: 'JSWSTEEL.NS', ticker: 'JSWSTEEL', name: 'JSW Steel Limited', sector: 'Automotive & Metals', price: 1255.60 },
  { symbol: 'ULTRACEMCO.NS', ticker: 'ULTRACEMCO', name: 'UltraTech Cement Limited', sector: 'Energy & Infrastructure', price: 11092.00 },
  { symbol: 'SUNPHARMA.NS', ticker: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma & Healthcare', price: 1794.30 },
  { symbol: 'CIPLA.NS', ticker: 'CIPLA', name: 'Cipla Limited', sector: 'Pharma & Healthcare', price: 1370.40 },
  { symbol: 'DRREDDY.NS', ticker: 'DRREDDY', name: "Dr. Reddy's Laboratories", sector: 'Pharma & Healthcare', price: 1349.00 },
  { symbol: 'SWIGGY.NS', ticker: 'SWIGGY', name: 'Swiggy Limited', sector: 'Consumer & Retail', price: 179.00 },
  { symbol: 'ZOMATO.NS', ticker: 'ZOMATO', name: 'Zomato Limited', sector: 'Consumer & Retail', price: 341.60 },
];

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  activeWorkspace = 'command-center',
  onSelectWorkspace,
}) => {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [marketSession, setMarketSession] = useState<MarketSessionState | null>(null);
  const [currentIstTime, setCurrentIstTime] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [paperCash, setPaperCash] = useState<number>(1000000);
  const [paperHoldingsValue, setPaperHoldingsValue] = useState<number>(0);
  const [userInitials, setUserInitials] = useState<string>('HS');
    const searchContainerRef = useRef<HTMLDivElement>(null);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { rawPrice: number; price: string; change: string; chg: string; positive: boolean }>>({});
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getActiveAuthUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleAuthChange = () => {
      const u = getActiveAuthUser();
      setAuthUser(u);
      if (u) {
        const inits = u.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        if (inits) setUserInitials(inits);
      }
    };
    handleAuthChange();
    window.addEventListener('arthai_auth_changed', handleAuthChange);
    return () => window.removeEventListener('arthai_auth_changed', handleAuthChange);
  }, []);

  const handleSwitchToAdmin = async () => {
    const user = getActiveAuthUser();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const clearance = await api.checkSwitchClearance(user.email);
      if (clearance.allowed && clearance.is_super_admin) {
        window.open('http://127.0.0.1:5174', '_blank');
      } else {
        setSwitchNotice(clearance.message);
      }
    } catch {
      if (user.email.toLowerCase() === 'hitesh.sunkari.23cse@bmu.edu.in') {
        window.open('http://127.0.0.1:5174', '_blank');
      } else {
        setSwitchNotice('ACCESS DENIED: Administrative switching clearance is restricted exclusively to hitesh.sunkari.23cse@bmu.edu.in.');
      }
    }
  };

  const handleSignOut = () => {
    setActiveAuthUser(null);
    setIsUserMenuOpen(false);
  };

  useEffect(() => {
    const fetchLiveQuotes = async () => {
      try {
        const res = await fetch('/market/stocks');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const map: Record<string, any> = {};
            data.forEach((s: any) => {
              map[s.ticker] = s;
            });
            setLiveQuotes(map);
          }
        }
      } catch {}
    };
    fetchLiveQuotes();
    const timer = setInterval(fetchLiveQuotes, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Live Indian Standard Time (IST) Clock
    const updateClock = () => {
      const now = new Date();
      setCurrentIstTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
        }) + ' IST'
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    // Check and synchronize full paper portfolio balance (Cash + Holdings Market Value)
    const syncPortfolioBalance = () => {
      try {
        const saved = localStorage.getItem('arthai_paper_cash');
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val)) setPaperCash(val);
        }
        const savedPos = localStorage.getItem('arthai_paper_positions');
        if (savedPos) {
          const parsed = JSON.parse(savedPos);
          if (Array.isArray(parsed)) {
            const { positions: migrated } = sanitizeAndMigrateHoldings(parsed);
            const hv = migrated.reduce(
              (acc: number, p: any) => acc + (p.shares || 0) * (p.currentPrice || p.avgPrice || 0),
              0
            );
            setPaperHoldingsValue(hv);
          } else {
            setPaperHoldingsValue(0);
          }
        } else {
          setPaperHoldingsValue(0);
        }
      } catch {}
    };

    syncPortfolioBalance();
    window.addEventListener('storage', syncPortfolioBalance);
    window.addEventListener('focus', syncPortfolioBalance);
    const balanceTimer = setInterval(syncPortfolioBalance, 2500);

    // Check saved user name for avatar initials
    const savedName = localStorage.getItem('arthai_user_name');
    if (savedName) {
      const inits = savedName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      if (inits) setUserInitials(inits);
    }

    // Check saved theme
    const savedTheme = localStorage.getItem('arthai_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    return () => {
      window.removeEventListener('storage', syncPortfolioBalance);
      window.removeEventListener('focus', syncPortfolioBalance);
      clearInterval(balanceTimer);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('arthai_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    const checkReadinessAndSession = async () => {
      try {
        const [res, sess] = await Promise.all([
          api.getReadiness().catch(() => null),
          api.getMarketSession().catch(() => null),
        ]);
        if (res) setReadiness(res);
        if (sess) setMarketSession(sess);
      } catch {
        // Keep previous state
      }
    };

    checkReadinessAndSession();
    const interval = setInterval(checkReadinessAndSession, 12000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStocks = searchQuery.trim()
    ? UNIVERSE_STOCKS.filter((s) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          s.ticker.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q) ||
          s.symbol.toLowerCase().includes(q)
        );
      }).slice(0, 6)
    : [];

  const handleSearchSubmit = () => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return;

    // Check exact ticker match first
    const exactTicker = UNIVERSE_STOCKS.find(
      (s) => s.ticker === q || s.symbol === q || s.symbol === `${q}.NS`
    );
    if (exactTicker) {
      if (onSelectWorkspace) onSelectWorkspace('research', exactTicker.symbol);
      setIsDropdownOpen(false);
      return;
    }

    // Check partial matches from filtered results
    if (filteredStocks.length > 0) {
      if (onSelectWorkspace) onSelectWorkspace('research', filteredStocks[0].symbol);
      setIsDropdownOpen(false);
      return;
    }

    // If query looks like a ticker, normalize to NSE ticker
    if (/^[A-Z0-9&-]+$/.test(q)) {
      const cleanTicker = q.endsWith('.NS') ? q : `${q}.NS`;
      if (onSelectWorkspace) onSelectWorkspace('research', cleanTicker);
      setIsDropdownOpen(false);
      return;
    }

    // Default to Explore watchlist
    if (onSelectWorkspace) onSelectWorkspace('command-center');
    setIsDropdownOpen(false);
  };

  const handleSelectStock = (symbol: string) => {
    if (onSelectWorkspace) onSelectWorkspace('research', symbol);
    setIsDropdownOpen(false);
  };

  const navItems = [
    { id: 'command-center' as PrimaryWorkspace, label: 'Explore' },
    { id: 'portfolio' as PrimaryWorkspace, label: 'Investments' },
    { id: 'research' as PrimaryWorkspace, label: 'Research & AI' },

    { id: 'profile' as PrimaryWorkspace, label: 'Profile' },
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
        zIndex: 50,
        position: 'sticky',
        top: 0,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: Active Workspace Breadcrumb & Market Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Primary Workspace Switcher Tabs */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {navItems.map((item) => {
                const isActive = activeWorkspace === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectWorkspace && onSelectWorkspace(item.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                      color: isActive ? 'var(--groww-green)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <span style={{ color: 'var(--border-subtle)' }}>|</span>

            {/* Live IST Clock */}
            {currentIstTime && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <Clock size={12} color="var(--groww-green)" />
                {currentIstTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Interactive Search Bar with Enter Key Processing */}
      <div
        ref={searchContainerRef}
        style={{
          flex: '0 1 440px',
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
          placeholder="Search 33 Indian equities (e.g. RELIANCE, SWIGGY, TCS)..."
          value={searchQuery}
          onFocus={() => {
            if (searchQuery.trim()) setIsDropdownOpen(true);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim()) setIsDropdownOpen(true);
            else setIsDropdownOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearchSubmit();
            } else if (e.key === 'Escape') {
              setIsDropdownOpen(false);
            }
          }}
          style={{
            width: '100%',
            padding: '9px 80px 9px 38px',
            backgroundColor: 'var(--bg-input)',
            border: isDropdownOpen ? '1px solid var(--groww-green)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />

        {/* Action Enter Badge */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleSearchSubmit();
          }}
          style={{
            position: 'absolute',
            right: '8px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: searchQuery.trim() ? 'var(--groww-green)' : 'var(--bg-card-hover)',
            color: searchQuery.trim() ? '#0F1217' : 'var(--text-muted)',
            border: searchQuery.trim() ? 'none' : '1px solid var(--border-subtle)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
          title="Press Enter or Click to Process Search"
        >
          <span>Enter</span>
          <span style={{ fontSize: '12px' }}>↵</span>
        </button>

        {/* Live Search Results Dropdown */}
        {isDropdownOpen && filteredStocks.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
              overflow: 'hidden',
              zIndex: 100,
            }}
          >
            <div
              style={{
                padding: '8px 14px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>MATCHING STOCKS (PRESS ENTER TO SELECT)</span>
              <span>33 UNIVERSE EQUITIES</span>
            </div>
            {filteredStocks.map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => handleSelectStock(stock.symbol)}
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{stock.ticker}</strong>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {stock.sector}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {stock.name}
                  </div>
                </div>

                {(() => {
                  const live = liveQuotes[stock.symbol];
                  const displayPrice = live ? live.price : `₹${stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                  const isPos = live ? live.positive : true;
                  const changeStr = live ? `${live.change} (${live.chg})` : 'Analyze ↵';
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {displayPrice}
                      </div>
                      <div style={{ fontSize: '11px', color: live ? (isPos ? 'var(--groww-green)' : 'var(--groww-red)') : 'var(--groww-green)', fontWeight: 600 }}>
                        {changeStr}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
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
          title={`Simulated Portfolio Net Worth: ₹${(paperCash + paperHoldingsValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Available Cash: ₹${paperCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}, Invested Holdings: ₹${paperHoldingsValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`}
          onClick={() => onSelectWorkspace && onSelectWorkspace('portfolio')}
        >
          <Wallet size={15} color="var(--groww-green)" />
          <span>₹{(paperCash + paperHoldingsValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
            cursor: 'pointer',
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Super-Admin Switching Clearance Button */}
        {authUser?.is_super_admin ? (
          <button
            onClick={handleSwitchToAdmin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(0, 208, 156, 0.2) 0%, rgba(83, 103, 255, 0.2) 100%)',
              border: '1px solid rgba(0, 208, 156, 0.5)',
              color: 'var(--groww-green)',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(0, 208, 156, 0.25)',
              transition: 'all 0.15s ease',
            }}
            title="Super-Admin Authorized: Switch directly to Admin Telemetry Dashboard"
          >
            <Sparkles size={14} color="var(--groww-green)" />
            <span>Switch to Admin ⚡</span>
          </button>
        ) : (
          <button
            onClick={handleSwitchToAdmin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Admin Dashboard (Clearance strictly restricted to hitesh.sunkari.23cse@bmu.edu.in)"
          >
            <Lock size={13} />
            <span>Admin</span>
          </button>
        )}

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
              cursor: 'pointer',
            }}
            title="Refresh Data"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* User Authentication & Profile Dropdown */}
        {authUser ? (
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <div
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px 4px 4px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-surface)',
                border: authUser.is_super_admin ? '1px solid rgba(0, 208, 156, 0.4)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: authUser.is_super_admin
                    ? 'linear-gradient(135deg, #00D09C 0%, #5367FF 100%)'
                    : 'linear-gradient(135deg, #181D27 0%, #2A3346 100%)',
                  color: authUser.is_super_admin ? '#0F1217' : 'var(--groww-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                }}
              >
                {userInitials}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {authUser.name.split(' ')[0]}
              </span>
              <ChevronDown size={14} color="var(--text-secondary)" />
            </div>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '42px',
                  right: 0,
                  width: '260px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
                  padding: '12px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {authUser.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                    {authUser.email}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    {authUser.is_super_admin ? (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(0, 208, 156, 0.15)',
                          color: 'var(--groww-green)',
                          border: '1px solid rgba(0, 208, 156, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldCheck size={11} />
                        SUPER-ADMINISTRATOR
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        INSTITUTIONAL INVESTOR
                      </span>
                    )}
                  </div>
                </div>

                {authUser.is_super_admin && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleSwitchToAdmin();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 208, 156, 0.08)',
                      border: '1px solid rgba(0, 208, 156, 0.3)',
                      color: 'var(--groww-green)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Open Admin Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectWorkspace && onSelectWorkspace('profile');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <User size={14} color="var(--text-secondary)" />
                  <span>Desk Profile & Settings</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectWorkspace && onSelectWorkspace('auth');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ShieldCheck size={14} color="var(--groww-green)" />
                  <span>Account & Clearance Portal</span>
                </button>

                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onSelectWorkspace && onSelectWorkspace('auth')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 208, 156, 0.08)',
                border: '1px solid rgba(0, 208, 156, 0.28)',
                color: 'var(--groww-green)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Open full dedicated Sign In / Sign Up page"
            >
              <Sparkles size={13} />
              <span>Dedicated Auth Page</span>
            </button>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--groww-green)',
                border: 'none',
                color: '#0F1217',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0, 208, 156, 0.3)',
              }}
            >
              <User size={14} />
              <span>Sign In / Google</span>
            </button>
          </div>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(u) => setAuthUser(u)}
          onOpenFullPage={() => {
            setIsAuthModalOpen(false);
            onSelectWorkspace && onSelectWorkspace('auth');
          }}
        />

        {/* Security Switch Denial Alert Dialog */}
        {switchNotice && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'var(--bg-card, #131722)',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '24px',
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '12px' }}>
                <AlertTriangle size={22} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Clearance Restriction</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                {switchNotice}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setSwitchNotice(null);
                    setIsAuthModalOpen(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 208, 156, 0.15)',
                    border: '1px solid rgba(0, 208, 156, 0.3)',
                    color: 'var(--groww-green)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sign In as Super-Admin
                </button>
                <button
                  onClick={() => setSwitchNotice(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
