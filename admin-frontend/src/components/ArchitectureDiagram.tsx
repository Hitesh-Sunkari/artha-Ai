import React, { useState } from 'react';
import {
  Brain,
  Cpu,
  Server,
  Database,
  ShieldCheck,
  GitBranch,
  Layers,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Newspaper,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sequential' | 'parallel' | 'hierarchical'>('overview');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Pattern Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {[
          { id: 'overview', label: 'Complete System Architecture' },
          { id: 'sequential', label: 'Sequential Pipeline' },
          { id: 'parallel', label: 'Parallel Branching' },
          { id: 'hierarchical', label: 'Hierarchical Gated Pipeline' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Architecture Flow Box */}
          <div
            className="terminal-card"
            style={{
              backgroundColor: 'var(--bg-deep)',
              border: '1px solid var(--border-medium)',
              padding: '24px',
            }}
          >
            {/* Top Level: Client & Gateway */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '320px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-cyan)',
                  borderRadius: '8px',
                  padding: '14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Client Interface & Research API
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  FastAPI Application (<span className="font-mono">/research, /runs</span>)
                </div>
              </div>
            </div>

            {/* Middle Level: Google ADK Coordinator & Central Blackboard */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 340px 1fr',
                gap: '20px',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              {/* FastMCP Service Box */}
              <div
                style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Server size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    FastMCP Protocol Server
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  ArthaAI-Market-Intelligence
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="font-mono" style={{ fontSize: '10px', backgroundColor: 'var(--bg-card)', padding: '3px 6px', borderRadius: '4px' }}>
                    • query_market_data (DuckDB/Parquet)
                  </span>
                  <span className="font-mono" style={{ fontSize: '10px', backgroundColor: 'var(--bg-card)', padding: '3px 6px', borderRadius: '4px' }}>
                    • calculate_statutory_costs (STT/GST)
                  </span>
                </div>
              </div>

              {/* Central Blackboard & ADK Manager */}
              <div
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '2px solid var(--accent-indigo)',
                  borderRadius: '10px',
                  padding: '18px',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Brain size={18} style={{ color: 'var(--accent-indigo)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Google ADK Research Manager
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Supervisor & Orchestration Engine
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px dashed var(--border-medium)',
                    borderRadius: '6px',
                    padding: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    CENTRAL BLACKBOARD STATE
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Thread-safe append-only contributions & audit lineage
                  </div>
                </div>
              </div>

              {/* A2A Protocol Bridge */}
              <div
                style={{
                  backgroundColor: 'rgba(236, 72, 153, 0.05)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Cpu size={16} style={{ color: '#f472b6' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f472b6' }}>
                    A2A Protocol Client Bridge
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  JSON-RPC 2.0 Agent-to-Agent Standard
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="font-mono" style={{ fontSize: '10px', backgroundColor: 'var(--bg-card)', padding: '3px 6px', borderRadius: '4px' }}>
                    • /.well-known/agent-card.json
                  </span>
                  <span className="font-mono" style={{ fontSize: '10px', backgroundColor: 'var(--bg-card)', padding: '3px 6px', borderRadius: '4px' }}>
                    • /rpc (Remote Agent Dispatch)
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Level: Specialist Fleet */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
                Seven Integrated Domain Specialist Agents
              </div>

              <div className="grid-cols-2" style={{ gap: '16px' }}>
                {/* Google ADK Specialists */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '10px' }}>
                    Google ADK Specialist Agents (In-Process)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={14} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Quant Specialist (Historical Parquet bars & technical features)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BarChart2 size={14} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Microstructure Specialist (Liquidity, spread & Kyle's lambda)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
                      <span>Risk Validator (Statutory friction bounds & guardrail audit)</span>
                    </div>
                  </div>
                </div>

                {/* CrewAI Specialists */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f472b6', marginBottom: '10px' }}>
                    CrewAI Specialist Suite (Dispatched via Official A2A Protocol)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Newspaper size={14} style={{ color: '#f472b6' }} />
                      <span>News & Macro Specialist (RBI circulars & macro sentiment)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileCheck2 size={14} style={{ color: '#f472b6' }} />
                      <span>Corporate Filing Specialist (BSE/NSE disclosures & governance)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} />
                      <span>Adversarial Skeptic (Statistical fragility & overfitting challenge)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sequential' && (
        <div className="terminal-card">
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Sequential Orchestration Pipeline
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Linear workflow handoff where each specialist updates the central Blackboard in a deterministic sequence.
            Guarantees total ordering and zero race conditions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { step: '1', title: 'Research Manager Initiates Run', desc: 'Validates point-in-time bounds and initializes Blackboard state.' },
              { step: '2', title: 'ADK Quant Specialist', desc: 'Queries FastMCP market data tool and calculates technical indicators.' },
              { step: '3', title: 'ADK Microstructure Specialist', desc: 'Analyzes orderbook liquidity and price impact bounds.' },
              { step: '4', title: 'CrewAI News & Macro Specialist', desc: 'Invoked via A2A protocol for macroeconomic context.' },
              { step: '5', title: 'CrewAI Corporate Filing Specialist', desc: 'Invoked via A2A protocol for regulatory disclosure notes.' },
              { step: '6', title: 'CrewAI Adversarial Skeptic', desc: 'Challenges findings on small sample size or missing data.' },
              { step: '7', title: 'ADK Risk Validator', desc: 'Calculates statutory cost schedule and enforces live trading guardrail.' },
              { step: '8', title: 'Synthesis & Report Generation', desc: 'Manager compiles Pydantic QuantitativeResearchReport.' },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--accent-cyan)',
                  }}
                >
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'parallel' && (
        <div className="terminal-card">
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
            Parallel Orchestration Pipeline
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Supervisory manager uses <span className="font-mono">asyncio.gather</span> to dispatch concurrent specialist tasks.
            Significantly reduces total workflow execution latency while maintaining thread-safe Blackboard locks.
          </p>

          <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Concurrent Execution Branches:
            </div>
            <div className="grid-cols-2" style={{ gap: '10px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--accent-cyan)' }}>
                <span style={{ fontWeight: 600, fontSize: '12px' }}>Branch 1 (ADK Quant):</span>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Parquet bar queries and returns volatility</p>
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--accent-cyan)' }}>
                <span style={{ fontWeight: 600, fontSize: '12px' }}>Branch 2 (ADK Microstructure):</span>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Spread estimation and orderbook depth</p>
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #f472b6' }}>
                <span style={{ fontWeight: 600, fontSize: '12px' }}>Branch 3 (CrewAI News via A2A):</span>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Macroeconomic circular retrieval</p>
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #f472b6' }}>
                <span style={{ fontWeight: 600, fontSize: '12px' }}>Branch 4 (CrewAI Filings via A2A):</span>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>BSE/NSE disclosure parsing</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hierarchical' && (
        <div className="terminal-card">
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: '8px' }}>
            Hierarchical Gated Orchestration Pipeline
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Two-tier supervisory architecture. The ADK Research Manager inspects intermediate outputs before dynamically directing
            the CrewAI Adversarial Skeptic with tailored audit instructions, followed by a mandatory Risk Validator gate.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                1. Manager Supervisory Review
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Evaluates retrieved bar counts and data density. If zero observations exist, directs Skeptic to stress zero-data statistical fragility.
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                2. Gated Adversarial Challenge
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Skeptic exercises veto and flags any unsupported directional claims or liquidity traps.
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                3. Gated Risk & Statutory Gate
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Audits all Blackboard state against live trading prohibition and computes exact statutory taxes.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
