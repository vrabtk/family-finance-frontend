import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/auth.store';
import useUIStore from '../../store/ui.store';
import { getInvestments, createInv, updateInv, deleteInv } from '../../api/finance.api';
import { fmt } from '../../utils/format';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/shared/Modal';
import useIsMobile from '../../utils/useIsMobile';

const INV_TYPES = [
  { value:'gold',  label:'Gold',         icon:'🥇', color:'#f0b429' },
  { value:'fd',    label:'Fixed Deposit', icon:'🏛️', color:'#38bdf8' },
  { value:'rd',    label:'Recurring Dep', icon:'💹', color:'#34d399' },
  { value:'stock', label:'Stocks',        icon:'📊', color:'#a78bfa' },
  { value:'mf',    label:'Mutual Fund',   icon:'📂', color:'#fb923c' },
  { value:'other', label:'Other',         icon:'💼', color:'#6b85a8' },
];
const FILTERS = ['all','gold','fd','rd','stock','mf','other'];
const typeMeta = (v) => INV_TYPES.find(t => t.value === v) || INV_TYPES[5];

const EMPTY = {
  name:'', type:'gold', owner:'', investedAmount:'', currentValue:'',
  quantity:'', rate:'', startDate:'', maturityDate:'', status:'active', notes:'',
};

