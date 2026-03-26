import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import useUIStore from '../../store/ui.store';
import {
  getOverview, createOverview, updateOverview, deleteOverview,
} from '../../api/finance.api';
import {
  getLoans, getInvestments, getInsurance, getBanks,
} from '../../api/finance.api';
import { fmt } from '../../utils/format';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/shared/Modal';
import useIsMobile from '../../utils/useIsMobile';

/* ── constants ── */
const FREQ = [
  { value:'monthly',     label:'Monthly',     mo:1       },
  { value:'quarterly',   label:'Quarterly',   mo:1/3     },
  { value:'half-yearly', label:'Half-Yearly', mo:1/6     },
  { value:'yearly',      label:'Yearly',      mo:1/12    },
  { value:'one-time',    label:'One-Time',    mo:0       },
];
const FREQ_LABEL  = { monthly:'/ mo', quarterly:'/ qtr', 'half-yearly':'/ 6mo', yearly:'/ yr', 'one-time':'once' };
const toMonthly   = (amt, freq) => parseFloat(amt||0) * (FREQ.find(f=>f.value===freq)?.mo ?? 1);
const toAnnual    = (amt, freq) => parseFloat(amt||0) * ({ monthly:12, quarterly:4, 'half-yearly':2, yearly:1, 'one-time':1 }[freq] ?? 12);

const CAT_META = {
  income:    { label:'Income Sources',          icon:'💵', color:'var(--green)',  emptyMsg:'No income sources yet' },
  mandatory: { label:'Monthly Mandatory Expenses', icon:'📌', color:'var(--red)',   emptyMsg:'No mandatory expenses yet' },
  savings:   { label:'Savings & Chitt',         icon:'🪙', color:'var(--teal,#2dd4bf)',  emptyMsg:'No savings entries yet' },
  other:     { label:'Other Expenses',          icon:'🧾', color:'var(--amber)',  emptyMsg:'No other expenses yet' },
};
const CAT_ICONS = {
  housing:'🏠', emi:'💰', insurance:'🛡️', utilities:'⚡', education:'📚',
  food:'🍽️', transport:'🚗', personal:'👤', medical:'💊', entertainment:'🎬', other:'📋',
};

const EMPTY = { name:'', category:'income', amount:'', frequency:'monthly', subCategory:'other', who:'', notes:'' };

