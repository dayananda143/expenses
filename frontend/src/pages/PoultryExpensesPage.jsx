import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Pencil, Trash2, X, Check,
  Upload, FileSpreadsheet, Loader2, Search, ChevronUp, ChevronDown, ChevronsUpDown, Tag,
  ChevronLeft, ChevronRight } from 'lucide-react';

const API = '/api/poultry/expenses';
const PAGE_SIZES = [5, 10, 15, 25];
const token = () => localStorage.getItem('expenses_token');

const CATEGORIES = ['shed', 'feed', 'medication', 'equipment', 'utilities', 'labor', 'sanjay_labor', 'chicks', 'other'];
const INCOME_CATEGORIES = ['pottu_sold', 'feed_bags_sold'];
const CAT_COLORS = {
  shed: '#f97316', shed_labor: '#6366f1', sanjay_labor: '#8b5cf6', medicine: '#ef4444',
  feed: '#f59e0b', medication: '#ef4444', equipment: '#3b82f6',
  utilities: '#a855f7', labor: '#6366f1', chicks: '#eab308', other: '#6b7280',
  pottu_sold: '#10b981', feed_bags_sold: '#06b6d4',
};
const CAT_LABELS = {
  shed: 'Shed', shed_labor: 'Shed Labor', sanjay_labor: 'Sanjay Labor', medicine: 'Medicine',
  feed: 'Feed', medication: 'Medication', equipment: 'Equipment',
  utilities: 'Utilities', labor: 'Labor', chicks: 'Chicks', other: 'Other',
  pottu_sold: 'Pottu Sold', feed_bags_sold: 'Feed Bags Sold',
};

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function today() { return new Date().toISOString().slice(0, 10); }

function SortIcon({ field, sort, order }) {
  if (sort !== field) return <ChevronsUpDown size={12} className="text-gray-300 dark:text-gray-600" />;
  return order === 'asc'
    ? <ChevronUp size={12} className="text-amber-500" />
    : <ChevronDown size={12} className="text-amber-500" />;
}

