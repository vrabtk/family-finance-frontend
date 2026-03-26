import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import useIsMobile from '../../utils/useIsMobile';

const NAV = [
  { path:'/expenses',   label:'📅 Expenses' },
  { path:'/loans',      label:'🏦 Loans' },
  { path:'/investments',label:'📈 Investments' },
  { path:'/insurance',  label:'🛡️ Insurance' },
  { path:'/overview',   label:'📋 Overview' },
  { path:'/banks',      label:'🏛️ Banks' },
  { path:'/analytics',  label:'📊 Analytics' },
];

export default function Header() {
  const navigate = useNavigate();
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout } = useAuthStore();
  const [showUser, setShowUser] = useState(false);
  const isMobile = useIsMobile();
  const current = window.location.pathname;

  const navStyle = (path) => ({
    padding:isMobile ? '8px 12px' : '8px 13px', borderRadius:10,
    color: current === path ? 'var(--gold)' : 'var(--text-muted)',
    background: current === path ? 'rgba(240,180,41,.12)' : 'transparent',
    border: current === path ? '1px solid var(--gold-dim)' : '1px solid transparent',
    cursor:'pointer', fontFamily:'var(--font)', fontSize:isMobile ? 12 : 13, fontWeight:700,
    whiteSpace:isMobile ? 'normal' : 'nowrap', transition:'all .15s',
    textAlign:'center', minHeight:isMobile ? 42 : 'auto', width:isMobile ? '100%' : 'auto',
  });

  return (
    <header style={{
      background:'rgba(13,20,34,.92)', borderBottom:'1px solid var(--border)',
      backdropFilter:'blur(16px)',
      padding:isMobile ? '10px 14px 12px' : '0 20px', position:'sticky', top:0, zIndex:200,
      minHeight:isMobile ? 'auto' : 62, display:'flex', alignItems:isMobile ? 'flex-start' : 'center', gap:isMobile ? 10 : 14,
      flexWrap:'wrap',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:9,flexShrink:0}}>
        <div style={{width:34,height:34,background:'linear-gradient(135deg,var(--gold),#c88b00)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:'0 10px 24px rgba(240,180,41,.18)'}}>💰</div>
        <span style={{fontSize:15,fontWeight:800,color:'var(--text)',whiteSpace:'nowrap',letterSpacing:-.3}}>Family<span style={{color:'var(--gold)'}}>Finance</span></span>
      </div>

      <nav style={{
        display:isMobile ? 'grid' : 'flex',
        gridTemplateColumns:isMobile ? 'repeat(3, minmax(0, 1fr))' : undefined,
        gap:isMobile ? 6 : 4,
        overflowX:isMobile ? 'visible' : 'auto',
        flex:isMobile ? '1 1 100%' : 1,
        order:isMobile ? 3 : 0,
        scrollbarWidth:'none',
        padding:isMobile ? '2px 0 0' : '6px 0',
        width:isMobile ? '100%' : 'auto',
      }}>
        {NAV.map(n => (
          <button key={n.path} style={navStyle(n.path)} onClick={() => navigate(n.path)}>{n.label}</button>
        ))}
      </nav>

      <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0,position:'relative',marginLeft:isMobile ? 'auto' : 0,flexWrap:'wrap',justifyContent:'flex-end'}}>
        {workspaces.length > 1 && (
          <select
            value={activeWorkspace?.id || ''}
            onChange={e => setActiveWorkspace(workspaces.find(w => w.id === e.target.value))}
            style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:10,color:'var(--text-dim)',fontSize:isMobile ? 12 : 13,padding:'7px 10px',cursor:'pointer',maxWidth:isMobile ? 170 : 220}}
          >
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <button
          onClick={() => setShowUser(!showUser)}
          aria-label="Account menu"
          style={{width:34,height:34,borderRadius:'50%',background:'var(--surface2)',border:'1px solid var(--border2)',color:'var(--gold)',fontWeight:700,cursor:'pointer',fontSize:14}}
        >
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </button>
        {showUser && (
          <div style={{position:'absolute',top:42,right:0,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'16px',padding:6,minWidth:isMobile ? 180 : 190,zIndex:300,boxShadow:'0 18px 40px rgba(0,0,0,.28)'}}>
            <div style={{padding:'10px 12px',fontSize:12,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',marginBottom:6}}>
              <div style={{fontWeight:700,color:'var(--text)',fontSize:14,marginBottom:2}}>{user?.name}</div>
              <div>{user?.email}</div>
            </div>
            <button onClick={() => navigate('/settings')} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 12px',background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:13,borderRadius:10}}>⚙️ Settings</button>
            <button onClick={logout} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 12px',background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:13,borderRadius:10}}>Sign Out</button>
          </div>
        )}
      </div>
    </header>
  );
}
