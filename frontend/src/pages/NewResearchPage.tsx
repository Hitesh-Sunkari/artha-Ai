import React, { useState } from 'react';
import {
  Send,
  GitBranch,
  Calendar,
  Layers,
  Shield,
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { OrchestrationPattern, ResearchRequestBody } from '../api/types';

interface NewResearchPageProps {
  onSubmitted: (runId: string) => void;
}

const PRESET_SYMBOLS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'NIFTY50'];

export const NewResearchPage: React.FC<NewResearchPageProps> = ({ onSubmitted }) => {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [pattern, setPattern] = useState<OrchestrationPattern>('SEQUENTIAL');
  const [asOfDate, setAsOfDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [timeframe, setTimeframe] = useState('1d');
  const [scopeQuant, setScopeQuant] = useState(true);
  const [scopeCompliance, setScopeCompliance] = useState(true);
  const [scopeAdversarial, setScopeAdversarial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) {
      setError('Symbol must be a valid, non-empty ticker (e.g. RELIANCE, TCS).');
      return;
    }

    let parsedDate: Date;
    try {
      parsedDate = new Date(asOfDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error();
      }
    } catch {
      setError('Please provide a valid point-in-time date & time.');
      return;
    }

    const scopes: string[] = [];
    if (scopeQuant) scopes.push('quant');
    if (scopeCompliance) scopes.push('compliance');
    if (scopeAdversarial) scopes.push('adversarial');

    if (!scopes.length) {
      setError('Please select at least one research scope.');
      return;
    }

    const payload: ResearchRequestBody = {
      symbol: cleanSymbol,
      as_of_time: parsedDate.toISOString(),
      orchestration_pattern: pattern,
      scope: scopes,
      timeframe,
    };

    setSubmitting(true);
    try {
      const res = await api.submitResearch(payload);
      onSubmitted(res.run_id);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(`Submission rejected: ${err.message}`);
      } else {
        setError(`Failed to submit research: ${err.message || 'Unknown network error'}`);
      }
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          Dispatch Multi-Agent Quantitative Research
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Configure point-in-time market analysis across the 7-specialist Google ADK & CrewAI pipeline
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '6px',
            color: 'var(--accent-rose)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="terminal-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Symbol Selection */}
        <div className="form-group">
          <label className="form-label">
            Target Indian Market Instrument / Asset Symbol (NSE / BSE)
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. RELIANCE, TCS, INFY, NIFTY50"
            className="form-input font-mono"
            style={{ fontSize: '15px', fontWeight: 700 }}
            required
          />

          {/* Quick preset buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Presets:</span>
            {PRESET_SYMBOLS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSymbol(s)}
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: symbol === s ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-surface)',
                  border: `1px solid ${symbol === s ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  color: symbol === s ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Orchestration Pattern Selection */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Multi-Agent Orchestration Pattern</span>
          </label>

          <div className="grid-cols-3" style={{ gap: '12px' }}>
            {[
              {
                id: 'SEQUENTIAL' as OrchestrationPattern,
                name: 'Sequential',
                badge: 'Linear Handoff',
                desc: 'Strict sequential pipeline. Each agent updates the central Blackboard in deterministic order.',
              },
              {
                id: 'PARALLEL' as OrchestrationPattern,
                name: 'Parallel',
                badge: 'Concurrent Branches',
                desc: 'Concurrent specialist branch dispatch. Reduces execution latency while maintaining thread-safe state.',
              },
              {
                id: 'HIERARCHICAL' as OrchestrationPattern,
                name: 'Hierarchical',
                badge: 'Gated Challenge',
                desc: 'Two-tier supervisory pattern. Manager actively reviews intermediate findings before directing Skeptic challenge gate.',
              },
            ].map((p) => {
              const isSelected = pattern === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setPattern(p.id)}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    border: `2px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {p.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date and Timeframe Row */}
        <div className="grid-cols-2" style={{ gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Point-In-Time As-Of Cutoff (UTC)</span>
            </label>
            <input
              type="datetime-local"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="form-input font-mono"
              required
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Records created strictly after this time are rejected to prevent lookahead bias.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Bar Resolution / Timeframe</span>
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="form-select font-mono"
            >
              <option value="1d">1 Day (EOD Daily Bars)</option>
              <option value="1h">1 Hour (Intraday Hourly)</option>
              <option value="15m">15 Minutes (Intraday)</option>
              <option value="5m">5 Minutes (Intraday)</option>
              <option value="1m">1 Minute (Microstructure)</option>
            </select>
          </div>
        </div>

        {/* Research Scope Activation */}
        <div className="form-group">
          <label className="form-label">Active Research Specialists & Domains</label>
          <div className="grid-cols-3" style={{ gap: '12px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={scopeQuant}
                onChange={(e) => setScopeQuant(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Quantitative Analysis</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={scopeCompliance}
                onChange={(e) => setScopeCompliance(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Statutory Friction (STT)</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={scopeAdversarial}
                onChange={(e) => setScopeAdversarial(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Adversarial Skeptic</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Calls live endpoint <span className="font-mono">POST /research</span> • Automatic polling starts on dispatch
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontSize: '14px' }}
          >
            {submitting ? (
              <>
                <Clock size={16} className="animate-spin" />
                <span>Dispatching Pipeline...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Execute Research Run</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
