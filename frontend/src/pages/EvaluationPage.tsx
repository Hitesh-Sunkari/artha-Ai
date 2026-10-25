import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Database,
  BarChart2,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  X,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  EvaluationDatasetResponse,
  EvaluationSummaryResponse,
  ExperimentReport,
  CaseResult,
} from '../api/types';
import { MetricCard } from '../components/MetricCard';

export const EvaluationPage: React.FC = () => {
  const [summary, setSummary] = useState<EvaluationSummaryResponse | null>(null);
  const [dataset, setDataset] = useState<EvaluationDatasetResponse | null>(null);
  const [experiments, setExperiments] = useState<ExperimentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [activeReportModal, setActiveReportModal] = useState<ExperimentReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, dataRes, expRes] = await Promise.allSettled([
        api.getEvaluationSummary(),
        api.getEvaluationDataset(),
        api.listEvaluationExperiments(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (dataRes.status === 'fulfilled') setDataset(dataRes.value);
      if (expRes.status === 'fulfilled') setExperiments(expRes.value);
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunDeterministicSuite = async () => {
    setRunningBenchmark(true);
    setError(null);
    try {
      const newReport = await api.runEvaluation(12);
      // Refresh list
      await loadData();
      setActiveReportModal(newReport);
    } catch (err: any) {
      setError(`Benchmark failed: ${err.message}`);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const latestExperiment = experiments.length > 0 ? experiments[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            Evaluation Infrastructure & Academic Benchmarks
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Empirical evidence integrity, statutory compliance test suite, and latency profiles
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRunDeterministicSuite}
            disabled={runningBenchmark}
            className="btn btn-primary"
            style={{ fontSize: '13px' }}
          >
            <FlaskConical size={15} className={runningBenchmark ? 'animate-spin' : ''} />
            <span>{runningBenchmark ? 'Executing Verification Cases...' : 'Run Statutory Benchmark'}</span>
          </button>

          <button onClick={loadData} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
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

      {/* Aggregate Metrics Grid */}
      <div className="grid-cols-4">
        <MetricCard
          label="Deterministic Pass Rate"
          value={latestExperiment ? `${latestExperiment.pass_rate_pct}%` : `${summary?.schema_valid_pct ?? 100}%`}
          subtext={
            latestExperiment
              ? `${latestExperiment.passed} passed / ${latestExperiment.total_cases} executed`
              : 'Empirical benchmark suite'
          }
          icon={CheckCircle2}
          accentColor="var(--accent-emerald)"
        />

        <MetricCard
          label="Mean Latency (p50)"
          value={
            latestExperiment
              ? `${(latestExperiment.p50_latency_seconds * 1000).toFixed(1)}ms`
              : `${(summary?.mean_latency_seconds ?? 0).toFixed(2)}s`
          }
          subtext={
            latestExperiment
              ? `p95: ${(latestExperiment.p95_latency_seconds * 1000).toFixed(1)}ms`
              : 'Workflow completion latency'
          }
          icon={Clock}
          accentColor="var(--accent-cyan)"
        />

        <MetricCard
          label="Evidence Violations"
          value={latestExperiment ? latestExperiment.unsupported_claim_violations : summary?.unsupported_claim_rate_pct ?? 0}
          subtext="Fabricated citations detected (Target: 0)"
          icon={ShieldCheck}
          accentColor="var(--accent-emerald)"
        />

        <MetricCard
          label="Versioned Test Cases"
          value={dataset?.total_cases ?? 44}
          subtext="Dataset v1.0.0 (Statutory, Adversarial, PIT)"
          icon={Database}
          accentColor="#818cf8"
        />
      </div>

      {/* Persisted Experiment Reports */}
      <div className="terminal-card">
        <div className="section-header">
          <div className="section-title">
            <FlaskConical size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Persisted Benchmark Experiments ({experiments.length} Reports)</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Stored in <span className="font-mono">evaluation_results/</span>
          </div>
        </div>

        {experiments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            No saved experiment reports yet. Click "Run Statutory Benchmark" above to generate one now.
          </div>
        ) : (
          <div className="terminal-table-container">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Experiment ID</th>
                  <th>Timestamp (UTC)</th>
                  <th>Cases Executed</th>
                  <th>Passed / Failed</th>
                  <th>Pass Rate</th>
                  <th>Mean Latency</th>
                  <th>p95 Latency</th>
                  <th style={{ textAlign: 'center' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp) => (
                  <tr key={exp.experiment_id}>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {exp.experiment_id}
                    </td>
                    <td className="font-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(exp.started_at).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="font-mono tabular-nums" style={{ fontWeight: 600 }}>
                      {exp.total_cases}
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{exp.passed}</span> /{' '}
                      <span style={{ color: exp.failed ? 'var(--accent-rose)' : 'var(--text-muted)' }}>{exp.failed}</span>
                    </td>
                    <td>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: exp.pass_rate_pct === 100 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        }}
                      >
                        {exp.pass_rate_pct}%
                      </span>
                    </td>
                    <td className="font-mono tabular-nums" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {(exp.mean_latency_seconds * 1000).toFixed(1)} ms
                    </td>
                    <td className="font-mono tabular-nums" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {(exp.p95_latency_seconds * 1000).toFixed(1)} ms
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setActiveReportModal(exp)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        View Cases
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 44-Case Benchmark Dataset Explorer */}
      <div className="terminal-card">
        <div className="section-header">
          <div className="section-title">
            <Database size={18} style={{ color: 'var(--accent-indigo)' }} />
            <span>Reproducible Benchmark Dataset (v1.0.0 — 44 Canonical Test Cases)</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Categorized by empirical evaluation objective
          </div>
        </div>

        {dataset?.summary && (
          <div className="grid-cols-4" style={{ gap: '10px', marginBottom: '16px' }}>
            {Object.entries(dataset.summary).map(([category, count]) => (
              <div
                key={category}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {category}
                </div>
                <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {String(count)} cases
                </div>
              </div>
            ))}
          </div>
        )}

        {dataset?.cases && (
          <div className="terminal-table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <table className="terminal-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Case ID</th>
                  <th>Category</th>
                  <th>Symbol</th>
                  <th>Expected Outcome</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {dataset.cases.map((c) => (
                  <tr key={c.case_id}>
                    <td className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {c.case_id}
                    </td>
                    <td>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {c.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{c.symbol}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color:
                            c.expected_outcome === 'PASS'
                              ? 'var(--accent-emerald)'
                              : c.expected_outcome === 'EMPTY_RESULT'
                              ? 'var(--accent-amber)'
                              : 'var(--accent-cyan)',
                        }}
                      >
                        {c.expected_outcome}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {c.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Results Inspection Modal */}
      {activeReportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
          onClick={() => setActiveReportModal(null)}
        >
          <div
            className="terminal-card"
            style={{
              width: '900px',
              maxWidth: '92vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  Experiment Report: {activeReportModal.experiment_id}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Pass Rate: {activeReportModal.pass_rate_pct}% ({activeReportModal.passed} / {activeReportModal.total_cases} passed)
                </div>
              </div>
              <button onClick={() => setActiveReportModal(null)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginTop: '16px' }} className="terminal-table-container">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Category</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReportModal.results?.map((res) => (
                    <tr key={res.case_id}>
                      <td className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {res.case_id}
                      </td>
                      <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {res.category}
                      </td>
                      <td style={{ fontSize: '11px' }}>{res.expected_outcome}</td>
                      <td style={{ fontSize: '11px' }}>{res.actual_outcome}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: res.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          }}
                        >
                          {res.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontSize: '11px' }}>
                        {(res.latency_seconds * 1000).toFixed(1)}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
