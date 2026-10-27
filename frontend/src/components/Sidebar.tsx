import React from 'react';
import {
  Compass,
  LineChart,
  Briefcase,
  Settings,
  Sparkles,
  ShieldCheck,
  Cpu,
  Layers,
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
      sublabel: 'Market indices, watchlist & fleet',
      icon: Compass,
    },
    {
      id: 'research' as PrimaryWorkspace,
      label: 'Research & AI',
      sublabel: '5Y quantitative depth & synthesis',
      icon: LineChart,
      badge: activeRunId ? 'Active' : undefined,
    },
    {
      id: 'portfolio' as PrimaryWorkspace,
      label: 'Investments',
      sublabel: 'Paper desk & portfolio orders',
      icon: Briefcase,
    },
    {
      id: 'operations' as PrimaryWorkspace,
      label: 'Terminal & Ops',
      sublabel: 'A2A, FastMCP & diagnostics',
      icon: Settings,
    },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-chrome)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        userSelect: 'none',
        padding: '16px 12px',
        gap: '20px',
      }}
    >
      {/* Category Heading */}
      <div style={{ padding: '0 8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Navigation
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = normalizedActive === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                backgroundColor: isActive ? 'var(--groww-green-light)' : 'transparent',
                color: isActive ? 'var(--groww-green)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'left',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'rgba(0, 208, 156, 0.2)' : 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? 'var(--groww-green)' : 'var(--text-muted)',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <div>
                  <div style={{ lineHeight: '1.2' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                    {item.sublabel}
                  </div>
                </div>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--groww-green)',
                    color: '#0F1217',
                    fontWeight: 800,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Groww Quick Help / Copilot Box */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(0, 208, 156, 0.1) 0%, rgba(83, 103, 255, 0.08) 100%)',
          border: '1px solid rgba(0, 208, 156, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} color="var(--groww-green)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--groww-green)' }}>
            ArthaAI Copilot
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Instant quantitative insights, 5-year analysis & SEBI regulatory guidance.
        </p>
      </div>

      {/* Safety & Protocol Footer */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
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
    </aside>
  );
};
