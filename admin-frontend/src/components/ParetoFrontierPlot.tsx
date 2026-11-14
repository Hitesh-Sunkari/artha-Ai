import React, { useState } from 'react';
import { TrendingUp, Award, Zap, Shield, ChevronRight } from 'lucide-react';

export interface ParetoPoint {
  id: string;
  name: string;
  shortName: string;
  framework: string;
  quality: number;
  latency: number;
  isParetoOptimal: boolean;
  color: string;
  labelPosition: 'top' | 'bottom' | 'left' | 'right';
  description: string;
}

const DEFAULT_PARETO_POINTS: ParetoPoint[] = [
  {
    id: 'hierarchical',
    name: 'ArthaAI Hierarchical Fleet',
    shortName: 'Hierarchical',
    framework: 'Google ADK + FastMCP + CrewAI',
    quality: 82.5,
    latency: 19.1,
    isParetoOptimal: true,
    color: 'var(--groww-green)',
    labelPosition: 'top',
    description: 'Lead research manager with subagent oversight. Highest overall institutional quality.',
  },
  {
    id: 'parallel',
    name: 'ArthaAI Parallel Fleet',
    shortName: 'Parallel Fleet',
    framework: 'Google ADK + FastMCP + CrewAI',
    quality: 81.4,
    latency: 14.8,
    isParetoOptimal: true,
    color: '#38bdf8',
    labelPosition: 'left',
    description: 'Concurrent 4-worker stream dispatch. Pareto-optimal throughput for live production.',
  },
  {
    id: 'sequential',
    name: 'ArthaAI Sequential Fleet',
    shortName: 'Sequential',
    framework: 'Google ADK + FastMCP',
    quality: 82.3,
    latency: 22.0,
    isParetoOptimal: false,
    color: '#a78bfa',
    labelPosition: 'right',
    description: 'Step-by-step deterministic handoffs. High quality with linear latency penalty.',
  },
  {
    id: 'react',
    name: 'ReAct Single Agent',
    shortName: 'ReAct Agent',
    framework: 'LangChain ReAct / FastMCP Tools',
    quality: 58.6,
    latency: 16.2,
    isParetoOptimal: false,
    color: '#f59e0b',
    labelPosition: 'bottom',
    description: 'Thought-Action-Observation loop without cross-examination. Dominated by Parallel Fleet.',
  },
  {
    id: 'solitary',
    name: 'Solitary Single Agent',
    shortName: 'Solitary LLM',
    framework: 'Gemini 2.5 Flash-Lite Prompt',
    quality: 33.8,
    latency: 12.1,
    isParetoOptimal: true,
    color: '#f43f5e',
    labelPosition: 'right',
    description: 'Unaugmented LLM without tools or secondary validation. Minimal latency, high hallucination.',
  },
];

interface ParetoFrontierPlotProps {
  points?: ParetoPoint[];
}

