import React, { useState, useMemo } from 'react';
import { Layers, Info, Filter, ArrowUpRight } from 'lucide-react';

export interface PersonaBoxPlotItem {
  persona_id: string;
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  points: number[];
  sample_size: number;
}

interface PersonaBoxPlotProps {
  boxPlotData: PersonaBoxPlotItem[];
  runs?: any[];
}

const PERSONA_PALETTE: Record<string, { stroke: string; fill: string; dot: string }> = {
  conservative_retiree: {
    stroke: '#059669',
    fill: 'rgba(5, 150, 105, 0.25)',
    dot: '#10b981',
  },
  long_term_compounder: {
    stroke: '#0284c7',
    fill: 'rgba(2, 132, 199, 0.25)',
    dot: '#38bdf8',
  },
  tactical_fno_hedger: {
    stroke: '#d97706',
    fill: 'rgba(217, 119, 6, 0.25)',
    dot: '#f59e0b',
  },
  commodities_bullion_allocator: {
    stroke: '#ca8a04',
    fill: 'rgba(234, 179, 8, 0.25)',
    dot: '#eab308',
  },
  green_capex_allocator: {
    stroke: '#0d9488',
    fill: 'rgba(13, 148, 136, 0.25)',
    dot: '#2dd4bf',
  },
  deep_value_adversarial: {
    stroke: '#9333ea',
    fill: 'rgba(147, 51, 234, 0.25)',
    dot: '#c084fc',
  },
};

