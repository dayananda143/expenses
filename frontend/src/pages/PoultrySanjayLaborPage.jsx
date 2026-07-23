import { useState, useEffect } from 'react';
import { Users, IndianRupee, GraduationCap, Wallet, Banknote, Pencil } from 'lucide-react';

const API = '/api/poultry/expenses';
const SALARY_API = '/api/poultry/sanjay-salary';
const CATEGORY = 'sanjay_labor';
const token = () => localStorage.getItem('expenses_token');

// Non-labor entries (food items, chores) get logged under Sanjay Labor in the
// source sheets but aren't labor pay — hide them here only; they still show
// on the general Expenses page since we don't touch their stored category.
const EXCLUDED_ITEM_RE = /atta|aata|chicken|rice|drinking water|fish|food for|cleaning shed/i;

// Some batches have a few items that don't belong in this view — scoped per
// batch since the same words are legitimate labor entries in other batches.
const BATCH_EXCLUDED_RE = {
  'Batch 1': /tablet|pooja items|swagath/i,
  'Batch 2': /tablet/i,
};

// Manually confirmed as school-fees despite a generic description (e.g. "Misc")
// that the text match can't distinguish from other entries.
const EXTRA_SCHOOL_FEE_IDS = new Set([7]); // Batch 7, Misc, ₹120 (2026-03-03)

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PoultrySanjayLaborPage() {
  const [batches, setBatches] = useState([]);
  const [flockFilter, setFlockFilter] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salaryGiven, setSalaryGiven] = useState(0);
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  useEffect(() => {
    fetch('/api/poultry/flock', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(j => {
        const list = j.data ?? [];
        setBatches(list);
        if (!list.length) return;
        const saved = localStorage.getItem('poultry_flock_filter');
        const valid = saved === 'all' || (saved && list.some(b => String(b.id) === saved));
        setFlockFilter(valid ? saved : String(list[0].id));
      });
  }, []);

  useEffect(() => { if (flockFilter) load(); }, [flockFilter]);

  async function load() {
    setLoading(true);
    const url = flockFilter === 'all' ? API : `${API}?flock_id=${flockFilter}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    const j = await r.json();
    setEntries((j.data ?? []).filter(e => {
      if (e.category !== CATEGORY) return false;
      const text = e.subcategory || e.description || '';
      if (EXCLUDED_ITEM_RE.test(text)) return false;
      const batchName = (batches.find(b => b.id === e.flock_id)?.name ?? '').trim();
      if (BATCH_EXCLUDED_RE[batchName]?.test(text)) return false;
      return true;
    }));
    setLoading(false);

    if (flockFilter === 'all') {
      const sr = await fetch(SALARY_API, { headers: { Authorization: `Bearer ${token()}` } });
      const sj = await sr.json();
      setSalaryGiven((sj.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0));
    } else {
      const sr = await fetch(`${SALARY_API}?flock_id=${flockFilter}`, { headers: { Authorization: `Bearer ${token()}` } });
      const sj = await sr.json();
      setSalaryGiven(sj.data?.amount ?? 0);
    }
  }

  function startEditSalary() {
    setSalaryDraft(String(salaryGiven || ''));
    setEditingSalary(true);
  }

  async function saveSalary() {
    const amount = parseFloat(salaryDraft);
    setEditingSalary(false);
    if (isNaN(amount) || amount === salaryGiven || flockFilter === 'all') return;
    setSavingSalary(true);
    try {
      await fetch(SALARY_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ flock_id: Number(flockFilter), amount }),
      });
      setSalaryGiven(amount);
    } finally {
      setSavingSalary(false);
    }
  }

  const batchNameById = Object.fromEntries(batches.map(b => [b.id, b.name.trim()]));

  const total = entries.reduce((s, e) => s + e.amount, 0);
  const schoolFeesEntries = entries.filter(e => {
    const text = `${e.subcategory ?? ''} ${e.description ?? ''}`;
    if (/school|bag\+books|bag \+ books/i.test(text)) return true;
    // Batch 4's "Misc" entries (examfees, school fees) are all education costs.
    if (batchNameById[e.flock_id] === 'Batch 4' && (e.subcategory ?? '').toLowerCase() === 'misc') return true;
    if (EXTRA_SCHOOL_FEE_IDS.has(e.id)) return true;
    return false;
  });
  const schoolFeesTotal = schoolFeesEntries.reduce((s, e) => s + e.amount, 0);
  const sanjayShareOfSchoolFees = schoolFeesTotal / 2;
  const totalExpenses = (total - schoolFeesTotal) + sanjayShareOfSchoolFees;
  const rows = entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-indigo-500" /> Sanjay Labor
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {entries.length} entries
          </p>
        </div>
        <select value={flockFilter} onChange={e => { setFlockFilter(e.target.value); localStorage.setItem('poultry_flock_filter', e.target.value); }}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="bg-emerald-600 dark:bg-emerald-700 rounded-2xl p-4 shadow-sm w-full max-w-xs"
          style={{ borderLeftWidth: 3, borderLeftColor: '#065f46' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Total Expenses</p>
              <p className="mt-1 text-lg font-bold text-white">{fmt(totalExpenses)}</p>
              <p className="text-xs text-emerald-200 mt-0.5">expenses + Sanjay's school fees share</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Wallet size={16} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 dark:bg-indigo-700 rounded-2xl p-4 shadow-sm w-full max-w-xs"
          style={{ borderLeftWidth: 3, borderLeftColor: '#3730a3' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Expenses (excl. school fees)</p>
              <p className="mt-1 text-lg font-bold text-white">{fmt(total - schoolFeesTotal)}</p>
              <p className="text-xs text-indigo-200 mt-0.5">{entries.length - schoolFeesEntries.length} entries</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <IndianRupee size={16} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-amber-600 dark:bg-amber-700 rounded-2xl p-4 shadow-sm w-full max-w-xs"
          style={{ borderLeftWidth: 3, borderLeftColor: '#92400e' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">School Fees</p>
              <p className="mt-1 text-lg font-bold text-white">{fmt(schoolFeesTotal)}</p>
              <p className="text-xs text-amber-200 mt-0.5">{schoolFeesEntries.length} entries</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <GraduationCap size={16} className="text-white" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-medium text-amber-100">Owed by Sanjay</p>
              <p className="text-sm font-bold text-white">{fmt(schoolFeesTotal / 2)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-amber-100">Owed by Us</p>
              <p className="text-sm font-bold text-white">{fmt(schoolFeesTotal / 2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-rose-600 dark:bg-rose-700 rounded-2xl p-4 shadow-sm w-full max-w-xs"
          style={{ borderLeftWidth: 3, borderLeftColor: '#9f1239' }}>
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-100">Salary Given</p>
                {!editingSalary && flockFilter !== 'all' && (
                  <button onClick={startEditSalary} title="Edit Salary Given"
                    className="p-0.5 rounded text-rose-200 hover:text-white hover:bg-white/15 transition-colors">
                    <Pencil size={11} />
                  </button>
                )}
              </div>
              {editingSalary ? (
                <input
                  type="number"
                  autoFocus
                  value={salaryDraft}
                  onChange={e => setSalaryDraft(e.target.value)}
                  onBlur={saveSalary}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingSalary(false); }}
                  className="mt-1 w-full text-lg font-bold text-white bg-white/15 border border-white/30 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              ) : (
                <p className="mt-1 text-lg font-bold text-white">{fmt(salaryGiven)}</p>
              )}
              <p className="text-xs text-rose-200 mt-0.5">
                {flockFilter === 'all' ? 'across all batches' : savingSalary ? 'Saving…' : 'paid to Sanjay'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Banknote size={16} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No Sanjay Labor entries for this batch yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                  <th className="px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Date</th>
                  {flockFilter === 'all' && <th className="px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Batch</th>}
                  <th className="px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Item</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-500 dark:text-gray-400 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    {flockFilter === 'all' && (
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{batchNameById[row.flock_id] ?? '—'}</td>
                    )}
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {row.subcategory || row.description || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{fmt(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
