import React, { useState } from 'react';
import { TrendingUp, Activity, CheckCircle2, Shield, Zap } from 'lucide-react';

export interface ParetoPoint {
  id: string;
  name: string;
  framework: string;
  quality: number;
  latency: number;
  cost_usd: number;
  isParetoOptimal: boolean;
  color: string;
  description: string;
}

const DEFAULT_PARETO_POINTS: ParetoPoint[] = [
  {
    id: 'hierarchical',
    name: 'ArthaAI Hierarchical',
    framework: 'Google ADK + FastMCP + CrewAI',
    quality: 82.5,
    latency: 19.1,
    cost_usd: 0.0008,
    isParetoOptimal: true,
    color: 'var(--groww-green)',
    description: 'Lead research manager with subagent oversight. Highest overall institutional quality.',
  },
  {
    id: 'parallel',
    name: 'ArthaAI Parallel Fleet',
    framework: 'Google ADK + FastMCP + CrewAI',
    quality: 81.4,
    latency: 14.8,
    cost_usd: 0.0008,
    isParetoOptimal: true,
    color: '#38bdf8',
    description: 'Concurrent 4-worker stream dispatch. Pareto-optimal throughput for live production.',
  },
  {
    id: 'sequential',
    name: 'ArthaAI Sequential',
    framework: 'Google ADK + FastMCP',
    quality: 82.3,
    latency: 22.0,
    cost_usd: 0.0008,
    isParetoOptimal: false,
    color: '#a78bfa',
    description: 'Step-by-step deterministic handoffs. High quality with linear latency penalty.',
  },
  {
    id: 'react',
    name: 'ReAct Single Agent',
    framework: 'LangChain ReAct / FastMCP Tools',
    quality: 58.6,
    latency: 16.2,
    cost_usd: 0.0003,
    isParetoOptimal: false,
    color: '#f59e0b',
    description: 'Thought-Action-Observation loop without cross-examination. Dominated by Parallel Fleet.',
  },
  {
    id: 'solitary',
    name: 'Solitary Single Agent',
    framework: 'Gemini 2.5 Flash-Lite Prompt',
    quality: 33.8,
    latency: 12.1,
    cost_usd: 0.0001,
    isParetoOptimal: true,
    color: '#f43f5e',
    description: 'Unaugmented LLM without tools or secondary validation. Minimal latency, high hallucination.',
  },
];

interface ParetoFrontierPlotProps {
  points?: ParetoPoint[];
}

