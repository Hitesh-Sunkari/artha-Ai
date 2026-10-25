import React from 'react';
import { Landmark, ShieldAlert, FileText } from 'lucide-react';
import type { StatutoryRiskBounds } from '../api/types';

interface StatCostBreakdownProps {
  statutoryBounds?: StatutoryRiskBounds;
}

export const StatCostBreakdown: React.FC<StatCostBreakdownProps> = ({ statutoryBounds }) => {
  if (!statutoryBounds) {
    return (
      <div className="terminal-card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
        No statutory risk bounds available for this run.
      </div>
    );
  }

  const breakdown = statutoryBounds.breakdown || {};
  const totalInr = statutoryBounds.total_statutory_costs_inr ?? 0;
  const effRate = statutoryBounds.effective_rate_pct ?? 0;
  const provenance = statutoryBounds.statutory_provenance || {};

  const items = [
    { label: 'Securities Transaction Tax (STT)', value: breakdown.stt, desc: 'Finance (No. 2) Act 2024 schedule' },
    { label: 'Goods & Services Tax (GST)', value: breakdown.gst, desc: '18% on transaction & exchange charges' },
    { label: 'Stamp Duty', value: breakdown.stamp_duty, desc: 'Indian Stamp Act (Delivery 0.015%)' },
    { label: 'Exchange Turnover Fee', value: breakdown.exchange_turnover_fee, desc: 'NSE/BSE transaction fee schedule' },
    { label: 'SEBI Turnover Charge', value: breakdown.sebi_turnover_fee, desc: 'SEBI Regulatory fee (INR 10/crore)' },
  ];

  return (
    <div className="terminal-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Landmark size={18} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Indian Statutory Friction & Transaction Bounds
            </h4>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Computed via FastMCP tool: <span className="font-mono">calculate_statutory_costs</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Effective Friction Rate</div>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-amber)' }}>
            {effRate.toFixed(4)}%
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="terminal-table-container">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Fee Component</th>
              <th>Regulatory Framework</th>
              <th style={{ textAlign: 'right' }}>Friction (INR)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{it.label}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{it.desc}</td>
                <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {it.value !== undefined ? `₹${Number(it.value).toFixed(2)}` : 'Included'}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
              <td style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>Total Statutory Friction</td>
              <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Per 100k standard turnover baseline</td>
              <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontWeight: 800, fontSize: '15px', color: 'var(--accent-cyan)' }}>
                ₹{totalInr.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {provenance.stt_source && (
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <FileText size={12} />
          <span>Statutory Provenance: {provenance.stt_source}</span>
        </div>
      )}
    </div>
  );
};