export const ParetoFrontierPlot: React.FC<ParetoFrontierPlotProps> = ({
  points = DEFAULT_PARETO_POINTS,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // SVG Geometry Dimensions
  const width = 480;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 35;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Domain: Latency (X) 10s -> 25s
  const minLatency = 10;
  const maxLatency = 25;
  const scaleX = (lat: number) => {
    const clamped = Math.max(minLatency, Math.min(maxLatency, lat));
    return paddingLeft + ((clamped - minLatency) / (maxLatency - minLatency)) * plotWidth;
  };

  // Domain: Quality (Y) 20 -> 100
  const minQuality = 20;
  const maxQuality = 100;
  const scaleY = (qual: number) => {
    const clamped = Math.max(minQuality, Math.min(maxQuality, qual));
    return paddingTop + (1.0 - (clamped - minQuality) / (maxQuality - minQuality)) * plotHeight;
  };

  // Pareto Frontier Curve Points (Solitary -> Parallel -> Hierarchical)
  const frontierPoints = points
    .filter((p) => p.isParetoOptimal)
    .sort((a, b) => a.latency - b.latency);

  const frontierPath = frontierPoints
    .map((p, idx) => {
      const x = scaleX(p.latency).toFixed(1);
      const y = scaleY(p.quality).toFixed(1);
      return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

  const activePoint = points.find((p) => p.id === hoveredId) || points[0];

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
              PARETO DOMINANCE
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

      {/* SVG Canvas with Non-Colliding Labels */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', flex: 1 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          {/* Quality Grid Lines (Y: 20, 40, 60, 80, 100) */}
          {[20, 40, 60, 80, 100].map((q) => {
            const y = scaleY(q);
            return (
              <g key={`pareto-q-${q}`}>
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

          {/* Latency Grid Lines (X: 10s, 15s, 20s, 25s) */}
          {[10, 15, 20, 25].map((l) => {
            const x = scaleX(l);
            return (
              <g key={`pareto-l-${l}`}>
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

          {/* Axis Titles */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 2}
            textAnchor="middle"
            fontSize="9px"
            fontWeight="700"
            fill="var(--text-muted)"
          >
            Response Latency (Seconds → Faster to Left)
          </text>
          <text
            x={-height / 2 + 10}
            y={12}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize="9px"
            fontWeight="700"
            fill="var(--text-muted)"
          >
            Quality (0-100)
          </text>

          {/* Pareto Frontier Curve */}
          <path
            d={frontierPath}
            fill="none"
            stroke="var(--groww-green)"
            strokeWidth={2.4}
            filter="drop-shadow(0 0 6px rgba(0, 208, 156, 0.4))"
          />

          {/* Non-Colliding Architecture Points & Strategic Placed Labels */}
          {points.map((pt) => {
            const cx = scaleX(pt.latency);
            const cy = scaleY(pt.quality);
            const isHovered = hoveredId === pt.id;

            // Intelligent Label Offsets to Completely Prevent Collisions
            let labelX = cx;
            let labelY = cy - 10;
            let textAnchor: 'start' | 'middle' | 'end' = 'middle';

            if (pt.labelPosition === 'top') {
              labelY = cy - 11;
              textAnchor = 'middle';
            } else if (pt.labelPosition === 'bottom') {
              labelY = cy + 18;
              textAnchor = 'middle';
            } else if (pt.labelPosition === 'left') {
              labelX = cx - 10;
              labelY = cy + 4;
              textAnchor = 'end';
            } else if (pt.labelPosition === 'right') {
              labelX = cx + 10;
              labelY = cy + 4;
              textAnchor = 'start';
            }

            return (
              <g
                key={pt.id}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={() => setHoveredId(pt.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Glow ring on Pareto optimal points */}
                {pt.isParetoOptimal && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 12 : 8}
                    fill={pt.color}
                    opacity={isHovered ? 0.35 : 0.15}
                  />
                )}

                {/* Main Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6.5 : 5}
                  fill={pt.color}
                  stroke="#0F1217"
                  strokeWidth={2}
                />

                {/* Non-Colliding Text Label */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={textAnchor}
                  fontSize="10px"
                  fontWeight={isHovered ? 800 : 700}
                  fill={isHovered ? 'var(--text-primary)' : pt.color}
                  fontFamily="var(--font-mono)"
                >
                  {pt.shortName} ({pt.quality.toFixed(1)})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Architecture Selector Row (Eliminates guesswork & clutters) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
        {points.map((pt) => {
          const isSelected = hoveredId === pt.id;
          return (
            <div
              key={`pill-${pt.id}`}
              onMouseEnter={() => setHoveredId(pt.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                backgroundColor: isSelected ? 'rgba(0, 208, 156, 0.12)' : 'var(--bg-surface)',
                border: isSelected ? `1px solid ${pt.color}` : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: pt.color }}>{pt.shortName}</span>
                {pt.isParetoOptimal && (
                  <span style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px', backgroundColor: 'rgba(0, 208, 156, 0.15)', color: 'var(--groww-green)', fontWeight: 800 }}>
                    PARETO
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {pt.quality.toFixed(1)} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {pt.latency.toFixed(1)}s wall-clock
              </div>
            </div>
          );
        })}
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
