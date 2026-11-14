import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  Zap,
  Layers,
  ShieldAlert,
  Target,
  Clock,
  Coins,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Database,
  Info,
  ShieldCheck,
  Cpu,
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
// Clean String Utility - Guarantees ZERO '#' and ZERO '*' in Clean View / Copy
// ---------------------------------------------------------------------------

export const stripMarkdownSymbols = (text: string): string => {
  if (!text) return '';
  return text
    // Strip leading markdown headers (e.g. ## 1. Section -> 1. Section, # Title -> Title)
    .replace(/^(?:#{1,6})\s*/gm, '')
    // Strip bold asterisks (**text** -> text)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Strip bullet asterisks or dashes (* bullet -> • bullet, - bullet -> • bullet)
    .replace(/^\s*[\*\-]\s+/gm, '• ')
    // Strip italic asterisks (*text* -> text)
    .replace(/\*([^*]+)\*/g, '$1')
    // Strip any leftover stray asterisks or hashes
    .replace(/[*#]/g, '')
    // Normalize multiple spaces or line hashes
    .replace(/(?<=\n)#{1,6}\s*/g, '')
    .trim();
};

// ---------------------------------------------------------------------------
// Inline Formatting Helper (Strips stray symbols and highlights metrics)
// ---------------------------------------------------------------------------

export const formatInlineText = (text: string): React.ReactNode => {
  if (!text) return null;

  // First strip any stray hashes or unformatted asterisks
  const sanitized = text
    .replace(/^(?:#{1,6})\s*/, '')
    .replace(/[*#]/g, '');

  return highlightMetrics(sanitized, 'inl');
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

    parts.push(
      <span
        key={`${keyPrefix}-${m.index}`}
        style={{
          color: isCurrency ? 'var(--text-primary)' : isBps ? '#f59e0b' : 'var(--groww-green)',
          fontFamily: isCurrency || isBps ? 'var(--font-mono)' : 'inherit',
          fontWeight: 700,
          backgroundColor: isBps
            ? 'rgba(245, 158, 11, 0.1)'
            : isCurrency
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 208, 156, 0.09)',
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
// Section Identification Helpers
// ---------------------------------------------------------------------------

// Checks whether a line represents a major section header (e.g. "1. DIRECT INQUIRY RESOLUTION...")
const isMajorSectionHeader = (line: string): boolean => {
  const clean = line.replace(/^(?:#{1,6})\s*/, '').replace(/[*#]/g, '').trim();
  // Numbered major section pattern: 1. DIRECT ..., 2. STAGE-BY-STAGE ..., 3. PIPELINE ...
  if (/^[1-9]\.\s+[A-Z][A-Z0-9\s\-\&—\:\(\)]+$/.test(clean) && clean.length > 8 && clean.length < 120) {
    return true;
  }
  // Line originally had ## markdown heading
  if (/^#{1,3}\s+[1-9]\./.test(line.trim())) {
    return true;
  }
  // Named sections common across ArthaAI multi-agent patterns
  const uppercase = clean.toUpperCase();
  if (
    uppercase.startsWith('1. DIRECT INQUIRY') ||
    uppercase.startsWith('2. STAGE-BY-STAGE') ||
    uppercase.startsWith('3. PIPELINE INVARIANTS') ||
    uppercase.startsWith('2. INDEPENDENT SPECIALIST') ||
    uppercase.startsWith('3. DIVERGENCE AUDIT') ||
    uppercase.startsWith('2. EXECUTIVE DELIBERATION') ||
    uppercase.startsWith('3. REGULATORY SIGN-OFF') ||
    uppercase.startsWith('1. DIRECT EVIDENCE') ||
    uppercase.startsWith('2. MULTI-AGENT SYNTHETIC') ||
    uppercase.startsWith('3. STRATEGIC ALLOCATION')
  ) {
    return true;
  }
  return false;
};

// Checks whether a line represents an institutional subheading (e.g. "Milestone Profit Targets:")
const isSubheading = (line: string): boolean => {
  const clean = line.replace(/^(?:#{1,6})\s*/, '').replace(/[*#]/g, '').trim();
  if (clean.endsWith(':') && clean.length < 60 && !clean.includes('.') && clean.length > 5) {
    return true;
  }
  return (
    clean.startsWith('Milestone Profit Targets:') ||
    clean.startsWith('Capital Deployment Strategy:') ||
    clean.startsWith('Trailing Stop-Loss Boundary:') ||
    clean.startsWith('Supervisory Mandate:') ||
    clean.startsWith('Squad Deliverables:') ||
    clean.startsWith('Resolution & Target Projection:') ||
    clean.startsWith('Direct Evidence-Grounded:') ||
    clean.startsWith('Adversarial Critique:') ||
    clean.startsWith('Statutory Guardrails:')
  );
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
  const [viewMode, setViewMode] = useState<'structured' | 'clean_text'>('structured');
  const [copied, setCopied] = useState(false);

  if (!synthesis) {
    return (
      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
        No executive synthesis available for this run.
      </div>
    );
  }

  const cleanSynthesisText = stripMarkdownSymbols(synthesis);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanSynthesisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse synthesis into structured document sections
  const lines = synthesis.split('\n');
  const rawMetadata: { key: string; value: string }[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let currentSection: { title: string; lines: string[] } | null = null;
  let docTitle = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const cleanedLine = trimmed
      .replace(/^(?:#{1,6})\s*/, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[*#]/g, '')
      .trim();

    // Check for document title (e.g. ARTHAAI SEQUENTIAL FLEET: DETERMINISTIC PIPELINE AUDIT REPORT)
    if (
      !docTitle &&
      (trimmed.startsWith('# ') ||
        cleanedLine.toUpperCase().startsWith('ARTHAAI ') ||
        cleanedLine.toUpperCase().includes('FLEET:') ||
        cleanedLine.toUpperCase().includes('REPORT') && cleanedLine.length < 80)
    ) {
      docTitle = cleanedLine;
      continue;
    }

    // Check for Major Section Header (e.g. 1. DIRECT INQUIRY RESOLUTION..., 2. STAGE-BY-STAGE...)
    if (isMajorSectionHeader(trimmed)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: cleanedLine,
        lines: [],
      };
      continue;
    }

    // Check for metadata key-value lines (e.g. Execution Model: 7-Agent Linear Relay..., Verdict: ...)
    if (!currentSection && cleanedLine.includes(':') && cleanedLine.split(':')[0].length < 35 && !cleanedLine.startsWith('•')) {
      const parts = cleanedLine.split(':');
      const k = parts[0].trim();
      const v = parts.slice(1).join(':').trim();
      if (k && v) {
        rawMetadata.push({ key: k, value: v });
        continue;
      }
    }

    if (currentSection) {
      currentSection.lines.push(trimmed);
    } else {
      // Preface lines before first section
      currentSection = { title: '1. Executive Synthesis & Resolution', lines: [trimmed] };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  const getSectionIcon = (title: string, index: number) => {
    const t = title.toLowerCase();
    if (t.includes('direct') || t.includes('resolution') || t.includes('verdict')) {
      return <Zap size={16} color="var(--groww-green)" />;
    }
    if (t.includes('discoveries') || t.includes('stream') || t.includes('squad') || t.includes('specialist') || t.includes('stage-by-stage') || t.includes('refinement')) {
      return <Layers size={16} color="var(--accent-cyan)" />;
    }
    if (t.includes('divergence') || t.includes('reconciliation') || t.includes('risk') || t.includes('skeptic') || t.includes('audit')) {
      return <ShieldAlert size={16} color="#f59e0b" />;
    }
    if (t.includes('directive') || t.includes('allocation') || t.includes('mandate') || t.includes('invariant') || t.includes('execution')) {
      return <Target size={16} color="#a78bfa" />;
    }
    return <Sparkles size={16} color="var(--groww-green)" />;
  };

  const getSectionBorderColor = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('direct') || t.includes('resolution') || t.includes('verdict')) {
      return 'var(--groww-green)';
    }
    if (t.includes('discoveries') || t.includes('stream') || t.includes('squad') || t.includes('specialist') || t.includes('stage-by-stage') || t.includes('refinement')) {
      return 'var(--accent-cyan)';
    }
    if (t.includes('divergence') || t.includes('reconciliation') || t.includes('risk') || t.includes('skeptic') || t.includes('audit')) {
      return '#f59e0b';
    }
    if (t.includes('directive') || t.includes('allocation') || t.includes('mandate') || t.includes('invariant') || t.includes('execution')) {
      return '#a78bfa';
    }
    return 'var(--groww-green)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Controls Bar: Toggle between Structured and Clean Text */}
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
              onClick={() => setViewMode('clean_text')}
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
                backgroundColor: viewMode === 'clean_text' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'clean_text' ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={12} />
              Clean Text View
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
            title="Copy clean institutional synthesis to clipboard"
          >
            {copied ? <Check size={12} color="var(--groww-green)" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* CLEAN TEXT VIEW (Zero hashes and zero asterisks) */}
      {viewMode === 'clean_text' ? (
        <div
          style={{
            fontSize: '12.5px',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-surface)',
            padding: '18px 20px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {cleanSynthesisText}
        </div>
      ) : (
        /* STRUCTURED VIEW (Rich interactive cards, styled subheadings, bullet items, badges) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Document Header & Metadata Ribbon */}
          {(docTitle || rawMetadata.length > 0) && (
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {docTitle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: rawMetadata.length > 0 ? '12px' : 0 }}>
                  <ShieldCheck size={16} color="var(--groww-green)" />
                  <h4
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: 0,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {docTitle}
                  </h4>
                </div>
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

                    // Strip any stray markdown symbols from this line
                    const cleanLine = trimmed
                      .replace(/^(?:#{1,6})\s*/, '')
                      .replace(/\*\*([^*]+)\*\*/g, '$1')
                      .replace(/[*#]/g, '')
                      .trim();

                    if (!cleanLine) return null;

                    // 1. Subheading Block (e.g. Milestone Profit Targets:, Capital Deployment Strategy:)
                    if (isSubheading(trimmed)) {
                      return (
                        <div
                          key={lIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(0, 208, 156, 0.06)',
                            border: '1px solid rgba(0, 208, 156, 0.15)',
                            marginTop: lIdx > 0 ? '6px' : 0,
                          }}
                        >
                          <Target size={13} color="var(--groww-green)" />
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 800,
                              color: 'var(--text-primary)',
                              letterSpacing: '-0.1px',
                            }}
                          >
                            {cleanLine}
                          </span>
                        </div>
                      );
                    }

                    // 2. Bullet Point (starts with •, -, or *)
                    if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      const bulletText = trimmed.replace(/^(?:•\s*|[-*]\s+)/, '');
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
                            padding: '7px 12px',
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
                              userSelect: 'none',
                            }}
                          >
                            •
                          </span>
                          <div style={{ flex: 1 }}>{formatInlineText(bulletText)}</div>
                        </div>
                      );
                    }

                    // 3. Numbered Sub-step (e.g. 1. Step, 2. Step) inside section
                    if (/^\d+\.\s+/.test(cleanLine)) {
                      const numMatch = cleanLine.match(/^(\d+)\.\s+(.*)/);
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
                              padding: '7px 12px',
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
                          lineHeight: 1.68,
                          color: 'var(--text-secondary)',
                          margin: 0,
                        }}
                      >
                        {formatInlineText(cleanLine)}
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
