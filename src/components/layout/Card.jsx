export default function Card({ header, children, footer, style={} }) {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 12px 30px rgba(0,0,0,.16)',...style}}>
      {header && <div style={{padding:'16px 18px',borderBottom:'1px solid var(--border)',background:'linear-gradient(180deg, rgba(19,29,48,.96) 0%, rgba(13,20,34,.92) 100%)'}}>{header}</div>}
      {children && <div style={{padding:'16px 18px'}}>{children}</div>}
      {footer && <div style={{padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',gap:8,flexWrap:'wrap'}}>{footer}</div>}
    </div>
  );
}
