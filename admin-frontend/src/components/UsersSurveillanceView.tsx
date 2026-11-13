import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserCheck,
  Clock,
  Sparkles,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import type { UserSession } from '../api/types';

interface UsersSurveillanceViewProps {
  users: UserSession[];
  loading: boolean;
  onRefresh: () => void;
}

export const UsersSurveillanceView: React.FC<UsersSurveillanceViewProps> = ({
  users,
  loading,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ONLINE' | 'IDLE' | 'OFFLINE'>('ALL');
  const [search, setSearch] = useState('');

  const onlineCount = users.filter((u) => u.status === 'ONLINE').length;
  const idleCount = users.filter((u) => u.status === 'IDLE').length;
  const offlineCount = users.filter((u) => u.status === 'OFFLINE').length;
  const totalAum = users.reduce((acc, u) => acc + (u.paper_aum || 0), 0);

  const filteredUsers = users.filter((u) => {
    if (filter !== 'ALL' && u.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.user_email.toLowerCase().includes(q) ||
        u.user_name.toLowerCase().includes(q) ||
        u.current_page.toLowerCase().includes(q) ||
        u.client_ip.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
      
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '20px 24px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 208, 156, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--groww-green)',
              }}
            >
              <Users size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Active Users & Client Sessions Surveillance
            </h2>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 208, 156, 0.12)',
                color: 'var(--groww-green)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              LIVE HEARTBEAT INGESTION
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            Surveillance of all connected user tabs, workspace navigation state, paper desk capital, and research frequency.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>ONLINE NOW</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--groww-green)', boxShadow: '0 0 8px var(--groww-green)' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--groww-green)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {onlineCount} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>active tabs</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Heartbeat &lt; 45 seconds ago
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>IDLE / INACTIVE</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {idleCount} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>sessions</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            45s to 5 mins inactive
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL TRACKED SESSIONS</span>
            <UserCheck size={15} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {users.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Active Registry
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>AGGREGATE PAPER AUM</span>
            <ShieldCheck size={15} color="var(--groww-green)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            ₹{(totalAum / 100000).toFixed(2)} L
          </div>
          <div style={{ fontSize: '11px', color: 'var(--groww-green)', marginTop: '4px' }}>
            Active simulated capital
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, IP, or page..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'ONLINE', 'IDLE', 'OFFLINE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: filter === f ? 'var(--groww-green)' : 'var(--bg-surface)',
                color: filter === f ? '#0F1217' : 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {f} {f === 'ONLINE' ? `(${onlineCount})` : f === 'IDLE' ? `(${idleCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>USER & EMAIL</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>CLEARANCE ROLE</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>ACTIVE PAGE / TAB</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>PAPER AUM</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>CLIENT IP</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>LAST HEARTBEAT</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No user sessions matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOnline = u.status === 'ONLINE';
                  const isIdle = u.status === 'IDLE';
                  const isSuper = !!u.is_super_admin;
                  return (
                    <tr
                      key={u.session_id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSuper ? 'rgba(0, 208, 156, 0.03)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: isOnline
                              ? 'rgba(0, 208, 156, 0.12)'
                              : isIdle
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: isOnline
                              ? 'var(--groww-green)'
                              : isIdle
                              ? '#f59e0b'
                              : 'var(--text-muted)',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isOnline ? 'var(--groww-green)' : isIdle ? '#f59e0b' : 'var(--text-muted)',
                            }}
                          />
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.user_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {u.user_email}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {isSuper ? (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(0, 208, 156, 0.15)',
                              color: 'var(--groww-green)',
                              border: '1px solid rgba(0, 208, 156, 0.35)',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Sparkles size={11} />
                            SUPER-ADMIN
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '10.5px',
                              fontWeight: 600,
                            }}
                          >
                            CLIENT INVESTOR
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {u.current_page || '/'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Tab: {u.current_tab || 'overview'}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          ₹{(u.paper_aum || 1000000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          Cash: ₹{(u.paper_cash || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({u.paper_positions_count || 0} stocks)
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {u.client_ip}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {u.idle_seconds !== undefined ? `${Math.round(u.idle_seconds)}s ago` : 'Just now'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

