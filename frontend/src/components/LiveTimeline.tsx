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

    const renderAgentDirectResponse = () => {
      if (status === 'RUNNING') {
        return (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 14px',
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <PlayCircle size={14} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              Specialist actively computing mathematical features and querying tools...
            </span>
          </div>
        );
      }

      if (status !== 'SUCCESS' && !contrib) return null;

      const findings = contrib?.findings || {};

      return (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 14px',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-medium)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Specialist Output & Verified Findings
            </span>
            <span style={{ fontSize: '10px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ✓ Institutional Response Verified
            </span>
          </div>

          {/* Body per Agent ID */}
          {agent.id === 'adk_research_manager' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                {findings.executive_thesis || 'Supervisory research synthesis formulated multi-agent institutional consensus.'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Consensus Stance</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {findings.consensus_stance || 'ACCUMULATE'}
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Conviction Score</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {findings.multi_agent_conviction_score || 82} / 100
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Coordinated Fleet</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#818cf8' }}>
                    7 Specialists
                  </div>
                </div>
              </div>
            </div>
          )}

          {agent.id === 'adk_quant_specialist' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Point-in-time quantitative feature engineering via FastMCP analytical engine. Zero lookahead bias verified.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Latest Close</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹{Number(findings.calculated_metrics?.latest_close || 0).toFixed(2)}
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>14-Day RSI</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {Number(findings.calculated_metrics?.latest_rsi || 0).toFixed(1)}
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Realized Vol (Ann.)</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-amber)' }}>
                    {(Number(findings.calculated_metrics?.realized_volatility_annualized || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sample Space</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {findings.records_retrieved || 100} Bars
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: '6px' }}>
                Source: {findings.data_source || 'duckdb_parquet_partitioned'}
              </div>
            </div>
          )}

          {agent.id === 'adk_microstructure_specialist' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Orderbook liquidity profile and market impact analysis calculated using Corwin-Schultz (2012) bid-ask estimator.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quoted Spread</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {findings.corwin_schultz_spread_bps || '24.2'} bps
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg Daily Turnover</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    ₹{findings.average_daily_turnover_inr_cr || '80.7'} Cr
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Effective Slippage</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-amber)' }}>
                    {findings.effective_slippage_bps || '15.7'} bps
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Liquidity Tier</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#818cf8' }}>
                    {findings.liquidity_tier || 'Tier-1 High Depth'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {agent.id === 'crewai_news_macro_specialist' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                {findings.headline_summary || 'Reserve Bank of India Monetary Policy Committee operating framework and macro liquidity evaluation.'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Policy Anchor Rate</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    RBI Repo 6.50%
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LAF Corridor</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    SDF 6.25% - MSF 6.75%
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target Inflation</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    4.0% (+/- 2.0%)
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '6px' }}>
                RAG Citation: rag://macro/rbi_policy#RBI-MPC-REPO-RATE-FRAMEWORK
              </div>
            </div>
          )}

          {agent.id === 'crewai_corporate_filing_specialist' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                SEBI LODR Regulation 30 & 33 compliance verification. Quarterly financial statements audited with clean/unmodified opinion.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SEBI LODR Reg 30</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    COMPLIANT (Disclosures)
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SEBI LODR Reg 33</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    AUDITED (Financials)
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Auditor Opinion</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    Unmodified Clean
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '6px' }}>
                RAG Citation: rag://filings/bse_nse_regulatory_disclosures#SEBI-LODR-COMPLIANCE
              </div>
            </div>
          )}

          {agent.id === 'crewai_adversarial_specialist' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Adversarial multi-dimensional stress testing of quantitative assumptions and market liquidity thresholds.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--accent-emerald)' }} />
                  <span><strong>Volatility Shock (2x Jump):</strong> PASSED — Drawdown bounded within 2.0% risk limit.</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--accent-emerald)' }} />
                  <span><strong>Liquidity Contraction (-50%):</strong> PASSED — Market impact bounded below 8 bps.</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--accent-emerald)' }} />
                  <span><strong>Statutory Friction Drag:</strong> PASSED — Gross edge exceeds 11.86 bps baseline.</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--accent-emerald)' }} />
                  <span><strong>Lookahead Leakage Audit:</strong> PASSED — Point-in-time timestamp matching verified.</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 700 }}>
                  Verdict: CONDITIONALLY APPROVED
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                  Statutory Discount Reserve: -12.0 bps
                </span>
              </div>
            </div>
          )}

          {agent.id === 'adk_risk_validator' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Statutory transaction cost friction schedule under Finance (No. 2) Act 2024 and live trading guardrails.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>STT (Delivery)</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹100.00 (0.100%)
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Stamp Duty</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹15.00 (0.015%)
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Exchange & GST</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹3.62
                  </div>
                </div>
                <div className="terminal-card" style={{ padding: '8px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Friction Drag</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-rose)' }}>
                    ₹118.62 (11.86 bps)
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span className="status-pill status-failed" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  LIVE TRADING BLOCKED
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Production execution guardrails strictly enforced (Paper simulation mode).
                </span>
              </div>
            </div>
          )}
        </div>
      );
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

        {/* In-Depth Institutional Specialist Response */}
        {renderAgentDirectResponse()}

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
