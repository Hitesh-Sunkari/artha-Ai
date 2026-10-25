import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import type { RunListItem } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';

interface HistoryPageProps {
  onOpenRun: (runId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenRun }) => {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [patternFilter, setPatternFilter] = useState('ALL');

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await api.listRuns();
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const filteredRuns = runs.filter((r) => {
    const matchesSearch =
      r.run_id.toLowerCase().includes(search.toLowerCase()) ||
      r.symbol.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesPattern = patternFilter === 'ALL' || r.orchestration_pattern === patternFilter;

    return matchesSearch && matchesStatus && matchesPattern;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            Execution History & Saved Traces
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Searchable log of research executions recorded in active session memory
          </div>
        </div>

        <button onClick={loadRuns} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Memory Retention Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
        <span>
          <strong>Storage Retention Notice:</strong> Research run records and lifecycle traces are stored in thread-safe active backend memory (<span className="font-mono">RunStore</span>). Evaluation reports are persisted to <span className="font-mono">evaluation_results/</span>.
        </span>
      </div>

      {/* Filter Bar */}
      <div className="terminal-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Symbol or Run ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px' }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: '160px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">Running</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Pattern Filter */}
          <select
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            className="form-select"
            style={{ width: '180px' }}
          >
            <option value="ALL">All Patterns</option>
            <option value="SEQUENTIAL">Sequential</option>
            <option value="PARALLEL">Parallel</option>
            <option value="HIERARCHICAL">Hierarchical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="terminal-card" style={{ padding: 0 }}>
        {filteredRuns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No research runs match your filter
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Adjust your search keywords or status filter, or submit a new research request.
            </div>
          </div>
        ) : (
          <div className="terminal-table-container" style={{ border: 'none' }}>
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Symbol</th>
                  <th>Orchestration Pattern</th>
                  <th>Status</th>
                  <th>Submitted (UTC)</th>
                  <th style={{ textAlign: 'right' }}>Latency</th>
                  <th style={{ textAlign: 'center' }}>Events</th>
                  <th style={{ textAlign: 'center' }}>Report</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((r) => (
                  <tr key={r.run_id}>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {r.run_id}
                    </td>
                    <td style={{ fontWeight: 800 }}>{r.symbol}</td>
                    <td>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {r.orchestration_pattern}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="font-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(r.submitted_at).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {r.latency_seconds !== null && r.latency_seconds !== undefined
                        ? `${r.latency_seconds.toFixed(2)}s`
                        : r.status === 'RUNNING'
                        ? 'Running...'
                        : '-'}
                    </td>
                    <td className="font-mono tabular-nums" style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {r.events_count}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: r.has_report ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        }}
                      >
                        {r.has_report ? 'Available' : 'None'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onOpenRun(r.run_id)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
