import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/auth.store';
import useUIStore from '../../store/ui.store';
import { getInsurance, createIns, updateIns, deleteIns } from '../../api/finance.api';
import { fmt } from '../../utils/format';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/shared/Modal';
import useIsMobile from '../../utils/useIsMobile';

/* ── constants ── */
const TYPES = [
  { value: 'life',    label: 'Life / Endowment', icon: '❤️',  color: '#38bdf8' },
  { value: 'health',  label: 'Health',            icon: '🏥',  color: '#34d399' },
  { value: 'term',    label: 'Term',              icon: '🛡️', color: '#a78bfa' },
  { value: 'vehicle', label: 'Vehicle',           icon: '🚗',  color: '#fbbf24' },
  { value: 'other',   label: 'Other',             icon: '📋',  color: '#6b85a8' },
];
const FREQ = [
  { value: 'monthly',     label: 'Monthly',    multiplier: 12 },
  { value: 'quarterly',   label: 'Quarterly',  multiplier: 4  },
  { value: 'half-yearly', label: 'Half-Yearly',multiplier: 2  },
  { value: 'yearly',      label: 'Yearly',     multiplier: 1  },
];
const FILTERS = ['all','life','health','term','vehicle','other'];

const typeMeta  = (v) => TYPES.find(t => t.value === v) || TYPES[4];
const annualPrem = (p) => {
  const m = FREQ.find(f => f.value === p.frequency)?.multiplier || 1;
  return parseFloat(p.premiumAmount || 0) * m;
};
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
};

/* ── tiny style helpers ── */
const lbl = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1,
  textTransform: 'uppercase', color: 'var(--text-dim)',
  display: 'block', marginBottom: 6,
};
const inp = (extra = {}) => ({
  width: '100%', padding: '11px 13px',
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 'var(--r)', color: 'var(--text)',
  fontFamily: 'var(--font)', fontSize: 14, outline: 'none',
  ...extra,
});
const btnSm = (extra = {}) => ({
  padding: '8px 12px', borderRadius: 10,
  border: '1px solid var(--border2)',
  background: 'var(--surface2)', color: 'var(--text-dim)',
  cursor: 'pointer', fontFamily: 'var(--font)',
  fontSize: 12, fontWeight: 700, transition: 'all .15s',
  ...extra,
});
const EMPTY_FORM = {
  name: '', type: 'life', insuredPerson: '', policyNumber: '',
  premiumAmount: '', frequency: 'yearly',
  startDate: '', endDate: '', nextDueDate: '',
  sumAssured: '', status: 'active', notes: '',
};

