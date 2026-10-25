import React from 'react';
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
} from 'lucide-react';
import type { LifecycleEvent, OrchestrationPattern } from '../api/types';

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
}

export const LiveTimeline: React.FC<LiveTimelineProps> = ({ pattern, events, runStatus }) => {
  const normPattern = (pattern || 'SEQUENTIAL').toUpperCase() as OrchestrationPattern;

  // Derive agent states from real events
  const getAgentStatus = (agentId: string) => {
    const agentEvents = events.filter((e) => e.agent_id === agentId);
    if (!agentEvents.length) {
      if (runStatus === 'RUNNING') {
        // Check if previous agent finished to mark as next pending or running
        return { status: 'PENDING', durationMs: null, lastEvent: null, warnings: [] };
      }
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

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          {agent.role}
        </div>

        {/* Framework & Duration Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
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

          <span style={{ color: 'var(--text-muted)' }}>
            {durationMs !== null ? `${durationMs.toFixed(1)} ms` : status === 'RUNNING' ? 'Executing...' : 'Waiting'}
          </span>
        </div>

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