export const ParetoFrontierPlot: React.FC<ParetoFrontierPlotProps> = ({
  points = DEFAULT_PARETO_POINTS,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ParetoPoint | null>(null);

  // SVG Dimension Settings
  const width = 460;
  const height = 320;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 45;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Domain: Latency (X) 10s -> 25s
  const minLatency = 10;
  const maxLatency = 26;
  const scaleX = (lat: number) => {
    const clamped = Math.max(minLatency, Math.min(maxLatency, lat));
    return paddingLeft + ((clamped - minLatency) / (maxLatency - minLatency)) * plotWidth;
  };

  // Domain: Quality (Y) 20 -> 100 (inverted SVG)
  const minQuality = 20;
  const maxQuality = 100;
  const scaleY = (qual: number) => {
    const clamped = Math.max(minQuality, Math.min(maxQuality, qual));
    return paddingTop + (1.0 - (clamped - minQuality) / (maxQuality - minQuality)) * plotHeight;
  };

  // Pareto Frontier Points (Ordered by Latency ascending)
  const frontierPoints = points
    .filter((p) => p.isParetoOptimal)
    .sort((a, b) => a.latency - b.latency);

  // Build curved Pareto frontier line
  const frontierPath = frontierPoints
    .map((p, idx) => {
      const x = scaleX(p.latency).toFixed(1);
      const y = scaleY(p.quality).toFixed(1);
      return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

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
        position: 'relative',
        height: '100%',
        minHeight: '440px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--groww-green)" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Quality vs. Latency Pareto Frontier
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
              PARETO-OPTIMAL DOMINANCE
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Tradeoff curve between institutional quality (0-100) and response latency across architectures
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--groww-green)' }} />
          <span>Pareto Optimal</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', flex: 1 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="paretoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--groww-green)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines - Y Quality (Every 20 pts: 20, 40, 60, 80, 100) */}
          {[20, 40, 60, 80, 100].map((q) => {
            const y = scaleY(q);
            return (
              <g key={`grid-q-${q}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + plotWidth}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray={q === 100 ? 'none' : '3 3'}
                  strokeWidth={q === 100 ? 1 : 0.6}
                  opacity={0.6}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10px"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {q}
                </text>
              </g>
            );
          })}

          {/* Grid lines - X Latency (Every 5 seconds: 10s, 15s, 20s, 25s) */}
          {[10, 15, 20, 25].map((l) => {
            const x = scaleX(l);
            return (
              <g key={`grid-l-${l}`}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + plotHeight}
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 3"
                  strokeWidth={0.6}
                  opacity={0.6}
                />
                <text
                  x={x}
                  y={paddingTop + plotHeight + 16}
                  textAnchor="middle"
                  fontSize="10px"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {l}s
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="10px"
            fontWeight="700"
            fill="var(--text-muted)"
          >
            Response Wall-Clock Latency (Seconds → Faster to Left)
          </text>
          <text
            x={-height / 2 + 10}
            y={12}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize="10px"
            fontWeight="700"
            fill="var(--text-muted)"
          >
            Quality Score (0 - 100)
          </text>

          {/* Pareto Frontier Curve Line */}
          <path
            d={frontierPath}
            fill="none"
            stroke="var(--groww-green)"
            strokeWidth={2.4}
            strokeDasharray="none"
            filter="drop-shadow(0 0 6px rgba(0, 208, 156, 0.4))"
          />

          {/* Points */}
          {points.map((pt) => {
            const cx = scaleX(pt.latency);
            const cy = scaleY(pt.quality);
            const isHovered = hoveredPoint?.id === pt.id;

            return (
              <g
                key={pt.id}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Glow ring on Pareto optimal points */}
                {pt.isParetoOptimal && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 14 : 9}
                    fill={pt.color}
                    opacity={isHovered ? 0.35 : 0.15}
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 5.5}
                  fill={pt.color}
                  stroke="#0F1217"
                  strokeWidth={2}
                />

                {/* Point Label */}
                <text
                  x={cx + (pt.latency > 18 ? -10 : 10)}
                  y={cy - 8}
                  textAnchor={pt.latency > 18 ? 'end' : 'start'}
                  fontSize="10px"
                  fontWeight={isHovered ? 800 : 700}
                  fill={isHovered ? 'var(--text-primary)' : pt.color}
                  fontFamily="var(--font-mono)"
                >
                  {pt.name} ({pt.quality.toFixed(1)})
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hovered Tooltip Card */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px 12px',
              boxShadow: 'var(--shadow-md)',
              maxWidth: '220px',
              fontSize: '11px',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontWeight: 800, color: hoveredPoint.color, marginBottom: '2px' }}>
              {hoveredPoint.name}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '6px' }}>
              {hoveredPoint.framework}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Quality Score:</span>
              <strong style={{ color: 'var(--groww-green)' }}>{hoveredPoint.quality.toFixed(1)}/100</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Latency:</span>
              <strong style={{ color: '#38bdf8' }}>{hoveredPoint.latency.toFixed(1)}s</strong>
            </div>
            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {hoveredPoint.description}
            </p>
          </div>
        )}
      </div>

      {/* Footer Insight Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(0, 208, 156, 0.08)',
          border: '1px solid rgba(0, 208, 156, 0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          <strong>ArthaAI Parallel Fleet</strong> dominates the Pareto sweet-spot: <strong>81.4 quality in 14.8s</strong>.
        </span>
        <span style={{ color: 'var(--groww-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          +22.8 pts over ReAct in less time
        </span>
      </div>
    </div>
  );
};
