import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../../store/auth.store';
import useUIStore from '../../store/ui.store';
import {
  getYears, createYear, updateYear, archiveYear, deleteYear,
  getGroups, createGroup, updateGroup, archiveGroup, deleteGroup,
  getExpenses, createExpense, updateExpense, archiveExpense, restoreExpense, deleteExpense,
  upsertSalary, importData,
} from '../../api/expenses.api';
import api from '../../api/client';
import { fmt, pct } from '../../utils/format';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/shared/Modal';
import useIsMobile from '../../utils/useIsMobile';

/* ─────────────── tiny style helpers ─────────────── */
const pill = (active, wrap = false) => ({
  padding: '8px 13px', borderRadius: 10, cursor: 'pointer',
  fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, whiteSpace: wrap ? 'normal' : 'nowrap',
  background: active ? 'rgba(240,180,41,.12)' : 'transparent',
  border: active ? '1px solid var(--gold-dim)' : '1px solid transparent',
  color: active ? 'var(--gold)' : 'var(--text-muted)',
  transition: 'all .15s', lineHeight: 1.25, textAlign: 'center',
});
const btnAdd = {
  width: '100%', padding: '10px 12px', background: 'var(--surface3)',
  border: '1px dashed var(--border2)', borderRadius: '12px',
  color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
  fontFamily: 'var(--font)', transition: 'all .15s',
};
const inlineInput = (extraStyle = {}) => ({
  background: 'none', border: 'none', outline: 'none',
  fontFamily: 'var(--font)', color: 'var(--text)', ...extraStyle,
});
const st = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
  color: 'var(--text-muted)', paddingBottom: 7,
  borderBottom: '1px solid var(--border)', marginBottom: 8, display: 'block',
};
const CATEGORIES = ['Housing','Food','Transport','Utilities','Education',
  'Healthcare','Insurance','EMI','Personal','Entertainment','Other'];
const OTHER_INCOME_CATEGORY = '__other_income__';
const COLORS = ['#38bdf8','#a78bfa','#34d399','#f472b6','#fb923c','#fbbf24','#2dd4bf','#e879f9','#a3e635','#60a5fa'];

