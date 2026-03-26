import useIsMobile from '../../utils/useIsMobile';

export default function PageLayout({ title, subtitle, actions, children }) {
  const isMobile = useIsMobile();

  return (
    <div style={{padding:'var(--page-pad)',maxWidth:1440,margin:'0 auto'}}>
      {(title || actions) && (
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:isMobile ? 20 : 24,gap:16,flexWrap:'wrap'}}>
          <div>
            {title && <div style={{fontSize:isMobile ? 24 : 28,fontWeight:800,letterSpacing:isMobile ? -0.6 : -0.9,lineHeight:1.1}}>{title}</div>}
            {subtitle && <div style={{fontSize:isMobile ? 12 : 13,color:'var(--text-dim)',marginTop:6,lineHeight:1.7,maxWidth:760}}>{subtitle}</div>}
          </div>
          {actions && <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
