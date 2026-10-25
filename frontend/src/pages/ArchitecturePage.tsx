import React, { useEffect, useState } from 'react';
import {
  GitFork,
  Brain,
  Cpu,
  Server,
  Database,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  Newspaper,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import type { SystemStatusResponse } from '../api/types';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';

export const ArchitecturePage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
    } catch {
      // Keep previous
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            System Architecture & Multi-Agent Fleet
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Google ADK coordinator, CrewAI specialists, FastMCP tools, and official A2A protocol topology
          </div>
        </div>

        <button onClick={loadStatus} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Interactive Topology Diagram */}
      <ArchitectureDiagram />

      {/* Specialist Fleet Directory */}
      <div className="terminal-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Registered Specialist Agents (Seven Roles)
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Every specialist implements typed inputs and contributions to the shared Blackboard state
        </p>

        <div className="grid-cols-2" style={{ gap: '16px' }}>
          {/* ADK Specialist Fleet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Google ADK Specialists (4 Agents)
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #818cf8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>1. Research Manager</span>
                <span className="status-pill status-framework-adk" style={{ fontSize: '10px' }}>Google ADK</span>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                adk_research_manager
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Coordinates request intake, Blackboard initialization, pattern dispatch (Sequential, Parallel, Hierarchical), and Pydantic v2 final report synthesis.
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #818cf8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>2. Quant Specialist</span>
                <span className="status-pill status-framework-adk" style={{ fontSize: '10px' }}>Google ADK</span>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                adk_quant_specialist
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Invokes FastMCP tool <span className="font-mono">query_market_data</span> over DuckDB Parquet storage. Computes returns, 20d volatility, SMA, EMA, and RSI.
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #818cf8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>3. Microstructure Specialist</span>
                <span className="status-pill status-framework-adk" style={{ fontSize: '10px' }}>Google ADK</span>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                adk_microstructure_specialist
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Evaluates orderbook liquidity, depth, effective bid-ask spread, and Kyle's lambda price impact bounds.
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #818cf8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>4. Risk Validator</span>
                <span className="status-pill status-framework-adk" style={{ fontSize: '10px' }}>Google ADK</span>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                adk_risk_validator
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Mandatory gating agent. Calculates exact Indian statutory costs (STT, GST, Stamp Duty, Exchange & SEBI fees) and enforces live trading prohibition.
              </div>
            </div>
          </div>

          {/* CrewAI A2A Specialist Fleet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CrewAI Specialists (3 Agents via Official A2A Protocol)
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #f472b6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>5. News & Macro Specialist</span>
                <span className="status-pill status-framework-crewai" style={{ fontSize: '10px' }}>CrewAI A2A</span>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#f472b6', marginTop: '2px' }}>
                crewai_news_macro_specialist
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Analyzes RBI monetary policy circulars, interest rate trajectory, inflation data, and sector-wide sentiment.
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #f472b6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>6. Corporate Filing Specialist</span>
                <span className="status-pill status-framework-crewai" style={{ fontSize: '10px' }}>CrewAI A2A</span>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#f472b6', marginTop: '2px' }}>
                crewai_corporate_filing_specialist
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Parses quarterly earnings notes, auditor qualifications, shareholder pattern changes, and BSE/NSE regulatory filings.
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #f472b6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>7. Adversarial Skeptic</span>
                <span className="status-pill status-framework-crewai" style={{ fontSize: '10px' }}>CrewAI A2A</span>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#f472b6', marginTop: '2px' }}>
                crewai_adversarial_specialist
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Devil's advocate reviewer. Rigorously stress-tests sample size, identifies lookahead risks, flags zero-data statistical fragility, and challenges momentum theses.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
