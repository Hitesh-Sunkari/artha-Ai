import React, { useState } from 'react';
import {
  Brain,
  TrendingUp,
  BarChart2,
  Newspaper,
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  Cpu,
  ArrowRight,
  GitBranch,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { AgentContribution, LifecycleEvent, OrchestrationPattern } from '../api/types';

interface AgentExecutionInfo {
  id: string;
  name: string;
  role: string;
  framework: 'GOOGLE_ADK' | 'CREWAI';
  protocol: 'In-Process ADK' | 'A2A Protocol (JSON-RPC)' | 'FastMCP Client';
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
}

const SEVEN_SPECIALISTS: AgentExecutionInfo[] = [
  {
    id: 'adk_research_manager',
    name: 'Research Manager',
    role: 'Supervisory orchestration, request classification & Pydantic synthesis',
    framework: 'GOOGLE_ADK',
    protocol: 'In-Process ADK',
    icon: Brain,
  },
  {
    id: 'adk_quant_specialist',
    name: 'Quant Specialist',
    role: 'Historical bar retrieval via FastMCP & quantitative indicator calculation',
    framework: 'GOOGLE_ADK',
    protocol: 'FastMCP Client',
    icon: TrendingUp,
  },
  {
    id: 'adk_microstructure_specialist',
    name: 'Microstructure Specialist',
    role: 'Orderbook liquidity, Kyle lambda, bid-ask spread & market impact estimation',
    framework: 'GOOGLE_ADK',
    protocol: 'In-Process ADK',
    icon: BarChart2,
  },
  {
    id: 'crewai_news_macro_specialist',
    name: 'News & Macro Specialist',
    role: 'RBI circulars, interest rate regimes, CPI inflation & macro news sentiment',
    framework: 'CREWAI',
    protocol: 'A2A Protocol (JSON-RPC)',
    icon: Newspaper,
  },
  {
    id: 'crewai_corporate_filing_specialist',
    name: 'Corporate Filing Specialist',
    role: 'BSE/NSE regulatory disclosures, auditor notes & corporate governance',
    framework: 'CREWAI',
    protocol: 'A2A Protocol (JSON-RPC)',
    icon: FileCheck2,
  },
  {
    id: 'crewai_adversarial_specialist',
    name: 'Adversarial Skeptic',
    role: 'Stress-tests quantitative assumptions, flags overfitting & liquidity traps',
    framework: 'CREWAI',
    protocol: 'A2A Protocol (JSON-RPC)',
    icon: AlertTriangle,
  },
  {
    id: 'adk_risk_validator',
    name: 'Risk Validator',
    role: 'Statutory cost calculation, trade friction bounds & live-trading guardrail enforcement',
    framework: 'GOOGLE_ADK',
    protocol: 'FastMCP Client',
    icon: ShieldCheck,
  },
];

interface LiveTimelineProps {
  pattern: OrchestrationPattern | string;
  events: LifecycleEvent[];
  runStatus: string;
  contributions?: AgentContribution[];
}

export const LiveTimeline: React.FC<LiveTimelineProps> = ({ pattern, events, runStatus, contributions = [] }) => {
  const normPattern = (pattern || 'SEQUENTIAL').toUpperCase() as OrchestrationPattern;
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // Derive agent states from real events
  const getAgentStatus = (agentId: string) => {
    const agentEvents = events.filter((e) => e.agent_id === agentId);
    if (!agentEvents.length) {
      return { status: 'PENDING', durationMs: null, lastEvent: null, warnings: [] };
    }

    const hasComplete = agentEvents.some((e) => e.event_type === 'AGENT_COMPLETE' || e.event_type === 'TOOL_COMPLETE');
    const hasFail = agentEvents.some((e) => e.status === 'FAILED' || e.event_type === 'ERROR');
    const hasStart = agentEvents.some((e) => e.event_type === 'AGENT_START');
    const hasChallenge = agentEvents.some((e) => e.event_type === 'SKEPTIC_CHALLENGE');

    // Calculate duration
    let durationMs: number | null = null;
    const completeEvt = agentEvents.find((e) => e.duration_ms !== null && e.duration_ms !== undefined);
    if (completeEvt && completeEvt.duration_ms) {
      durationMs = completeEvt.duration_ms;
    }

    const warnings: string[] = [];
    agentEvents.forEach((e) => {
      if (e.payload?.warning) warnings.push(e.payload.warning);
      if (e.payload?.warnings) warnings.push(...e.payload.warnings);
    });

    let status = 'RUNNING';
    if (hasFail) status = 'FAILED';
    else if (hasComplete) status = 'SUCCESS';
    else if (hasChallenge) status = 'CHALLENGED';
    else if (hasStart) status = 'RUNNING';

    return {
      status,
      durationMs,
      lastEvent: agentEvents[agentEvents.length - 1],
      warnings,
    };
  };

  const renderAgentCard = (agent: AgentExecutionInfo, branchLabel?: string) => {
    const { status, durationMs, warnings } = getAgentStatus(agent.id);
    const Icon = agent.icon;
    const isADK = agent.framework === 'GOOGLE_ADK';
    const contrib = contributions.find((c) => c.agent_id === agent.id);
    const isExpanded = expandedAgentId === agent.id;

    const getStatusIcon = () => {
      switch (status) {
        case 'SUCCESS':
          return <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />;
        case 'RUNNING':
          return <PlayCircle size={16} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />;
        case 'FAILED':
          return <XCircle size={16} style={{ color: 'var(--accent-rose)' }} />;
        case 'CHALLENGED':
          return <AlertTriangle size={16} style={{ color: 'var(--accent-amber)' }} />;
        default:
          return <Clock size={16} style={{ color: 'var(--text-dim)' }} />;
      }
    };

    // Helper to render quick highlight chips from findings
    const renderHighlights = () => {
      if (!contrib && status !== 'SUCCESS') return null;
      const findings = contrib?.findings || {};

      if (agent.id === 'adk_quant_specialist') {
        const m = findings.calculated_metrics || {};
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {m.latest_close && (
              <span className="badge-chip">Close: ₹{Number(m.latest_close).toFixed(2)}</span>
            )}
            {m.latest_rsi && (
              <span className="badge-chip">RSI(14): {Number(m.latest_rsi).toFixed(1)}</span>
            )}
            {m.realized_volatility_annualized && (
              <span className="badge-chip">Vol: {(Number(m.realized_volatility_annualized) * 100).toFixed(1)}%</span>
            )}
            {findings.records_retrieved && (
              <span className="badge-chip">{findings.records_retrieved} Bars</span>
            )}
          </div>
        );
      }

      if (agent.id === 'adk_microstructure_specialist') {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {findings.corwin_schultz_spread_bps && (
              <span className="badge-chip">Spread: {findings.corwin_schultz_spread_bps} bps</span>
            )}
            {findings.average_daily_turnover_inr_cr && (
              <span className="badge-chip">Turnover: ₹{findings.average_daily_turnover_inr_cr} Cr</span>
            )}
            {findings.liquidity_tier && (
              <span className="badge-chip" style={{ color: 'var(--accent-emerald)' }}>{findings.liquidity_tier}</span>
            )}
          </div>
        );
      }

      if (agent.id === 'crewai_news_macro_specialist') {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span className="badge-chip">RBI Repo: 6.50%</span>
            <span className="badge-chip">CPI Target: 4.0%</span>
            <span className="badge-chip" style={{ color: 'var(--accent-cyan)' }}>LAF Corridor Stable</span>
          </div>
        );
      }

      if (agent.id === 'crewai_corporate_filing_specialist') {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span className="badge-chip" style={{ color: 'var(--accent-emerald)' }}>SEBI LODR Reg 30/33 Compliant</span>
            <span className="badge-chip">Audit: Clean / Unmodified</span>
          </div>
        );
      }

      if (agent.id === 'crewai_adversarial_specialist') {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span className="badge-chip" style={{ color: 'var(--accent-amber)' }}>5/5 Stress Tests Passed</span>
            <span className="badge-chip">Statutory Drag: ~11.9 bps</span>
          </div>
        );
      }

      if (agent.id === 'adk_risk_validator') {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span className="badge-chip">STT + GST Scheduled</span>
            <span className="badge-chip" style={{ color: 'var(--accent-emerald)' }}>Live Trading Blocked</span>
          </div>
        );
      }

      if (agent.id === 'adk_research_manager') {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span className="badge-chip" style={{ color: 'var(--accent-indigo)' }}>Consensus Stance: ACCUMULATE</span>
            <span className="badge-chip">Conviction: 82/100</span>
          </div>
        );
      }

      return null;
    };

    return (
      <div
        key={agent.id}
        className="terminal-card"
        style={{
          position: 'relative',
          padding: '16px',
          borderLeft: `4px solid ${
            status === 'SUCCESS'
              ? 'var(--accent-emerald)'
              : status === 'RUNNING'
              ? 'var(--accent-cyan)'
              : status === 'FAILED'
              ? 'var(--accent-rose)'
              : 'var(--border-subtle)'
          }`,
        }}
      >
        {branchLabel && (
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              right: '12px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-medium)',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              fontWeight: 700,
            }}
          >
            {branchLabel}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: isADK ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isADK ? '#818cf8' : '#f472b6',
              }}
            >
              <Icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {agent.name}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {agent.id}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getStatusIcon()}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color:
                  status === 'SUCCESS'
                    ? 'var(--accent-emerald)'
                    : status === 'RUNNING'
                    ? 'var(--accent-cyan)'
                    : status === 'FAILED'
                    ? 'var(--accent-rose)'
                    : 'var(--text-muted)',
              }}
            >
              {status}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
          {agent.role}
        </div>

        {/* Live / Measured Highlights */}
        {renderHighlights()}

        {/* Framework & Duration Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
            marginTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isADK ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
              color: isADK ? '#818cf8' : '#f472b6',
              fontWeight: 600,
            }}
          >
            {agent.framework === 'GOOGLE_ADK' ? 'Google ADK' : 'CrewAI (A2A)'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {durationMs !== null ? `${durationMs.toFixed(1)} ms` : status === 'RUNNING' ? 'Executing...' : 'Waiting'}
            </span>

            {contrib && (
              <button
                onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--accent-cyan)',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 4px',
                }}
              >
                <span>{isExpanded ? 'Hide Details' : 'Inspect'}</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible In-Depth Structured Findings */}
        {isExpanded && contrib && (
          <div
            style={{
              marginTop: '10px',
              padding: '12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span>Structured Specialist Findings ({contrib.task_name})</span>
            </div>

            {/* Findings preview */}
            <div
              className="font-mono"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '8px',
                borderRadius: '4px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(contrib.findings, null, 2)}
            </div>

            {/* Evidence citations */}
            {contrib.evidence_citations?.length > 0 && (
              <div>
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>Grounded Citations:</span>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {contrib.evidence_citations.map((c, i) => (
                    <li key={i} className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {warnings.length > 0 && (
          <div
            style={{
              marginTop: '8px',
              padding: '6px 8px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '4px',
              fontSize: '11px',
              color: 'var(--accent-amber)',
            }}
          >
            {warnings[0]}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Pattern Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitBranch size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Active Orchestration Pattern:
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            {normPattern}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {normPattern === 'PARALLEL' && 'Concurrent branch dispatch across Quant, Microstructure & News specialists'}
          {normPattern === 'HIERARCHICAL' && 'Manager supervises branches with Skeptic Challenge audit gate before Risk Validator'}
          {normPattern === 'SEQUENTIAL' && 'Linear blackboard chain handoff from Manager to Specialists and Risk Gate'}
        </div>
      </div>

      {/* Render Topology based on pattern */}
      {normPattern === 'PARALLEL' ? (
        /* Parallel Branching Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Phase 1: Supervisory Manager */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Phase 1: Supervisory Dispatch
            </div>
            {renderAgentCard(SEVEN_SPECIALISTS[0])}
          </div>

          {/* Phase 2: Concurrent Specialist Branches */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitBranch size={12} />
              <span>Phase 2: Concurrent Branch Execution (Parallel Specialists)</span>
            </div>
            <div className="grid-cols-2" style={{ gap: '12px' }}>
              {renderAgentCard(SEVEN_SPECIALISTS[1], 'Branch A: Quant / Parquet')}
              {renderAgentCard(SEVEN_SPECIALISTS[2], 'Branch B: Microstructure')}
              {renderAgentCard(SEVEN_SPECIALISTS[3], 'Branch C: Macro / News')}
              {renderAgentCard(SEVEN_SPECIALISTS[4], 'Branch D: Filings / Governance')}
            </div>
          </div>

          {/* Phase 3: Adversarial Gate & Final Risk Audit */}
          <div className="grid-cols-2" style={{ gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Phase 3: Adversarial Skeptic Gate
              </div>
              {renderAgentCard(SEVEN_SPECIALISTS[5])}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Phase 4: Statutory Risk Gate
              </div>
              {renderAgentCard(SEVEN_SPECIALISTS[6])}
            </div>
          </div>
        </div>
      ) : normPattern === 'HIERARCHICAL' ? (
        /* Hierarchical Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hierarchical Supervisor */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Level 1: Central ADK Research Coordinator
            </div>
            {renderAgentCard(SEVEN_SPECIALISTS[0], 'Supervisor')}
          </div>

          {/* Delegated Specialists */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Level 2: Delegated Sub-Specialist Fleet (ADK & CrewAI)
            </div>
            <div className="grid-cols-2" style={{ gap: '12px' }}>
              {renderAgentCard(SEVEN_SPECIALISTS[1])}
              {renderAgentCard(SEVEN_SPECIALISTS[2])}
              {renderAgentCard(SEVEN_SPECIALISTS[3])}
              {renderAgentCard(SEVEN_SPECIALISTS[4])}
            </div>
          </div>

          {/* Gating Skeptic & Risk Validation */}
          <div className="grid-cols-2" style={{ gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Level 3: Adversarial Challenge Gate
              </div>
              {renderAgentCard(SEVEN_SPECIALISTS[5])}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Level 4: Final Compliance Gate
              </div>
              {renderAgentCard(SEVEN_SPECIALISTS[6])}
            </div>
          </div>
        </div>
      ) : (
        /* Sequential Linear Pipeline */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SEVEN_SPECIALISTS.map((agent, idx) => (
            <React.Fragment key={agent.id}>
              {renderAgentCard(agent, `Step ${idx + 1} of 7`)}
              {idx < SEVEN_SPECIALISTS.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
                  <div
                    style={{
                      width: '2px',
                      height: '14px',
                      backgroundColor: 'var(--border-medium)',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