/* ═══════════════════════════════════════════════════════ */
export default function InsurancePage() {
  const { activeWorkspace } = useAuthStore();
  const { showToast } = useUIStore();
  const isMobile = useIsMobile();
  const wid = activeWorkspace?.id;

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [modal, setModal]       = useState(false);
  const [editId, setEditId]     = useState('');
  const [form, setForm]         = useState(EMPTY_FORM);
  const [confirm, setConfirm]   = useState(null);
  const formCols = isMobile ? '1fr' : '1fr 1fr';

  const load = useCallback(async () => {
    if (!wid) return;
    setLoading(true);
    try { setPolicies(await getInsurance(wid)); }
    finally { setLoading(false); }
  }, [wid]);

  useEffect(() => { load(); }, [load]);

  /* ── derived totals ── */
  const active   = policies.filter(p => p.status === 'active');
  const totalAnn = active.reduce((s, p) => s + annualPrem(p), 0);
  const totalMo  = totalAnn / 12;
  const totalCov = active.reduce((s, p) => s + parseFloat(p.sumAssured || 0), 0);
  const dueSoon  = active.filter(p => { const d = daysUntil(p.nextDueDate); return d !== null && d >= 0 && d <= 30; }).length;

  /* ── filtered ── */
  const visible = filter === 'all' ? policies : policies.filter(p => p.type === filter);

  /* ── CRUD ── */
  const openAdd = () => {
    setEditId('');
    setForm(EMPTY_FORM);
    setModal(true);
  };
  const openEdit = (p) => {
    setEditId(p.id);
    setForm({
      name: p.name || '', type: p.type || 'life',
      insuredPerson: p.insuredPerson || '', policyNumber: p.policyNumber || '',
      premiumAmount: p.premiumAmount || '', frequency: p.frequency || 'yearly',
      startDate: p.startDate ? p.startDate.slice(0,10) : '',
      endDate: p.endDate ? p.endDate.slice(0,10) : '',
      nextDueDate: p.nextDueDate ? p.nextDueDate.slice(0,10) : '',
      sumAssured: p.sumAssured || '', status: p.status || 'active',
      notes: p.notes || '',
    });
    setModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const payload = {
        ...form,
        premiumAmount: form.premiumAmount !== '' ? Number(form.premiumAmount) : null,
        sumAssured:    form.sumAssured    !== '' ? Number(form.sumAssured)    : null,
        startDate:     form.startDate  || null,
        endDate:       form.endDate    || null,
        nextDueDate:   form.nextDueDate || null,
      };
      if (editId) {
        await updateIns(wid, editId, payload);
        showToast('Policy updated');
      } else {
        await createIns(wid, payload);
        showToast('Policy added');
      }
      setModal(false);
      await load();
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };
  const handleDelete = async (p) => {
    await deleteIns(wid, p.id);
    showToast(`Deleted "${p.name}"`);
    setConfirm(null);
    await load();
  };

  if (!wid) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No workspace selected</div>
  );

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 62px)', overflowY: 'auto' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: isMobile ? '18px 16px' : '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.8, lineHeight: 1.1 }}>🛡️ Insurance Policies</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>LIC · Health · Term · Vehicle — renewal tracking</div>
        </div>
        <button onClick={openAdd} style={{ padding: '10px 18px', borderRadius: '12px', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontFamily: 'var(--font)', fontSize: 14, width: isMobile ? '100%' : 'auto' }}>
          + Add Policy
        </button>
      </div>

      {/* ── SUMMARY BAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'Annual Premium',   val: fmt(Math.round(totalAnn)), color: 'var(--red)',   sub: `${active.length} active policies` },
          { label: 'Monthly Cost',     val: fmt(Math.round(totalMo)),  color: 'var(--amber)', sub: 'Equiv monthly' },
          { label: 'Total Coverage',   val: totalCov > 0 ? fmt(totalCov) : '—',  color: 'var(--green)', sub: 'Sum assured' },
          { label: 'Due in 30 Days',   val: dueSoon,                   color: dueSoon > 0 ? 'var(--red)' : 'var(--text-dim)', sub: dueSoon > 0 ? 'Renewal needed ⚠️' : 'All clear ✓' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER TABS ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: isMobile ? '10px 16px' : '10px 24px', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const meta = f === 'all' ? null : typeMeta(f);
          const isActive = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700,
              background: isActive ? 'rgba(240,180,41,.12)' : 'transparent',
              border: isActive ? '1px solid var(--gold-dim)' : '1px solid transparent',
              color: isActive ? 'var(--gold)' : 'var(--text-muted)',
            }}>
              {meta ? `${meta.icon} ${meta.label}` : 'All'}
            </button>
          );
        })}
      </div>

      {/* ── CARDS GRID ── */}
      <div style={{ padding: isMobile ? 16 : 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px,1fr))', gap: 18, alignItems: 'start' }}>
        {loading && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>}

        {!loading && visible.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🛡️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>No policies yet</div>
            <div style={{ fontSize: 13, marginBottom: 22 }}>Click "+ Add Policy" to get started</div>
            <button onClick={openAdd} style={{ padding: '11px 20px', borderRadius: '12px', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>+ Add Policy</button>
          </div>
        )}

        {!loading && visible.map(p => {
          const meta  = typeMeta(p.type);
          const ann   = annualPrem(p);
          const days  = daysUntil(p.nextDueDate);
          const overdue  = days !== null && days < 0;
          const soon     = days !== null && days >= 0 && days <= 30;
          const dueLabel = days === null ? null : overdue ? 'OVERDUE' : soon ? `DUE IN ${days}d` : null;

          return (
            <div key={p.id} style={{
              background: 'var(--surface)', border: `1px solid ${overdue ? 'var(--red)' : soon ? '#5a3a00' : 'var(--border)'}`,
              borderRadius: 'var(--r2)', overflow: 'hidden',
              boxShadow: overdue ? '0 0 0 1px var(--red-dim)' : 'none',
            }}>
              {/* card header */}
              <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, background: `${meta.color}18` }}>
                    {meta.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.insuredPerson && <span style={{ color: meta.color }}>{p.insuredPerson} · </span>}
                      {meta.label}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <StatusBadge status={p.status} />
                  {dueLabel && (
                    <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 20, fontWeight: 700, background: overdue ? 'var(--red-dim)' : 'var(--amber-dim)', color: overdue ? 'var(--red)' : 'var(--amber)', border: `1px solid ${overdue ? '#5a1010' : '#5a3a00'}` }}>
                      {dueLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* card body */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* annual premium highlight */}
                <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '12px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Annual Premium</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{fmt(Math.round(ann))}</span>
                </div>

                <FieldRow label="Premium" value={`${fmt(parseFloat(p.premiumAmount || 0))} / ${FREQ.find(f=>f.value===p.frequency)?.label || p.frequency}`} />
                {p.policyNumber && <FieldRow label="Policy No." value={p.policyNumber} mono />}
                {p.nextDueDate  && <FieldRow label="Next Due" value={new Date(p.nextDueDate).toLocaleDateString('en-IN')} color={overdue ? 'var(--red)' : soon ? 'var(--amber)' : undefined} />}
                {p.endDate      && <FieldRow label="Matures" value={new Date(p.endDate).toLocaleDateString('en-IN')} />}
                {parseFloat(p.sumAssured || 0) > 0 && <FieldRow label="Sum Assured" value={fmt(p.sumAssured)} color="var(--green)" />}
                {p.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6, paddingTop: 4 }}>{p.notes}</div>}
              </div>

              {/* card footer */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(p)} style={btnSm({ flex: 1, justifyContent: 'center', display: 'flex', background: 'rgba(240,180,41,.08)', borderColor: 'var(--gold-dim)', color: 'var(--gold)' })}>
                  ✏️ Edit
                </button>
                <button
                  onClick={() => {
                    // Quick toggle status
                    const newStatus = p.status === 'active' ? 'inactive' : 'active';
                    updateIns(wid, p.id, { status: newStatus }).then(() => {
                      showToast(`Policy ${newStatus}`);
                      load();
                    });
                  }}
                  style={btnSm({ flex: 1, justifyContent: 'center', display: 'flex' })}
                >
                  {p.status === 'active' ? '⏸ Deactivate' : '▶ Activate'}
                </button>
                <button
                  onClick={() => setConfirm({ message: `Delete policy "${p.name}" permanently?`, action: () => handleDelete(p) })}
                  style={btnSm({ color: 'var(--red)' })}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════ ADD / EDIT MODAL ═══════════════ */}
      {modal && (
        <Modal open={modal} onClose={() => setModal(false)} width={520} title={editId ? '✏️ Edit Policy' : '🛡️ Add Policy'}>
            {/* Policy Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Policy Name</label>
              <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. LIC Jeevan Anand" style={inp()} />
            </div>

            {/* Type selector — visual pills */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Type</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setForm({ ...form, type: t.value })}
                    style={{
                      padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700,
                      background: form.type === t.value ? `${t.color}20` : 'var(--surface2)',
                      border: `1px solid ${form.type === t.value ? t.color : 'var(--border2)'}`,
                      color: form.type === t.value ? t.color : 'var(--text-muted)',
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row: insured + policy no */}
            <div style={{ display: 'grid', gridTemplateColumns: formCols, gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Insured Person</label>
                <input value={form.insuredPerson} onChange={e => setForm({ ...form, insuredPerson: e.target.value })} placeholder="Hema, Hari, Family…" style={inp()} />
              </div>
              <div>
                <label style={lbl}>Policy Number</label>
                <input value={form.policyNumber} onChange={e => setForm({ ...form, policyNumber: e.target.value })} placeholder="Policy No." style={inp()} />
              </div>
            </div>

            {/* Row: premium + frequency */}
            <div style={{ display: 'grid', gridTemplateColumns: formCols, gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Premium (₹)</label>
                <input type="number" value={form.premiumAmount} onChange={e => setForm({ ...form, premiumAmount: e.target.value })} placeholder="0" style={inp()} />
              </div>
              <div>
                <label style={lbl}>Frequency</label>
                <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} style={inp()}>
                  {FREQ.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {/* Annual preview */}
            {form.premiumAmount && (
              <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--red-dim)', border: '1px solid #5a1010', borderRadius: '12px', fontSize: 12, color: 'var(--red)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Annual Premium</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                  {fmt(Number(form.premiumAmount) * (FREQ.find(f=>f.value===form.frequency)?.multiplier || 1))}
                </span>
              </div>
            )}

            {/* Row: start + end dates */}
            <div style={{ display: 'grid', gridTemplateColumns: formCols, gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={lbl}>End / Maturity Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inp()} />
              </div>
            </div>

            {/* Row: next due + sum assured */}
            <div style={{ display: 'grid', gridTemplateColumns: formCols, gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Next Due Date</label>
                <input type="date" value={form.nextDueDate} onChange={e => setForm({ ...form, nextDueDate: e.target.value })} style={inp()} />
              </div>
              <div>
                <label style={lbl}>Sum Assured / Cover (₹)</label>
                <input type="number" value={form.sumAssured} onChange={e => setForm({ ...form, sumAssured: e.target.value })} placeholder="0" style={inp()} />
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp()}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lapsed">Lapsed</option>
                <option value="claimed">Claimed</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={lbl}>Notes / Login Details</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Login ID, password hint, branch, agent name…"
                rows={3}
                style={{ ...inp(), resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 18px', borderRadius: '12px', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
                {editId ? 'Update Policy' : 'Add Policy'}
              </button>
            </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Delete Policy"
        message={confirm?.message}
        danger
        onConfirm={confirm?.action}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

/* ── tiny sub-components ── */
function StatusBadge({ status }) {
  const map = {
    active:   { bg: '#0a3020', color: 'var(--green)', border: '#1a5a30', label: 'Active' },
    inactive: { bg: 'var(--surface3)', color: 'var(--text-muted)', border: 'var(--border)', label: 'Inactive' },
    lapsed:   { bg: 'var(--red-dim)', color: 'var(--red)', border: '#5a1010', label: 'Lapsed' },
    claimed:  { bg: 'var(--amber-dim)', color: 'var(--amber)', border: '#5a3a00', label: 'Claimed' },
  };
  const s = map[status] || map.inactive;
  return (
    <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 20, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function FieldRow({ label, value, mono, color }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 4 : 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--mono)' : 'var(--font)', fontSize: mono ? 12 : 13, fontWeight: 700, color: color || 'var(--text)', textAlign: isMobile ? 'left' : 'right', maxWidth: isMobile ? '100%' : '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap', alignSelf: isMobile ? 'stretch' : 'auto' }}>{value}</span>
    </div>
  );
}
