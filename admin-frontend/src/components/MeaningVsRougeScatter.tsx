import React, { useState } from 'react';
import { Target, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface MeaningScatterPoint {
  id: string;
  symbol: string;
  rouge_l: number;
  meaning_match: number;
  contradicts: boolean;
  persona: string;
}

interface MeaningVsRougeScatterProps {
  points?: MeaningScatterPoint[];
}

const PERSONA_COLORS: Record<string, string> = {
  conservative_retiree: '#10b981',
  long_term_compounder: '#38bdf8',
  tactical_fno_hedger: '#f59e0b',
  commodities_bullion_allocator: '#eab308',
  green_capex_allocator: '#2dd4bf',
  deep_value_adversarial: '#c084fc',
};

export const MeaningVsRougeScatter: React.FC<MeaningVsRougeScatterProps> = ({
  points = [],
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<MeaningScatterPoint | null>(null);

  // SVG Coordinate mapping
  const width = 760;
  const height = 360;
  const paddingLeft = 55;
  const paddingRight = 45;
  const paddingTop = 35;
  const paddingBottom = 45;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // X maps ROUGE-L 0.0 - 1.0
  const scaleX = (rouge: number) => paddingLeft + Math.max(0, Math.min(1.0, rouge)) * plotWidth;

  // Y maps Meaning Match 1.0 - 5.0 (inverted: 5.0 at top, 1.0 at bottom)
  const scaleY = (match: number) => {
    const clamped = Math.max(1.0, Math.min(5.0, match));
    const norm = (clamped - 1.0) / 4.0;
    return paddingTop + (1.0 - norm) * plotHeight;
  };

  const midX = scaleX(0.45);
  const midY = scaleY(3.5);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} color="var(--groww-green)" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              ROUGE-L Word Overlap vs. Semantic Meaning Match Analysis
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
              CELL 56 PARITY • DUAL-AXIS SYNTHESIS
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Evaluates whether the MAS agent achieved true conceptual synthesis (high meaning match) without verbatim regurgitation (low ROUGE-L)
          </span>
        </div>

        {/* Quadrant Legend Pill */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: 'rgba(0, 208, 156, 0.15)',
              color: 'var(--groww-green)',
              border: '1px solid rgba(0, 208, 156, 0.3)',
              padding: '4px 10px',
              borderRadius: '6px',
            }}
          >
            TOP-LEFT: OPTIMAL SYNTHESIS QUADRANT
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', minWidth: `${width}px`, height: 'auto', display: 'block' }}
        >
          {/* Quadrant 1: Top-Left (OPTIMAL HIGH-ABSTRACTION SYNTHESIS) */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={midX - paddingLeft}
            height={midY - paddingTop}
            fill="rgba(0, 208, 156, 0.06)"
            rx="4"
          />
          <text
            x={paddingLeft + 12}
            y={paddingTop + 20}
            fill="var(--groww-green)"
            fontSize="11"
            fontWeight="800"
          >
            ★ HIGH-ABSTRACTION SYNTHESIS (IDEAL)
          </text>
          <text
            x={paddingLeft + 12}
            y={paddingTop + 34}
            fill="var(--text-muted)"
            fontSize="9"
          >
            Low verbatim overlap (ROUGE &lt; 0.45) • High semantic accuracy (&ge; 3.5)
          </text>

          {/* Quadrant 2: Top-Right (VERBATIM ALIGNMENT) */}
          <rect
            x={midX}
            y={paddingTop}
            width={paddingLeft + plotWidth - midX}
            height={midY - paddingTop}
            fill="rgba(2, 132, 199, 0.04)"
            rx="4"
          />
          <text
            x={midX + 12}
            y={paddingTop + 20}
            fill="#38bdf8"
            fontSize="10"
            fontWeight="700"
          >
            VERBATIM GROUNDING
          </text>

          {/* Quadrant 3: Bottom-Left (OMISSION / WEAK MEANING) */}
          <rect
            x={paddingLeft}
            y={midY}
            width={midX - paddingLeft}
            height={paddingTop + plotHeight - midY}
            fill="rgba(239, 68, 68, 0.04)"
            rx="4"
          />
          <text
            x={paddingLeft + 12}
            y={midY + 20}
            fill="#dc2626"
            fontSize="10"
            fontWeight="700"
          >
            OMISSION / WEAK FIDELITY
          </text>

          {/* Quadrant 4: Bottom-Right (SUPERFICIAL COPYING) */}
          <rect
            x={midX}
            y={midY}
            width={paddingLeft + plotWidth - midX}
            height={paddingTop + plotHeight - midY}
            fill="rgba(217, 119, 6, 0.04)"
            rx="4"
          />
          <text
            x={midX + 12}
            y={midY + 20}
            fill="#d97706"
            fontSize="10"
            fontWeight="700"
          >
            SUPERFICIAL QUOTING
          </text>

          {/* Quadrant Dividing Crosshairs */}
          <line
            x1={midX}
            y1={paddingTop}
            x2={midX}
            y2={paddingTop + plotHeight}
            stroke="var(--border-subtle)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <line
            x1={paddingLeft}
            y1={midY}
            x2={paddingLeft + plotWidth}
            y2={midY}
            stroke="var(--border-subtle)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* X-Axis Ticks & Labels (ROUGE-L 0.0 to 1.0) */}
          {[0.0, 0.2, 0.4, 0.6, 0.8, 1.0].map((rVal) => {
            const x = scaleX(rVal);
            return (
              <g key={`x-tick-${rVal}`}>
                <line
                  x1={x}
                  y1={paddingTop + plotHeight}
                  x2={x}
                  y2={paddingTop + plotHeight + 5}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={paddingTop + plotHeight + 18}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {rVal.toFixed(1)}
                </text>
              </g>
            );
          })}
          <text
            x={paddingLeft + plotWidth / 2}
            y={paddingTop + plotHeight + 35}
            fill="var(--text-secondary)"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            ROUGE-L Word Overlap with Reference Ground Truth (Lower is Higher Abstraction) →
          </text>

          {/* Y-Axis Ticks & Labels (Meaning Match 1.0 to 5.0) */}
          {[1.0, 2.0, 3.0, 4.0, 5.0].map((mVal) => {
            const y = scaleY(mVal);
            return (
              <g key={`y-tick-${mVal}`}>
                <line
                  x1={paddingLeft - 5}
                  y1={y}
                  x2={paddingLeft}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {mVal.toFixed(1)}
                </text>
              </g>
            );
          })}
          <text
            x={-height / 2}
            y={16}
            fill="var(--text-secondary)"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            transform="rotate(-90)"
          >
            Semantic Meaning Match (1.0 to 5.0) →
          </text>

          {/* Data Points */}
          {points.map((pt, pIdx) => {
            const cx = scaleX(pt.rouge_l);
            const cy = scaleY(pt.meaning_match);
            const color = PERSONA_COLORS[pt.persona] || 'var(--groww-green)';

            return (
              <g
                key={`scatter-${pt.id}-${pIdx}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={hoveredPoint?.id === pt.id ? 8 : 5.5}
                  fill={color}
                  stroke="#0F1217"
                  strokeWidth="1.5"
                  opacity={0.9}
                  style={{ transition: 'all 0.15s ease' }}
                />
                {/* Scenario Label text if in top quadrant */}
                <text
                  x={cx + 8}
                  y={cy + 3}
                  fill="var(--text-primary)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                  opacity={0.8}
                >
                  {pt.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              right: '20px',
              top: '20px',
              backgroundColor: '#0F1217',
              border: '1px solid var(--groww-green)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '11px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 20,
              minWidth: '220px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, color: 'var(--groww-green)', fontSize: '13px' }}>
                Scenario {hoveredPoint.id}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {hoveredPoint.symbol}
              </span>
            </div>
            <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
              Semantic Meaning Match: <strong>{hoveredPoint.meaning_match.toFixed(1)} / 5.0</strong>
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
              ROUGE-L Word Overlap: <strong>{hoveredPoint.rouge_l.toFixed(2)}</strong>
            </div>
            <div style={{ color: hoveredPoint.contradicts ? '#dc2626' : 'var(--groww-green)', fontWeight: 700 }}>
              {hoveredPoint.contradicts ? '⚠️ Contradicts Ground Truth' : '✓ 100% Truth Grounded (Zero Contradiction)'}
            </div>
          </div>
        )}
      </div>

      {/* Footer Notes */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>
          <strong>Academic Verification:</strong> High semantic match combined with modest word overlap verifies true quantitative synthesis without verbatim pattern memorization.
        </span>
        <span style={{ color: 'var(--groww-green)', fontWeight: 700 }}>
          Evaluated via Reference Truth Library
        </span>
      </div>
    </div>
  );
};

