import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Wrench,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Bell,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  Terminal,
} from 'lucide-react';
import type { ClientErrorReport } from '../api/types';

interface RectificationCenterViewProps {
  errors: ClientErrorReport[];
  loading: boolean;
  onRefresh: () => void;
  onExecuteRectify: (action: string, targetId?: string, details?: any) => Promise<void>;
}

export const RectificationCenterView: React.FC<RectificationCenterViewProps> = ({
  errors,
  loading,
  onRefresh,
  onExecuteRectify,
}) => {
  const [selectedError, setSelectedError] = useState<ClientErrorReport | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const activeErrorsCount = errors.filter((e) => e.status === 'DETECTED').length;
  const rectifiedCount = errors.filter((e) => e.status === 'RECTIFIED').length;

  const handleAction = async (action: string, targetId?: string, details?: any) => {
    setActionInProgress(action);
    setStatusNotice(null);
    try {
      await onExecuteRectify(action, targetId, details);
      setStatusNotice(`Rectification operation [${action}] executed successfully.`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setStatusNotice(`Rectification failed: ${err.message || 'Operation error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

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
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <Wrench size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Live Anomaly Detection & One-Click Rectification Center
            </h2>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: activeErrorsCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 208, 156, 0.12)',
                color: activeErrorsCount > 0 ? '#ef4444' : 'var(--groww-green)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {activeErrorsCount > 0 ? `${activeErrorsCount} ANOMALIES DETECTED` : '0 ANOMALIES • ALL NOMINAL'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            Instantly detect runtime errors or corrupted state in user frontends, and dispatch surgical administrative fixes.
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
          <span>Refresh Errors</span>
        </button>
      </div>

      {statusNotice && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: 'rgba(0, 208, 156, 0.12)',
            border: '1px solid rgba(0, 208, 156, 0.35)',
            color: 'var(--groww-green)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Quick Rectification Control Console */}
      <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--groww-green)" />
          Surgical Administrative Rectification Operations
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 18px 0' }}>
          One-click corrective actions to immediately rectify client anomalies, purge corrupt caches, and synchronize historical data across all devices.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Action 1: Holdings Migration */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={15} color="var(--accent-cyan)" />
                Force Authentic NSE Parquet Migration
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                Purges any legacy mock buy prices in user browser caches and aligns Reliance (₹1,167.40), TCS (₹2,478.00 honest loss), and HDFC Bank to authentic closing prices.
              </p>
            </div>
            <button
              onClick={() => handleAction('MIGRATE_LEGACY_HOLDINGS')}
              disabled={actionInProgress !== null}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 208, 156, 0.15)',
                border: '1px solid rgba(0, 208, 156, 0.4)',
                color: 'var(--groww-green)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {actionInProgress === 'MIGRATE_LEGACY_HOLDINGS' ? 'Dispatching...' : 'Dispatch Parquet Migration'}
            </button>
          </div>

          {/* Action 2: Reset User Desk */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={15} color="#ef4444" />
                Reset Client Desk to Clean ₹10L Cash
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                Wipes corrupted paper trade positions or order queues and resets user cash to exactly ₹10,00,000 baseline with 0 holdings.
              </p>
            </div>
            <button
              onClick={() => handleAction('RESET_USER_HOLDINGS')}
              disabled={actionInProgress !== null}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {actionInProgress === 'RESET_USER_HOLDINGS' ? 'Resetting...' : 'Reset Client Desk (₹10L Clean)'}
            </button>
          </div>

          {/* Action 3: Clear Error Queue */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="var(--groww-green)" />
                Batch Mark All Anomalies Rectified
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                Clears active incident alerts, sets status of all logged client errors to RECTIFIED, and records resolution timestamp.
              </p>
            </div>
            <button
              onClick={() => handleAction('CLEAR_ALL_ERRORS')}
              disabled={actionInProgress !== null || activeErrorsCount === 0}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: activeErrorsCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: activeErrorsCount > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {actionInProgress === 'CLEAR_ALL_ERRORS' ? 'Rectifying...' : `Rectify All (${activeErrorsCount} Active)`}
            </button>
          </div>

          {/* Action 4: Broadcast Notice */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={15} color="var(--accent-cyan)" />
                Broadcast System Health Ping
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                Pings all active user browser tabs, verifies heartbeat synchronization, and announces full analytical fleet readiness.
              </p>
            </div>
            <button
              onClick={() => handleAction('BROADCAST_SYSTEM_PING')}
              disabled={actionInProgress !== null}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                backgroundColor: 'rgba(83, 103, 255, 0.12)',
                border: '1px solid rgba(83, 103, 255, 0.35)',
                color: 'var(--groww-blue)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {actionInProgress === 'BROADCAST_SYSTEM_PING' ? 'Broadcasting...' : 'Broadcast Fleet Health Ping'}
            </button>
          </div>
        </div>
      </div>

      {/* Detected Errors & Exceptions Log Table */}
      <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#ef4444" /> Detected Client & Backend Errors Log
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>ERROR TYPE</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>MESSAGE</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>SOURCE & USER</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>TIMESTAMP</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--groww-green)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={24} color="var(--groww-green)" />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>Zero Anomalies Detected</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        All user frontends, FastMCP tools, and DuckDB queries are operating with zero runtime errors.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                errors.map((err) => {
                  const isDetected = err.status === 'DETECTED';
                  return (
                    <tr
                      key={err.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isDetected ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: isDetected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 208, 156, 0.12)',
                            color: isDetected ? '#ef4444' : 'var(--groww-green)',
                          }}
                        >
                          {err.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {err.error_type}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                        <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{err.message}</div>
                        {err.component && (
                          <div style={{ fontSize: '10.5px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            Component: {err.component}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{err.source}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {err.user_email}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {new Date(err.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {isDetected ? (
                          <button
                            onClick={() => handleAction('RESOLVE_ERROR', err.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(0, 208, 156, 0.15)',
                              border: '1px solid rgba(0, 208, 156, 0.35)',
                              color: 'var(--groww-green)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Mark Rectified
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Resolved</span>
                        )}
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