function ExpenseModal({ initial, onClose, onSave, flockId }) {
  const [form, setForm] = useState(initial ?? { date: today(), category: 'feed', description: '', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const method = initial ? 'PATCH' : 'POST';
    const url = initial ? `${API}/${initial.id}` : API;
    const body = { ...form, amount: Number(form.amount) };
    if (!initial && flockId) body.flock_id = Number(flockId);
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setSaving(false);
    if (j.data) onSave(j.data);
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select value={form.category} onChange={e => {
                const category = e.target.value;
                const DEFAULT_DESC = { pottu_sold: 'Pottu Sold', feed_bags_sold: 'Feed Bags Sold' };
                setForm(p => ({
                  ...p,
                  category,
                  description: !p.description && DEFAULT_DESC[category] ? DEFAULT_DESC[category] : p.description,
                }));
              }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                <optgroup label="Expenses">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c] ?? c}</option>)}
                </optgroup>
                <optgroup label="Income (adds to net pay)">
                  {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c] ?? c}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description *</label>
            <input value={form.description} onChange={e => f('description', e.target.value)} required
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount (₹) *</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => f('amount', e.target.value)} required placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <input value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} placeholder="Optional..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
              <Check size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImported }) {
  const [batches, setBatches] = useState([]);
  const [flockId, setFlockId] = useState('');
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    fetch('/api/poultry/flock', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(j => {
        const list = j.data ?? [];
        setBatches(list);
        if (list.length) setFlockId(String(list[0].id));
      });
  }, []);

  async function doImport() {
    if (!file) return;
    setImporting(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    if (flockId) fd.append('flock_id', flockId);
    try {
      const r = await fetch(`${API}/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Import failed');
      setResult(j.data.imported);
      onImported();
    } catch (e) { setError(e.message); }
    setImporting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-amber-500" /> Import Excel
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {result != null ? (
            <div className="text-center py-4">
              <Check size={36} className="text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white">{result} expenses imported</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium">Done</button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Batch</label>
                <select value={flockId} onChange={e => setFlockId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">No batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Excel / CSV File</label>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <FileSpreadsheet size={18} className="text-green-500 shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</p>
                    <button onClick={() => fileRef.current?.click()} className="text-xs text-amber-600 hover:underline shrink-0">Change</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-amber-400 transition-colors">
                    <Upload size={24} className="text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click to select file</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">.xlsx · .xls · .csv</p>
                  </button>
                )}
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button onClick={doImport} disabled={!file || importing}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {importing ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={14} /> Import</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PoultryExpensesPage() {
  const [entries, setEntries] = useState([]);
  const [modal, setModal] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [flockFilter, setFlockFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [paidByFilter, setPaidByFilter] = useState('');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [showCatChange, setShowCatChange] = useState(false);
  const [bulkCat, setBulkCat] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [netPay, setNetPay] = useState(0);
  const [netPayBillId, setNetPayBillId] = useState(null);
  const [editingNetPay, setEditingNetPay] = useState(false);
  const [netPayDraft, setNetPayDraft] = useState('');
  const [savingNetPay, setSavingNetPay] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetch('/api/poultry/flock', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(j => {
        const list = j.data ?? [];
        setBatches(list);
        if (!list.length) return;
        const saved = localStorage.getItem('poultry_flock_filter');
        const valid = saved && list.some(b => String(b.id) === saved);
        setFlockFilter(valid ? saved : String(list[0].id));
      });
  }, []);

  useEffect(() => { load(); }, [flockFilter]);

  async function load() {
    setLoading(true);
    let url = API + '?';
    if (flockFilter) url += `flock_id=${flockFilter}&`;
    const [expR, billR] = await Promise.all([
      fetch(url, { headers: { Authorization: `Bearer ${token()}` } }),
      flockFilter
        ? fetch(`/api/poultry/bills?flock_id=${flockFilter}`, { headers: { Authorization: `Bearer ${token()}` } })
        : Promise.resolve(null),
    ]);
    const expJ = await expR.json();
    setEntries(expJ.data ?? []);
    if (billR) {
      const billJ = await billR.json();
      const bills = billJ.data ?? [];
      setNetPay(bills.reduce((s, b) => s + (b.net_pay ?? 0), 0));
      setNetPayBillId(bills[0]?.id ?? null);
    } else {
      setNetPay(0);
      setNetPayBillId(null);
    }
    setLoading(false);
  }

  function startEditNetPay() {
    setNetPayDraft(String(netPay || ''));
    setEditingNetPay(true);
  }

  async function saveNetPay() {
    const amount = parseFloat(netPayDraft);
    setEditingNetPay(false);
    if (isNaN(amount) || amount === netPay) return;
    setSavingNetPay(true);
    try {
      if (netPayBillId) {
        await fetch(`/api/poultry/bills/${netPayBillId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ net_pay: amount }),
        });
      } else if (flockFilter) {
        const r = await fetch('/api/poultry/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ flock_id: flockFilter, net_pay: amount }),
        });
        const j = await r.json();
        setNetPayBillId(j.data?.id ?? null);
      }
      setNetPay(amount);
    } finally {
      setSavingNetPay(false);
    }
  }

  function onSave(row) {
    setEntries(p => {
      const idx = p.findIndex(x => x.id === row.id);
      return idx >= 0 ? p.map(x => x.id === row.id ? row : x) : [row, ...p];
    });
    setModal(null);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`${API}/${deleteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setEntries(p => p.filter(x => x.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
  }

  async function bulkChangeCategory() {
    if (!bulkCat || selected.size === 0) return;
    setBulkSaving(true);
    await Promise.all([...selected].map(id =>
      fetch(`${API}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ category: bulkCat }),
      })
    ));
    setEntries(p => p.map(e => selected.has(e.id) ? { ...e, category: bulkCat } : e));
    setSelected(new Set());
    setShowCatChange(false);
    setBulkCat('');
    setBulkSaving(false);
  }

  function handleSort(field) {
    if (sort === field) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setOrder('desc'); }
    setPage(1);
  }

  // Client-side search + sort
  const filtered = entries
    .filter(e => {
      if (catFilter && e.category !== catFilter) return false;
      if (paidByFilter && (e.paid_by ?? '') !== paidByFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (e.subcategory ?? '').toLowerCase().includes(q)
        || (e.description ?? '').toLowerCase().includes(q)
        || (e.notes ?? '').toLowerCase().includes(q)
        || (e.paid_by ?? '').toLowerCase().includes(q)
        || (e.category ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let va = a[sort], vb = b[sort];
      if (sort === 'amount') { va = Number(va); vb = Number(vb); }
      if (va < vb) return order === 'asc' ? -1 : 1;
      if (va > vb) return order === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const isIncome = e => INCOME_CATEGORIES.includes(e.category);
  const expenseEntries = filtered.filter(e => !isIncome(e));
  const incomeEntries = filtered.filter(e => isIncome(e));
  const total = expenseEntries.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);

  // Category summary (expenses only)
  const byCategory = expenseEntries.reduce((acc, e) => {
    if (e.category) acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  // Income summary — always from full entries, not filtered, so cards never disappear when filters are active
  const byIncome = entries.filter(e => INCOME_CATEGORIES.includes(e.category)).reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const totalNetPay = netPay + INCOME_CATEGORIES.reduce((s, cat) => s + (byIncome[cat] ?? 0), 0);
  const totalExpensesAll = entries.filter(e => !INCOME_CATEGORIES.includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const profitLoss = totalNetPay - totalExpensesAll;

  // Paid-by summary
  const byPaidBy = filtered.reduce((acc, e) => {
    if (e.paid_by) acc[e.paid_by] = (acc[e.paid_by] ?? 0) + e.amount;
    return acc;
  }, {});

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 dark:hover:text-white';

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart size={20} className="text-amber-500" /> Expenses
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} entries · Expenses {fmt(total)}{totalIncome > 0 && <> · <span className="text-emerald-600 dark:text-emerald-400">Income {fmt(totalIncome)}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Show</span>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-medium">
              {PAGE_SIZES.map(n => (
                <button key={n} onClick={() => { setPageSize(n); setPage(1); }}
                  className={`px-2.5 py-1 transition-colors ${pageSize === n ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {selected.size > 0 && (
            <button onClick={() => { setShowCatChange(true); setBulkCat(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
              <Tag size={15} /> Change Category ({selected.size})
            </button>
          )}
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <FileSpreadsheet size={15} /> Import
          </button>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Net pay + income cards — always visible, above filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Profit / Loss */}
        <div className={`rounded-xl p-4 shadow-sm col-span-1 ${profitLoss >= 0 ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-red-600 dark:bg-red-700'}`}
          style={{ borderLeftWidth: 3, borderLeftColor: profitLoss >= 0 ? '#065f46' : '#7f1d1d' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            {profitLoss >= 0 ? 'Profit' : 'Loss'}
          </p>
          <p className="mt-1 text-lg font-bold text-white">{fmt(Math.abs(profitLoss))}</p>
          <p className="text-xs text-white/70 mt-0.5">net pay − expenses</p>
        </div>
        {/* Total Expenses */}
        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-300 dark:border-red-700 p-4"
          style={{ borderLeftWidth: 3, borderLeftColor: '#dc2626' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Total Expenses</p>
          <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{fmt(totalExpensesAll)}</p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">all expense entries</p>
        </div>
        {/* Total Net Pay — sum of all three */}
        <div className="bg-emerald-600 dark:bg-emerald-700 rounded-xl p-4 shadow-sm"
          style={{ borderLeftWidth: 3, borderLeftColor: '#065f46' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Total Net Pay</p>
          <p className="mt-1 text-lg font-bold text-white">
            {fmt(totalNetPay)}
          </p>
          <p className="text-xs text-emerald-200 mt-0.5">bills + pottu + feed bags</p>
        </div>
        {/* Net Pay from bills */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-300 dark:border-emerald-700 p-4"
          style={{ borderLeftWidth: 3, borderLeftColor: '#059669' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Net Pay (Company)</p>
            {!editingNetPay && (
              <button onClick={startEditNetPay} title="Edit Net Pay"
                className="p-0.5 rounded text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                <Pencil size={11} />
              </button>
            )}
          </div>
          {editingNetPay ? (
            <input
              type="number"
              autoFocus
              value={netPayDraft}
              onChange={e => setNetPayDraft(e.target.value)}
              onBlur={saveNetPay}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingNetPay(false); }}
              className="mt-1 w-full text-lg font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-900 border border-emerald-400 dark:border-emerald-600 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          ) : (
            <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmt(netPay)}</p>
          )}
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">{savingNetPay ? 'Saving…' : 'from RC bills'}</p>
        </div>
        {/* Pottu Sold, Feed Bags Sold — always show */}
        {INCOME_CATEGORIES.map(cat => {
          const sum = byIncome[cat] ?? 0;
          const color = CAT_COLORS[cat] ?? '#10b981';
          return (
            <button key={cat}
              onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
              className="text-left bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/40 p-4 hover:shadow-md transition-shadow"
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color }}>
                ↑ {CAT_LABELS[cat] ?? cat}
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmt(sum)}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">adds to net pay</p>
            </button>
          );
        })}
      </div>


      {/* Category summary cards */}
      {Object.keys(byCategory).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, sum]) => {
              const color = CAT_COLORS[cat] ?? '#6b7280';
              return (
                <button
                  key={cat}
                  onClick={() => { setCatFilter(catFilter === cat ? '' : cat); setPage(1); }}
                  className="text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                  style={{ borderLeftWidth: 3, borderLeftColor: color }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{CAT_LABELS[cat] ?? cat}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{fmt(sum)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {((sum / total) * 100).toFixed(1)}%
                  </p>
                </button>
              );
            })}
        </div>
      )}

      {/* Paid-by summary cards */}
      {Object.keys(byPaidBy).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(byPaidBy)
            .sort((a, b) => b[1] - a[1])
            .map(([name, sum]) => (
              <button
                key={name}
                onClick={() => { setPaidByFilter(paidByFilter === name ? '' : name); setPage(1); }}
                className={`text-left bg-white dark:bg-gray-900 rounded-xl border p-4 hover:shadow-md transition-shadow ${paidByFilter === name ? 'border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}
                style={{ borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">{name}</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{fmt(sum)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {((sum / total) * 100).toFixed(1)}% of total
                </p>
              </button>
            ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          {batches.length > 0 && (
            <select value={flockFilter} onChange={e => { setFlockFilter(e.target.value); localStorage.setItem('poultry_flock_filter', e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">All Categories</option>
            <optgroup label="Expenses">
              {[...new Set(entries.map(e => e.category).filter(c => c && !INCOME_CATEGORIES.includes(c)))].sort().map(c => (
                <option key={c} value={c}>{CAT_LABELS[c] ?? c}</option>
              ))}
            </optgroup>
            <optgroup label="Income">
              {INCOME_CATEGORIES.map(c => (
                <option key={c} value={c}>{CAT_LABELS[c] ?? c}</option>
              ))}
            </optgroup>
          </select>
          {[...new Set(entries.map(e => e.paid_by).filter(Boolean))].length > 0 && (
            <select value={paidByFilter} onChange={e => { setPaidByFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">All Paid by</option>
              {[...new Set(entries.map(e => e.paid_by).filter(Boolean))].sort().map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="text-amber-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart size={36} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No expenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox"
                      checked={filtered.length > 0 && filtered.every(e => selected.has(e.id))}
                      onChange={ev => {
                        if (ev.target.checked) setSelected(new Set(filtered.map(e => e.id)));
                        else setSelected(new Set());
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  </th>
                  <th className={thCls} onClick={() => handleSort('date')}>
                    <span className="flex items-center gap-1">Date <SortIcon field="date" sort={sort} order={order} /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item / Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid by</th>
                  <th className={thCls} onClick={() => handleSort('amount')}>
                    <span className="flex items-center gap-1 justify-end">Amount <SortIcon field="amount" sort={sort} order={order} /></span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => (
                  <tr key={e.id} className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selected.has(e.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                    <td className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selected.has(e.id)}
                        onChange={ev => {
                          setSelected(p => {
                            const s = new Set(p);
                            ev.target.checked ? s.add(e.id) : s.delete(e.id);
                            return s;
                          });
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: (CAT_COLORS[e.category] ?? '#6b7280') + '22', color: CAT_COLORS[e.category] ?? '#6b7280' }}>
                        {CAT_LABELS[e.category] ?? e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{e.subcategory || e.description || '—'}</p>
                      {(e.subcategory ? e.description : e.notes) && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-xs">
                          {e.subcategory ? e.description : e.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {e.paid_by || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {fmt(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModal(e)} className="p-1.5 text-gray-400 hover:text-amber-500 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteId(e.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-center px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                {(() => {
                  const cur = safePage;
                  const total = totalPages;
                  const range = [];
                  for (let i = 1; i <= total; i++) {
                    if (i === 1 || i === total || (i >= cur - 1 && i <= cur + 1)) range.push(i);
                  }
                  const withEllipsis = [];
                  let prev = null;
                  for (const p of range) {
                    if (prev !== null && p - prev > 1) withEllipsis.push('...' + p);
                    withEllipsis.push(p);
                    prev = p;
                  }
                  return (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={cur <= 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft size={14} />
                      </button>
                      {withEllipsis.map((p, i) =>
                        typeof p === 'string'
                          ? <span key={p + i} className="text-xs text-gray-300 dark:text-gray-600 px-1">…</span>
                          : <button key={p} onClick={() => setPage(p)}
                              className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${p === cur ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                              {p}
                            </button>
                      )}
                      <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={cur >= total}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <ExpenseModal initial={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={onSave} flockId={flockFilter} />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xs shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Delete expense?</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={load} />
      )}
      {showCatChange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag size={16} className="text-indigo-500" /> Change Category
              </h2>
              <button onClick={() => setShowCatChange(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{selected.size} expense{selected.size !== 1 ? 's' : ''} selected</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New Category</label>
                <select value={bulkCat} onChange={e => setBulkCat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c] ?? c}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowCatChange(false)}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button onClick={bulkChangeCategory} disabled={!bulkCat || bulkSaving}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                  {bulkSaving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Apply</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