/* ── style helpers ── */
const lbl  = { fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text-dim)',display:'block',marginBottom:6 };
const inp  = (e={}) => ({ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontFamily:'var(--font)',fontSize:14,outline:'none',...e });
const btnSm= (e={}) => ({ padding:'8px 12px',borderRadius:10,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text-dim)',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,fontWeight:700,transition:'all .15s',...e });
const ST   = { fontSize:10,fontWeight:700,letterSpacing:1.4,textTransform:'uppercase',color:'var(--text-muted)',paddingBottom:7,borderBottom:'1px solid var(--border)',marginBottom:10,display:'block' };

/* ═══════════════════════════════════════════════════════════════ */
export default function OverviewPage() {
  const { activeWorkspace } = useAuthStore();
  const { showToast }       = useUIStore();
  const navigate            = useNavigate();
  const isMobile            = useIsMobile();
  const wid = activeWorkspace?.id;

  /* ── data ── */
  const [items,   setItems]   = useState([]);
  const [loans,   setLoans]   = useState([]);
  const [invests, setInvests] = useState([]);
  const [insur,   setInsur]   = useState([]);
  const [banks,   setBanks]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── modal ── */
  const [modal,   setModal]   = useState(false);
  const [editId,  setEditId]  = useState('');
  const [form,    setForm]    = useState(EMPTY);
  const [confirm, setConfirm] = useState(null);
  const formCols = isMobile ? '1fr' : '1fr 1fr';

  const load = useCallback(async () => {
    if (!wid) return;
    setLoading(true);
    try {
      const [ov, lo, iv, ins, bk] = await Promise.all([
        getOverview(wid),
        getLoans(wid),
        getInvestments(wid),
        getInsurance(wid),
        getBanks(wid),
      ]);
      setItems(ov); setLoans(lo); setInvests(iv); setInsur(ins); setBanks(bk);
    } finally { setLoading(false); }
  }, [wid]);

  useEffect(() => { load(); }, [load]);

  /* ── split items by category ── */
  const byCat = (cat) => items.filter(i => i.category === cat);

  /* ── monthly equivalents ── */
  const moIncome = byCat('income').reduce((s,i) => s + toMonthly(i.amount, i.frequency), 0);
  const moMand   = byCat('mandatory').reduce((s,i) => s + toMonthly(i.amount, i.frequency), 0);
  const moSav    = byCat('savings').reduce((s,i) => s + toMonthly(i.amount, i.frequency), 0);
  const moOther  = byCat('other').reduce((s,i) => s + toMonthly(i.amount, i.frequency), 0);
  const moTotal  = moMand + moOther;
  const surplus  = moIncome - moTotal - moSav;

  /* ── live data from other modules ── */
  const activeLoans  = loans.filter(l => l.status === 'active' && !l.isArchived);
  const totalDebt    = activeLoans.filter(l => l.type !== 'given').reduce((s,l) => s + parseFloat(l.outstanding||0), 0);
  const totalEmi     = activeLoans.filter(l => l.type !== 'given').reduce((s,l) => s + parseFloat(l.emi||0), 0);
  const totalGiven   = activeLoans.filter(l => l.type === 'given').reduce((s,l) => s + parseFloat(l.outstanding||0), 0);
  const totalInvest  = invests.reduce((s,i) => s + parseFloat(i.currentValue||i.investedAmount||0), 0);
  const annInsur     = insur.filter(p => p.status==='active').reduce((s,p) => s + toAnnual(p.premiumAmount, p.frequency), 0);
  const bankTotal    = banks.reduce((b,bank) => b + (bank.sections||[]).reduce((s,sec) => s + (sec.entries||[]).reduce((e,en) => e + parseFloat(en.amount||0), 0), 0), 0);

  /* ── CRUD ── */
  const openAdd = (cat = 'income') => {
    setEditId('');
    setForm({ ...EMPTY, category: cat });
    setModal(true);
  };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name||'', category: item.category||'income',
      amount: item.amount||'', frequency: item.frequency||'monthly',
      subCategory: item.subCategory||'other', who: item.who||'', notes: item.notes||'',
    });
    setModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, amount: Number(form.amount)||0 };
    try {
      if (editId) { await updateOverview(wid, editId, payload); showToast('Updated'); }
      else        { await createOverview(wid, payload);         showToast('Added'); }
      setModal(false); await load();
    } catch(e) { showToast(e.response?.data?.error||'Error','error'); }
  };
  const handleDelete = async (item) => {
    await deleteOverview(wid, item.id);
    showToast(`Deleted "${item.name}"`);
    setConfirm(null); await load();
  };

  if (!wid) return <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>No workspace selected</div>;

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'calc(100dvh - 62px)',overflowY:'auto'}}>

      {/* ── HEADER ── */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:isMobile ? '18px 16px' : '18px 24px',flexShrink:0}}>
        <div style={{fontSize:24,fontWeight:800,letterSpacing:-.8,lineHeight:1.1}}>📋 Monthly Overview</div>
        <div style={{fontSize:13,color:'var(--text-dim)',marginTop:4}}>Income · Expenses · Savings · Loans · Banks — all in one place</div>
      </div>

      {/* ── NET SUMMARY BAR ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:1,background:'var(--border)',borderBottom:'3px solid var(--border2)',flexShrink:0}}>
        {[
          { label:'Monthly Income',   val:fmt(Math.round(moIncome)), color:'var(--green)',  sub:`${byCat('income').length} sources` },
          { label:'Fixed Expenses',   val:fmt(Math.round(moMand)),   color:'var(--red)',    sub:`${byCat('mandatory').length} items` },
          { label:'Other Expenses',   val:fmt(Math.round(moOther)),  color:'var(--amber)',  sub:`${byCat('other').length} items` },
          { label:'Savings / Chitt',  val:fmt(Math.round(moSav)),    color:'var(--teal,#2dd4bf)',   sub:`${byCat('savings').length} buckets` },
          { label:'Monthly Surplus',  val:(surplus>=0?'+':'')+fmt(Math.round(surplus)), color:surplus>=0?'var(--gold)':'var(--red)', sub:surplus>=0?'After all outgoings':'Over budget ⚠️' },
          { label:'Bank Balance',     val:fmt(bankTotal), color:'var(--blue,#38bdf8)', sub:`${banks.length} banks`, onClick:()=>navigate('/banks') },
        ].map((s,i) => (
          <div key={i} onClick={s.onClick} style={{background:'var(--surface)',padding:'14px 16px',cursor:s.onClick?'pointer':undefined,transition:s.onClick?'background .15s':undefined}} onMouseEnter={e=>{if(s.onClick)e.currentTarget.style.background='var(--surface2)'}} onMouseLeave={e=>{if(s.onClick)e.currentTarget.style.background='var(--surface)'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1.1,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>{s.label}{s.onClick&&' ↗'}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color:s.color,lineHeight:1.2}}>{s.val}</div>
            <div style={{fontSize:12,color:'var(--text-dim)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{padding:isMobile ? 16 : 24,display:'grid',gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr',gap:20,alignItems:'start'}}>

        {/* ─── INCOME SOURCES ─── */}
        <OvSection
          title="💵 Income Sources"
          color="var(--green)"
          strip={[
            { label:'Monthly', val:fmt(Math.round(moIncome)), color:'var(--green)' },
            { label:'Annual',  val:fmt(Math.round(moIncome*12)), color:'var(--green)' },
            { label:'Sources', val:byCat('income').length },
          ]}
          onAdd={() => openAdd('income')}
          addLabel="+ Add Source"
          loading={loading}
          emptyMsg="No income sources yet"
        >
          {byCat('income').map(item => (
            <OvRow key={item.id} item={item} color="var(--green)"
              sub={<span>{item.who && <span style={{color:'var(--green)'}}>{item.who} · </span>}{FREQ_LABEL[item.frequency]||item.frequency}</span>}
              onEdit={()=>openEdit(item)}
              onDelete={()=>setConfirm({message:`Delete "${item.name}"?`,action:()=>handleDelete(item)})}
            />
          ))}
        </OvSection>

        {/* ─── MANDATORY EXPENSES ─── */}
        <OvSection
          title="📌 Monthly Mandatory Expenses"
          color="var(--red)"
          strip={[
            { label:'Monthly',  val:fmt(Math.round(moMand)), color:'var(--red)' },
            { label:'Annual',   val:fmt(Math.round(toAnnualSum(byCat('mandatory')))), color:'var(--red)' },
            { label:'Items',    val:byCat('mandatory').length },
          ]}
          onAdd={() => openAdd('mandatory')}
          addLabel="+ Add Expense"
          loading={loading}
          emptyMsg="No mandatory expenses yet"
        >
          {byCat('mandatory').map(item => (
            <OvRow key={item.id} item={item} color="var(--red)"
              sub={<span>{item.subCategory && <span>{CAT_ICONS[item.subCategory]||'📋'} </span>}{item.subCategory||'other'}{item.notes&&` · ${item.notes}`}</span>}
              onEdit={()=>openEdit(item)}
              onDelete={()=>setConfirm({message:`Delete "${item.name}"?`,action:()=>handleDelete(item)})}
            />
          ))}
        </OvSection>

        {/* ─── SAVINGS / CHITT ─── */}
        <OvSection
          title="🪙 Savings & Chitt"
          color="var(--teal,#2dd4bf)"
          strip={[
            { label:'Monthly Total', val:fmt(Math.round(moSav)), color:'var(--teal,#2dd4bf)' },
            { label:'Buckets',       val:byCat('savings').length },
          ]}
          onAdd={() => openAdd('savings')}
          addLabel="+ Add Bucket"
          loading={loading}
          emptyMsg="No savings entries yet"
        >
          {byCat('savings').map(item => (
            <OvRow key={item.id} item={item} color="var(--teal,#2dd4bf)"
              sub={<span>{item.notes||'Savings bucket'}</span>}
              onEdit={()=>openEdit(item)}
              onDelete={()=>setConfirm({message:`Delete "${item.name}"?`,action:()=>handleDelete(item)})}
            />
          ))}
        </OvSection>

        {/* ─── OTHER EXPENSES ─── */}
        <OvSection
          title="🧾 Other Expenses"
          color="var(--amber)"
          strip={[
            { label:'Monthly',  val:fmt(Math.round(moOther)), color:'var(--amber)' },
            { label:'Annual',   val:fmt(Math.round(toAnnualSum(byCat('other')))), color:'var(--amber)' },
            { label:'Items',    val:byCat('other').length },
          ]}
          onAdd={() => openAdd('other')}
          addLabel="+ Add Item"
          loading={loading}
          emptyMsg="No other expenses yet"
        >
          {byCat('other').map(item => (
            <OvRow key={item.id} item={item} color="var(--amber)"
              sub={<span>{item.subCategory && <span>{CAT_ICONS[item.subCategory]||'🧾'} </span>}{item.subCategory||'other'}{item.notes&&` · ${item.notes}`}</span>}
              onEdit={()=>openEdit(item)}
              onDelete={()=>setConfirm({message:`Delete "${item.name}"?`,action:()=>handleDelete(item)})}
            />
          ))}
        </OvSection>

        {/* ─── LOANS LIVE SUMMARY ─── */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r2)',overflow:'hidden'}}>
          <SectionHead title="💳 Loans & Liabilities" note="Live from Loans tab" onAdd={()=>navigate('/loans')} addLabel="Manage →" addStyle={{background:'var(--surface2)',color:'var(--text-dim)'}} />
          <StripRow cols={[
            { label:'Outstanding', val:fmt(totalDebt), color:'var(--red)' },
            { label:'Monthly EMIs', val:fmt(totalEmi), color:'var(--amber)' },
            { label:'Given Out', val:fmt(totalGiven), color:'var(--teal,#2dd4bf)' },
          ]} />
          <div style={{padding:'4px 0'}}>
            {activeLoans.length === 0
              ? <div style={{padding:'20px 16px',fontSize:13,color:'var(--text-muted)',textAlign:'center'}}>No active loans</div>
              : activeLoans.slice(0,6).map(l => {
                  const icon = {emi:'🏠',credit:'💳',personal:'👤',given:'🤝'}[l.type]||'💰';
                  return (
                    <div key={l.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontSize:14}}>{icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:isMobile ? 'normal' : 'nowrap',lineHeight:1.35}}>{l.name}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{l.who||'—'}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:l.type==='given'?'var(--teal,#2dd4bf)':'var(--red)'}}>{fmt(l.outstanding||0)}</div>
                        {parseFloat(l.emi||0)>0&&<div style={{fontSize:10,color:'var(--text-muted)'}}>EMI {fmt(l.emi)}</div>}
                      </div>
                    </div>
                  );
                })}
            {activeLoans.length > 6 && (
              <div style={{padding:'10px 14px',fontSize:12,color:'var(--text-muted)'}}>
                +{activeLoans.length-6} more · <span onClick={()=>navigate('/loans')} style={{color:'var(--gold)',cursor:'pointer'}}>view all</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── INVESTMENTS LIVE SUMMARY ─── */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r2)',overflow:'hidden'}}>
          <SectionHead title="📈 Investments" note="Live from Investments tab" onAdd={()=>navigate('/investments')} addLabel="Manage →" addStyle={{background:'var(--surface2)',color:'var(--text-dim)'}} />
          <StripRow cols={[
            { label:'Total Value', val:fmt(totalInvest), color:'var(--gold)' },
            { label:'Policies', val:`${invests.length} investments` },
            { label:'Ins. Annual', val:fmt(Math.round(annInsur)), color:'var(--red)' },
          ]} />
          <div style={{padding:'4px 0'}}>
            {invests.length === 0
              ? <div style={{padding:'20px 16px',fontSize:13,color:'var(--text-muted)',textAlign:'center'}}>No investments yet</div>
              : invests.slice(0,5).map(inv => {
                  const icons = {gold:'🥇',fd:'🏛️',rd:'💹',stock:'📊',mf:'📂',other:'💼'};
                  const colors = {gold:'var(--gold)',fd:'var(--blue,#38bdf8)',rd:'var(--green)',stock:'var(--purple,#a78bfa)',mf:'var(--orange,#fb923c)',other:'var(--text-dim)'};
                  const curr = parseFloat(inv.currentValue||inv.investedAmount||0);
                  const col  = colors[inv.type]||colors.other;
                  return (
                    <div key={inv.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontSize:14}}>{icons[inv.type]||'💼'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:isMobile ? 'normal' : 'nowrap',lineHeight:1.35}}>{inv.name}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{inv.owner||'—'}</div>
                      </div>
                      <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:col,flexShrink:0}}>{fmt(curr)}</div>
                    </div>
                  );
                })}
            {invests.length > 5 && (
              <div style={{padding:'10px 14px',fontSize:12,color:'var(--text-muted)'}}>
                +{invests.length-5} more · <span onClick={()=>navigate('/investments')} style={{color:'var(--gold)',cursor:'pointer'}}>view all</span>
              </div>
            )}
          </div>
        </div>

      </div>{/* end grid */}

      {/* ═══════════════════ ADD / EDIT MODAL ═══════════════════ */}
      {modal && (
        <Modal open={modal} onClose={() => setModal(false)} width={500} title={editId?'✏️ Edit Item':'➕ Add Item'}>
            {/* category pills */}
            <div style={{marginBottom:14}}>
              <label style={lbl}>Category</label>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {Object.entries(CAT_META).map(([k,v]) => (
                  <button key={k} onClick={()=>setForm({...form,category:k})} style={{padding:'8px 12px',borderRadius:10,cursor:'pointer',fontFamily:'var(--font)',fontSize:13,fontWeight:700,background:form.category===k?`rgba(240,180,41,.12)`:'var(--surface2)',border:`1px solid ${form.category===k?'var(--gold-dim)':'var(--border2)'}`,color:form.category===k?'var(--gold)':'var(--text-muted)'}}>
                    {v.icon} {v.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={lbl}>Name</label>
              <input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Hema Salary, Rent, Chitt 1…" style={inp()} />
            </div>

            <div style={{display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:12}}>
              <div>
                <label style={lbl}>Amount (₹)</label>
                <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" style={inp()} />
              </div>
              <div>
                <label style={lbl}>Frequency</label>
                <select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} style={inp()}>
                  {FREQ.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {/* monthly equivalent preview */}
            {form.amount && form.frequency !== 'monthly' && (
              <div style={{marginBottom:12,padding:'10px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'12px',fontSize:12,display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--text-muted)'}}>Monthly equivalent</span>
                <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--gold)'}}>
                  ≈ {fmt(Math.round(toMonthly(form.amount, form.frequency)))} / mo
                </span>
              </div>
            )}

            {/* category-specific fields */}
            {form.category === 'income' && (
              <div style={{marginBottom:12}}>
                <label style={lbl}>Who (Person)</label>
                <input value={form.who} onChange={e=>setForm({...form,who:e.target.value})} placeholder="Hema, Hari, Joint…" style={inp()} />
              </div>
            )}

            {(form.category === 'mandatory' || form.category === 'other') && (
              <div style={{marginBottom:12}}>
                <label style={lbl}>Sub-Category</label>
                <select value={form.subCategory} onChange={e=>setForm({...form,subCategory:e.target.value})} style={inp()}>
                  {Object.keys(CAT_ICONS).map(k => <option key={k} value={k}>{CAT_ICONS[k]} {k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
                </select>
              </div>
            )}

            <div style={{marginBottom:22}}>
              <label style={lbl}>Notes (optional)</label>
              <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any extra details…" style={inp()} />
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(false)} style={{padding:'10px 16px',borderRadius:'12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:700}}>Cancel</button>
              <button onClick={handleSave} style={{padding:'10px 18px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:14}}>
                {editId ? 'Update' : 'Add'}
              </button>
            </div>
        </Modal>
      )}

      <ConfirmDialog open={!!confirm} title="Delete Item" message={confirm?.message} danger onConfirm={confirm?.action} onCancel={()=>setConfirm(null)} />
    </div>
  );
}

/* ── helpers ── */
function toAnnualSum(items) {
  return items.reduce((s,i) => s + toAnnual(i.amount, i.frequency), 0);
}

/* ── sub-components ── */
function SectionHead({ title, note, onAdd, addLabel, addStyle={} }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'15px 16px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',gap:12,flexWrap:'wrap'}}>
      <div>
        <div style={{fontSize:15,fontWeight:700}}>{title}</div>
        {note && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{note}</div>}
      </div>
      {onAdd && (
        <button onClick={onAdd} style={{padding:'8px 12px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontFamily:'var(--font)',fontSize:12,...addStyle}}>
          {addLabel||'+ Add'}
        </button>
      )}
    </div>
  );
}

function StripRow({ cols }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:1,background:'var(--border)',borderBottom:'1px solid var(--border)'}}>
      {cols.map((c,i) => (
        <div key={i} style={{background:'var(--surface2)',padding:'11px 14px'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.1,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:3}}>{c.label}</div>
          <div style={{fontFamily:'var(--mono)',fontSize:15,fontWeight:700,color:c.color||'var(--text)'}}>{c.val}</div>
        </div>
      ))}
    </div>
  );
}

function OvSection({ title, color, strip, onAdd, addLabel, loading, emptyMsg, children }) {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r2)',overflow:'hidden'}}>
      <SectionHead title={title} onAdd={onAdd} addLabel={addLabel} />
      <StripRow cols={strip} />
      <div>
        {loading
          ? <div style={{padding:'20px 16px',fontSize:13,color:'var(--text-muted)',textAlign:'center'}}>Loading…</div>
          : !React.Children.count(children)
            ? <div style={{padding:'20px 16px',fontSize:13,color:'var(--text-muted)',textAlign:'center'}}>{emptyMsg}</div>
            : children
        }
      </div>
    </div>
  );
}

function OvRow({ item, color, sub, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const isMobile = useIsMobile();
  const mo = toMonthly(item.amount, item.frequency);
  return (
    <div
      style={{display:'flex',alignItems:isMobile ? 'flex-start' : 'center',flexWrap:isMobile ? 'wrap' : 'nowrap',gap:8,padding:'9px 14px',borderBottom:'1px solid var(--border)',background:hov?'var(--surface2)':'transparent',transition:'background .1s'}}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
    >
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:isMobile ? 'normal' : 'nowrap',lineHeight:1.35}}>{item.name}</div>
        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{sub}</div>
      </div>
      <div style={{textAlign:isMobile ? 'left' : 'right',flexShrink:0}}>
        <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:700,color}}>{fmt(parseFloat(item.amount||0))}</div>
        <div style={{fontSize:10,color:'var(--text-muted)'}}>{FREQ_LABEL[item.frequency]||item.frequency}{item.frequency!=='monthly'&&` ≈ ${fmt(Math.round(mo))}/mo`}</div>
      </div>
      <div style={{display:'flex',gap:2,opacity:isMobile ? 1 : (hov ? 1 : 0.72),transition:'opacity .15s',marginLeft:isMobile ? 'auto' : 0}}>
        <button onClick={onEdit}   style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:13,padding:'2px 4px'}}>✏️</button>
        <button onClick={onDelete} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:13,padding:'2px 4px'}}>✕</button>
      </div>
    </div>
  );
}
