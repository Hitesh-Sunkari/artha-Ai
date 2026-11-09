import React from 'react';
import {
  Activity,
  Zap,
  Clock,
  ArrowUpRight,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { TrafficTelemetry } from '../api/types';

interface TrafficSurveillanceViewProps {
  data: TrafficTelemetry | null;
  loading: boolean;
  onRefresh: () => void;
}

export const TrafficSurveillanceView: React.FC<TrafficSurveillanceViewProps> = ({
  data,
  loading,
  onRefresh,
}) => {
  const totalReq = data?.total_requests || 0;
  const s2xx = data?.status_counts?.status_2xx || 0;
  const s4xx = data?.status_counts?.status_4xx || 0;
  const s5xx = data?.status_counts?.status_5xx || 0;

  const successRate = totalReq > 0 ? ((s2xx / totalReq) * 100).toFixed(1) : '100.0';

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
              <Activity size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Live Traffic & Network Telemetry Surveillance
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
              REAL-TIME HTTP HOOK ACTIVE
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            Continuous zero-mock network monitoring across User Frontends, Admin Terminal, and FastMCP endpoints.
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
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>THROUGHPUT (RPM)</span>
            <Activity size={15} color="var(--groww-green)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {data?.rpm ?? 0} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>req/min</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--groww-green)', marginTop: '4px', fontWeight: 600 }}>
            Sliding 60-Second Window
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>AVERAGE LATENCY</span>
            <Clock size={15} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {data?.avg_latency_ms ?? 0} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>ms</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            P95 Latency: <strong style={{ color: 'var(--text-primary)' }}>{data?.p95_latency_ms ?? 0} ms</strong>
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>SUCCESS RATE</span>
            <CheckCircle2 size={15} color="var(--groww-green)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--groww-green)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {successRate}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            2xx: {s2xx} • 4xx: {s4xx} • 5xx: {s5xx}
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL LOGGED CALLS</span>
            <Server size={15} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {totalReq.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Since Server Startup
          </div>
        </div>
      </div>

      {/* Top Endpoints & HTTP Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} color="var(--accent-cyan)" /> Top Traffic Endpoints
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(data?.top_endpoints || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Awaiting endpoint traffic...
              </div>
            ) : (
              (data?.top_endpoints || []).map((ep, idx) => {
                const maxHits = data?.top_endpoints[0]?.hits || 1;
                const pct = Math.round((ep.hits / maxHits) * 100);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{ep.endpoint}</code>
                      <strong style={{ color: 'var(--text-primary)' }}>{ep.hits} hits</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #00D09C 0%, #5367FF 100%)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* HTTP Status Code Breakdown */}
        <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--groww-green)" /> HTTP Response Health Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--groww-green)' }}>2xx Success Responses</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Normal API resolutions and research streams</div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)' }}>
                {s2xx}
              </span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>4xx Client Validation Notices</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>404 Not Found, 422 Unprocessable Request</div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                {s4xx}
              </span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>5xx Server Exceptions</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Backend internal crashes or uncaught errors</div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: s5xx > 0 ? '#ef4444' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {s5xx}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stream Table */}
      <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--groww-green)" /> Live Requests Stream (Recent 40 Calls)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>METHOD</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>ENDPOINT PATH</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>LATENCY</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>CLIENT IP</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>TIMESTAMP (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_requests || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No network requests recorded yet.
                  </td>
                </tr>
              ) : (
                (data?.recent_requests || []).map((req) => {
                  const is2xx = req.status_code >= 200 && req.status_code < 400;
                  const is4xx = req.status_code >= 400 && req.status_code < 500;
                  return (
                    <tr
                      key={req.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: is2xx
                              ? 'rgba(0, 208, 156, 0.12)'
                              : is4xx
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                            color: is2xx
                              ? 'var(--groww-green)'
                              : is4xx
                              ? '#f59e0b'
                              : '#ef4444',
                          }}
                        >
                          {req.status_code}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: req.method === 'GET' ? 'var(--accent-cyan)' : 'var(--groww-blue)' }}>
                          {req.method}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {req.path}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: req.latency_ms > 1000 ? '#f59e0b' : 'var(--text-secondary)' }}>
                        {req.latency_ms} ms
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {req.client_ip}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                        {new Date(req.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
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

