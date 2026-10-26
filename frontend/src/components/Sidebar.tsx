import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Activity,
  History,
  GitFork,
  FlaskConical,
  Settings,
  Shield,
  Layers,
  Briefcase,
  Users,
  Database,
  Cpu,
} from 'lucide-react';

export type TabId =
  | 'dashboard'
  | 'new-research'
  | 'live-execution'
  | 'portfolio'
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
  const navItems = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-research' as TabId, label: 'New Research', icon: PlusCircle },
    {
      id: 'live-execution' as TabId,
      label: 'Live Execution',
      icon: Activity,
      badge: activeRunId ? 'Active' : undefined,
    },
    { id: 'portfolio' as TabId, label: 'Portfolio Engine', icon: Briefcase },
    { id: 'committee' as TabId, label: 'Investment Committee', icon: Users },
    { id: 'evidence' as TabId, label: 'Evidence Explorer', icon: Database },
    { id: 'telemetry' as TabId, label: 'Telemetry Observatory', icon: Cpu },
    { id: 'history' as TabId, label: 'Run History', icon: History },
    { id: 'architecture' as TabId, label: 'System Topology', icon: GitFork },
    { id: 'evaluation' as TabId, label: 'Evaluation & Benchmarks', icon: FlaskConical },
    { id: 'system-status' as TabId, label: 'System Status & API', icon: Settings },
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
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
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
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon
                  size={16}
                  style={{
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  }}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(6, 182, 212, 0.2)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
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