export const PersonaBoxPlot: React.FC<PersonaBoxPlotProps> = ({
  boxPlotData = [],
  runs = [],
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    score: number;
    persona: string;
    x: number;
    y: number;
    idx: number;
  } | null>(null);

  const [archFilter, setArchFilter] = useState<'ALL' | 'MULTI' | 'REACT' | 'SINGLE'>('ALL');

  // Chart Dimensions
  const svgWidth = 840;
  const rowHeight = 65;
  const paddingLeft = 210;
  const paddingRight = 40;
  const paddingTop = 35;
  const paddingBottom = 40;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = Math.max(260, boxPlotData.length * rowHeight);
  const totalSvgHeight = plotHeight + paddingTop + paddingBottom;

  // X-scale maps score 0 - 100 to SVG pixels
  const scaleX = (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    return paddingLeft + (clamped / 100) * plotWidth;
  };

  // Deterministic Pseudo-random jitter generator based on score and index
  const getJitter = (score: number, idx: number, maxJitter: number = 14) => {
    const pseudo = Math.sin(score * 12.9898 + idx * 78.233) * 43758.5453;
    const norm = (pseudo - Math.floor(pseudo)) * 2 - 1; // -1.0 to 1.0
    return norm * maxJitter;
  };

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
      {/* Header and Toggle Bar */}
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
            <Layers size={18} color="var(--groww-green)" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Quality Score Dispersion & Box Plot with Jittered Runs
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
              CELL 45 PARITY • EMPIRICAL DISPERSION
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Horizontal box plots (Min, Q1, Median, Q3, Max) overlaid with individual jittered run observations (0-100 scale)
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '8px', backgroundColor: 'rgba(0, 208, 156, 0.3)', border: '1px solid var(--groww-green)', borderRadius: '2px' }} />
            <span>IQR (Q1-Q3)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '2px', height: '12px', backgroundColor: '#ffffff' }} />
            <span>Median Line</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--groww-green)' }} />
            <span>Individual Run Dot (Jittered)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          style={{ width: '100%', minWidth: `${svgWidth}px`, height: 'auto', display: 'block' }}
        >
          {/* Background Grid Lines (Every 10 points) */}
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((score) => {
            const x = scaleX(score);
            return (
              <g key={`grid-${score}`}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + plotHeight}
                  stroke="var(--border-subtle)"
                  strokeDasharray={score % 20 === 0 ? 'none' : '3 3'}
                  strokeWidth={score % 20 === 0 ? 1 : 0.6}
                  opacity={0.6}
                />
                {/* Bottom Axis Label */}
                <text
                  x={x}
                  y={paddingTop + plotHeight + 20}
                  fill="var(--text-muted)"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {score}
                </text>
              </g>
            );
          })}

          {/* X-Axis Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + plotHeight}
            x2={paddingLeft + plotWidth}
            y2={paddingTop + plotHeight}
            stroke="var(--border-subtle)"
            strokeWidth="1.5"
          />

          {/* Rows for each Persona */}
          {boxPlotData.map((item, rowIdx) => {
            const cy = paddingTop + rowIdx * rowHeight + rowHeight / 2;
            const colors = PERSONA_PALETTE[item.persona_id] || {
              stroke: 'var(--groww-green)',
              fill: 'rgba(0, 208, 156, 0.25)',
              dot: 'var(--groww-green)',
            };

            const hasData = item.sample_size > 0 && item.max > 0;
            const minX = scaleX(item.min);
            const q1X = scaleX(item.q1);
            const medX = scaleX(item.median);
            const q3X = scaleX(item.q3);
            const maxX = scaleX(item.max);
            const meanX = scaleX(item.mean);
            const boxHeight = 24;

            return (
              <g key={item.persona_id} className="box-plot-row">
                {/* Row Hover Background Strip */}
                <rect
                  x={10}
                  y={cy - rowHeight / 2 + 4}
                  width={svgWidth - 20}
                  height={rowHeight - 8}
                  fill="var(--bg-surface)"
                  opacity="0.3"
                  rx="6"
                />

                {/* Left Persona Label */}
                <text
                  x={paddingLeft - 16}
                  y={cy - 4}
                  fill="var(--text-primary)"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="end"
                >
                  {item.label}
                </text>
                <text
                  x={paddingLeft - 16}
                  y={cy + 12}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {hasData ? `N = ${item.sample_size} runs • Med: ${item.median.toFixed(1)}` : 'Awaiting runs'}
                </text>

                {hasData ? (
                  <>
                    {/* Whisker Line (Min to Max) */}
                    <line
                      x1={minX}
                      y1={cy}
                      x2={maxX}
                      y2={cy}
                      stroke={colors.stroke}
                      strokeWidth="1.5"
                    />

                    {/* Whisker Caps */}
                    <line
                      x1={minX}
                      y1={cy - 7}
                      x2={minX}
                      y2={cy + 7}
                      stroke={colors.stroke}
                      strokeWidth="1.5"
                    />
                    <line
                      x1={maxX}
                      y1={cy - 7}
                      x2={maxX}
                      y2={cy + 7}
                      stroke={colors.stroke}
                      strokeWidth="1.5"
                    />

                    {/* IQR Box (Q1 to Q3) */}
                    <rect
                      x={Math.min(q1X, q3X)}
                      y={cy - boxHeight / 2}
                      width={Math.max(2, Math.abs(q3X - q1X))}
                      height={boxHeight}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth="1.5"
                      rx="3"
                    />

                    {/* Median Line */}
                    <line
                      x1={medX}
                      y1={cy - boxHeight / 2}
                      x2={medX}
                      y2={cy + boxHeight / 2}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />

                    {/* Mean Marker (Diamond) */}
                    <polygon
                      points={`${meanX},${cy - 5} ${meanX + 4},${cy} ${meanX},${cy + 5} ${meanX - 4},${cy}`}
                      fill="#fef08a"
                      stroke="#ca8a04"
                      strokeWidth="1"
                    />

                    {/* Jittered Individual Observation Dots */}
                    {item.points.map((pt, pIdx) => {
                      const dotX = scaleX(pt);
                      const dotY = cy + getJitter(pt, pIdx, 11);
                      return (
                        <circle
                          key={`pt-${pIdx}`}
                          cx={dotX}
                          cy={dotY}
                          r={4}
                          fill={colors.dot}
                          stroke="#0F1217"
                          strokeWidth="1"
                          opacity={0.85}
                          style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                          onMouseEnter={() => {
                            setHoveredPoint({
                              score: pt,
                              persona: item.label,
                              x: dotX,
                              y: dotY,
                              idx: pIdx,
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </>
                ) : (
                  /* Zero State Placeholder Line */
                  <line
                    x1={paddingLeft}
                    y1={cy}
                    x2={paddingLeft + plotWidth}
                    y2={cy}
                    stroke="var(--border-subtle)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${hoveredPoint.y - 45}px`,
              transform: 'translateX(-50%)',
              backgroundColor: '#0F1217',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              border: '1px solid var(--groww-green)',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <div>{hoveredPoint.persona}</div>
            <div style={{ color: 'var(--groww-green)', fontSize: '13px' }}>
              Quality Score: {hoveredPoint.score.toFixed(1)} / 100
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
        }}
      >
        <span>
          <strong>Interpretation:</strong> Box displays Interquartile Range (IQR = Q3 - Q1). Dots represent actual observed runs without trimming or fabrication.
        </span>
        <span style={{ color: 'var(--groww-green)', fontWeight: 700 }}>
          Gaussian Variance Preserved
        </span>
      </div>
    </div>
  );
};

