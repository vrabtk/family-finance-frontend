import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/auth.store';
import useUIStore from '../../store/ui.store';
import {
  getBanks, createBank, updateBank, deleteBank,
  createSection, updateSection, deleteSection,
  createEntry, updateEntry, deleteEntry,
} from '../../api/finance.api';
import { fmt } from '../../utils/format';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/shared/Modal';
import useIsMobile from '../../utils/useIsMobile';

/* ── constants ── */
const ICONS = ['🏦','💰','📈','💹','🏛️','💳','🏠','🎓','🛡️','💊','🚗','✈️','🎯','📦','💎','🪙','📊','💼','🔒','🌱'];
const PALETTE = [
  { name:'Sky',    val:'#38bdf8' }, { name:'Purple', val:'#a78bfa' },
  { name:'Green',  val:'#34d399' }, { name:'Gold',   val:'#f0b429' },
  { name:'Pink',   val:'#f472b6' }, { name:'Orange', val:'#fb923c' },
  { name:'Teal',   val:'#2dd4bf' }, { name:'Red',    val:'#f87171' },
  { name:'Lime',   val:'#a3e635' }, { name:'Blue',   val:'#60a5fa' },
];

/* ── helpers ── */
const secTotal  = (sec)  => (sec.entries || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
const bankTotal = (bank) => (bank.sections || []).reduce((s, sec) => s + secTotal(sec), 0);
const grandTotal = (banks) => banks.reduce((s, b) => s + bankTotal(b), 0);

const uid = () => Math.random().toString(36).slice(2, 9);

/* ── tiny style helpers ── */
const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--r2)', overflow: 'hidden',
};
const btnSm = (extra = {}) => ({
  padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border2)',
  background: 'var(--surface2)', color: 'var(--text-dim)', cursor: 'pointer',
  fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, transition: 'all .15s',
  ...extra,
});
const label = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  color: 'var(--text-dim)', display: 'block', marginBottom: 6,
};
const input = (extra = {}) => ({
  width: '100%', padding: '11px 13px',
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 'var(--r)', color: 'var(--text)',
  fontFamily: 'var(--font)', fontSize: 14, outline: 'none',
  ...extra,
});

