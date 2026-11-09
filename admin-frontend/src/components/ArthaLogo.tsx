import React from 'react';

export interface ArthaLogoProps {
  /** Size in pixels (width & height of the icon/badge). Defaults to 36. */
  size?: number;
  /**
   * - 'badge': Icon inside an institutional dark glassmorphic squircle with subtle emerald border.
   * - 'icon': Pure transparent logo image without container.
   * - 'full': Logo mark + "ArthaAI" typography + optional tier pill.
   */
  variant?: 'badge' | 'icon' | 'full';
  /** Whether to emit a soft ambient emerald/cyan glow */
  showGlow?: boolean;
  /** Optional pill label when variant is 'full' (e.g. 'ADMIN', 'CONTROL PLANE', 'QUANT') */
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
  size = 36,
  variant = 'icon',
  showGlow = false,
  pillText,
  subtitle,
  theme = 'auto',
  className = '',
  style = {},
  onClick,
}) => {
  const imgSize = size;
  const borderRadius = Math.max(6, Math.round(size * 0.26));

  const glowFilter = showGlow
    ? 'drop-shadow(0 2px 10px rgba(0, 208, 156, 0.45)) drop-shadow(0 0 4px rgba(6, 182, 212, 0.35))'
    : 'none';

  const logoImage = (
    <img
      src="/logo.png"
      alt="ArthaAI Quantitative Monogram"
      width={imgSize}
      height={imgSize}
      style={{
        width: `${imgSize}px`,
        height: `${imgSize}px`,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        filter: glowFilter,
        userSelect: 'none',
        pointerEvents: 'none',
        background: 'transparent',
      }}
      loading="eager"
      decoding="async"
    />
  );

  const badgeElement = (
    <div
      className={className}
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: 'transparent',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      {logoImage}
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
        {logoImage}
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
