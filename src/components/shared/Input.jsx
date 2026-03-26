import useIsMobile from '../../utils/useIsMobile';

export default function Input({ label, error, style, inputStyle, ...props }) {
  const isMobile = useIsMobile();

  return (
    <div style={style}>
      {label && <label style={{fontSize:isMobile ? 12 : 11,fontWeight:700,letterSpacing:1,color:'var(--text-dim)',textTransform:'uppercase',display:'block',marginBottom:7}}>{label}</label>}
      <input
        {...props}
        style={{
          width:'100%', padding:isMobile ? '14px 15px' : '13px 14px',
          background:'var(--surface2)', border:`1px solid ${error ? 'var(--red)' : 'var(--border2)'}`,
          borderRadius:'var(--r)', color:'var(--text)',
          fontFamily:'var(--font)', fontSize:isMobile ? 16 : 14, outline:'none',
          transition: 'border-color .16s ease, box-shadow .16s ease, background .16s ease',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.02)',
          ...inputStyle,
        }}
        onFocus={e => {
          e.target.style.borderColor = error ? 'var(--red)' : 'var(--gold-dim)';
          e.target.style.boxShadow = error
            ? '0 0 0 3px rgba(248,113,113,.10)'
            : '0 0 0 3px rgba(240,180,41,.10)';
          props.onFocus?.(e);
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--red)' : 'var(--border2)';
          e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.02)';
          props.onBlur?.(e);
        }}
      />
      {error && <span style={{fontSize:11,color:'var(--red)',marginTop:6,display:'block',lineHeight:1.5}}>{error}</span>}
    </div>
  );
}