const lbl = { fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text-dim)',display:'block',marginBottom:6 };
const inp = (e={}) => ({ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontFamily:'var(--font)',fontSize:14,outline:'none',...e });
const btnSm = (e={}) => ({ padding:'8px 12px',borderRadius:10,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text-dim)',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,fontWeight:700,...e });

export default function InvestmentsPage() {
  const { activeWorkspace } = useAuthStore();
  const { showToast } = useUIStore();
  const isMobile = useIsMobile();
  const wid = activeWorkspace?.id;

  const [items,    setItems]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [filter,   setFilter]  = useState('all');
  const [modal,    setModal]   = useState(false);
  const [editId,   setEditId]  = useState('');
  const [form,     setForm]    = useState(EMPTY);
  const [confirm,  setConfirm] = useState(null);
  const formCols = isMobile ? '1fr' : '1fr 1fr';

  const load = useCallback(async () => {
    if (!wid) return;
    setLoading(true);
    try { setItems(await getInvestments(wid)); }
    finally { setLoading(false); }
  }, [wid]);
  useEffect(() => { load(); }, [load]);

  /* totals */
  const active  = items.filter(i => !i.isArchived);
  const totInv  = active.reduce((s,i) => s + parseFloat(i.investedAmount||0), 0);
  const totCurr = active.reduce((s,i) => s + parseFloat(i.currentValue||0), 0);
  const totGold = active.filter(i => i.type==='gold').reduce((s,i) => s + parseFloat(i.quantity||0), 0);
  const gain    = totCurr - totInv;

  const visible = filter==='all' ? items : items.filter(i => i.type===filter);

  const openAdd  = () => { setEditId(''); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name||'', type: item.type||'gold', owner: item.owner||'',
      investedAmount: item.investedAmount||'', currentValue: item.currentValue||'',
      quantity: item.quantity||'', rate: item.rate||'',
      startDate:    item.startDate    ? item.startDate.slice(0,10)    : '',
      maturityDate: item.maturityDate ? item.maturityDate.slice(0,10) : '',
      status: item.status||'active', notes: item.notes||'',
    });
    setModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      investedAmount: form.investedAmount !== '' ? Number(form.investedAmount) : null,
      currentValue:   form.currentValue   !== '' ? Number(form.currentValue)   : null,
      quantity:       form.quantity       !== '' ? Number(form.quantity)       : null,
      rate:           form.rate           !== '' ? Number(form.rate)           : null,
      startDate:    form.startDate    || null,
      maturityDate: form.maturityDate || null,
    };
    try {
      if (editId) { await updateInv(wid, editId, payload); showToast('Updated'); }
      else        { await createInv(wid, payload);         showToast('Investment added'); }
      setModal(false); await load();
    } catch(e) { showToast(e.response?.data?.error||'Error','error'); }
  };
  const handleDelete = async (item) => {
    await deleteInv(wid, item.id);
    showToast(`Deleted "${item.name}"`);
    setConfirm(null); await load();
  };
  const quickUpdate = async (item, field, val) => {
    await updateInv(wid, item.id, { [field]: Number(val) });
    showToast('Updated'); await load();
  };

  if (!wid) return <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>No workspace selected</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'calc(100dvh - 62px)',overflowY:'auto'}}>

      {/* header */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:isMobile ? '18px 16px' : '18px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:14,flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,letterSpacing:-.8,lineHeight:1.1}}>📈 Investments</div>
          <div style={{fontSize:13,color:'var(--text-dim)',marginTop:4}}>Gold · FD · RD · Stocks · Mutual Funds</div>
        </div>
        <button onClick={openAdd} style={{padding:'10px 18px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontFamily:'var(--font)',fontSize:14,width:isMobile ? '100%' : 'auto'}}>
          + Add Investment
        </button>
      </div>

      {/* summary bar */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:1,background:'var(--border)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        {[
          {label:'Total Invested',  val:fmt(totInv),  color:'var(--blue,#38bdf8)', sub:`${active.length} investments`},
          {label:'Current Value',   val:fmt(totCurr), color:'var(--gold)',         sub:'Mark-to-market'},
          {label:'Gain / Loss',     val:(gain>=0?'+':'')+fmt(gain), color:gain>=0?'var(--green)':'var(--red)', sub:totInv>0?((gain/totInv)*100).toFixed(1)+'% return':'—'},
          {label:'Total Gold',      val:totGold>0?totGold.toFixed(3)+'g':'—', color:'var(--gold)', sub:'Physical gold'},
        ].map((s,i) => (
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
          const meta = f==='all' ? null : typeMeta(f);
          const on   = filter===f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{padding:'8px 14px',borderRadius:10,cursor:'pointer',fontFamily:'var(--font)',fontSize:13,fontWeight:700,background:on?'rgba(240,180,41,.12)':'transparent',border:on?'1px solid var(--gold-dim)':'1px solid transparent',color:on?'var(--gold)':'var(--text-muted)'}}>
              {meta ? `${meta.icon} ${meta.label}` : 'All'}
            </button>
          );
        })}
      </div>

      {/* cards */}
      <div style={{padding:isMobile ? 16 : 24,display:'grid',gridTemplateColumns:isMobile ? '1fr' : 'repeat(auto-fill,minmax(340px,1fr))',gap:18,alignItems:'start'}}>
        {loading && <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'var(--text-muted)'}}>Loading…</div>}
        {!loading && visible.length===0 && (
          <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'var(--text-muted)'}}>
            <div style={{fontSize:34,marginBottom:10}}>📈</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text-dim)',marginBottom:8}}>No investments yet</div>
            <div style={{fontSize:13,marginBottom:22}}>Click "+ Add Investment" to start tracking</div>
            <button onClick={openAdd} style={{padding:'11px 20px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:14}}>+ Add Investment</button>
          </div>
        )}
        {!loading && visible.map(item => {
          const meta    = typeMeta(item.type);
          const inv     = parseFloat(item.investedAmount||0);
          const curr    = parseFloat(item.currentValue||0);
          const g       = curr - inv;
          const pct     = inv>0 ? ((g/inv)*100).toFixed(1) : null;
          const repaid  = inv>0 ? Math.min(100, Math.round((inv-Math.max(0,g))/inv*100)) : 0;
          return (
            <div key={item.id} style={{background:'var(--surface)',border:`1px solid ${meta.color}30`,borderRadius:'var(--r2)',overflow:'hidden'}}>
              {/* card header */}
              <div style={{padding:'16px 16px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',borderBottom:'1px solid var(--border)',background:`linear-gradient(135deg,${meta.color}12,var(--surface2))`}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:38,height:38,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,background:`${meta.color}20`}}>{meta.icon}</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,lineHeight:1.25}}>{item.name}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                      {item.owner && <span style={{color:meta.color}}>{item.owner} · </span>}
                      {meta.label}
                    </div>
                  </div>
                </div>
                <span style={{fontSize:10,padding:'4px 8px',borderRadius:20,fontWeight:700,background:item.status==='active'?'#0a3020':'var(--surface3)',color:item.status==='active'?'var(--green)':'var(--text-muted)',border:`1px solid ${item.status==='active'?'#1a5a30':'var(--border)'}`}}>
                  {item.status}
                </span>
              </div>
              {/* body */}
              <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
                {/* current value highlight */}
                <div style={{background:'var(--surface2)',borderRadius:12,padding:'12px 13px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:.7}}>Current Value</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color:meta.color}}>{curr>0?fmt(curr):'—'}</div>
                  </div>
                  {g!==0 && curr>0 && (
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:.7}}>Gain/Loss</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:700,color:g>=0?'var(--green)':'var(--red)'}}>{g>=0?'+':''}{fmt(g)}</div>
                      {pct && <div style={{fontSize:10,color:g>=0?'var(--green)':'var(--red)'}}>{g>=0?'+':''}{pct}%</div>}
                    </div>
                  )}
                </div>

                {/* progress bar if gain data exists */}
                {inv>0 && curr>0 && (
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-muted)',marginBottom:5}}>
                      <span>Invested</span><span>Current</span>
                    </div>
                    <div style={{height:4,background:'var(--surface3)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:`${Math.min(100,(curr/Math.max(inv,curr))*100)}%`,height:'100%',background:g>=0?'var(--green)':'var(--red)',borderRadius:3,transition:'width .4s'}} />
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-muted)',marginTop:4}}>
                      <span>{fmt(inv)}</span><span>{fmt(curr)}</span>
                    </div>
                  </div>
                )}

                <FR label="Invested"  val={fmt(inv)} />
                {item.quantity>0 && <FR label={item.type==='gold'?'Quantity':'Units'} val={item.type==='gold'?`${parseFloat(item.quantity).toFixed(3)}g`:`${parseFloat(item.quantity)} units`} />}
                {item.rate>0     && <FR label={item.type==='gold'?'Buy Rate':'Rate'} val={fmt(item.rate)} />}
                {item.maturityDate && <FR label="Matures" val={new Date(item.maturityDate).toLocaleDateString('en-IN')} />}
                {item.notes && <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6,paddingTop:4}}>{item.notes}</div>}
              </div>
              {/* footer */}
              <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
                <button onClick={() => openEdit(item)} style={btnSm({flex:1,justifyContent:'center',display:'flex',background:'rgba(240,180,41,.08)',borderColor:'var(--gold-dim)',color:'var(--gold)'})}>✏️ Edit</button>
                <button onClick={() => {
                  const v = prompt(`Update current value for "${item.name}":`, item.currentValue||'');
                  if (v!==null && !isNaN(Number(v))) quickUpdate(item,'currentValue',v);
                }} style={btnSm({flex:1,justifyContent:'center',display:'flex'})}>💹 Update Value</button>
                <button onClick={() => setConfirm({message:`Delete "${item.name}" permanently?`,action:()=>handleDelete(item)})} style={btnSm({color:'var(--red)'})}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* modal */}
      {modal && (
        <Modal open={modal} onClose={() => setModal(false)} width={520} title={editId?'✏️ Edit Investment':'📈 Add Investment'}>
            <div style={{marginBottom:12}}>
              <label style={lbl}>Name</label>
              <input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. SBI Gold Fund, HDFC FD" style={inp()} />
            </div>

            <div style={{marginBottom:14}}>
              <label style={lbl}>Type</label>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {INV_TYPES.map(t => (
                  <button key={t.value} onClick={() => setForm({...form,type:t.value})} style={{padding:'8px 12px',borderRadius:10,cursor:'pointer',fontFamily:'var(--font)',fontSize:13,fontWeight:700,background:form.type===t.value?`${t.color}20`:'var(--surface2)',border:`1px solid ${form.type===t.value?t.color:'var(--border2)'}`,color:form.type===t.value?t.color:'var(--text-muted)'}}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>Owner</label><input value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} placeholder="Hema, Hari, Joint…" style={inp()} /></div>
              <div><label style={lbl}>Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inp()}>
                  <option value="active">Active</option><option value="matured">Matured</option><option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>Invested Amount (₹)</label><input type="number" value={form.investedAmount} onChange={e=>setForm({...form,investedAmount:e.target.value})} placeholder="0" style={inp()} /></div>
              <div><label style={lbl}>Current Value (₹)</label><input type="number" value={form.currentValue} onChange={e=>setForm({...form,currentValue:e.target.value})} placeholder="0" style={inp()} /></div>
            </div>

            {/* live gain preview */}
            {form.investedAmount && form.currentValue && (
              <div style={{marginBottom:12,padding:'10px 12px',background:Number(form.currentValue)>=Number(form.investedAmount)?'var(--green-dim)':'var(--red-dim)',border:`1px solid ${Number(form.currentValue)>=Number(form.investedAmount)?'#1a5a30':'#5a1010'}`,borderRadius:'12px',fontSize:12,display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--text-dim)'}}>Gain / Loss</span>
                <span style={{fontFamily:'var(--mono)',fontWeight:700,color:Number(form.currentValue)>=Number(form.investedAmount)?'var(--green)':'var(--red)'}}>
                  {(Number(form.currentValue)-Number(form.investedAmount))>=0?'+':''}{fmt(Number(form.currentValue)-Number(form.investedAmount))}
                  {Number(form.investedAmount)>0 && ` (${(((Number(form.currentValue)-Number(form.investedAmount))/Number(form.investedAmount))*100).toFixed(1)}%)`}
                </span>
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>{form.type==='gold'?'Quantity (grams)':'Units / Qty'}</label><input type="number" step="0.001" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="0" style={inp()} /></div>
              <div><label style={lbl}>{form.type==='gold'?'Buy Rate (₹/g)':'Rate / Price (₹)'}</label><input type="number" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})} placeholder="0" style={inp()} /></div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div><label style={lbl}>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} style={inp()} /></div>
              <div><label style={lbl}>Maturity Date</label><input type="date" value={form.maturityDate} onChange={e=>setForm({...form,maturityDate:e.target.value})} style={inp()} /></div>
            </div>

            <div style={{marginBottom:22}}>
              <label style={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Bank, folio no., purpose…" rows={2} style={{...inp(),resize:'vertical',lineHeight:1.6}} />
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(false)} style={{padding:'10px 16px',borderRadius:'12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:700}}>Cancel</button>
              <button onClick={handleSave} style={{padding:'10px 18px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:14}}>{editId?'Update':'Add Investment'}</button>
            </div>
        </Modal>
      )}

      <ConfirmDialog open={!!confirm} title="Delete Investment" message={confirm?.message} danger onConfirm={confirm?.action} onCancel={()=>setConfirm(null)} />
    </div>
  );
}

function FR({label,val,color}) {
  const isMobile = useIsMobile();
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:isMobile ? 'flex-start' : 'center',flexDirection:isMobile ? 'column' : 'row',gap:isMobile ? 4 : 8}}>
      <span style={{fontSize:12,color:'var(--text-dim)'}}>{label}</span>
      <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:color||'var(--text)',textAlign:isMobile ? 'left' : 'right',alignSelf:isMobile ? 'stretch' : 'auto'}}>{val}</span>
    </div>
  );
}