/* ─────────────── main component ─────────────── */
export default function ExpensesPage() {
  const { activeWorkspace } = useAuthStore();
  const { showToast } = useUIStore();
  const isMobile = useIsMobile();
  const wid = activeWorkspace?.id;

  /* ── server data ── */
  const [years, setYears]       = useState([]);
  const [groups, setGroups]     = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [persons, setPersons]   = useState([]);
  const [salaries, setSalaries] = useState({});   // { personId: amount }

  /* ── selection ── */
  const [activeYear,  setActiveYear]  = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  /* ── modals ── */
  const [yearModal,  setYearModal]  = useState(false);
  const [grpModal,   setGrpModal]   = useState(false);
  const [expModal,   setExpModal]   = useState(false);
  const [editExp,    setEditExp]    = useState(null);
  const [personModal,setPersonModal]= useState(false);
  const [confirm,    setConfirm]    = useState(null);

  const [yearForm,  setYearForm]  = useState({ label:'', hasSubgroups: true });
  const [grpForm,   setGrpForm]   = useState({ label:'' });
  const [expForm,   setExpForm]   = useState({ label:'', amount:'', status:'pending', notes:'', category:'Other', personId:'' });
  const [personForm,setPersonForm]= useState({ name:'', baseSalary:'', hasPanel: true, color:'#38bdf8' });
  const formCols = isMobile ? '1fr' : '1fr 1fr';

  const debounceTimers = useRef({});

  /* ── load years ── */
  const loadYears = useCallback(async () => {
    if (!wid) return;
    const data = await getYears(wid, { includeArchived: showArchived });
    setYears(data);
    setActiveYear(prev => {
      if (!data.length) return null;
      if (!prev) return data[0];
      return data.find(y => y.id === prev.id) || data[0];
    });
  }, [wid, showArchived]);

  /* ── load persons ── */
  const loadPersons = useCallback(async () => {
    if (!wid) return;
    const data = await api.get(`/workspaces/${wid}/persons`).then(r => r.data);
    setPersons(data);
  }, [wid]);

  /* ── cleanup debounce timers on unmount ── */
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  useEffect(() => { loadYears(); loadPersons(); }, [loadYears, loadPersons]);

  /* ── load groups when year changes ── */
  useEffect(() => {
    if (!activeYear || !wid) return;
    if (activeYear.hasSubgroups) {
      getGroups(wid, activeYear.id, { includeArchived: showArchived }).then(d => {
        setGroups(d);
        if (d.length) setActiveGroup(prev => d.find(g => g.id === prev?.id) || d[0]);
        else setActiveGroup(null);
      });
    } else {
      setGroups([]);
      setActiveGroup(null);
    }
  }, [activeYear, wid, showArchived]);

  const loadExpenses = useCallback(async (yearId, groupId) => {
    if (!yearId) { setExpenses([]); return; }
    const data = await getExpenses(wid, { yearId, groupId, includeArchived: showArchived });
    setExpenses(data);
  }, [wid, showArchived]);

  const loadSalaries = useCallback(async (yearId, groupId) => {
    if (!yearId) { setSalaries({}); return; }
    try {
      const q = groupId ? `groupId=${groupId}` : `yearId=${yearId}`;
      const data = await api.get(`/workspaces/${wid}/salary-entries?${q}`).then(r => r.data);
      const map = {};
      data.forEach(s => { map[s.personId] = parseFloat(s.amount); });
      setSalaries(map);
    } catch {
      setSalaries({});
    }
  }, [wid]);

  /* ── load expenses & salaries when group/year changes ── */
  useEffect(() => {
    if (!wid || !activeYear) return;
    if (activeYear.hasSubgroups && activeGroup && activeGroup.yearId && activeGroup.yearId !== activeYear.id) {
      setExpenses([]);
      setSalaries({});
      return;
    }
    const groupId = activeYear.hasSubgroups ? activeGroup?.id : undefined;
    if (activeYear.hasSubgroups && !activeGroup) {
      setExpenses([]);
      setSalaries({});
      return;
    }
    loadExpenses(activeYear.id, groupId);
    loadSalaries(activeYear.id, groupId);
  }, [activeGroup, activeYear, wid, showArchived, loadExpenses, loadSalaries]);

  /* ─────────── COMPUTED TOTALS ─────────── */
  const scopedPersons = persons.filter(p => p.id in salaries);
  const salaryOf = (p) => (salaries[p.id] !== undefined ? Number(salaries[p.id] || 0) : 0);
  const totalSalary = scopedPersons.reduce((s, p) => s + salaryOf(p), 0);
  const isScopedExpense = (e) => {
    if (!activeYear) return false;
    if (e.yearId !== activeYear.id) return false;
    if (activeYear.hasSubgroups) return e.groupId === activeGroup?.id;
    return true;
  };
  const scopedExpenses = expenses.filter(isScopedExpense);
  const visibleEntries = scopedExpenses.filter(e => !e.isArchived);
  const spendingExpenses = visibleEntries.filter(e => e.category !== OTHER_INCOME_CATEGORY);
  const otherInc = visibleEntries
    .filter(e => e.category === OTHER_INCOME_CATEGORY && !e.isArchived)
    .map(e => ({ id: e.id, label: e.label || '', amount: e.amount || 0 }));
  const totalOther  = otherInc.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const totalIncome = totalSalary + totalOther;
  const panelPersons = scopedPersons.filter(p => p.hasPanel);
  const panelPersonIds = new Set(panelPersons.map(p => p.id));

  const expByPerson = {};
  panelPersons.forEach(p => {
    const mine = spendingExpenses.filter(e => e.personId === p.id);
    expByPerson[p.id] = {
      total: mine.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
      done:  mine.filter(e => e.status === 'done').length,
      count: mine.length,
    };
  });
  const unassignedExpenses = spendingExpenses.filter(e => !panelPersonIds.has(e.personId));
  const totalExp   = spendingExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalDone  = spendingExpenses.filter(e => e.status === 'done').length;
  const totalItems = spendingExpenses.length;
  const unpaid     = spendingExpenses.filter(e => e.status !== 'done').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const surplus    = totalIncome - totalExp;
  const spendRate  = totalIncome > 0 ? Math.round(totalExp / totalIncome * 100) : 0;

  /* ─────────── ACTIONS ─────────── */
  const saveSalary = async (personId, amount) => {
    if (!activeYear) return;
    if (activeYear.hasSubgroups && !activeGroup) {
      showToast('Create/select a month before entering salaries', 'error');
      return;
    }
    const groupId = activeYear?.hasSubgroups ? activeGroup?.id : undefined;
    const yearId  = activeYear?.id;
    setSalaries(prev => ({ ...prev, [personId]: Number(amount) }));
    try {
      await upsertSalary(wid, { personId, yearId, groupId: groupId || null, amount: Number(amount) });
    } catch {}
  };

  const handleAddPerson = async () => {
    if (!activeYear || (activeYear.hasSubgroups && !activeGroup)) {
      showToast('Create/select a year/month before adding person', 'error');
      return;
    }
    if (!personForm.name.trim()) return;
    try {
      const enteredSalary = Number(personForm.baseSalary) || 0;
      const person = await api.post(`/workspaces/${wid}/persons`, {
        name: personForm.name, color: personForm.color,
        baseSalary: enteredSalary, hasPanel: personForm.hasPanel,
      }).then(r => r.data);

      const groupId = activeYear.hasSubgroups ? (activeGroup?.id || null) : null;
      await upsertSalary(wid, {
        personId: person.id,
        yearId: activeYear.id,
        groupId,
        amount: enteredSalary,
      });
      setSalaries(prev => ({ ...prev, [person.id]: enteredSalary }));

      showToast(`Added ${personForm.name}`);
      setPersonModal(false);
      setPersonForm({ name:'', baseSalary:'', hasPanel: true, color: '#38bdf8' });
      await loadPersons();
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleDeletePerson = async (p) => {
    try {
      if (!activeYear) return;
      const groupId = activeYear.hasSubgroups ? activeGroup?.id : undefined;
      // Delete salary entry for this scope so person disappears from this year/month
      await api.delete(`/workspaces/${wid}/salary-entries`, {
        params: { personId: p.id, yearId: activeYear.id, groupId: groupId || undefined },
      });
      // Remove from local state immediately
      setSalaries(prev => { const next = { ...prev }; delete next[p.id]; return next; });
      showToast(`Removed ${p.name} from this ${activeYear.hasSubgroups ? 'month' : 'year'}`);
      setConfirm(null);
    } catch (e) { showToast(e.response?.data?.error || 'Error removing person', 'error'); }
  };


  const addOtherInc = async () => {
    if (!activeYear) return;
    if (activeYear.hasSubgroups && !activeGroup) {
      showToast('Create/select a month before adding Other Income', 'error');
      return;
    }
    const groupId = activeYear.hasSubgroups ? activeGroup?.id || null : null;
    try {
      const nextSourceNumber = otherInc.length + 1;
      await createExpense(wid, {
        yearId: activeYear.id,
        groupId,
        personId: null,
        label: `Income Source ${nextSourceNumber}`,
        amount: 0,
        status: 'done',
        notes: '',
        category: OTHER_INCOME_CATEGORY,
      });
      showToast('Added income source');
      await loadExpenses(activeYear.id, groupId || undefined);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };
  const updOther = (id, field, val) => {
    setExpenses(prev => prev.map(e => (
      e.id === id ? { ...e, [field === 'amount' ? 'amount' : 'label']: field === 'amount' ? Number(val || 0) : val } : e
    )));
    clearTimeout(debounceTimers.current['oinc_' + id + '_' + field]);
    debounceTimers.current['oinc_' + id + '_' + field] = setTimeout(async () => {
      try {
        await updateExpense(wid, id, field === 'amount' ? { amount: Number(val || 0), status: 'done' } : { label: val });
      } catch {}
    }, 450);
  };
  const removeOther = async (id) => {
    try {
      await archiveExpense(wid, id);
      if (!activeYear) return;
      const groupId = activeYear.hasSubgroups ? activeGroup?.id : undefined;
      await loadExpenses(activeYear.id, groupId);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddYear = async () => {
    if (!yearForm.label.trim()) return;
    try {
      const y = await createYear(wid, yearForm);
      showToast(`Created "${y.label}"`);
      setYearModal(false); setYearForm({ label:'', hasSubgroups: true });
      setActiveGroup(null);
      setGroups([]);
      setExpenses([]);
      setSalaries({});
      await loadYears();
      setActiveYear(y);
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddGroup = async () => {
    if (!grpForm.label.trim() || !activeYear) return;
    try {
      const g = await createGroup(wid, activeYear.id, grpForm);
      showToast(`Created "${g.label}"`);
      setGrpModal(false); setGrpForm({ label:'' });
      setExpenses([]);
      setSalaries({});
      const d = await getGroups(wid, activeYear.id);
      setGroups(d); setActiveGroup(g);
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleRenameYear = async () => {
    if (!activeYear) return;
    const nextLabel = window.prompt('Rename year', activeYear.label);
    if (nextLabel === null) return;
    const label = nextLabel.trim();
    if (!label || label === activeYear.label) return;
    try {
      await updateYear(wid, activeYear.id, { label });
      showToast('Year renamed');
      await loadYears();
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleRenameMonth = async () => {
    if (!activeYear || !activeGroup) return;
    const nextLabel = window.prompt('Rename month', activeGroup.label);
    if (nextLabel === null) return;
    const label = nextLabel.trim();
    if (!label || label === activeGroup.label) return;
    try {
      const updated = await updateGroup(wid, activeYear.id, activeGroup.id, { label });
      showToast('Month renamed');
      const d = await getGroups(wid, activeYear.id, { includeArchived: showArchived });
      setGroups(d);
      setActiveGroup(updated);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleDeleteYear = async () => {
    if (!activeYear) return;
    try {
      await deleteYear(wid, activeYear.id);
      showToast('Year deleted');
      setConfirm(null);
      setActiveYear(null);
      setActiveGroup(null);
      await loadYears();
      await loadPersons();
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleDeleteMonth = async () => {
    if (!activeYear || !activeGroup) return;
    try {
      await deleteGroup(wid, activeYear.id, activeGroup.id);
      showToast('Month deleted');
      setConfirm(null);
      setActiveGroup(null);
      const d = await getGroups(wid, activeYear.id, { includeArchived: showArchived });
      setGroups(d);
      await loadExpenses(activeYear.id, undefined);
      await loadPersons();
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const handleSaveExp = async () => {
    if (!expForm.label.trim()) return;
    try {
      if (editExp) {
        await updateExpense(wid, editExp.id, expForm);
        showToast('Updated');
      } else {
        await createExpense(wid, {
          ...expForm,
          yearId: activeYear?.id,
          groupId: activeGroup?.id || null,
        });
        showToast('Added');
      }
      setExpModal(false); setEditExp(null);
      setExpForm({ label:'', amount:'', status:'pending', notes:'', category:'Other', personId:'' });
      loadExpenses(activeYear?.id, activeGroup?.id);
    } catch(e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const togglePaid = async (exp) => {
    const newStatus = exp.status === 'done' ? 'pending' : 'done';
    try {
      await updateExpense(wid, exp.id, { status: newStatus });
      setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: newStatus } : e));
    } catch (e) { showToast(e.response?.data?.error || 'Error updating status', 'error'); }
  };

  const doArchiveExp = async (exp) => {
    try {
      if (exp.isArchived) { await restoreExpense(wid, exp.id); showToast('Restored'); }
      else { await archiveExpense(wid, exp.id); showToast('Archived'); }
      loadExpenses(activeYear?.id, activeGroup?.id);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const doDeleteExp = async (exp) => {
    try {
      await deleteExpense(wid, exp.id); showToast('Deleted');
      setConfirm(null); loadExpenses(activeYear?.id, activeGroup?.id);
    } catch (e) { showToast(e.response?.data?.error || 'Error deleting', 'error'); }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const result = await importData(wid, data);
          await Promise.all([loadYears(), loadPersons()]);
          const imported = result.imported || {};
          const summary = [
            imported.persons ? `${imported.persons} people` : null,
            imported.years ? `${imported.years} year${imported.years === 1 ? '' : 's'}` : null,
            imported.groups ? `${imported.groups} month${imported.groups === 1 ? '' : 's'}` : null,
            imported.salaryEntries ? `${imported.salaryEntries} salaries` : null,
            imported.expenses ? `${imported.expenses} entries` : null,
          ].filter(Boolean).join(', ');

          showToast(summary ? `Imported ${summary}` : 'Import complete');
          if (result.errorCount) {
            showToast(`Import completed with ${result.errorCount} warning${result.errorCount === 1 ? '' : 's'}`, 'error');
          }
        } catch(err) {
          showToast(err.response?.data?.error || err.message || 'Import failed', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  /* ─────────── RENDER HELPERS ─────────── */

  const progressBar = (value, color) => (
    <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
    </div>
  );
  const canAddPerson = !!activeYear && (!activeYear.hasSubgroups || !!activeGroup);
  const canAddOtherIncome = !!activeYear && (!activeYear.hasSubgroups || !!activeGroup);

  if (!wid) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No workspace selected</div>;

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 62px)' }}>

      {/* ── YEAR / MONTH TAB STRIP ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: isMobile ? '10px 14px' : '10px 18px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: 4, flexShrink: 0 }}>YEAR</span>
        {years.map(y => (
          <button key={y.id} style={pill(activeYear?.id === y.id, isMobile)} onClick={() => { setActiveYear(y); setActiveGroup(null); }}>
            {y.label}{y.status === 'archived' && ' (archived)'}
          </button>
        ))}
        <button style={pill(false, isMobile)} onClick={() => setYearModal(true)}>+ Year</button>
        {activeYear?.status === 'active' && (
          <button style={{ ...pill(false, isMobile), color: 'var(--red)' }} onClick={() => archiveYear(wid, activeYear.id).then(() => { showToast('Archived'); setActiveYear(null); loadYears(); }).catch(e => showToast(e.response?.data?.error || 'Error archiving year', 'error'))}>
            Archive Year
          </button>
        )}
        {activeYear && (
          <button style={pill(false, isMobile)} onClick={handleRenameYear}>Rename Year</button>
        )}
        {activeYear && (
          <button
            style={{ ...pill(false, isMobile), color: 'var(--red)' }}
            onClick={() => setConfirm({
              message: `Delete "${activeYear.label}" permanently? This removes all months, salaries, and expenses in it.`,
              action: handleDeleteYear,
            })}
          >
            Delete Year
          </button>
        )}
        <div style={{ marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : 'auto', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button style={{ ...pill(showArchived, isMobile), fontSize: 12 }} onClick={() => setShowArchived(p => !p)}>
            {showArchived ? '🙈 Hide Archived' : '📦 Show Archived'}
          </button>
          <button style={{ ...pill(false, isMobile), fontSize: 12 }} onClick={handleImport}>⬆ Import JSON</button>
        </div>
      </div>

      {activeYear?.hasSubgroups && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: isMobile ? '10px 14px' : '10px 18px', display: 'flex', alignItems: 'center', gap: 8, overflowX: isMobile ? 'visible' : 'auto', scrollbarWidth: 'none', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 }}>MONTH</span>
          {groups.map(g => (
            <button key={g.id} style={pill(activeGroup?.id === g.id, isMobile)} onClick={() => setActiveGroup(g)}>
              {g.label}{g.status === 'archived' && ' (archived)'}
            </button>
          ))}
          <button style={pill(false, isMobile)} onClick={() => setGrpModal(true)}>+ Month</button>
          {activeGroup?.status === 'active' && (
            <button style={{ ...pill(false, isMobile), color: 'var(--red)' }} onClick={() =>
              archiveGroup(wid, activeYear.id, activeGroup.id).then(() => {
                showToast('Month archived');
                setActiveGroup(null);
                getGroups(wid, activeYear.id, { includeArchived: showArchived }).then(setGroups);
              }).catch(e => showToast(e.response?.data?.error || 'Error archiving month', 'error'))
            }>Archive Month</button>
          )}
          {activeGroup && (
            <button style={pill(false, isMobile)} onClick={handleRenameMonth}>Rename Month</button>
          )}
          {activeGroup && (
            <button
              style={{ ...pill(false, isMobile), color: 'var(--red)' }}
              onClick={() => setConfirm({
                message: `Delete "${activeGroup.label}" permanently? This removes salaries and expenses in this month.`,
                action: handleDeleteMonth,
              })}
            >
              Delete Month
            </button>
          )}
        </div>
      )}

      {/* ── SUMMARY BAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'Total Income',    val: fmt(totalIncome), color: 'var(--green)',  sub: `${scopedPersons.length} person${scopedPersons.length !== 1 ? 's' : ''}` },
          { label: 'Total Expenses',  val: fmt(totalExp),    color: 'var(--red)',    sub: `${totalDone}/${totalItems} paid` },
          { label: 'Remaining',       val: fmt(surplus),     color: surplus >= 0 ? 'var(--gold)' : 'var(--red)', sub: surplus >= 0 ? 'Savings available' : 'Over budget ⚠️' },
          { label: 'Spend Rate',      val: spendRate + '%',  color: spendRate > 80 ? 'var(--red)' : spendRate > 60 ? 'var(--amber)' : 'var(--green)', sub: spendRate > 80 ? 'High ⚠️' : spendRate > 60 ? 'Moderate' : 'Healthy ✓' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN AREA: sidebar + panels ── */}
      <div style={{ flex: 1, display: 'flex', overflow: isMobile ? 'visible' : 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* ════ LEFT SIDEBAR ════ */}
        <aside style={{ width: isMobile ? '100%' : 286, flexShrink: 0, background: 'var(--surface)', borderRight: isMobile ? 'none' : '1px solid var(--border)', borderBottom: isMobile ? '1px solid var(--border)' : 'none', padding: isMobile ? 16 : 18, overflowY: isMobile ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── SALARIES ── */}
          <div>
            <span style={st}>💼 Salaries</span>
            {scopedPersons.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <input
                  style={{ ...inlineInput({ flex: 1, fontSize: 13, fontWeight: 700, minWidth: 0 }) }}
                  value={p.name}
                  onChange={e => {
                    setPersons(prev => prev.map(x => x.id === p.id ? { ...x, name: e.target.value } : x));
                    // debounced save
                    clearTimeout(debounceTimers.current['pt_' + p.id]);
                    debounceTimers.current['pt_' + p.id] = setTimeout(() => api.put(`/workspaces/${wid}/persons/${p.id}`, { name: e.target.value }), 600);
                  }}
                />
                <input
                  type="number"
                  style={{ ...inlineInput({ width: 78, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--green)', textAlign: 'right' }) }}
                  value={salaries[p.id] !== undefined ? salaries[p.id] : 0}
                  onChange={e => saveSalary(p.id, e.target.value)}
                />
                <span style={{ fontSize: 10, padding: '2px 5px', borderRadius: 6, background: p.hasPanel ? 'rgba(56,189,248,.1)' : 'var(--surface3)', color: p.hasPanel ? 'var(--blue,#38bdf8)' : 'var(--text-muted)', border: '1px solid', borderColor: p.hasPanel ? 'rgba(56,189,248,.25)' : 'var(--border)' }}>
                  {p.hasPanel ? 'panel' : 'income'}
                </span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 2, lineHeight: 1 }} onClick={() => setConfirm({ action: () => handleDeletePerson(p), message: `Remove "${p.name}" from this ${activeYear?.hasSubgroups ? 'month' : 'year'}?` })}>✕</button>
              </div>
            ))}
            <button
              style={{ ...btnAdd, opacity: canAddPerson ? 1 : 0.5, cursor: canAddPerson ? 'pointer' : 'not-allowed' }}
              disabled={!canAddPerson}
              onClick={() => canAddPerson && setPersonModal(true)}
            >
              + Add Person
            </button>
          </div>

          {/* ── OTHER INCOME ── */}
          <div>
            <span style={st}>➕ Other Income</span>
            {otherInc.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 10px', marginBottom: 6 }}>
                <input
                  type="text"
                  placeholder="Other Income"
                  value={o.label}
                  onChange={e => updOther(o.id, 'label', e.target.value)}
                  style={{ ...inlineInput({ flex: 1, fontSize: 12 }) }}
                />
                <input
                  type="number"
                  placeholder="0"
                  value={o.amount}
                  onChange={e => updOther(o.id, 'amount', e.target.value)}
                  style={{ ...inlineInput({ width: 76, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--gold)', textAlign: 'right' }) }}
                />
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 2 }} onClick={() => removeOther(o.id)}>✕</button>
              </div>
            ))}
            <button
              style={{ ...btnAdd, opacity: canAddOtherIncome ? 1 : 0.5, cursor: canAddOtherIncome ? 'pointer' : 'not-allowed' }}
              disabled={!canAddOtherIncome}
              onClick={() => canAddOtherIncome && addOtherInc()}
            >
              + Add Source
            </button>
            <div style={{ marginTop: 10, background: 'linear-gradient(135deg,var(--green-dim),#0a2e1e)', border: '1px solid #1a5a3a', borderRadius: '14px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: .8, color: 'var(--green)' }}>TOTAL INCOME</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{fmt(totalIncome)}</span>
            </div>
          </div>

          {/* ── BREAKDOWN ── */}
          <div>
            <span style={st}>📊 Breakdown</span>
            {panelPersons.map(p => {
              const rem = salaryOf(p) - (expByPerson[p.id]?.total || 0);
              return (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: p.color }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: rem >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(rem)}</span>
                </div>
              );
            })}
            {scopedPersons.filter(p => !p.hasPanel).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: p.color }}>{p.name} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(income)</span></span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{fmt(salaryOf(p))}</span>
              </div>
            ))}
            {unassignedExpenses.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--amber)' }}>Unassigned</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>
                  {fmt(unassignedExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0))}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Items Paid</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{totalDone}/{totalItems}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Unpaid Amount</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>{fmt(unpaid)}</span>
            </div>
          </div>

          {/* ── PROGRESS ── */}
          <div>
            <span style={st}>📈 Progress</span>
            {panelPersons.map(p => {
              const sal  = salaryOf(p);
              const spent = expByPerson[p.id]?.total || 0;
              const sp   = pct(spent, sal);
              return (
                <div key={p.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span>{sp}%</span>
                  </div>
                  {progressBar(sp, p.color)}
                </div>
              );
            })}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: 'var(--green)' }}>Payments Done</span>
                <span>{pct(totalDone, totalItems)}%</span>
              </div>
              {progressBar(pct(totalDone, totalItems), 'var(--green)')}
            </div>
          </div>
        </aside>

        {/* ════ EXPENSE PANELS ════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflowX: isMobile ? 'visible' : 'auto', overflowY: isMobile ? 'visible' : 'hidden', scrollbarWidth: 'thin' }}>
          {panelPersons.length === 0 && unassignedExpenses.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-muted)', padding: 40 }}>
              <div style={{ fontSize: 36 }}>👤</div>
              <div style={{ fontSize: 14 }}>No expense panels — add a person with "Panel" mode</div>
            </div>
          ) : (
            [...panelPersons, ...(unassignedExpenses.length ? [{ id: '__unassigned__', name: 'Unassigned', color: 'var(--amber)', hasPanel: true }] : [])].map(p => {
              const isUnassignedPanel = p.id === '__unassigned__';
              const panelExpenses = isUnassignedPanel ? unassignedExpenses : spendingExpenses.filter(e => e.personId === p.id);
              const total  = panelExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              const sal    = salaryOf(p);
              const done   = panelExpenses.filter(e => e.status === 'done').length;
              return (
                <div key={p.id} style={{ minWidth: isMobile ? '100%' : 320, flex: isMobile ? '0 0 auto' : '1 0 320px', borderRight: isMobile ? 'none' : '1px solid var(--border)', borderBottom: isMobile ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', overflowY: isMobile ? 'visible' : 'auto' }}>
                  {/* panel header */}
                  <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: isMobile ? 'relative' : 'sticky', top: isMobile ? 'auto' : 0, zIndex: 5, borderTop: `2px solid ${p.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                        <span style={{ color: p.color }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {isUnassignedPanel ? (
                          <>Expenses without a visible panel</>
                        ) : (
                          <>Remaining: <span style={{ fontFamily: 'var(--mono)', color: 'var(--gold)' }}>{fmt(sal - total)}</span></>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: p.color }}>{fmt(total)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>✓ {done}/{panelExpenses.length}</div>
                    </div>
                  </div>

                  {/* expense list */}
                  <div style={{ padding: isMobile ? '12px' : '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    {panelExpenses.length === 0 && (
                      <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 24 }}>🗒️</div>
                        <div style={{ fontSize: 13 }}>No expenses yet</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use "+ Add Expense" below</div>
                      </div>
                    )}
                    {panelExpenses.map(exp => (
                      <div key={exp.id} style={{
                        background: exp.isArchived ? 'var(--surface)' : 'var(--surface2)',
                        border: `1px solid ${exp.status === 'done' ? '#1a3d20' : 'var(--border)'}`,
                        borderRadius: '12px', padding: '10px 10px',
                        opacity: exp.isArchived ? 0.6 : 1,
                      }}>
                        {/* row 1: name + amount + pay button */}
                        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 4, marginBottom: 4, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                          <input
                            style={{ ...inlineInput({ flex: isMobile ? '1 1 100%' : 1, minWidth: isMobile ? '100%' : 0, fontSize: 13, fontWeight: 500, textDecoration: exp.status === 'done' ? 'line-through' : 'none', color: exp.status === 'done' ? 'var(--text-dim)' : 'var(--text)' }) }}
                            value={exp.label}
                            onChange={e => { setExpenses(prev => prev.map(x => x.id === exp.id ? { ...x, label: e.target.value } : x)); clearTimeout(debounceTimers.current['exp_' + exp.id]); debounceTimers.current['exp_' + exp.id] = setTimeout(() => updateExpense(wid, exp.id, { label: e.target.value }), 600); }}
                          />
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>₹</span>
                          <input
                            type="number"
                            style={{ ...inlineInput({ width: isMobile ? 96 : 82, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, textAlign: 'right' }) }}
                            value={exp.amount}
                            onChange={e => { setExpenses(prev => prev.map(x => x.id === exp.id ? { ...x, amount: e.target.value } : x)); clearTimeout(debounceTimers.current['expa_' + exp.id]); debounceTimers.current['expa_' + exp.id] = setTimeout(() => updateExpense(wid, exp.id, { amount: Number(e.target.value) }), 600); }}
                          />
                          <button onClick={() => togglePaid(exp)} style={{
                            padding: '4px 8px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0,
                            background: exp.status === 'done' ? 'var(--green-dim)' : 'var(--surface3)',
                            color: exp.status === 'done' ? 'var(--green)' : 'var(--text-muted)',
                            border: exp.status === 'done' ? '1px solid #1a5a30' : '1px solid var(--border2)',
                          }}>
                            {exp.status === 'done' ? '✓ Done' : 'Pay'}
                          </button>
                          <button onClick={() => { setEditExp(exp); setExpForm({ label: exp.label, amount: exp.amount, status: exp.status, notes: exp.notes || '', category: exp.category || 'Other', personId: exp.personId }); setExpModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '1px 3px', opacity: 0.7 }}>✏️</button>
                          <button onClick={() => doArchiveExp(exp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', fontSize: 12, padding: '1px 3px' }} title={exp.isArchived ? 'Restore' : 'Archive'}>
                            {exp.isArchived ? '↩' : '📦'}
                          </button>
                          <button onClick={() => setConfirm({ action: () => doDeleteExp(exp), message: `Delete "${exp.label}" permanently?` })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '1px 3px' }}>✕</button>
                        </div>
                        {/* row 2: notes */}
                        <input
                          style={{ ...inlineInput({ width: '100%', fontSize: 11, color: 'var(--text-muted)' }) }}
                          placeholder="Note..."
                          value={exp.notes || ''}
                          onChange={e => { setExpenses(prev => prev.map(x => x.id === exp.id ? { ...x, notes: e.target.value } : x)); clearTimeout(debounceTimers.current['expn_' + exp.id]); debounceTimers.current['expn_' + exp.id] = setTimeout(() => updateExpense(wid, exp.id, { notes: e.target.value }), 600); }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* add expense button */}
                  <div style={{ padding: isMobile ? '0 12px 12px' : '0 14px 14px', flexShrink: 0 }}>
                    <button style={btnAdd} onClick={() => {
                      setEditExp(null);
                      setExpForm({ label:'', amount:'', status:'pending', notes:'', category:'Other', personId: isUnassignedPanel ? '' : p.id });
                      setExpModal(true);
                    }}>{isUnassignedPanel ? '+ Add Unassigned Expense' : '+ Add Expense'}</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* Year modal */}
      {yearModal && (
        <Modal open={yearModal} onClose={() => setYearModal(false)} width={420} title="➕ Add Year">
            <div style={{ marginBottom:12 }}>
              <label style={{ ...st, display:'block' }}>Year Label</label>
              <input value={yearForm.label} onChange={e=>setYearForm({...yearForm,label:e.target.value})} placeholder="e.g. Year - 2026" style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14,outline:'none' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ ...st, display:'block' }}>Structure</label>
              {[true,false].map(v => (
                <label key={String(v)} style={{ display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:13,color:yearForm.hasSubgroups===v?'var(--text)':'var(--text-muted)',marginBottom:8 }}>
                  <input type="radio" checked={yearForm.hasSubgroups===v} onChange={()=>setYearForm({...yearForm,hasSubgroups:v})} />
                  {v ? 'Year → Month → Expenses (2-level)' : 'Year → Expenses directly (flat)'}
                </label>
              ))}
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <button onClick={()=>setYearModal(false)} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:700 }}>Cancel</button>
              <button onClick={handleAddYear} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:13 }}>Add Year</button>
            </div>
        </Modal>
      )}

      {/* Group modal */}
      {grpModal && (
        <Modal open={grpModal} onClose={() => setGrpModal(false)} width={380} title="📅 Add Month">
            <div style={{ marginBottom:20 }}>
              <label style={{ ...st, display:'block' }}>Label</label>
              <input value={grpForm.label} onChange={e=>setGrpForm({label:e.target.value})} placeholder="e.g. March, April, Q1" style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14,outline:'none' }} />
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <button onClick={()=>setGrpModal(false)} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:700 }}>Cancel</button>
              <button onClick={handleAddGroup} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:13 }}>Add Month</button>
            </div>
        </Modal>
      )}

      {/* Expense modal */}
      {expModal && (
        <Modal open={expModal} onClose={() => setExpModal(false)} width={460} title={`${editExp ? '✏️ Edit' : '+ Add'} Expense`}>
            <div style={{ marginBottom:11 }}>
              <label style={{ ...st, display:'block' }}>Expense Name</label>
              <input value={expForm.label} onChange={e=>setExpForm({...expForm,label:e.target.value})} placeholder="e.g. Rent, Electricity" style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14,outline:'none' }} />
            </div>
            <div style={{ display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:11 }}>
              <div>
                <label style={{ ...st, display:'block' }}>Amount (₹)</label>
                <input type="number" value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} placeholder="0" style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14,outline:'none' }} />
              </div>
              <div>
                <label style={{ ...st, display:'block' }}>Status</label>
                <select value={expForm.status} onChange={e=>setExpForm({...expForm,status:e.target.value})} style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14 }}>
                  <option value="pending">Pending</option>
                  <option value="done">Done / Paid</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:formCols,gap:10,marginBottom:11 }}>
              <div>
                <label style={{ ...st, display:'block' }}>Category</label>
                <select value={expForm.category} onChange={e=>setExpForm({...expForm,category:e.target.value})} style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14 }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...st, display:'block' }}>Assign To</label>
                <select value={expForm.personId} onChange={e=>setExpForm({...expForm,personId:e.target.value})} style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14 }}>
                  <option value="">Unassigned</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ ...st, display:'block' }}>Notes (optional)</label>
              <input value={expForm.notes} onChange={e=>setExpForm({...expForm,notes:e.target.value})} placeholder="Any notes..." style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14,outline:'none' }} />
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <button onClick={()=>setExpModal(false)} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:700 }}>Cancel</button>
              <button onClick={handleSaveExp} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:13 }}>{editExp ? 'Update' : 'Add'}</button>
            </div>
        </Modal>
      )}

      {/* Person modal */}
      {personModal && (
        <Modal open={personModal} onClose={() => setPersonModal(false)} width={400} title="👤 Add Person">
            <div style={{ marginBottom:11 }}>
              <label style={{ ...st, display:'block' }}>Full Name</label>
              <input value={personForm.name} onChange={e=>setPersonForm({...personForm,name:e.target.value})} placeholder="e.g. Brother, Amma" style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14,outline:'none' }} />
            </div>
            <div style={{ marginBottom:11 }}>
              <label style={{ ...st, display:'block' }}>Monthly Salary (₹)</label>
              <input type="number" value={personForm.baseSalary} onChange={e=>setPersonForm({...personForm,baseSalary:e.target.value})} placeholder="0" style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14,outline:'none' }} />
            </div>
            <div style={{ marginBottom:11 }}>
              <label style={{ ...st, display:'block' }}>Color</label>
              <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setPersonForm({...personForm,color:c})} style={{ width:26,height:26,borderRadius:'50%',background:c,border:`3px solid ${personForm.color===c?'#fff':'transparent'}`,cursor:'pointer',transition:'all .15s' }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ ...st, display:'block' }}>Expense Tracking</label>
              <select value={personForm.hasPanel ? 'yes' : 'no'} onChange={e=>setPersonForm({...personForm,hasPanel:e.target.value==='yes'})} style={{ width:'100%',padding:'11px 13px',background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'12px',color:'var(--text)',fontSize:14 }}>
                <option value="yes">Yes — show separate expense panel</option>
                <option value="no">No — income only, no expense column</option>
              </select>
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <button onClick={()=>setPersonModal(false)} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-dim)',cursor:'pointer',fontSize:13,fontWeight:700 }}>Cancel</button>
              <button onClick={handleAddPerson} style={{ padding:'10px 16px',borderRadius:'12px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontWeight:800,fontSize:13 }}>Add Person</button>
            </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Confirm Action"
        message={confirm?.message}
        danger
        onConfirm={confirm?.action}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
