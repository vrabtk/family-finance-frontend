import { useEffect, useState } from 'react';
import useUIStore from '../../store/ui.store';

export default function Toast() {
  const { toast } = useUIStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) { setVisible(true); const t = setTimeout(() => setVisible(false), 2800); return () => clearTimeout(t); }
  }, [toast]);

  if (!toast || !visible) return null;

  const colors = { success: 'var(--green)', error: 'var(--red)', info: 'var(--gold)' };

  return (
    <div style={{
      position:'fixed', bottom:20, right:20,
      background:'var(--surface3)', border:`1px solid ${colors[toast.type] || 'var(--border2)'}`,
      borderRadius:'14px', padding:'12px 18px',
      fontSize:13, color:'var(--text)', zIndex:2000,
      animation:'slideUp .25s ease',
      boxShadow:'0 12px 32px rgba(0,0,0,.32)',
    }}>
      {toast.message}
    </div>
  );
}