/* ═══════════════════════════════════════════════════════════════════════ */
export default function BanksPage() {
  const { activeWorkspace } = useAuthStore();
  const { showToast } = useUIStore();
  const isMobile = useIsMobile();
  const wid = activeWorkspace?.id;

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  /* ── bank modal ── */
  const [bankModal, setBankModal]   = useState(false);
  const [editBankId, setEditBankId] = useState('');
  const [bankName, setBankName]     = useState('');

  /* ── section modal ── */
  const [secModal, setSecModal]     = useState(false);
  const [secBankId, setSecBankId]   = useState('');
  const [editSecId, setEditSecId]   = useState('');
  const [secForm, setSecForm]       = useState({ name: '', icon: '🏦', color: '#38bdf8' });

  /* ── entry modal ── */
  const [entryModal, setEntryModal]   = useState(false);
  const [entryBankId, setEntryBankId] = useState('');
  const [entrySecId, setEntrySecId]   = useState('');
  const [editEntryId, setEditEntryId] = useState('');
  const [entryForm, setEntryForm]     = useState({ label: '', amount: '', notes: '' });
  const [entrySecName, setEntrySecName] = useState('');

  /* ── load ── */
  const load = useCallback(async () => {
    if (!wid) return;
    setLoading(true);
    try { setBanks(await getBanks(wid)); }
    finally { setLoading(false); }
  }, [wid]);

  useEffect(() => { load(); }, [load]);

  /* ── totals for summary strip ── */
  const grand = grandTotal(banks);

  /* group entries by section name across all banks for type totals */
  const typeTotals = {};
  banks.forEach(b => (b.sections || []).forEach(s => {
    const k = s.name;
    typeTotals[k] = (typeTotals[k] || 0) + secTotal(s);
  }));

  /* ─── BANK CRUD ─── */
  const openAddBank = () => {
    setEditBankId(''); setBankName(''); setBankModal(true);
  };
  const openRenameBank = (b) => {
    setEditBankId(b.id); setBankName(b.name); setBankModal(true);
  };
  const handleSaveBank = async () => {
    if (!bankName.trim()) return;
    try {
      if (editBankId) {
        await updateBank(wid, editBankId, { name: bankName });
        showToast(`Renamed to "${bankName}"`);
      } else {
        await createBank(wid, { name: bankName, sortOrder: banks.length });
        showToast(`Added "${bankName}"`);
      }
      setBankModal(false);
      await load();
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };
  const handleDeleteBank = async (b) => {
    await deleteBank(wid, b.id);
    showToast(`Deleted "${b.name}"`);
    setConfirm(null);
    await load();
  };

  /* ─── SECTION CRUD ─── */
  const openAddSection = (bankId) => {
    setSecBankId(bankId); setEditSecId('');
    setSecForm({ name: '', icon: '🏦', color: '#38bdf8' });
    setSecModal(true);
  };
  const openEditSection = (bankId, sec) => {
    setSecBankId(bankId); setEditSecId(sec.id);
    setSecForm({ name: sec.name, icon: sec.icon || '🏦', color: sec.color || '#38bdf8' });
    setSecModal(true);
  };
  const handleSaveSection = async () => {
    if (!secForm.name.trim()) return;
    try {
      if (editSecId) {
        await updateSection(wid, secBankId, editSecId, secForm);
        showToast('Section updated');
      } else {
        const bank = banks.find(b => b.id === secBankId);
        await createSection(wid, secBankId, { ...secForm, sortOrder: (bank?.sections || []).length });
        showToast(`Added section "${secForm.name}"`);
      }
      setSecModal(false);
      await load();
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };
  const handleDeleteSection = async (bankId, sec) => {
    await deleteSection(wid, bankId, sec.id);
    showToast(`Deleted section "${sec.name}"`);
    setConfirm(null);
    await load();
  };

  /* ─── ENTRY CRUD ─── */
  const openAddEntry = (bankId, sec) => {
    setEntryBankId(bankId); setEntrySecId(sec.id);
    setEditEntryId(''); setEntrySecName(sec.name);
    setEntryForm({ label: '', amount: '', notes: '' });
    setEntryModal(true);
  };
  const openEditEntry = (bankId, sec, entry) => {
    setEntryBankId(bankId); setEntrySecId(sec.id);
    setEditEntryId(entry.id); setEntrySecName(sec.name);
    setEntryForm({ label: entry.label, amount: entry.amount, notes: entry.notes || '' });
    setEntryModal(true);
  };
  const handleSaveEntry = async () => {
    if (!entryForm.label.trim()) return;
    try {
      if (editEntryId) {
        await updateEntry(wid, entryBankId, entrySecId, editEntryId, { ...entryForm, amount: Number(entryForm.amount) || 0 });
        showToast('Entry updated');
      } else {
        await createEntry(wid, entryBankId, entrySecId, { ...entryForm, amount: Number(entryForm.amount) || 0 });
        showToast('Entry added');
      }
      setEntryModal(false);
      await load();
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };
  const handleDeleteEntry = async (bankId, sec, entry) => {
    await deleteEntry(wid, bankId, sec.id, entry.id);
    showToast(`Deleted "${entry.label}"`);
    setConfirm(null);
    await load();
  };

  if (!wid) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No workspace selected</div>;

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 62px)', overflowY: 'auto' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: isMobile ? '18px 16px' : '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.8, lineHeight: 1.1 }}>🏛️ Bank Accounts</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>Dynamic sections · Savings · RD · FD · and more</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '14px', padding: '10px 18px', flex: isMobile ? 1 : 'none', minWidth: isMobile ? 0 : 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Balance</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{fmt(grand)}</div>
          </div>
          <button onClick={openAddBank} style={{ padding: '10px 18px', borderRadius: '12px', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontFamily: 'var(--font)', fontSize: 14, width: isMobile ? '100%' : 'auto' }}>
            + Add Bank
          </button>
        </div>
      </div>

      {/* ── SUMMARY STRIP ── */}
      {banks.length > 0 && (
        <div style={{ display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? 'repeat(auto-fit,minmax(150px,1fr))' : undefined, gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: isMobile ? 'visible' : 'auto' }}>
          {banks.map(b => {
            const bt = bankTotal(b);
            const secSubs = (b.sections || []).map(s => `${s.name}: ${fmt(secTotal(s))}`).join(' · ');
            return (
              <div key={b.id} style={{ flex: isMobile ? '1 0 160px' : '1 0 180px', background: 'var(--surface2)', padding: '12px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{b.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color: 'var(--hema, #38bdf8)' }}>{fmt(bt)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, whiteSpace: isMobile ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.45 }}>{secSubs || 'No sections'}</div>
              </div>
            );
          })}
          {/* type-level totals */}
          {Object.entries(typeTotals).slice(0, 6).map(([name, total]) => (
            <div key={name} style={{ flex: isMobile ? '1 0 130px' : '1 0 140px', background: 'var(--surface3)', padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>All {name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color: 'var(--gold)' }}>{fmt(total)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── BANKS GRID ── */}
      <div style={{ padding: isMobile ? 16 : 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
        {loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
        )}

        {!loading && banks.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏛️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>No banks yet</div>
            <div style={{ fontSize: 13, marginBottom: 22 }}>Click "+ Add Bank" to get started</div>
            <button onClick={openAddBank} style={{ padding: '11px 20px', borderRadius: '12px', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>+ Add Bank</button>
          </div>
        )}

        {!loading && banks.map(bank => (
          <div key={bank.id} style={card}>
            {/* bank card header */}
            <div style={{ padding: '16px 18px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -.3 }}>{bank.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>
                  {fmt(bankTotal(bank))} total
                  <span style={{ fontFamily: 'var(--font)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                    · {(bank.sections || []).length} section{(bank.sections || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginLeft: 'auto' }}>
                <button onClick={() => openAddSection(bank.id)} style={btnSm({ background: 'rgba(240,180,41,.1)', borderColor: 'var(--gold-dim)', color: 'var(--gold)' })}>
                  + Section
                </button>
                <button onClick={() => openRenameBank(bank)} style={btnSm()}>✏️</button>
                <button
                  onClick={() => setConfirm({ message: `Delete "${bank.name}" and ALL its sections and entries?`, action: () => handleDeleteBank(bank) })}
                  style={btnSm({ color: 'var(--red)' })}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* sections */}
            {(bank.sections || []).length === 0 && (
              <div style={{ padding: '18px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                No sections yet — click "+ Section" to add one
              </div>
            )}

            {(bank.sections || []).map(sec => {
              const col   = sec.color || 'var(--gold)';
              const total = secTotal(sec);
              return (
                <div key={sec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* section header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', background: 'var(--surface)', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{sec.icon || '💰'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: .3, color: col }}>{sec.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: col }}>{fmt(total)}</span>
                      <button onClick={() => openAddEntry(bank.id, sec)} style={btnSm({ fontSize: 11, padding: '5px 9px', background: 'rgba(240,180,41,.1)', borderColor: 'var(--gold-dim)', color: 'var(--gold)' })}>+ Add</button>
                      <button onClick={() => openEditSection(bank.id, sec)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '2px 4px', borderRadius: 4 }} title="Edit section">✏️</button>
                      <button
                        onClick={() => setConfirm({
                          message: (sec.entries || []).length > 0
                            ? `Delete section "${sec.name}" and its ${sec.entries.length} entries?`
                            : `Delete section "${sec.name}"?`,
                          action: () => handleDeleteSection(bank.id, sec),
                        })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '2px 4px', borderRadius: 4 }}
                        title="Delete section"
                      >✕</button>
                    </div>
                  </div>

                  {/* entries */}
                  <div style={{ padding: '0 14px 8px' }}>
                    {(sec.entries || []).length === 0 && (
                      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No entries yet</div>
                    )}
                    {(sec.entries || []).map(entry => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: isMobile ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.35 }}>{entry.label}</div>
                          {entry.notes && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{entry.notes}</div>
                          )}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: col, whiteSpace: 'nowrap' }}>{fmt(entry.amount)}</div>
                        {/* edit/delete on hover */}
                        <div style={{ display: 'flex', gap: 2, marginLeft: isMobile ? 'auto' : 0 }}>
                          <button onClick={() => openEditEntry(bank.id, sec, entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '2px 4px', opacity: .7 }}>✏️</button>
                          <button
                            onClick={() => setConfirm({ message: `Delete "${entry.label}"?`, action: () => handleDeleteEntry(bank.id, sec, entry) })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '2px 4px' }}
                          >✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ═══════════════════════ MODALS ═══════════════════════ */}

      {/* ── ADD / RENAME BANK ── */}
      {bankModal && (
        <Overlay onClose={() => setBankModal(false)} title={editBankId ? '✏️ Rename Bank' : '🏛️ Add Bank'}>
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Bank Name</label>
            <input
              autoFocus
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveBank()}
              placeholder="e.g. SBI, HDFC, ICICI"
              style={input()}
            />
          </div>
          <ModalActions onCancel={() => setBankModal(false)} onSave={handleSaveBank} saveLabel={editBankId ? 'Rename' : 'Add Bank'} />
        </Overlay>
      )}

      {/* ── ADD / EDIT SECTION ── */}
      {secModal && (
        <Overlay onClose={() => setSecModal(false)} title={editSecId ? '✏️ Edit Section' : '+ Add Section'}>
          {/* name */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Section Name</label>
            <input
              autoFocus
              value={secForm.name}
              onChange={e => setSecForm({ ...secForm, name: e.target.value })}
              placeholder="e.g. Savings, FD, RD, Current…"
              style={input()}
            />
          </div>
          {/* icon picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setSecForm({ ...secForm, icon: ic })}
                  style={{
                    width: 36, height: 36, borderRadius: 10, fontSize: 16,
                    border: `2px solid ${secForm.icon === ic ? 'var(--gold)' : 'var(--border2)'}`,
                    background: secForm.icon === ic ? 'rgba(240,180,41,.12)' : 'var(--surface2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{ic}</button>
              ))}
            </div>
          </div>
          {/* color picker */}
          <div style={{ marginBottom: 22 }}>
            <label style={label}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETTE.map(c => (
                <button
                  key={c.val}
                  title={c.name}
                  onClick={() => setSecForm({ ...secForm, color: c.val })}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c.val, cursor: 'pointer',
                    border: `3px solid ${secForm.color === c.val ? '#fff' : 'transparent'}`,
                    transform: secForm.color === c.val ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all .15s',
                  }}
                />
              ))}
            </div>
            {/* preview */}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{secForm.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: secForm.color }}>{secForm.name || 'Preview'}</span>
            </div>
          </div>
          <ModalActions onCancel={() => setSecModal(false)} onSave={handleSaveSection} saveLabel={editSecId ? 'Update Section' : 'Add Section'} />
        </Overlay>
      )}

      {/* ── ADD / EDIT ENTRY ── */}
      {entryModal && (
        <Overlay onClose={() => setEntryModal(false)} title={editEntryId ? `✏️ Edit ${entrySecName} Entry` : `+ Add ${entrySecName} Entry`}>
          <div style={{ marginBottom: 11 }}>
            <label style={label}>Label / Purpose</label>
            <input
              autoFocus
              value={entryForm.label}
              onChange={e => setEntryForm({ ...entryForm, label: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSaveEntry()}
              placeholder="e.g. Emergency fund, Mahanvi fee, X1234"
              style={input()}
            />
          </div>
          <div style={{ marginBottom: 11 }}>
            <label style={label}>Amount (₹)</label>
            <input
              type="number"
              value={entryForm.amount}
              onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })}
              placeholder="0"
              style={input()}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={label}>Notes (optional)</label>
            <input
              value={entryForm.notes}
              onChange={e => setEntryForm({ ...entryForm, notes: e.target.value })}
              placeholder="Account no., purpose, etc."
              style={input()}
            />
          </div>
          <ModalActions onCancel={() => setEntryModal(false)} onSave={handleSaveEntry} saveLabel={editEntryId ? 'Update' : 'Add Entry'} />
        </Overlay>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Confirm Delete"
        message={confirm?.message}
        danger
        onConfirm={confirm?.action}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

/* ── shared modal helpers ── */
function Overlay({ children, onClose, title }) {
  return (
    <Modal open onClose={onClose} width={460} title={title}>
      {children}
    </Modal>
  );
}

function ModalActions({ onCancel, onSave, saveLabel = 'Save' }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button onClick={onCancel} style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Cancel</button>
      <button onClick={onSave} style={{ padding: '10px 18px', borderRadius: '12px', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>{saveLabel}</button>
    </div>
  );
}
