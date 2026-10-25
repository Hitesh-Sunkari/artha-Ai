import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  GitBranch,
  ShieldAlert,
  ArrowLeft,
  Share2,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api/client';
import type { LifecycleEvent, RunDetailsResponse } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { LiveTimeline } from '../components/LiveTimeline';
import { EventStream } from '../components/EventStream';
import { ReportView } from '../components/ReportView';

interface RunDetailsPageProps {
  runId: string | null;
  onBack: () => void;
}

export const RunDetailsPage: React.FC<RunDetailsPageProps> = ({ runId, onBack }) => {
  const [runDetails, setRunDetails] = useState<RunDetailsResponse | null>(null);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeView, setActiveView] = useState<'timeline' | 'specialists' | 'report' | 'events'>('timeline');

  const pollTimerRef = useRef<any>(null);
  const elapsedTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());

  const fetchRunState = async (id: string) => {
    try {
      const [details, trace] = await Promise.all([api.getRun(id), api.getRunTrace(id)]);
      setRunDetails(details);
      setEvents(trace.events || []);

      if (details.status === 'COMPLETED' || details.status === 'FAILED') {
        // Run has finished; stop polling
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
          elapsedTimerRef.current = null;
        }

        // If completed and report is present, switch to report view
        if (details.status === 'COMPLETED' && details.report) {
          setActiveView('report');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch run details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!runId) return;

    setLoading(true);
    setError(null);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);

    // Initial fetch
    fetchRunState(runId);

    // Bounded resilient polling every 1.5 seconds while active
    pollTimerRef.current = setInterval(() => {
      fetchRunState(runId);
    }, 1500);

    // Local elapsed seconds ticker
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [runId]);

  if (!runId) {
    return (
      <div className="terminal-card" style={{ textAlign: 'center', padding: '48px' }}>
        <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          No Active Research Run Selected
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
          Select a completed execution from the Run History, or submit a new research query.
        </p>
        <button onClick={onBack} className="btn btn-primary">
          <ArrowLeft size={14} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  const isTerminal = runDetails?.status === 'COMPLETED' || runDetails?.status === 'FAILED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {runId}
              </span>
              {runDetails && <StatusBadge status={runDetails.status} />}
              {runDetails?.symbol && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {runDetails.symbol}
                </span>
              )}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              Pattern: {runDetails?.orchestration_pattern || 'SEQUENTIAL'} • Submitted:{' '}
              {runDetails?.submitted_at
                ? new Date(runDetails.submitted_at).toUTCString()
                : 'Pending'}
            </div>
          </div>
        </div>

        {/* Live Timer or Completed Latency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!isTerminal ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '6px',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <RefreshCw size={14} className="animate-spin" />
              <span>LIVE POLLING ({elapsedSeconds}s elapsed)</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            >
              <span>
                Total Latency:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {runDetails?.latency_seconds ? `${runDetails.latency_seconds.toFixed(2)}s` : `${elapsedSeconds}s`}
                </strong>
              </span>
            </div>
          )}

          <button
            onClick={() => fetchRunState(runId)}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title="Manual poll refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
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
          }}
        >
          {error}
        </div>
      )}

      {/* Sub-Tabs: Live Timeline, Specialist Findings, Final Report, Event Stream */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveView('timeline')}
          className={`btn ${activeView === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          <GitBranch size={14} />
          <span>Multi-Agent Live Timeline</span>
        </button>

        <button
          onClick={() => setActiveView('specialists')}
          className={`btn ${activeView === 'specialists' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          <Users size={14} />
          <span>Specialist Fleet Findings ({runDetails?.agent_contributions?.length ?? 0}/7)</span>
        </button>

        <button
          onClick={() => setActiveView('report')}
          disabled={!runDetails?.report}
          className={`btn ${activeView === 'report' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          <FileText size={14} />
          <span>Final Research Report {runDetails?.report ? '(Ready)' : '(In Progress)'}</span>
        </button>

        <button
          onClick={() => setActiveView('events')}
          className={`btn ${activeView === 'events' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          <Activity size={14} />
          <span>Lifecycle Events Log ({events.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeView === 'timeline' && (
        <LiveTimeline
          pattern={runDetails?.orchestration_pattern || 'SEQUENTIAL'}
          events={events}
          runStatus={runDetails?.status || 'PENDING'}
          contributions={runDetails?.agent_contributions || []}
        />
      )}

      {activeView === 'specialists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              <strong>Specialist Agent Execution Fleet:</strong> In-depth factual outputs, mathematical indicators,
              and grounded regulatory citations contributed to the Blackboard.
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: '11px',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
              }}
            >
              {runDetails?.agent_contributions?.length ?? 0} of 7 agents completed
            </span>
          </div>

          {(runDetails?.agent_contributions || []).length === 0 ? (
            <div className="terminal-card" style={{ textAlign: 'center', padding: '36px' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Agents Executing...
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Intermediate agent findings will populate dynamically as each specialist completes its step.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(runDetails?.agent_contributions || []).map((contrib, idx) => (
                <div
                  key={contrib.agent_id || idx}
                  className="terminal-card"
                  style={{
                    padding: '18px',
                    borderLeft: `4px solid ${
                      contrib.status === 'SUCCESS' ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {contrib.agent_id}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: contrib.framework === 'GOOGLE_ADK' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                          color: contrib.framework === 'GOOGLE_ADK' ? '#818cf8' : '#f472b6',
                          fontWeight: 700,
                        }}
                      >
                        {contrib.framework}
                      </span>
                      <span
                        className="font-mono"
                        style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                      >
                        task: {contrib.task_name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className={`status-pill ${contrib.status === 'SUCCESS' ? 'status-completed' : 'status-failed'}`}
                      >
                        {contrib.status}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(contrib.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Findings Structured Display */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                      Factual Findings & Structured Metrics:
                    </div>
                    <div
                      className="font-mono"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {JSON.stringify(contrib.findings, null, 2)}
                    </div>
                  </div>

                  {/* Evidence Citations */}
                  {contrib.evidence_citations && contrib.evidence_citations.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                        Grounded Evidence Citations:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {contrib.evidence_citations.map((cite, cIdx) => (
                          <span
                            key={cIdx}
                            className="font-mono"
                            style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              color: 'var(--accent-emerald)',
                            }}
                          >
                            {cite}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {contrib.warnings && contrib.warnings.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      {contrib.warnings.map((w, wIdx) => (
                        <div
                          key={wIdx}
                          style={{
                            fontSize: '11px',
                            color: 'var(--accent-amber)',
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            marginTop: '4px',
                          }}
                        >
                          ⚠️ {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'report' && runDetails?.report && (
        <ReportView report={runDetails.report} events={events} />
      )}

      {activeView === 'events' && (
        <EventStream events={events} />
      )}
    </div>
  );
};
