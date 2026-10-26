import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  Briefcase,
  Activity,
  Layers,
  ShieldAlert,
} from 'lucide-react';

export type PrimaryWorkspace = 'command-center' | 'research' | 'portfolio' | 'operations';

// For backward compatibility with any internal callers
export type TabId = PrimaryWorkspace | 'dashboard' | 'new-research' | 'live-execution' | 'committee' | 'evidence' | 'telemetry' | 'history' | 'architecture' | 'evaluation' | 'system-status';

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
      : activeTab === 'research' || activeTab === 'new-research' || activeTab === 'live-execution' || activeTab === 'committee' || activeTab === 'evidence'
      ? 'research'
      : activeTab === 'portfolio'
      ? 'portfolio'
      : 'operations';

  const navItems = [
    {
      id: 'command-center' as PrimaryWorkspace,
      label: 'Command Center',
      sublabel: 'Market & Research Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'research' as PrimaryWorkspace,
      label: 'Research Workspace',
      sublabel: 'Multi-Agent Journey & Report',
      icon: BrainCircuit,
      badge: activeRunId ? 'Active Run' : undefined,
    },
    {
      id: 'portfolio' as PrimaryWorkspace,
      label: 'Portfolio & Trading',
      sublabel: 'Optimization & Paper Trading',
      icon: Briefcase,
    },
    {
      id: 'operations' as PrimaryWorkspace,
      label: 'Operations',
      sublabel: 'Telemetry, Fleet & Audit',
      icon: Activity,
    },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        userSelect: 'none',
      }}
    >
      {/* Platform Header */}
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />
        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
          QUANT WORKSTATION
        </span>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                padding: '11px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
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
                <Icon
                  size={18}
                  style={{
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                />
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
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(34, 211, 238, 0.15)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Terminal Footer Specifications */}
      <div
        style={{
          padding: '16px 18px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Multi-Agent Stack:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)' }}>ADK + CrewAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Interoperability:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>FastMCP + A2A</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Trading Guardrail:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>STRICT PAPER</span>
        </div>
      </div>
    </aside>
  );
};
