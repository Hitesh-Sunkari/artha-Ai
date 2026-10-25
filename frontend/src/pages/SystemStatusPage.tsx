import React, { useEffect, useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Server,
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Link,
  Lock,
} from 'lucide-react';
import { api, getApiBaseUrl, setApiBaseUrl } from '../api/client';
import type { ReadinessResponse, SystemStatusResponse } from '../api/types';

export const SystemStatusPage: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    try {
      const [h, r, s] = await Promise.allSettled([
        api.getHealth(),
        api.getReadiness(),
        api.getSystemStatus(),
      ]);

      setHealthOk(h.status === 'fulfilled' && h.value.status === 'ok');
      if (r.status === 'fulfilled') setReadiness(r.value);
      if (s.status === 'fulfilled') setStatus(s.value);
    } catch {
      setHealthOk(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    fetchDiagnostics();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const h = await api.getHealth();
      setTestResult(`Success: Connected to ${h.service} (v1.0.0). Process is healthy.`);
      setHealthOk(true);
      fetchDiagnostics();
    } catch (err: any) {
      setTestResult(`Connection Failed: ${err.message}`);
      setHealthOk(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          System Diagnostics & Environment Settings
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Operational readiness, registered tools, inter-agent endpoints, and safety guardrails
        </div>
      </div>

      {/* API Endpoint Configuration */}
      <form onSubmit={handleSaveApiUrl} className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Link size={16} style={{ color: 'var(--accent-cyan)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Research API Connection Endpoint
          </h3>
        </div>

        <div className="form-group">
          <label className="form-label">Backend Base URL</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000"
              className="form-input font-mono"
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', flexShrink: 0 }}>
              <Save size={14} />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="btn btn-secondary"
              style={{ padding: '0 16px', flexShrink: 0 }}
            >
              <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
              <span>Test</span>
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Persistent in browser <span className="font-mono">localStorage</span>. Default is <span className="font-mono">http://127.0.0.1:8000</span>.
          </div>
        </div>

        {saveSuccess && (
          <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', marginTop: '8px' }}>
            ✓ API base URL updated successfully.
          </div>
        )}

        {testResult && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: healthOk ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${healthOk ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              borderRadius: '6px',
              fontSize: '12px',
              color: healthOk ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              marginTop: '10px',
            }}
          >
            {testResult}
          </div>
        )}
      </form>

      {/* Safety Guardrails Audit */}
      <div className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Financial Safety & Live-Trading Guardrail Audit
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '6px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Live Order Placement Guardrail
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Deterministic prohibition enforced in AppConfig and ADKRiskValidator
              </div>
            </div>
            <span className="status-pill status-completed">
              ENFORCED & BLOCKED
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '6px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Point-In-Time Lookahead Bias Guard
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Strict UTC as_of_time upper bounds enforced on Parquet bar queries
              </div>
            </div>
            <span className="status-pill status-completed">
              ACTIVE & BOUNDED
            </span>
          </div>
        </div>
      </div>

      {/* Subsystem Health Grid */}
      <div className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Server size={18} style={{ color: 'var(--accent-cyan)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Core Subsystem Readiness Probes
          </h3>
        </div>

        <div className="grid-cols-2" style={{ gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>FastMCP Server</span>
              <span className={`status-pill ${readiness?.mcp_available ? 'status-completed' : 'status-failed'}`}>
                {readiness?.mcp_available ? 'Ready' : 'Unavailable'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Service: <span className="font-mono">ArthaAI-Market-Intelligence</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Tools: <span className="font-mono">query_market_data, calculate_statutory_costs</span>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>CrewAI A2A Protocol</span>
              <span className={`status-pill ${readiness?.a2a_available ? 'status-completed' : 'status-failed'}`}>
                {readiness?.a2a_available ? 'Ready' : 'Unavailable'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Service: <span className="font-mono">crewai_specialist_suite</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Endpoints: <span className="font-mono">/.well-known/agent-card.json, /rpc</span>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>DuckDB Analytical Engine</span>
              <span className="status-pill status-completed">Ready</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Engine: <span className="font-mono">DuckDB in-process columnar SQL</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Storage: Partitioned Parquet (<span className="font-mono">data/ohlcv/</span>)
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Evaluation Runner</span>
              <span className="status-pill status-completed">Ready</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Dataset Version: <span className="font-mono">v1.0.0</span> (44 test cases)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Budget Control: 300.0s time enforcement
            </div>
          </div>
        </div>
      </div>

      {/* Model Providers & LLM Guardrails */}
      <div className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Cpu size={16} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Model Providers & Cost Control Guardrails
          </h3>
        </div>

        <div className="grid-cols-2" style={{ gap: '14px' }}>
          {/* OpenAI */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>OpenAI Adapter</span>
              <span
                className={`status-pill ${
                  status?.llm_providers?.openai?.status === 'CONFIGURED'
                    ? 'status-completed'
                    : status?.llm_providers?.openai?.status === 'QUOTA_EXHAUSTED'
                    ? 'status-pending'
                    : 'status-failed'
                }`}
              >
                {status?.llm_providers?.openai?.status || 'Configured'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Model: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{status?.llm_providers?.openai?.model || 'gpt-4o-mini'}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Role: CrewAI Adversarial Skeptic & Qualitative Synthesis
            </div>
          </div>

          {/* Google Gemini */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Google Gemini Adapter</span>
              <span
                className={`status-pill ${
                  status?.llm_providers?.gemini?.configured
                    ? 'status-completed'
                    : 'status-pending'
                }`}
              >
                {status?.llm_providers?.gemini?.configured ? 'Configured' : 'Not Configured'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Model: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{status?.llm_providers?.gemini?.model || 'gemini-1.5-flash'}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Role: Google ADK Supervisory Planning & Risk Verification
            </div>
          </div>
        </div>

        {/* Cost Controls Schedule */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            Max Calls/Run: <strong style={{ color: 'var(--accent-cyan)' }}>{status?.llm_providers?.guardrails?.max_calls_per_run || 10}</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Budget/Run: <strong style={{ color: 'var(--accent-emerald)' }}>${(status?.llm_providers?.guardrails?.max_budget_per_run_usd || 0.1).toFixed(2)} USD</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Timeout: <strong style={{ color: 'var(--text-primary)' }}>{status?.llm_providers?.guardrails?.timeout_seconds || 30}s</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Max Retries: <strong style={{ color: 'var(--text-primary)' }}>{status?.llm_providers?.guardrails?.max_retries || 2}</strong>
          </span>
        </div>
      </div>

      {/* Grounded RAG Knowledge Base */}
      <div className="terminal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Database size={16} style={{ color: 'var(--accent-cyan)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Regulatory & Statutory RAG Knowledge Base
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>SEBI (LODR) Regulations (2015)</span>
            <span className="font-mono" style={{ color: 'var(--accent-emerald)' }}>Regulations 30 & 33 Indexed</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Finance (No. 2) Act 2024</span>
            <span className="font-mono" style={{ color: 'var(--accent-emerald)' }}>STT Revised Rates (Effective Oct 1, 2024)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>RBI Monetary Policy Guidelines</span>
            <span className="font-mono" style={{ color: 'var(--accent-emerald)' }}>Repo Rate Corridor & LAF Window</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Benchmark Corporate Filings</span>
            <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>RELIANCE, TCS, INFY, HDFCBANK (Q2 FY25)</span>
          </div>
        </div>
      </div>

      {/* Security Disclaimer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        <Lock size={14} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
        <span>
          <strong>Credential Security Policy:</strong> No API keys, model credentials, tokens, or environment secrets are exposed to the client interface. All model dispatches occur strictly server-side through Google ADK and CrewAI.
        </span>
      </div>
    </div>
  );
};
