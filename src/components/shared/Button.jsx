import { useState } from 'react';

const sizeStyles = {
  sm: { padding: '8px 13px', fontSize: 12, minHeight: 38 },
  md: { padding: '10px 16px', fontSize: 13, minHeight: 42 },
  lg: { padding: '13px 20px', fontSize: 15, minHeight: 48 },
};

const variantStyles = {
  primary: {
    background: 'var(--gold)',
    border: '1px solid var(--gold)',
    color: '#0d1118',
    boxShadow: '0 12px 26px rgba(240,180,41,.16)',
  },
  secondary: {
    background: 'var(--surface2)',
    border: '1px solid var(--border2)',
    color: 'var(--text-dim)',
  },
  danger: {
    background: 'var(--red-dim)',
    border: '1px solid rgba(248,113,113,.65)',
    color: 'var(--red)',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-muted)',
  },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const inactive = disabled || loading;
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const sizeStyle = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      {...props}
      disabled={inactive}
      onMouseEnter={(e) => {
        setHovered(true);
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        props.onMouseLeave?.(e);
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: 'fit-content',
        borderRadius: 12,
        cursor: inactive ? 'not-allowed' : 'pointer',
        transition: 'transform .16s ease, filter .16s ease, background .16s ease, border-color .16s ease, color .16s ease',
        fontFamily: 'var(--font)',
        fontWeight: 800,
        letterSpacing: 0.2,
        opacity: inactive ? 0.55 : 1,
        transform: hovered && !inactive ? 'translateY(-1px)' : 'translateY(0)',
        filter: hovered && !inactive ? 'brightness(1.04)' : 'none',
        ...sizeStyle,
        ...variantStyle,
        ...style,
      }}
    >
      {loading && <span style={{ display: 'inline-block', animation: 'spin .8s linear infinite' }}>⟳</span>}
      {children}
    </button>
  );
}
