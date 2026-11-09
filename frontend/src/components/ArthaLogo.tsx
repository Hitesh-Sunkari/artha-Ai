import React, { useId } from 'react';

export interface ArthaLogoProps {
  /** Size in pixels (width & height of the icon/badge). Defaults to 34. */
  size?: number;
  /**
   * - 'badge': Icon inside an institutional dark glassmorphic rounded squircle with subtle emerald border.
   * - 'icon': Pure vector mark with transparent background.
   * - 'full': Mark + "ArthaAI" typography + optional tier pill.
   */
  variant?: 'badge' | 'icon' | 'full';
  /** Whether to emit a soft ambient emerald/cyan glow */
  showGlow?: boolean;
  /** Optional pill label when variant is 'full' (e.g. 'PRO', 'ADMIN', 'QUANT') */
  pillText?: string;
  /** Subtitle line when variant is 'full' */
  subtitle?: string;
  /** Force light or dark typography */
  theme?: 'dark' | 'light' | 'auto';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const ArthaLogo: React.FC<ArthaLogoProps> = ({
  size = 34,
  variant = 'badge',
  showGlow = false,
  pillText,
  subtitle,
  theme = 'auto',
  className = '',
  style = {},
  onClick,
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '');

  const p1GradId = `artha-p1-${id}`;
  const p2GradId = `artha-p2-${id}`;
  const crossGradId = `artha-cross-${id}`;
  const glowFilterId = `artha-glow-${id}`;
  const bgGradId = `artha-bg-${id}`;

  const markSvg = (
    <svg
      width={variant === 'badge' ? Math.round(size * 0.72) : size}
      height={variant === 'badge' ? Math.round(size * 0.72) : size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="ArthaAI Quantitative Alpha Monogram"
    >
      <defs>
        {/* Left Wing Gradient (Institutional Growth Green) */}
        <linearGradient id={p1GradId} x1="0" y1="64" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00875A" />
          <stop offset="60%" stopColor="#00D09C" />
          <stop offset="100%" stopColor="#00F5A0" />
        </linearGradient>

        {/* Right Wing Gradient (High-Frequency Cyan to Indigo Alpha) */}
        <linearGradient id={p2GradId} x1="32" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F5A0" />
          <stop offset="45%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Kinetic Alpha Crossbar (Neural Bridge Vector) */}
        <linearGradient id={crossGradId} x1="16" y1="40" x2="48" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D09C" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* High-Precision Glow Filter */}
        <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Left Pillar (Risk Guard & Foundation Wing) */}
      <path
        d="M14 51L27.5 12C28.8 8.5 31.2 8 32 8V20L22.5 47L22.5 51H14Z"
        fill={`url(#${p1GradId})`}
      />

      {/* Right Pillar (Alpha & Market Outperformance Vector) */}
      <path
        d="M32 8C32.8 8 35.2 8.5 36.5 12L50 51H41.5L41.5 47L32 20V8Z"
        fill={`url(#${p2GradId})`}
      />

      {/* Kinetic Alpha Chevron (Connecting Neural Bridge) */}
      <path
        d="M19 38.5L32 26.5L45 38.5L40.8 43L32 34.5L23.2 43L19 38.5Z"
        fill={`url(#${crossGradId})`}
        filter={`url(#${glowFilterId})`}
      />

      {/* Quantum Core Spark at Apex */}
      <polygon
        points="32,9 34.5,12.5 32,16 29.5,12.5"
        fill="#FFFFFF"
        opacity={0.96}
      />
    </svg>
  );

  const borderRadius = Math.max(6, Math.round(size * 0.26));

  const badgeElement = (
    <div
      className={className}
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        background: 'linear-gradient(145deg, #0D1627 0%, #060911 100%)',
        border: '1px solid rgba(0, 208, 156, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: showGlow
          ? '0 4px 20px rgba(0, 208, 156, 0.35), 0 0 10px rgba(6, 182, 212, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
          : '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      {markSvg}
    </div>
  );

  if (variant === 'icon') {
    return (
      <div
        className={className}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
      >
        {markSvg}
      </div>
    );
  }

  if (variant === 'badge') {
    return badgeElement;
  }

  // Full variant: Badge + Typography + Optional Pill
  const primaryTextColor =
    theme === 'light'
      ? '#0F172A'
      : theme === 'dark'
      ? '#F8FAFC'
      : 'var(--text-primary, #F8FAFC)';

  const secondaryTextColor =
    theme === 'light'
      ? '#64748B'
      : theme === 'dark'
      ? '#94A3B8'
      : 'var(--text-secondary, #94A3B8)';

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {badgeElement}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            lineHeight: 1.15,
          }}
        >
          <span
            style={{
              fontSize: `${Math.max(14, Math.round(size * 0.44))}px`,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: primaryTextColor,
            }}
          >
            Artha<span style={{ color: '#00D09C' }}>AI</span>
          </span>
          {pillText && (
            <span
              style={{
                fontSize: `${Math.max(9, Math.round(size * 0.24))}px`,
                fontWeight: 800,
                color: '#00D09C',
                backgroundColor: 'rgba(0, 208, 156, 0.14)',
                border: '1px solid rgba(0, 208, 156, 0.28)',
                padding: '1px 6px',
                borderRadius: '4px',
                letterSpacing: '0.04em',
                fontFamily: 'monospace',
              }}
            >
              {pillText}
            </span>
          )}
        </div>
        {subtitle && (
          <span
            style={{
              fontSize: `${Math.max(9, Math.round(size * 0.26))}px`,
              color: secondaryTextColor,
              fontWeight: 500,
              letterSpacing: '0.02em',
              marginTop: '2px',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default ArthaLogo;

