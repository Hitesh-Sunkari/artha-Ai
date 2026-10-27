import React, { useState } from 'react';
import {
  Compass,
  LineChart,
  Briefcase,
  Settings,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export type PrimaryWorkspace = 'command-center' | 'research' | 'portfolio' | 'operations';

// For backward compatibility with any internal callers
export type TabId =
  | PrimaryWorkspace
  | 'dashboard'
  | 'new-research'
  | 'live-execution'
  | 'committee'
  | 'evidence'
  | 'telemetry'
  | 'history'
  | 'architecture'
  | 'evaluation'
  | 'system-status';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeRunId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, activeRunId }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Normalize legacy tab IDs to one of the 4 primary workspaces
  const normalizedActive: PrimaryWorkspace =
    activeTab === 'command-center' || activeTab === 'dashboard'
      ? 'command-center'
      : activeTab === 'research' ||
        activeTab === 'new-research' ||
        activeTab === 'live-execution' ||
        activeTab === 'committee' ||
        activeTab === 'evidence'
      ? 'research'
      : activeTab === 'portfolio'
      ? 'portfolio'
      : 'operations';

  const navItems = [
    {
      id: 'command-center' as PrimaryWorkspace,
      label: 'Explore',
      sublabel: 'Indices & Stock Watchlist',
      icon: Compass,
    },
    {
      id: 'research' as PrimaryWorkspace,
      label: 'Research & AI',
      sublabel: '5Y Deep Analysis & Agents',
      icon: LineChart,
      badge: activeRunId ? 'Active' : undefined,
    },
    {
      id: 'portfolio' as PrimaryWorkspace,
      label: 'Investments',
      sublabel: 'Paper Desk & SLSQP',
      icon: Briefcase,
    },
    {
      id: 'operations' as PrimaryWorkspace,
      label: 'Terminal & Ops',
      sublabel: 'A2A, FastMCP & Diagnostics',
      icon: Settings,
    },
  ];

  return (
    <div
      style={{
        width: '72px',
        flexShrink: 0,
        height: '100vh',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: isHovered ? '240px' : '72px',
          backgroundColor: 'var(--bg-chrome)',
          borderRight: '1px solid var(--border-subtle)',
          boxShadow: isHovered ? '6px 0 28px rgba(0, 0, 0, 0.22)' : 'none',
          transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          userSelect: 'none',
          padding: isHovered ? '16px 12px' : '16px 8px',
          gap: '16px',
          overflow: 'hidden',
          zIndex: 50,
        }}
      >
        {/* Brand Icon & Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 6px',
            cursor: 'pointer',
          }}
          onClick={() => onSelectTab('command-center')}
          title="ArthaAI Terminal"
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00D09C 0%, #009E77 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 208, 156, 0.3)',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={20} color="#0B1020" strokeWidth={2.8} />
          </div>
          <div
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateX(0)' : 'translateX(-8px)',
              transition: 'opacity 0.2s 0.05s ease, transform 0.2s 0.05s ease',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>ArthaAI</span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  backgroundColor: 'var(--groww-green-light)',
                  color: 'var(--groww-green)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                PRO
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Institutional Multi-Agent
            </div>
          </div>
        </div>

        {/* Section Label */}
        <div
          style={{
            padding: '0 8px',
            height: '14px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Workspaces
          </span>
        </div>

        {/* Navigation Item Rail */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = normalizedActive === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={!isHovered ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: isHovered ? '10px 12px' : '10px 6px',
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--groww-green-light)' : 'transparent',
                  color: isActive ? 'var(--groww-green)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, color 0.15s ease, padding 0.2s ease',
                  textAlign: 'left',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {/* Active Indicator Bar on left for collapsed mode */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: '3px',
                      borderRadius: '0 3px 3px 0',
                      backgroundColor: 'var(--groww-green)',
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? 'rgba(0, 208, 156, 0.22)' : 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? 'var(--groww-green)' : 'var(--text-muted)',
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                  </div>

                  <div
                    style={{
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? 'translateX(0)' : 'translateX(-6px)',
                      transition: 'opacity 0.2s 0.05s ease, transform 0.2s 0.05s ease',
                    }}
                  >
                    <div style={{ lineHeight: '1.2' }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                      {item.sublabel}
                    </div>
                  </div>

                  {item.badge && isHovered && (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: 'var(--groww-green)',
                        color: '#0F1217',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* ArthaAI Copilot Drawer Trigger / Mini Card */}
        {isHovered ? (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(0, 208, 156, 0.12) 0%, rgba(83, 103, 255, 0.08) 100%)',
              border: '1px solid rgba(0, 208, 156, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'opacity 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--groww-green)" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--groww-green)' }}>
                ArthaAI Copilot
              </span>
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
              5Y quantitative analysis, SEBI & Finance Act statutory intelligence.
            </p>
          </div>
        ) : (
          <div
            title="ArthaAI Copilot Ready"
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 0',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0, 208, 156, 0.15) 0%, rgba(83, 103, 255, 0.1) 100%)',
                border: '1px solid rgba(0, 208, 156, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--groww-green)',
              }}
            >
              <Sparkles size={16} />
            </div>
          </div>
        )}

        {/* Safety & Protocol Footer */}
        {isHovered ? (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Fleet:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Google ADK + CrewAI</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Protocol:</span>
              <span style={{ fontWeight: 600, color: 'var(--groww-blue)' }}>A2A + FastMCP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Trading:</span>
              <span style={{ fontWeight: 700, color: 'var(--groww-green)' }}>Paper Simulation</span>
            </div>
          </div>
        ) : (
          <div
            title="Institutional Multi-Agent Engine: Google ADK + CrewAI + FastMCP"
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '4px 0',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--groww-green)',
              }}
            >
              <ShieldCheck size={16} />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Sidebar;
