import React, { useState } from 'react';
import {
  Code,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Play,
  Wrench,
  Edit3,
  Shield,
  X,
  Copy,
  Check,
  Send,
  Download,
  BookOpen,
} from 'lucide-react';
import type { LifecycleEvent } from '../api/types';

interface EventStreamProps {
  events: LifecycleEvent[];
}

export const EventStream: React.FC<EventStreamProps> = ({ events }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activeModalEvent, setActiveModalEvent] = useState<LifecycleEvent | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.agent_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(e.payload || {}).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'ALL' || e.event_type === selectedType;
    return matchesSearch && matchesType;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'AGENT_START':
        return <Play size={13} style={{ color: 'var(--accent-cyan)' }} />;
      case 'AGENT_COMPLETE':
        return <CheckCircle size={13} style={{ color: 'var(--accent-emerald)' }} />;
      case 'TOOL_INVOCATION':
      case 'TOOL_COMPLETE':
        return <Wrench size={13} style={{ color: '#818cf8' }} />;
      case 'BLACKBOARD_WRITE':
        return <Edit3 size={13} style={{ color: 'var(--accent-cyan)' }} />;
      case 'SKEPTIC_CHALLENGE':
        return <AlertTriangle size={13} style={{ color: 'var(--accent-amber)' }} />;
      case 'RISK_VALIDATION':
        return <Shield size={13} style={{ color: 'var(--accent-emerald)' }} />;
      case 'A2A_MESSAGE_SENT':
        return <Send size={13} style={{ color: '#f472b6' }} />;
      case 'A2A_MESSAGE_RECEIVED':
        return <Download size={13} style={{ color: '#f472b6' }} />;
      case 'RAG_RETRIEVAL':
        return <BookOpen size={13} style={{ color: 'var(--accent-amber)' }} />;
      default:
        return <Code size={13} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  const copyPayload = () => {
    if (activeModalEvent) {
      navigator.clipboard.writeText(JSON.stringify(activeModalEvent, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="terminal-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Execution Trace & Observability Events
          </h4>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Chronological audit log ({filteredEvents.length} of {events.length} events)
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search trace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '28px', paddingRight: '8px', paddingTop: '6px', paddingBottom: '6px', fontSize: '11px' }}
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="form-select"
            style={{ width: '160px', padding: '6px 10px', fontSize: '11px' }}
          >
            <option value="ALL">All Event Types</option>
            <option value="AGENT_START">AGENT_START</option>
            <option value="AGENT_COMPLETE">AGENT_COMPLETE</option>
            <option value="TOOL_INVOCATION">TOOL_INVOCATION</option>
            <option value="TOOL_COMPLETE">TOOL_COMPLETE</option>
            <option value="BLACKBOARD_WRITE">BLACKBOARD_WRITE</option>
            <option value="SKEPTIC_CHALLENGE">SKEPTIC_CHALLENGE</option>
            <option value="RISK_VALIDATION">RISK_VALIDATION</option>
            <option value="A2A_MESSAGE_SENT">A2A_MESSAGE_SENT</option>
            <option value="A2A_MESSAGE_RECEIVED">A2A_MESSAGE_RECEIVED</option>
            <option value="RAG_RETRIEVAL">RAG_RETRIEVAL</option>
          </select>
        </div>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No lifecycle events recorded for this run yet.
        </div>
      ) : (
        <div className="terminal-table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
          <table className="terminal-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Timestamp</th>
                <th style={{ width: '160px' }}>Event Type</th>
                <th style={{ width: '180px' }}>Agent / System</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Duration</th>
                <th style={{ textAlign: 'center', width: '80px' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt) => (
                <tr key={evt.event_id}>
                  <td className="font-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(evt.timestamp).toISOString().substring(11, 23)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getEventIcon(evt.event_type)}
                      <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600 }}>
                        {evt.event_type}
                      </span>
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {evt.agent_id}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color:
                          evt.status === 'SUCCESS'
                            ? 'var(--accent-emerald)'
                            : evt.status === 'FAILED'
                            ? 'var(--accent-rose)'
                            : 'var(--accent-amber)',
                      }}
                    >
                      {evt.status}
                    </span>
                  </td>
                  <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {evt.duration_ms !== null && evt.duration_ms !== undefined ? `${evt.duration_ms.toFixed(1)}ms` : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setActiveModalEvent(evt)}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      title="Inspect event JSON payload"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JSON Payload Modal */}
      {activeModalEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
          onClick={() => setActiveModalEvent(null)}
        >
          <div
            className="terminal-card"
            style={{
              width: '640px',
              maxWidth: '90vw',
              maxHeight: '80vh',
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
                <span className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {activeModalEvent.event_type}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px' }}>
                  Agent: {activeModalEvent.agent_id}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={copyPayload}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  {copied ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setActiveModalEvent(null)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px' }}>
              <pre
                className="font-mono"
                style={{
                  fontSize: '11px',
                  lineHeight: '1.5',
                  backgroundColor: 'var(--bg-deep)',
                  padding: '14px',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {JSON.stringify(activeModalEvent, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
