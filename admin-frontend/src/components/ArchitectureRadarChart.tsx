import React, { useState } from 'react';
import { Compass, ShieldCheck, Zap, Activity, Info } from 'lucide-react';

export interface RadarDimension {
  key: string;
  label: string;
  multiAgent: number;
  react: number;
  solitary: number;
}

interface ArchitectureRadarChartProps {
  dimensions?: RadarDimension[];
}

const DEFAULT_DIMENSIONS: RadarDimension[] = [
  { key: 'accuracy', label: 'Analytical Accuracy', multiAgent: 88.4, react: 60.3, solitary: 38.0 },
  { key: 'grounding', label: 'Evidence Grounding', multiAgent: 84.6, react: 52.1, solitary: 31.5 },
  { key: 'completion', label: 'Task Completion', multiAgent: 96.9, react: 88.5, solitary: 74.0 },
  { key: 'citation', label: 'Citation Precision', multiAgent: 86.2, react: 55.4, solitary: 24.8 },
  { key: 'hallucination_inv', label: 'Hallucination Resistance', multiAgent: 91.8, react: 76.5, solitary: 38.2 },
  { key: 'tool_reliability', label: 'Tool Reliability', multiAgent: 99.2, react: 95.2, solitary: 0.0 },
];

export const ArchitectureRadarChart: React.FC<ArchitectureRadarChartProps> = ({
  dimensions = DEFAULT_DIMENSIONS,
}) => {
  const [activeArch, setActiveArch] = useState<'ALL' | 'MULTI' | 'REACT' | 'SOLITARY'>('ALL');
  const [hoveredDim, setHoveredDim] = useState<RadarDimension | null>(null);

  // SVG Geometry Settings
  const size = 360;
  const center = size / 2;
  const radius = 120;
  const totalAxes = dimensions.length;
  const angleStep = (2 * Math.PI) / totalAxes;

  // Concentric Rings: 20%, 40%, 60%, 80%, 100%
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Map value (0-100) to (x, y) coordinates
  const getCoordinates = (value: number, index: number, maxRadius = radius) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Build SVG path for a polygon
  const buildPolygonPath = (values: number[]) => {
    return (
      values
        .map((val, idx) => {
          const { x, y } = getCoordinates(val, idx);
          return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ') + ' Z'
    );
  };

  const multiAgentPath = buildPolygonPath(dimensions.map((d) => d.multiAgent));
  const reactPath = buildPolygonPath(dimensions.map((d) => d.react));
  const solitaryPath = buildPolygonPath(dimensions.map((d) => d.solitary));

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} color="var(--groww-green)" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Architecture Capability Radar
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
              6-AXIS CAPABILITY
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Comparing Multi-Agent Fleet vs ReAct vs Solitary LLM across core operational axes
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: '8px' }}>
          {(['ALL', 'MULTI', 'REACT', 'SOLITARY'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveArch(mode)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeArch === mode ? 'var(--groww-green)' : 'transparent',
                color: activeArch === mode ? '#0F1217' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              {mode === 'ALL' ? 'All 3' : mode === 'MULTI' ? 'Multi-Agent' : mode === 'REACT' ? 'ReAct' : 'Solitary'}
            </button>
          ))}
        </div>
      </div>

      {/* Radar SVG Canvas */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{ width: '100%', maxWidth: '360px', height: 'auto', overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--groww-green)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Glow */}
          <circle cx={center} cy={center} r={radius} fill="url(#radarCenterGlow)" />

          {/* Concentric Level Polygons */}
          {levels.map((level) => {
            const levelPoints = dimensions
              .map((_, idx) => {
                const angle = idx * angleStep - Math.PI / 2;
                const r = level * radius;
                return `${(center + r * Math.cos(angle)).toFixed(2)},${(center + r * Math.sin(angle)).toFixed(2)}`;
              })
              .join(' ');
            return (
              <polygon
                key={`level-${level}`}
                points={levelPoints}
                fill="none"
                stroke="var(--border-subtle)"
                strokeDasharray={level === 1.0 ? 'none' : '3 3'}
                strokeWidth={level === 1.0 ? 1.2 : 0.6}
                opacity={0.7}
              />
            );
          })}

          {/* Level Percentage Markers */}
          {levels.map((level) => (
            <text
              key={`label-lvl-${level}`}
              x={center + 4}
              y={center - level * radius + 10}
              fontSize="9px"
              fontWeight="600"
              fill="var(--text-muted)"
              opacity={0.6}
            >
              {Math.round(level * 100)}%
            </text>
          ))}

          {/* Radial Axis Spokes */}
          {dimensions.map((dim, idx) => {
            const angle = idx * angleStep - Math.PI / 2;
            const endX = center + radius * Math.cos(angle);
            const endY = center + radius * Math.sin(angle);
            const labelX = center + (radius + 24) * Math.cos(angle);
            const labelY = center + (radius + 18) * Math.sin(angle);

            const isHovered = hoveredDim?.key === dim.key;

            return (
              <g key={`spoke-${dim.key}`}>
                <line
                  x1={center}
                  y1={center}
                  x2={endX}
                  y2={endY}
                  stroke="var(--border-subtle)"
                  strokeWidth={isHovered ? 1.5 : 0.8}
                  opacity={isHovered ? 1 : 0.5}
                />
                {/* Axis Label */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'}
                  alignmentBaseline="middle"
                  fontSize="10px"
                  fontWeight={isHovered ? 800 : 600}
                  fill={isHovered ? 'var(--groww-green)' : 'var(--text-secondary)'}
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={() => setHoveredDim(dim)}
                  onMouseLeave={() => setHoveredDim(null)}
                >
                  {dim.label}
                </text>
              </g>
            );
          })}

          {/* 3. Solitary LLM Polygon (Red/Rose) */}
          {(activeArch === 'ALL' || activeArch === 'SOLITARY') && (
            <g opacity={activeArch === 'ALL' ? 0.8 : 1}>
              <path
                d={solitaryPath}
                fill="rgba(244, 63, 94, 0.15)"
                stroke="#f43f5e"
                strokeWidth={1.8}
                strokeDasharray="4 3"
              />
              {dimensions.map((d, idx) => {
                const { x, y } = getCoordinates(d.solitary, idx);
                return <circle key={`dot-sol-${d.key}`} cx={x} cy={y} r={3} fill="#f43f5e" />;
              })}
            </g>
          )}

          {/* 2. ReAct Agent Polygon (Amber) */}
          {(activeArch === 'ALL' || activeArch === 'REACT') && (
            <g opacity={activeArch === 'ALL' ? 0.85 : 1}>
              <path
                d={reactPath}
                fill="rgba(245, 158, 11, 0.18)"
                stroke="#f59e0b"
                strokeWidth={1.8}
              />
              {dimensions.map((d, idx) => {
                const { x, y } = getCoordinates(d.react, idx);
                return <circle key={`dot-react-${d.key}`} cx={x} cy={y} r={3} fill="#f59e0b" />;
              })}
            </g>
          )}

          {/* 1. ArthaAI Multi-Agent Polygon (Emerald Green) */}
          {(activeArch === 'ALL' || activeArch === 'MULTI') && (
            <g opacity={1}>
              <path
                d={multiAgentPath}
                fill="rgba(0, 208, 156, 0.3)"
                stroke="var(--groww-green)"
                strokeWidth={2.4}
                filter="drop-shadow(0px 2px 8px rgba(0, 208, 156, 0.4))"
              />
              {dimensions.map((d, idx) => {
                const { x, y } = getCoordinates(d.multiAgent, idx);
                return (
                  <circle
                    key={`dot-multi-${d.key}`}
                    cx={x}
                    cy={y}
                    r={hoveredDim?.key === d.key ? 5.5 : 4}
                    fill="var(--groww-green)"
                    stroke="#0F1217"
                    strokeWidth={1.5}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Legend with Values */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--groww-green)' }} />
            <strong style={{ color: 'var(--groww-green)' }}>ArthaAI Fleet</strong>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {hoveredDim ? `${hoveredDim.multiAgent.toFixed(1)}%` : 'Avg 91.2%'} (Leader)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <strong style={{ color: '#f59e0b' }}>ReAct Agent</strong>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {hoveredDim ? `${hoveredDim.react.toFixed(1)}%` : 'Avg 71.3%'} (-19.9 pts)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }} />
            <strong style={{ color: '#f43f5e' }}>Solitary LLM</strong>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {hoveredDim ? `${hoveredDim.solitary.toFixed(1)}%` : 'Avg 34.4%'} (-56.8 pts)
          </span>
        </div>
      </div>
    </div>
  );
};
