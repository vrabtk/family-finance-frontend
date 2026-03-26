export default function Badge({ children, color='gold', size='sm' }) {
  const colorMap = {
    gold:   { bg:'rgba(240,180,41,.12)',  text:'var(--gold)',   border:'var(--gold-dim)' },
    green:  { bg:'rgba(52,211,153,.1)',   text:'var(--green)',  border:'#1a5a30' },
    red:    { bg:'var(--red-dim)',         text:'var(--red)',    border:'#5a1010' },
    blue:   { bg:'var(--blue-dim)',        text:'var(--blue)',   border:'rgba(56,189,248,.3)' },
    purple: { bg:'var(--purple-dim)',      text:'var(--purple)', border:'rgba(167,139,250,.3)' },
    muted:  { bg:'var(--surface3)',        text:'var(--text-muted)', border:'var(--border)' },
  };
  const c = colorMap[color] || colorMap.muted;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding: size === 'sm' ? '4px 8px' : '6px 12px',
      borderRadius:20, fontSize: size === 'sm' ? 11 : 12,
      fontWeight:700, background:c.bg, color:c.text,
      border:`1px solid ${c.border}`,
    }}>
      {children}
    </span>
  );
}
