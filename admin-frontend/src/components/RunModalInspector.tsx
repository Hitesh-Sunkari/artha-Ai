import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Clock,
  Terminal,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { RunListItem, RunDetailsResponse } from '../api/types';
import { api } from '../api/client';
import { QueryReportView } from './QueryReportView';
import { NormalReportView } from './NormalReportView';
import { StatusBadge } from './StatusBadge';

interface RunModalInspectorProps {
  run: RunListItem | null;
  onClose: () => void;
}

export const RunModalInspector: React.FC<RunModalInspectorProps> = ({ run, onClose }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'trace'>('report');
  const [details, setDetails] = useState<RunDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!run) return;

    let active = true;
    setLoading(true);
    setError(null);

    const fetchDetails = async () => {
      try {
        const data = await api.getRun(run.run_id);
        if (active) {
          setDetails(data);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to fetch full run details');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      active = false;
    };
  }, [run]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!run) return null;

  const isQueryRun =
    run.orchestration_pattern === 'QUERY_STUDIO' ||
    run.run_id.startsWith('run-query-') ||
    !!details?.query_research_result;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(details || run, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyMarkdown = () => {
    let md = '';
    if (isQueryRun) {
      const qRes = details?.query_research_result || details?.report?.quantitative_findings?.query_research_result;
      const thesis = qRes?.executive_synthesis || details?.report?.executive_thesis || '';
      md = `# ArthaAI Query Quantitative Research Report: ${run.symbol}\n**Run ID:** \`${run.run_id}\`\n**Verdict:** ${qRes?.verdict || run.recommendation || 'ACCUMULATE'} (Conviction: ${qRes?.conviction_score || 80}/100)\n\n---\n\n## Executive Synthesis\n${thesis}\n`;
    } else {
      const thesis = details?.report?.executive_thesis || '';
      md = `# ArthaAI Multi-Agent Research Report: ${run.symbol}\n**Run ID:** \`${run.run_id}\`\n**Pattern:** ${run.orchestration_pattern}\n**Recommendation:** ${run.recommendation || 'HOLD'}\n\n---\n\n## Executive Thesis\n${thesis}\n`;
    }
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header Bar ────────────────────────────────────────────── */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--bg-chrome)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isQueryRun ? 'rgba(0, 208, 156, 0.12)' : 'rgba(0, 180, 216, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isQueryRun ? 'var(--groww-green)' : 'var(--accent-cyan)',
              }}
            >
              {isQueryRun ? <Sparkles size={20} /> : <Layers size={20} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {run.symbol}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    color: isQueryRun ? 'var(--groww-green)' : 'var(--text-secondary)',
                    fontWeight: 700,
                  }}
                >
                  {run.orchestration_pattern}
                </span>
                <StatusBadge status={run.status} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                Run ID: {run.run_id}
              </div>
            </div>
          </div>

          {/* Action Controls & Tab Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Switcher: Report vs Raw Trace */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'report' ? 'var(--groww-green)' : 'transparent',
                  color: activeTab === 'report' ? '#0F1217' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.12s ease',
                }}
              >
                <FileText size={13} />
                <span>Executive Report</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trace')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'trace' ? 'var(--accent-cyan)' : 'transparent',
                  color: activeTab === 'trace' ? '#0F1217' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.12s ease',
                }}
              >
                <Terminal size={13} />
                <span>Raw DuckDB Trace</span>
              </button>
            </div>

            <button
              onClick={copyMarkdown}
              title="Copy Report Markdown"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copied ? <Check size={13} color="var(--groww-green)" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Modal Content Body ──────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: 'var(--bg-deep)',
          }}
        >
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--groww-green)' }} />
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Loading complete execution record from DuckDB...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#ef4444' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Failed to retrieve run details</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{error}</div>
            </div>
          ) : activeTab === 'report' ? (
            isQueryRun ? (
              <QueryReportView
                result={
                  details?.query_research_result ||
                  details?.report?.quantitative_findings?.query_research_result ||
                  run?.query_research_result
                }
                rawRun={details || run}
              />
            ) : (
              <NormalReportView
                report={details?.report || (run as any)}
                events={details?.blackboard_events}
                agentContributions={details?.agent_contributions}
                rawRun={details || run}
              />
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Complete DuckDB Serialized JSON Execution Record
                </span>
                <button
                  onClick={copyJson}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Copy JSON
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  maxHeight: '68vh',
                  overflowY: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {JSON.stringify(details || run, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

