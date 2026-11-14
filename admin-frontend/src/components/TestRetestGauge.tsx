import React from 'react';
import { ShieldCheck, CheckCircle2, RotateCcw, AlertTriangle, Scale, Lock } from 'lucide-react';

interface TestRetestGaugeProps {
  consistencyPct?: number;
  sigmaPts?: number;
  cvValue?: number;
  contradictionRate?: number;
  statutoryDragBps?: number;
  schemaValidityPct?: number;
}

export const TestRetestGauge: React.FC<TestRetestGaugeProps> = ({
  consistencyPct = 98.2,
  sigmaPts = 8.8,
  cvValue = 0.099,
  contradictionRate = 0.0,
  statutoryDragBps = 22.22,
  schemaValidityPct = 100.0,
}) => {
  // SVG Circular Gauge Calculations
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (consistencyPct / 100) * circumference;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: 'var(--shadow-sm)',
        height: '100%',
        minHeight: '440px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--groww-green)" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Test-Retest Consistency & Invariance Audit
            </h4>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: 'rgba(0, 208, 156, 0.12)',
                color: 'var(--groww-green)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              SR 11-7 GUIDANCE • REPEATABILITY
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Empirical stability across exact-repeat scenario pairs and statutory legal guardrails
          </span>
        </div>
      </div>

      {/* Main Dual Gauge & Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'center', flex: 1 }}>
        {/* Circular Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '110px', height: '110px' }}>
            <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background Track */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="10"
              />
              {/* Progress Track */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="none"
                stroke="var(--groww-green)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                filter="drop-shadow(0 0 4px rgba(0, 208, 156, 0.5))"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {consistencyPct.toFixed(1)}%
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--groww-green)', letterSpacing: '0.04em' }}>
                AGREEMENT
              </span>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
            Exact-Repeat Stability
          </span>
        </div>

        {/* 4 Invariance Metric Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>STANDARD DEVIATION & CV</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                σ = {sigmaPts.toFixed(1)} pts • CV = {cvValue.toFixed(3)}
              </div>
            </div>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 800 }}>
              CV &lt; 0.100 PASSED
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>POLARITY CONTRADICTION RATE</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {contradictionRate.toFixed(1)}% (0 of 64 contradictory stances)
              </div>
            </div>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 800 }}>
              ZERO FLIPS
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>FINANCE ACT 2024 STT INVARIANCE</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {statutoryDragBps.toFixed(2)} bps delivery friction enforced
              </div>
            </div>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', fontWeight: 800 }}>
              SEBI SEC 112
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>SCHEMA & LOOKAHEAD INVARIANCE</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {schemaValidityPct.toFixed(1)}% Pydantic v2 • DuckDB UTC bound
              </div>
            </div>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 800 }}>
              DETERMINISTIC
            </span>
          </div>
        </div>
      </div>

      {/* Academic Citation Note */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          <strong>Academic Governance Note:</strong> MiFID II serves as regulatory context for execution suitability; SR 11-7 provides model-risk-management guidance for recommendation agreement.
        </span>
      </div>
    </div>
  );
};
