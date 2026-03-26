export default function EmptyState({ icon='📭', title, subtitle, action }) {
  return (
    <div style={{textAlign:'center', padding:'56px 24px', color:'var(--text-muted)', gridColumn:'1/-1'}}>
      <div style={{fontSize:40, marginBottom:12}}>{icon}</div>
      <div style={{fontSize:16, fontWeight:700, color:'var(--text-dim)', marginBottom:8}}>{title}</div>
      {subtitle && <div style={{fontSize:13, marginBottom:18, lineHeight:1.6}}>{subtitle}</div>}
      {action}
    </div>
  );
}
