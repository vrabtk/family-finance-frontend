import { useState } from 'react';
import useAuthStore from '../store/auth.store';
import useUIStore from '../store/ui.store';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import api from '../api/client';
import useIsMobile from '../utils/useIsMobile';

export default function SettingsPage() {
  const { user, workspaces, activeWorkspace } = useAuthStore();
  const { showToast } = useUIStore();
  const isMobile = useIsMobile();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeWorkspace) return;
    setLoading(true);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/invite`, { email: inviteEmail, role: inviteRole });
      showToast(`Invited ${inviteEmail}`);
      setInviteEmail('');
    } catch(e) { showToast(e.response?.data?.error || 'Invite failed', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <PageLayout title="⚙️ Settings" subtitle="Manage your account details and workspace access from one place.">
      <div style={{display:'grid',gridTemplateColumns:isMobile ? '1fr' : 'repeat(auto-fit,minmax(280px,1fr))',gap:22,maxWidth:920}}>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:isMobile ? 20 : 24,boxShadow:'0 12px 28px rgba(0,0,0,.14)'}}>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:18}}>👤 Account</h3>
          <div style={{fontSize:13,color:'var(--text-dim)',marginBottom:6}}>Name</div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:14}}>{user?.name}</div>
          <div style={{fontSize:13,color:'var(--text-dim)',marginBottom:6}}>Email</div>
          <div style={{fontSize:16,fontWeight:700}}>{user?.email}</div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:isMobile ? 20 : 24,boxShadow:'0 12px 28px rgba(0,0,0,.14)'}}>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:18}}>🤝 Invite to "{activeWorkspace?.name}"</h3>
          <Input label="Email" type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@example.com" style={{marginBottom:12}} />
          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'var(--text-dim)',textTransform:'uppercase',display:'block',marginBottom:7}}>Role</label>
            <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14}}>
              <option value="viewer">Viewer (read-only)</option>
              <option value="member">Member (add/edit)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <Button variant="primary" loading={loading} onClick={handleInvite}>Send Invite</Button>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:10,lineHeight:1.6}}>They must have an account. Share the app URL for them to sign up first.</p>
        </div>
      </div>
    </PageLayout>
  );
}
