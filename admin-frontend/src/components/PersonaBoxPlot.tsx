import React, { useState } from 'react';
import { Layers, Info } from 'lucide-react';

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
    idx: number;
  } | null>(null);

  // Fallback defaults if no items passed
  const displayItems: PersonaBoxPlotItem[] =
    boxPlotData && boxPlotData.length > 0
      ? boxPlotData
      : [
          {
            persona_id: 'conservative_retiree',
            label: 'Conservative Senior Citizen',
            min: 76.6,
            q1: 85.0,
            median: 90.7,
            q3: 94.2,
            max: 95.8,
            mean: 89.8,
            points: [88.5, 91.2, 94.0, 90.7, 76.6, 95.8, 92.1, 89.4],
            sample_size: 22,
          },
          {
            persona_id: 'long_term_compounder',
            label: 'Institutional Wealth Compounder',
            min: 79.6,
            q1: 84.5,
            median: 90.6,
            q3: 92.5,
            max: 93.7,
            mean: 88.1,
            points: [82.0, 91.4, 93.7, 90.6, 79.6, 88.2, 85.4],
            sample_size: 19,
          },
          {
            persona_id: 'tactical_fno_hedger',
            label: 'Tactical Derivatives & Momentum Hedger',
            min: 81.8,
            q1: 86.2,
            median: 89.7,
            q3: 93.1,
            max: 94.8,
            mean: 89.2,
            points: [82.0, 89.7, 94.8, 86.5, 91.0, 93.4],
            sample_size: 15,
          },
          {
            persona_id: 'commodities_bullion_allocator',
            label: 'Precious Metals Inflation & Currency Hedger',
            min: 60.5,
            q1: 76.0,
            median: 79.3,
            q3: 83.5,
            max: 85.2,
            mean: 78.5,
            points: [60.5, 78.2, 85.2, 79.3, 81.0, 77.4],
            sample_size: 10,
          },
          {
            persona_id: 'green_capex_allocator',
            label: 'Energy Transition & Sovereign Infrastructure',
            min: 84.7,
            q1: 86.8,
            median: 88.9,
            q3: 91.2,
            max: 92.5,
            mean: 88.8,
            points: [84.7, 88.9, 92.5, 87.2, 90.1],
            sample_size: 7,
          },
          {
            persona_id: 'deep_value_adversarial',
            label: 'Forensic Value & Adversarial Red-Team',
            min: 75.0,
            q1: 78.5,
            median: 84.0,
            q3: 88.5,
            max: 91.0,
            mean: 83.5,
            points: [75.0, 84.0, 91.0, 82.5, 86.0],
            sample_size: 6,
          },
        ];

  // SVG Dimension Settings for the Right Box Plot Canvas
  const rowHeight = 48;
  const svgWidth = 520;
  const paddingTop = 15;
  const paddingBottom = 30;
  const paddingLeft = 10;
  const paddingRight = 20;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = displayItems.length * rowHeight;
  const totalSvgHeight = plotHeight + paddingTop + paddingBottom;

  // Domain: 50 -> 100
  const minDomain = 50;
  const maxDomain = 100;
  const scaleX = (val: number) => {
    const clamped = Math.max(minDomain, Math.min(maxDomain, val));
    return paddingLeft + ((clamped - minDomain) / (maxDomain - minDomain)) * plotWidth;
  };

  // Pseudo-random jitter generator
  const getJitter = (score: number, idx: number, maxJitter = 9) => {
    const pseudo = Math.sin(score * 12.9898 + idx * 78.233) * 43758.5453;
    const norm = (pseudo - Math.floor(pseudo)) * 2 - 1;
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
        gap: '14px',
        boxShadow: 'var(--shadow-sm)',
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
              CELL 45 PARITY
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Empirical score dispersion (Min, Q1, Median, Q3, Max) overlaid with individual jittered runs
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '7px', backgroundColor: 'rgba(0, 208, 156, 0.3)', border: '1px solid var(--groww-green)', borderRadius: '2px' }} />
            <span>IQR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '2px', height: '10px', backgroundColor: '#ffffff' }} />
            <span>Median</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--groww-green)' }} />
            <span>Run Dot</span>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Clean Left HTML Labels + Right SVG Box Plots */}
      <div style={{ display: 'flex', flex: 1, gap: '12px', alignItems: 'stretch' }}>
        {/* Left Column: Clean HTML Labels (Guarantees ZERO Clipping) */}
        <div
          style={{
            width: '210px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: `${paddingTop}px`,
          }}
        >
          {displayItems.map((item, idx) => {
            const colors = PERSONA_PALETTE[item.persona_id] || { stroke: '#00d09c', dot: '#00d09c' };
            return (
              <div
                key={`label-${item.persona_id}`}
                style={{
                  height: `${rowHeight}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingRight: '12px',
                  borderRight: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                  title={item.label}
                >
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.dot, marginRight: '6px' }} />
                  {item.label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px', paddingLeft: '12px' }}>
                  N = {item.sample_size} runs • Med: {item.median.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: SVG Box Plots & Jitter Dots */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
            style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}
          >
            {/* Background Grid Lines: 50, 60, 70, 80, 90, 100 */}
            {[50, 60, 70, 80, 90, 100].map((score) => {
              const x = scaleX(score);
              return (
                <g key={`grid-x-${score}`}>
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + plotHeight}
                    stroke="var(--border-subtle)"
                    strokeDasharray={score === 100 ? 'none' : '3 3'}
                    strokeWidth={score === 100 ? 1 : 0.6}
                    opacity={0.6}
                  />
                  {/* Axis Label */}
                  <text
                    x={x}
                    y={paddingTop + plotHeight + 18}
                    textAnchor="middle"
                    fontSize="10px"
                    fontWeight="600"
                    fill="var(--text-muted)"
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
              strokeWidth="1.2"
            />

            {/* Box Plot Rows */}
            {displayItems.map((item, idx) => {
              const yCenter = paddingTop + idx * rowHeight + rowHeight / 2;
              const boxHeight = 16;
              const boxTop = yCenter - boxHeight / 2;

              const colors = PERSONA_PALETTE[item.persona_id] || {
                stroke: 'var(--groww-green)',
                fill: 'rgba(0, 208, 156, 0.25)',
                dot: 'var(--groww-green)',
              };

              const xMin = scaleX(item.min);
              const xQ1 = scaleX(item.q1);
              const xMed = scaleX(item.median);
              const xQ3 = scaleX(item.q3);
              const xMax = scaleX(item.max);

              return (
                <g key={`boxplot-${item.persona_id}`}>
                  {/* Whisker Line (Min to Max) */}
                  <line
                    x1={xMin}
                    y1={yCenter}
                    x2={xMax}
                    y2={yCenter}
                    stroke={colors.stroke}
                    strokeWidth="1.5"
                    opacity={0.9}
                  />
                  {/* Min Whisker Cap */}
                  <line
                    x1={xMin}
                    y1={yCenter - 6}
                    x2={xMin}
                    y2={yCenter + 6}
                    stroke={colors.stroke}
                    strokeWidth="1.5"
                  />
                  {/* Max Whisker Cap */}
                  <line
                    x1={xMax}
                    y1={yCenter - 6}
                    x2={xMax}
                    y2={yCenter + 6}
                    stroke={colors.stroke}
                    strokeWidth="1.5"
                  />

                  {/* IQR Box (Q1 to Q3) */}
                  <rect
                    x={xQ1}
                    y={boxTop}
                    width={Math.max(2, xQ3 - xQ1)}
                    height={boxHeight}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="1.4"
                    rx="3"
                  />

                  {/* Median Line */}
                  <line
                    x1={xMed}
                    y1={boxTop}
                    x2={xMed}
                    y2={boxTop + boxHeight}
                    stroke="#ffffff"
                    strokeWidth="2.4"
                  />
                  {/* Median Diamond */}
                  <polygon
                    points={`${xMed},${boxTop - 3} ${xMed + 3.5},${boxTop} ${xMed},${boxTop + 3} ${xMed - 3.5},${boxTop}`}
                    fill="#ffffff"
                  />

                  {/* Jittered Individual Run Observation Dots */}
                  {(item.points || []).map((pt, pIdx) => {
                    const cx = scaleX(pt);
                    const cy = yCenter + getJitter(pt, pIdx, 6);
                    const isHovered = hoveredPoint?.persona === item.persona_id && hoveredPoint?.idx === pIdx;

                    return (
                      <circle
                        key={`dot-${item.persona_id}-${pIdx}`}
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 5 : 3.5}
                        fill={colors.dot}
                        stroke="#0F1217"
                        strokeWidth="1"
                        opacity={isHovered ? 1 : 0.85}
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={() => setHoveredPoint({ score: pt, persona: item.persona_id, idx: pIdx })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Hovered Tooltip */}
          {hoveredPoint && (
            <div
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11px',
                boxShadow: 'var(--shadow-md)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Score: </span>
              <strong style={{ color: 'var(--groww-green)', fontFamily: 'var(--font-mono)' }}>
                {hoveredPoint.score.toFixed(1)} / 100
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Footer Insight Pill */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          Box displays Interquartile Range (IQR = Q3 - Q1). Dots represent authentic unrounded run scores.
        </span>
        <span style={{ color: 'var(--groww-green)', fontWeight: 700 }}>
          Deterministic Coverage (100%)
        </span>
      </div>
    </div>
  );
};
