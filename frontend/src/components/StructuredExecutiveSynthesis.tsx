import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  Zap,
  Layers,
  Cpu,
  ShieldAlert,
  GitCompare,
  Target,
  Clock,
  Coins,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Database,
  Info,
} from 'lucide-react';

interface StructuredExecutiveSynthesisProps {
  synthesis: string;
  verdict?: string;
  convictionScore?: number;
  orchestrationPattern?: string;
  horizonYears?: number;
  anchorPrice?: number;
  capital?: number;
}

// ---------------------------------------------------------------------------
// Inline Formatting Helper
// ---------------------------------------------------------------------------

export const formatInlineText = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by bold (**...**) and code (`...`) tokens
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(highlightMetrics(text.substring(lastIndex, match.index), `txt-${lastIndex}`));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2);
      parts.push(
        <strong key={`b-${match.index}`} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {inner}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const inner = token.slice(1, -1);
      parts.push(
        <code
          key={`c-${match.index}`}
          style={{
            backgroundColor: 'rgba(0, 208, 156, 0.1)',
            color: 'var(--groww-green)',
            padding: '1px 6px',
            borderRadius: '4px',
            fontSize: '11.5px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {inner}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(highlightMetrics(text.substring(lastIndex), `txt-${lastIndex}`));
  }

  return <>{parts}</>;
};

// Highlights currencies (₹...), percentages (...%), and bps (... bps)
const highlightMetrics = (text: string, keyPrefix: string): React.ReactNode => {
  const metricRegex = /(₹[\d,]+(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*bps\b)/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = metricRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(text.substring(lastIdx, m.index));
    }
    const val = m[0];
    const isCurrency = val.startsWith('₹');
    const isBps = val.includes('bps');
    const isPct = val.endsWith('%');

    parts.push(
      <span
        key={`${keyPrefix}-${m.index}`}
        style={{
          color: isCurrency ? 'var(--text-primary)' : isBps ? '#f59e0b' : 'var(--groww-green)',
          fontFamily: isCurrency || isBps ? 'var(--font-mono)' : 'inherit',
          fontWeight: 700,
          backgroundColor: isBps ? 'rgba(245, 158, 11, 0.1)' : isCurrency ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 208, 156, 0.08)',
          padding: '0 4px',
          borderRadius: '3px',
        }}
      >
        {val}
      </span>
    );
    lastIdx = m.index + val.length;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return <React.Fragment key={keyPrefix}>{parts}</React.Fragment>;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const StructuredExecutiveSynthesis: React.FC<StructuredExecutiveSynthesisProps> = ({
  synthesis,
  verdict,
  convictionScore,
  orchestrationPattern,
  horizonYears,
  anchorPrice,
  capital,
}) => {
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');
  const [copied, setCopied] = useState(false);

  if (!synthesis) {
    return (
      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
        No executive synthesis available for this run.
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(synthesis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse markdown into sections
  const lines = synthesis.split('\n');
  const rawMetadata: { key: string; value: string }[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let currentSection: { title: string; lines: string[] } | null = null;
  let docTitle = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# ') && !docTitle) {
      docTitle = trimmed.replace(/^#\s+/, '');
      continue;
    }

    if (trimmed.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: trimmed.replace(/^##\s+/, ''),
        lines: [],
      };
      continue;
    }

    // Check if line is top-level metadata (e.g. **Verdict**: ... or **Target Horizon**: ...)
    if (!currentSection && trimmed.startsWith('**') && trimmed.includes(':')) {
      const match = trimmed.match(/^\*\*([^*]+)\*\*:\s*(.*)/);
      if (match) {
        rawMetadata.push({ key: match[1], value: match[2] });
        continue;
      }
    }

    if (currentSection) {
      currentSection.lines.push(trimmed);
    } else {
      // Preface lines before first section
      if (!currentSection) {
        currentSection = { title: 'Executive Overview', lines: [trimmed] };
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  const getSectionIcon = (title: string, index: number) => {
    const t = title.toLowerCase();
    if (t.includes('direct') || t.includes('resolution') || t.includes('verdict')) {
      return <Zap size={15} color="var(--groww-green)" />;
    }
    if (t.includes('discoveries') || t.includes('stream') || t.includes('squad') || t.includes('specialist')) {
      return <Layers size={15} color="var(--accent-cyan)" />;
    }
    if (t.includes('divergence') || t.includes('reconciliation') || t.includes('risk') || t.includes('skeptic')) {
      return <ShieldAlert size={15} color="#f59e0b" />;
    }
    if (t.includes('directive') || t.includes('allocation') || t.includes('mandate') || t.includes('execution')) {
      return <Target size={15} color="#a78bfa" />;
    }
    return <Sparkles size={15} color="var(--groww-green)" />;
  };

  const getSectionBorderColor = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('direct') || t.includes('resolution') || t.includes('verdict')) {
      return 'var(--groww-green)';
    }
    if (t.includes('discoveries') || t.includes('stream') || t.includes('squad') || t.includes('specialist')) {
      return 'var(--accent-cyan)';
    }
    if (t.includes('divergence') || t.includes('reconciliation') || t.includes('risk') || t.includes('skeptic')) {
      return '#f59e0b';
    }
    if (t.includes('directive') || t.includes('allocation') || t.includes('mandate') || t.includes('execution')) {
      return '#a78bfa';
    }
    return 'var(--groww-green)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Controls Bar: Toggle between Structured and Raw Markdown */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '8px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={14} color="var(--groww-green)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Institutional Multi-Agent Synthesis Memorandum
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 208, 156, 0.12)',
              color: 'var(--groww-green)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {orchestrationPattern || 'MULTI-AGENT'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setViewMode('structured')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'structured' ? 'var(--groww-green)' : 'transparent',
                color: viewMode === 'structured' ? '#000000' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={12} />
              Structured View
            </button>
            <button
              onClick={() => setViewMode('raw')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'raw' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'raw' ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={12} />
              Raw Markdown
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="groww-chip"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Copy full synthesis to clipboard"
          >
            {copied ? <Check size={12} color="var(--groww-green)" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* RAW MARKDOWN VIEW */}
      {viewMode === 'raw' ? (
        <div
          style={{
            fontSize: '12px',
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-surface)',
            padding: '16px 18px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {synthesis}
        </div>
      ) : (
        /* STRUCTURED VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Document Header & Metadata Ribbon (if metadata found) */}
          {(docTitle || rawMetadata.length > 0) && (
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {docTitle && (
                <h4
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 10px 0',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {docTitle}
                </h4>
              )}

              {rawMetadata.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {rawMetadata.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{m.key}:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right' }}>
                        {formatInlineText(m.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Render Parsed Section Cards */}
          {sections.map((sec, sIdx) => {
            const accentColor = getSectionBorderColor(sec.title);
            const icon = getSectionIcon(sec.title, sIdx);

            return (
              <div
                key={sIdx}
                style={{
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `4px solid ${accentColor}`,
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {icon}
                  <h4
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: 0,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {sec.title}
                  </h4>
                </div>

                {/* Section Body */}
                <div
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {sec.lines.map((line, lIdx) => {
                    const trimmed = line.trim();

                    // 1. Subheading (### ...)
                    if (trimmed.startsWith('### ')) {
                      return (
                        <h5
                          key={lIdx}
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            margin: '8px 0 2px 0',
                          }}
                        >
                          {trimmed.replace(/^###\s+/, '')}
                        </h5>
                      );
                    }

                    // 2. Bullet Point (- ... or * ...)
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      const bulletText = trimmed.replace(/^[-*]\s+/, '');
                      return (
                        <div
                          key={lIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            fontSize: '12.5px',
                            lineHeight: 1.6,
                            color: 'var(--text-secondary)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.015)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                          }}
                        >
                          <span
                            style={{
                              color: accentColor,
                              fontWeight: 900,
                              fontSize: '14px',
                              lineHeight: 1.2,
                              marginTop: '2px',
                            }}
                          >
                            •
                          </span>
                          <div style={{ flex: 1 }}>{formatInlineText(bulletText)}</div>
                        </div>
                      );
                    }

                    // 3. Numbered Step (1. ..., 2. ...)
                    if (/^\d+\.\s+/.test(trimmed)) {
                      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
                      if (numMatch) {
                        return (
                          <div
                            key={lIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              fontSize: '12.5px',
                              lineHeight: 1.6,
                              color: 'var(--text-secondary)',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.015)',
                              border: '1px solid rgba(255, 255, 255, 0.04)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor: 'rgba(0, 208, 156, 0.15)',
                                color: 'var(--groww-green)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-mono)',
                                marginTop: '2px',
                              }}
                            >
                              {numMatch[1]}
                            </span>
                            <div style={{ flex: 1 }}>{formatInlineText(numMatch[2])}</div>
                          </div>
                        );
                      }
                    }

                    // 4. Regular Paragraph Text
                    return (
                      <p
                        key={lIdx}
                        style={{
                          fontSize: '12.5px',
                          lineHeight: 1.65,
                          color: 'var(--text-secondary)',
                          margin: 0,
                        }}
                      >
                        {formatInlineText(trimmed)}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
