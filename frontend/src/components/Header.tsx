import React, { useEffect, useState } from 'react';
import { ShieldCheck, Server, Cpu, Clock, RefreshCw, Terminal } from 'lucide-react';
import { api } from '../api/client';
import type { ReadinessResponse } from '../api/types';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [timeUtc, setTimeUtc] = useState<string>('');
  const [timeIst, setTimeIst] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toUTCString().replace('GMT', 'UTC'));
      setTimeIst(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    checkReadiness();
    const interval = setInterval(checkReadiness, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10,
      }}
    >
      {/* Brand & Market Identifier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#030712',
              fontWeight: 800,
              fontSize: '15px',
            }}
          >
            A
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                ArthaAI
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid var(--border-medium)',
                  fontWeight: 600,
                }}
              >
                PRO QUANT TERMINAL
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Indian Capital Markets • NSE / BSE Multi-Agent Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Clocks */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>{timeUtc || 'UTC --:--:--'}</span>
        </div>
        <div style={{ color: 'var(--border-medium)' }}>|</div>
        <div style={{ color: 'var(--text-muted)' }}>{timeIst || 'IST --:--:--'}</div>
      </div>

      {/* Control-Plane Diagnostics & Safety Guardrail */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Live Trading Guardrail Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: 'var(--accent-emerald)',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}
          title="Live trading prohibition strictly active. Paper and research mode only."
        >
          <ShieldCheck size={14} />
          <span>LIVE TRADING: BLOCKED</span>
        </div>

        {/* MCP & A2A Readiness Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: readiness?.mcp_available ? 'rgba(6, 182, 212, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            border: `1px solid ${readiness?.mcp_available ? 'rgba(6, 182, 212, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: readiness?.mcp_available ? 'var(--accent-cyan)' : 'var(--accent-rose)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
          title="Model Context Protocol (FastMCP) Tools Status"
        >
          <Server size={12} />
          <span>MCP: {readiness?.mcp_available ? 'ACTIVE' : 'OFFLINE'}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: readiness?.a2a_available ? 'rgba(99, 102, 241, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            border: `1px solid ${readiness?.a2a_available ? 'rgba(99, 102, 241, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: readiness?.a2a_available ? '#818cf8' : 'var(--accent-rose)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
          title="A2A Inter-Agent Protocol Status"
        >
          <Cpu size={12} />
          <span>A2A: {readiness?.a2a_available ? 'ACTIVE' : 'OFFLINE'}</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title="Refresh Terminal Data"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </header>
  );
};
