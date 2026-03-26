import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/auth.store';
import useUIStore from '../../store/ui.store';
import { getLoans, createLoan, updateLoan, deleteLoan } from '../../api/finance.api';
import { fmt } from '../../utils/format';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/shared/Modal';
import useIsMobile from '../../utils/useIsMobile';

const LOAN_TYPES = [
  { value:'emi',      label:'Home / EMI',    icon:'🏠', color:'#38bdf8' },
  { value:'credit',   label:'Credit Card',   icon:'💳', color:'#f87171' },
  { value:'personal', label:'Personal Loan', icon:'👤', color:'#fbbf24' },
  { value:'given',    label:'Given Out',     icon:'🤝', color:'#2dd4bf' },
];
const FILTERS = ['all','emi','credit','personal','given'];
const typeMeta = (v) => LOAN_TYPES.find(t => t.value === v) || LOAN_TYPES[2];

const EMPTY = {
  name:'', type:'emi', who:'', totalAmount:'', outstanding:'',
  emi:'', interestRate:'', startDate:'', endDate:'', status:'active', notes:'',
};

const lbl = { fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text-dim)',display:'block',marginBottom:6 };
const inp = (e={}) => ({ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontFamily:'var(--font)',fontSize:14,outline:'none',...e });
const btnSm = (e={}) => ({ padding:'8px 12px',borderRadius:10,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text-dim)',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,fontWeight:700,...e });

const monthsLeft = (endDate) => {
  if (!endDate) return null;
  const e = new Date(endDate), n = new Date();
  return (e.getFullYear()-n.getFullYear())*12 + (e.getMonth()-n.getMonth());
};

export default function LoansPage() {
  const { activeWorkspace } = useAuthStore();
  const { showToast } = useUIStore();
  const isMobile = useIsMobile();
  const wid = activeWorkspace?.id;

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [modal,   setModal]   = useState(false);
  const [editId,  setEditId]  = useState('');
  const [form,    setForm]    = useState(EMPTY);
  const [confirm, setConfirm] = useState(null);
  const formCols = isMobile ? '1fr' : '1fr 1fr';

  const load = useCallback(async () => {
    if (!wid) return;
    setLoading(true);
    try { setItems(await getLoans(wid)); }
    finally { setLoading(false); }
  }, [wid]);
  useEffect(() => { load(); }, [load]);

  /* totals — only non-given loans count as debt */
  const active   = items.filter(i => !i.isArchived && i.status === 'active');
  const owed     = active.filter(l => l.type !== 'given').reduce((s,l) => s + parseFloat(l.outstanding||0), 0);
  const given    = active.filter(l => l.type === 'given').reduce((s,l) => s + parseFloat(l.outstanding||0), 0);
  const totalEmi = active.filter(l => l.type !== 'given').reduce((s,l) => s + parseFloat(l.emi||0), 0);

  const visible = filter==='all' ? items : items.filter(l => l.type===filter);

  const openAdd  = () => { setEditId(''); setForm(EMPTY); setModal(true); };
  const openEdit = (l) => {
    setEditId(l.id);
    setForm({
      name: l.name||'', type: l.type||'emi', who: l.who||'',
      totalAmount:  l.totalAmount||'', outstanding: l.outstanding||'',
      emi:          l.emi||'',         interestRate: l.interestRate||'',
      startDate:    l.startDate  ? l.startDate.slice(0,10)  : '',
      endDate:      l.endDate    ? l.endDate.slice(0,10)    : '',
      status: l.status||'active', notes: l.notes||'',
    });
    setModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      totalAmount:  form.totalAmount  !== '' ? Number(form.totalAmount)  : null,
      outstanding:  form.outstanding  !== '' ? Number(form.outstanding)  : null,
      emi:          form.emi          !== '' ? Number(form.emi)          : null,
      interestRate: form.interestRate !== '' ? Number(form.interestRate) : null,
      startDate: form.startDate || null,
      endDate:   form.endDate   || null,
    };
    try {
      if (editId) { await updateLoan(wid, editId, payload); showToast('Updated'); }
      else        { await createLoan(wid, payload);         showToast('Loan added'); }
      setModal(false); await load();
    } catch(e) { showToast(e.response?.data?.error||'Error','error'); }
  };
  const handleDelete = async (l) => {
    await deleteLoan(wid, l.id);
    showToast(`Deleted "${l.name}"`);
    setConfirm(null); await load();
  };
  const quickUpdateBal = async (l) => {
    const v = prompt(`Outstanding balance for "${l.name}":`, l.outstanding||'');
    if (v !== null && !isNaN(Number(v))) {
      await updateLoan(wid, l.id, { outstanding: Number(v) });
      showToast('Balance updated'); await load();
    }
  };

  if (!wid) return <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>No workspace selected</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'calc(100dvh - 62px)',overflowY:'auto'}}>

      {/* header */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:isMobile ? '18px 16px' : '18px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:14,flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,letterSpacing:-.8,lineHeight:1.1}}>🏦 Loans & Debts</div>
          <div style={{fontSize:13,color:'var(--text-dim)',marginTop:4}}>EMIs · Credit Cards · Personal Loans · Money Given Out</div>
        </div>
        <button onClick={openAdd} style={{padding:'10px 18px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontFamily:'var(--font)',fontSize:14,width:isMobile ? '100%' : 'auto'}}>
          + Add Loan
        </button>
      </div>

      {/* summary bar */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:1,background:'var(--border)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        {[
          {label:'Outstanding Debt', val:fmt(owed),     color:'var(--red)',   sub:`${active.filter(l=>l.type!=='given').length} active loans`},
          {label:'Monthly EMIs',     val:fmt(totalEmi), color:'var(--amber)', sub:'Total monthly outflow'},
          {label:'Given Out',        val:fmt(given),    color:'var(--teal,#2dd4bf)', sub:`${active.filter(l=>l.type==='given').length} recoverable`},
          {label:'Net Debt',         val:fmt(owed-given), color:(owed-given)>0?'var(--red)':'var(--green)', sub:(owed-given)>0?'You owe more':'Balanced'},
        ].map((s,i)=>(
          <div key={i} style={{background:'var(--surface)',padding:'14px 18px'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1.1,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>{s.label}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:20,fontWeight:700,color:s.color,lineHeight:1.2}}>{s.val}</div>
            <div style={{fontSize:12,color:'var(--text-dim)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* filter tabs */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:isMobile ? '10px 16px' : '10px 24px',display:'flex',gap:8,flexShrink:0,flexWrap:'wrap'}}>
        {FILTERS.map(f => {
          const meta = f==='all'?null:typeMeta(f);
          const on   = filter===f;
          return (
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'8px 14px',borderRadius:10,cursor:'pointer',fontFamily:'var(--font)',fontSize:13,fontWeight:700,background:on?'rgba(240,180,41,.12)':'transparent',border:on?'1px solid var(--gold-dim)':'1px solid transparent',color:on?'var(--gold)':'var(--text-muted)'}}>
              {meta?`${meta.icon} ${meta.label}`:'All'}
            </button>
          );
        })}
      </div>

      {/* cards */}
      <div style={{padding:isMobile ? 16 : 24,display:'grid',gridTemplateColumns:isMobile ? '1fr' : 'repeat(auto-fill,minmax(340px,1fr))',gap:18,alignItems:'start'}}>
        {loading && <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'var(--text-muted)'}}>Loading…</div>}
        {!loading && visible.length===0 && (
          <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'var(--text-muted)'}}>
            <div style={{fontSize:34,marginBottom:10}}>🏦</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text-dim)',marginBottom:8}}>No loans here</div>
            <div style={{fontSize:13,marginBottom:22}}>Click "+ Add Loan" to track a loan</div>
            <button onClick={openAdd} style={{padding:'11px 20px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:14}}>+ Add Loan</button>
          </div>
        )}
        {!loading && visible.map(l => {
          const meta  = typeMeta(l.type);
          const out   = parseFloat(l.outstanding||0);
          const tot   = parseFloat(l.totalAmount||0);
          const repaid = tot>0 ? Math.min(100,Math.round((tot-out)/tot*100)) : 0;
          const ml    = monthsLeft(l.endDate);
          const isGiven = l.type==='given';

          return (
            <div key={l.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r2)',overflow:'hidden'}}>
              {/* header */}
              <div style={{padding:'16px 16px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',borderBottom:'1px solid var(--border)',background:'var(--surface2)'}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:38,height:38,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,background:`${meta.color}18`}}>{meta.icon}</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,lineHeight:1.25}}>{l.name}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                      {l.who && <span style={{color:meta.color}}>{l.who} · </span>}
                      {meta.label}
                    </div>
                  </div>
                </div>
                <span style={{fontSize:10,padding:'4px 8px',borderRadius:20,fontWeight:700,background:l.status==='active'?'#0a3020':'var(--surface3)',color:l.status==='active'?'var(--green)':'var(--text-muted)',border:`1px solid ${l.status==='active'?'#1a5a30':'var(--border)'}`}}>
                  {l.status}
                </span>
              </div>

              {/* body */}
              <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
                {/* outstanding highlight */}
                <div style={{background:'var(--surface2)',borderRadius:12,padding:'12px 13px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:12,color:'var(--text-dim)'}}>{isGiven?'Recoverable':'Outstanding'}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color:isGiven?'var(--teal,#2dd4bf)':'var(--red)'}}>{fmt(out)}</span>
                </div>

                {/* repayment progress */}
                {tot>0 && (
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-muted)',marginBottom:5}}>
                      <span>Repaid {repaid}%</span>
                      <span>{fmt(tot-out)} / {fmt(tot)}</span>
                    </div>
                    <div style={{height:5,background:'var(--surface3)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:`${repaid}%`,height:'100%',background:'var(--green)',borderRadius:3,transition:'width .4s'}} />
                    </div>
                  </div>
                )}

                {parseFloat(l.emi||0)>0    && <FR label="Monthly EMI"   val={fmt(l.emi)}         color="var(--amber)"/>}
                {parseFloat(l.interestRate||0)>0 && <FR label="Interest Rate" val={`${l.interestRate}% p.a.`}/>}
                {l.endDate && <FR label="Ends" val={`${new Date(l.endDate).toLocaleDateString('en-IN')}${ml!==null?` · ${ml}mo left`:''}`} color={ml!==null&&ml<6?'var(--red)':undefined}/>}
                {l.notes && <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6,paddingTop:4}}>{l.notes}</div>}
              </div>

              {/* footer */}
              <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
                <button onClick={()=>openEdit(l)} style={btnSm({flex:1,justifyContent:'center',display:'flex',background:'rgba(240,180,41,.08)',borderColor:'var(--gold-dim)',color:'var(--gold)'})}>✏️ Edit</button>
                <button onClick={()=>quickUpdateBal(l)} style={btnSm({flex:1,justifyContent:'center',display:'flex'})}>💰 Update Balance</button>
                <button onClick={()=>setConfirm({message:`Delete "${l.name}" permanently?`,action:()=>handleDelete(l)})} style={btnSm({color:'var(--red)'})}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* modal */}
      {modal && (
        <Modal open={modal} onClose={() => setModal(false)} width={520} title={editId?'✏️ Edit Loan':'🏦 Add Loan'}>
            <div style={{marginBottom:12}}>
              <label style={lbl}>Name</label>
              <input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. HDFC Home Loan, Durga Prasad 2L" style={inp()} />
            </div>

            {/* type pills */}
            <div style={{marginBottom:14}}>
              <label style={lbl}>Type</label>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {LOAN_TYPES.map(t=>(
                  <button key={t.value} onClick={()=>setForm({...form,type:t.value})} style={{padding:'8px 12px',borderRadius:10,cursor:'pointer',fontFamily:'var(--font)',fontSize:13,fontWeight:700,background:form.type===t.value?`${t.color}20`:'var(--surface2)',border:`1px solid ${form.type===t.value?t.color:'var(--border2)'}`,color:form.type===t.value?t.color:'var(--text-muted)'}}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>Who (Person)</label><input value={form.who} onChange={e=>setForm({...form,who:e.target.value})} placeholder="Hema, Hari, Joint…" style={inp()} /></div>
              <div><label style={lbl}>Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inp()}>
                  <option value="active">Active</option><option value="closed">Closed</option><option value="defaulted">Defaulted</option>
                </select>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>Principal / Total (₹)</label><input type="number" value={form.totalAmount} onChange={e=>setForm({...form,totalAmount:e.target.value})} placeholder="0" style={inp()} /></div>
              <div><label style={lbl}>Outstanding (₹)</label><input type="number" value={form.outstanding} onChange={e=>setForm({...form,outstanding:e.target.value})} placeholder="0" style={inp()} /></div>
            </div>

            {/* repaid preview */}
            {form.totalAmount && form.outstanding && Number(form.totalAmount)>0 && (
              <div style={{marginBottom:12,padding:'10px 12px',background:'var(--green-dim)',border:'1px solid #1a5a30',borderRadius:'12px',fontSize:12,display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--text-dim)'}}>Repaid</span>
                <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--green)'}}>
                  {fmt(Number(form.totalAmount)-Number(form.outstanding))} ({Math.min(100,Math.round(((Number(form.totalAmount)-Number(form.outstanding))/Number(form.totalAmount))*100))}%)
                </span>
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>Monthly EMI (₹)</label><input type="number" value={form.emi} onChange={e=>setForm({...form,emi:e.target.value})} placeholder="0" style={inp()} /></div>
              <div><label style={lbl}>Interest Rate (% p.a.)</label><input type="number" step="0.1" value={form.interestRate} onChange={e=>setForm({...form,interestRate:e.target.value})} placeholder="0.0" style={inp()} /></div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} style={inp()} /></div>
              <div><label style={lbl}>End Date</label><input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} style={inp()} /></div>
            </div>

            <div style={{marginBottom:22}}>
              <label style={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Bank name, account no., purpose…" rows={2} style={{...inp(),resize:'vertical',lineHeight:1.6}} />
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(false)} style={{padding:'10px 16px',borderRadius:'12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:700}}>Cancel</button>
              <button onClick={handleSave} style={{padding:'10px 18px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:14}}>{editId?'Update':'Add Loan'}</button>
            </div>
        </Modal>
      )}

      <ConfirmDialog open={!!confirm} title="Delete Loan" message={confirm?.message} danger onConfirm={confirm?.action} onCancel={()=>setConfirm(null)} />
    </div>
  );
}

function FR({label,val,color}) {
  const isMobile = useIsMobile();
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:isMobile ? 'flex-start' : 'center',flexDirection:isMobile ? 'column' : 'row',gap:isMobile ? 4 : 8}}>
      <span style={{fontSize:12,color:'var(--text-dim)'}}>{label}</span>
      <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:color||'var(--text)',maxWidth:isMobile ? '100%' : '60%',textAlign:isMobile ? 'left' : 'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:isMobile ? 'normal' : 'nowrap',alignSelf:isMobile ? 'stretch' : 'auto'}}>{val}</span>
    </div>
  );
}
