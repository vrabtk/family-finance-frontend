import { fmt } from '../../utils/format';
import useIsMobile from '../../utils/useIsMobile';

export default function SummaryBar({ items }) {
  const isMobile = useIsMobile();

  return (
    <div style={{display:'grid',gridTemplateColumns:isMobile ? 'repeat(auto-fit,minmax(160px,1fr))' : `repeat(${items.length},minmax(0,1fr))`,gap:1,background:'var(--border)',borderBottom:'1px solid var(--border)',borderRadius:'18px',overflow:'hidden'}}>
      {items.map((item, i) => (
        <div key={i} style={{background:'var(--surface)',padding:'14px 18px',cursor:item.onClick?'pointer':undefined,minWidth:0}} onClick={item.onClick}>
          <div style={{fontSize:'var(--fs-2xs)',fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>{item.label}</div>
          <div style={{fontFamily:'var(--mono)',fontSize:21,fontWeight:700,color:item.color||'var(--text)',lineHeight:1.2}}>{fmt(item.value)}</div>
          {item.sub && <div style={{fontSize:'var(--fs-xs)',color:'var(--text-dim)',marginTop:4,lineHeight:1.5}}>{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
