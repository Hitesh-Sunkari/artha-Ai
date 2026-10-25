import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
} from 'lucide-react';
import type { LifecycleEvent } from '../api/types';

interface BarData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FinancialChartsProps {
  symbol: string;
  bars?: BarData[];
  metrics?: Record<string, any>;
  events?: LifecycleEvent[];
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  symbol,
  bars = [],
  metrics = {},
  events = [],
}) => {
  const [hoveredBar, setHoveredBar] = useState<BarData | null>(null);

  const hasBars = bars && bars.length > 0;

  // Compute scale bounds for candlestick chart
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let maxVolume = 1;

  if (hasBars) {
    bars.forEach((b) => {
      if (b.low < minPrice) minPrice = b.low;
      if (b.high > maxPrice) maxPrice = b.high;
      if (b.volume > maxVolume) maxVolume = b.volume;
    });
    // Add 5% padding
    const pPad = (maxPrice - minPrice) * 0.05 || 10;
    minPrice -= pPad;
    maxPrice += pPad;
  }

  // Latency breakdown per agent
  const agentDurations: { id: string; name: string; framework: string; durationMs: number }[] = [];
  events.forEach((e) => {
    if (e.duration_ms && (e.event_type === 'AGENT_COMPLETE' || e.event_type === 'TOOL_COMPLETE')) {
      const existing = agentDurations.find((a) => a.id === e.agent_id);
      if (existing) {
        existing.durationMs = Math.max(existing.durationMs, e.duration_ms);
      } else {
        const cleanName = e.agent_id
          .replace('adk_', '')
          .replace('crewai_', '')
          .replace(/_/g, ' ')
          .toUpperCase();
        agentDurations.push({
          id: e.agent_id,
          name: cleanName,
          framework: e.framework || (e.agent_id.startsWith('adk') ? 'GOOGLE_ADK' : 'CREWAI'),
          durationMs: e.duration_ms,
        });
      }
    }
  });

  const maxDuration = Math.max(...agentDurations.map((a) => a.durationMs), 1);

  // Width & height of SVG candlestick canvas
  const svgWidth = 740;
  const svgHeight = 220;
  const volHeight = 50;
  const priceHeight = svgHeight - volHeight - 20;

  const barWidth = hasBars ? Math.max(2, Math.min(14, (svgWidth - 60) / bars.length - 2)) : 8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. OHLCV Candlestick & Indicator Chart */}
      <div className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent-cyan)' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Historical Price & Moving Average Overlay ({symbol})
            </h4>
          </div>

          {hasBars && hoveredBar && (
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', display: 'flex', gap: '12px' }}>
              <span>D: {hoveredBar.timestamp.slice(0, 10)}</span>
              <span>O: ₹{hoveredBar.open.toFixed(2)}</span>
              <span>H: ₹{hoveredBar.high.toFixed(2)}</span>
              <span>L: ₹{hoveredBar.low.toFixed(2)}</span>
              <span>C: ₹{hoveredBar.close.toFixed(2)}</span>
              <span>Vol: {hoveredBar.volume.toLocaleString()}</span>
            </div>
          )}
        </div>

        {!hasBars ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px dashed var(--border-medium)',
              borderRadius: '6px',
            }}
          >
            <Database size={28} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              No Historical Parquet Bars Available for {symbol}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '480px', margin: '4px auto 0' }}>
              Historical market data store has zero pre-recorded observations for this symbol in selected window.
              Candlestick price charting is omitted to strictly prevent numerical hallucination.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#060911', borderRadius: '6px', padding: '10px' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              {/* Horizontal Price Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                const y = 10 + priceHeight * frac;
                const priceVal = maxPrice - (maxPrice - minPrice) * frac;
                return (
                  <g key={idx}>
                    <line x1="45" y1={y} x2={svgWidth - 10} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <text x="5" y={y + 3} fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                      ₹{priceVal.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Candlesticks & Volume Bars */}
              {bars.map((b, i) => {
                const x = 50 + i * ((svgWidth - 65) / bars.length);
                const isBull = b.close >= b.open;
                const color = isBull ? 'var(--accent-emerald)' : 'var(--accent-rose)';

                // Price coordinates
                const highY = 10 + ((maxPrice - b.high) / (maxPrice - minPrice)) * priceHeight;
                const lowY = 10 + ((maxPrice - b.low) / (maxPrice - minPrice)) * priceHeight;
                const openY = 10 + ((maxPrice - b.open) / (maxPrice - minPrice)) * priceHeight;
                const closeY = 10 + ((maxPrice - b.close) / (maxPrice - minPrice)) * priceHeight;

                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(2, Math.abs(closeY - openY));

                // Volume bar
                const vBarHeight = Math.max(2, (b.volume / maxVolume) * (volHeight - 10));
                const vBarY = svgHeight - vBarHeight;

                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredBar(b)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Wick */}
                    <line x1={x + barWidth / 2} y1={highY} x2={x + barWidth / 2} y2={lowY} stroke={color} strokeWidth="1" />
                    {/* Body */}
                    <rect
                      x={x}
                      y={bodyTop}
                      width={barWidth}
                      height={bodyHeight}
                      fill={color}
                      rx="1"
                    />
                    {/* Volume Bar */}
                    <rect
                      x={x}
                      y={vBarY}
                      width={barWidth}
                      height={vBarHeight}
                      fill={color}
                      opacity={0.35}
                    />
                  </g>
                );
              })}

              {/* Volume Separator */}
              <line x1="45" y1={svgHeight - volHeight} x2={svgWidth - 10} y2={svgHeight - volHeight} stroke="rgba(255,255,255,0.12)" />
              <text x="5" y={svgHeight - volHeight + 12} fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-mono)">
                VOL
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* 2. Technical Indicators & RSI Panel */}
      {hasBars && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* RSI Gauge */}
          <div className="terminal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={15} style={{ color: 'var(--accent-indigo)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Relative Strength Index (RSI 14)
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {metrics.latest_rsi ? Number(metrics.latest_rsi).toFixed(2) : 'N/A'}
              </span>
            </div>

            {/* RSI Level Bar */}
            {metrics.latest_rsi !== null && metrics.latest_rsi !== undefined && (
              <div>
                <div style={{ height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, Number(metrics.latest_rsi)))}%`,
                      backgroundColor:
                        Number(metrics.latest_rsi) > 70
                          ? 'var(--accent-rose)'
                          : Number(metrics.latest_rsi) < 30
                          ? 'var(--accent-cyan)'
                          : 'var(--accent-emerald)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  <span>0 (Oversold &lt;30)</span>
                  <span>50 (Neutral)</span>
                  <span>100 (Overbought &gt;70)</span>
                </div>
              </div>
            )}
          </div>

          {/* Realized Volatility Panel */}
          <div className="terminal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Annualized Realized Volatility
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {metrics.realized_volatility_annualized
                  ? `${(Number(metrics.realized_volatility_annualized) * 100).toFixed(2)}%`
                  : 'N/A'}
              </span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Computed over 20-trading-day lookback window with 252 annualization factor. Zero future leakage enforced by UTC as-of timestamp cutoff.
            </div>
          </div>
        </div>
      )}

      {/* 3. Multi-Agent Duration & Latency Breakdown */}
      {agentDurations.length > 0 && (
        <div className="terminal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Specialist Agent Execution Latency Breakdown
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {agentDurations.map((agent) => {
              const pct = (agent.durationMs / maxDuration) * 100;
              const isADK = agent.framework === 'GOOGLE_ADK';
              return (
                <div key={agent.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {agent.name}{' '}
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: isADK ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: isADK ? 'var(--accent-cyan)' : 'var(--accent-indigo)',
                          marginLeft: '6px',
                        }}
                      >
                        {isADK ? 'ADK' : 'CREWAI'}
                      </span>
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{agent.durationMs.toFixed(1)} ms</span>
                  </div>

                  <div style={{ height: '6px', backgroundColor: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(2, pct)}%`,
                        backgroundColor: isADK ? 'var(--accent-cyan)' : 'var(--accent-indigo)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
