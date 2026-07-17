import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bird, Plus, Pencil, Trash2, X, Check, CalendarDays, AlertCircle, FileText, Upload, ShoppingCart } from 'lucide-react';
import PoultryBillModal from './PoultryBillModal';

const API = '/api/poultry/flock';
const token = () => localStorage.getItem('expenses_token');

const BIRD_TYPES = ['chicken', 'duck', 'turkey', 'quail', 'geese', 'other'];
const CYCLE_DAYS = 60;

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime();
  return Math.floor(diff / 86400000);
}

function BatchModal({ initial, initialDeaths, onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = addDays(today, CYCLE_DAYS);
  const [form, setForm] = useState(
    initial
      ? { name: initial.name, bird_type: initial.bird_type, count: initial.count, date_added: initial.date_added, end_date: initial.end_date ?? '', notes: initial.notes ?? '', deaths: initialDeaths ? String(initialDeaths) : '' }
      : { name: '', bird_type: 'chicken', count: '', date_added: today, end_date: defaultEnd, notes: '', deaths: '' }
  );
  const [saving, setSaving] = useState(false);

  function onStartChange(val) {
    setForm(p => ({ ...p, date_added: val, end_date: addDays(val, CYCLE_DAYS) }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const method = initial ? 'PATCH' : 'POST';
    const url = initial ? `${API}/${initial.id}` : API;
    const { deaths, ...batchForm } = form;
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...batchForm, count: Number(batchForm.count), end_date: batchForm.end_date || null }),
    });
    const j = await r.json();

    // Optional deaths field: reconcile against existing mortality total with a single
    // adjustment record, rather than rewriting the individual dated mortality log.
    const newDeaths = deaths === '' ? 0 : Number(deaths);
    const delta = newDeaths - (initialDeaths ?? 0);
    if (j.data && delta !== 0) {
      await fetch('/api/poultry/mortality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ flock_id: j.data.id, date: today, count: delta, cause: 'Batch edit adjustment' }),
      });
    }

    setSaving(false);
    if (j.data) onSave(j.data);
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Batch' : 'New Batch'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Batch Name *</label>
            <input value={form.name} onChange={e => f('name', e.target.value)} required
              placeholder="e.g. Batch 3 – May 2025"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bird Type</label>
              <select value={form.bird_type} onChange={e => f('bird_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {BIRD_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Birds Placed *</label>
              <input type="number" min="1" value={form.count} onChange={e => f('count', e.target.value)} required placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Placement Date</label>
            <input type="date" value={form.date_added} onChange={e => onStartChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Expected Completion Date</label>
              {form.date_added && form.end_date && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {Math.round((new Date(form.end_date + 'T00:00:00') - new Date(form.date_added + 'T00:00:00')) / 86400000)} days cycle
                </span>
              )}
            </div>
            <input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Auto-set to 60 days from placement — adjust as needed</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deaths (optional)</label>
            <input type="number" min="0" value={form.deaths} onChange={e => f('deaths', e.target.value)} placeholder="0"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} placeholder="Breed, supplier, etc."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
              <Check size={14} /> {saving ? 'Saving…' : 'Save Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BatchCard({ batch, deaths, bill, onEdit, onDelete, onMarkSold, onUploadBill, onViewExpenses }) {
  const elapsed = daysSince(batch.date_added);
  const endDate = batch.end_date ?? addDays(batch.date_added, CYCLE_DAYS);
  const totalDays = Math.max(1, daysSince(batch.date_added) + Math.max(0, new Date(endDate + 'T00:00:00') - Date.now()) / 86400000);
  const daysLeft = Math.ceil((new Date(endDate + 'T00:00:00') - Date.now()) / 86400000);
  const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const effectiveDeaths = (bill?.mortality != null) ? bill.mortality : (deaths ?? 0);
  const liveBirds = Math.max(0, batch.count - effectiveDeaths);
  const mortalityPct = batch.count > 0 ? (effectiveDeaths / batch.count * 100).toFixed(1) : '0.0';
  const isOverdue = daysLeft < 0 && batch.status === 'active';
  const isSold = batch.status === 'sold';

  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 space-y-4 ${isSold ? 'border-gray-100 dark:border-gray-800 opacity-70' : 'border-amber-100 dark:border-amber-900/30'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSold ? 'bg-gray-100 dark:bg-gray-800' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <Bird size={20} className={isSold ? 'text-gray-400' : 'text-amber-500'} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{batch.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{batch.bird_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isSold
            ? <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">Sold</span>
            : isOverdue
              ? <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1"><AlertCircle size={10} /> Overdue</span>
              : <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300">Active</span>
          }
          <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{batch.count}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">placed</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{effectiveDeaths}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">deaths ({mortalityPct}%)</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{liveBirds}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">live birds</p>
        </div>
      </div>

      {/* Progress bar */}
      {!isSold && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><CalendarDays size={11} /> Day {elapsed}</span>
            <span>{isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${isOverdue ? 'bg-orange-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{new Date(batch.date_added + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span>{new Date(endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      )}
      {isSold && batch.end_date && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Sold on {new Date(batch.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      {/* Bill + actions row */}
      <div className="flex items-center gap-2">
        {!isSold && (
          <button onClick={() => onMarkSold(batch)}
            className="flex-1 py-2 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            Mark batch as sold
          </button>
        )}
        <button onClick={() => onUploadBill(batch)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
            bill
              ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}>
          {bill ? <FileText size={14} /> : <Upload size={14} />}
          {bill ? 'View Bill' : 'Upload Bill'}
        </button>
        <button onClick={() => onViewExpenses(batch)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20">
          <ShoppingCart size={14} /> View Expenses
        </button>
      </div>

      {/* Bill summary strip */}
      {bill && (
        <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white">{bill.fcr ?? '—'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">FCR</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white">{bill.eef ?? '—'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">EEF</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {bill.net_pay ? `₹${new Intl.NumberFormat('en-IN').format(bill.net_pay)}` : '—'}
              </p>
              <button onClick={() => onUploadBill(batch)} title="Edit Net Pay"
                className="p-0.5 rounded text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                <Pencil size={10} />
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Net Pay</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoultryFlockPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [deaths, setDeaths] = useState({});
  const [bills, setBills] = useState({});
  const [modal, setModal] = useState(null);
  const [billModal, setBillModal] = useState(null); // { flockId, existingBill }
  const [loading, setLoading] = useState(true);

  function viewExpenses(batch) {
    localStorage.setItem('poultry_flock_filter', String(batch.id));
    navigate('/poultry/expenses');
  }

  useEffect(() => { load(); }, []);

  async function load() {
    const [fr, mr, br] = await Promise.all([
      fetch(API, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch('/api/poultry/mortality', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch('/api/poultry/bills', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]);
    setBatches(fr.data ?? []);
    const d = {};
    for (const m of (mr.data ?? [])) {
      if (m.flock_id) d[m.flock_id] = (d[m.flock_id] ?? 0) + m.count;
    }
    setDeaths(d);
    // Latest bill per flock
    const b = {};
    for (const bill of (br.data ?? [])) {
      if (!b[bill.flock_id]) b[bill.flock_id] = bill;
    }
    setBills(b);
    setLoading(false);
  }

  function onSave(row) {
    setBatches(p => {
      const idx = p.findIndex(x => x.id === row.id);
      return idx >= 0 ? p.map(x => x.id === row.id ? row : x) : [row, ...p];
    });
    setModal(null);
    load(); // refresh mortality totals in case the batch modal recorded a deaths adjustment
  }

  function onBillSaved(bill) {
    if (bill === null) {
      // deleted
      setBills(p => { const n = { ...p }; delete n[billModal.flockId]; return n; });
    } else {
      setBills(p => ({ ...p, [bill.flock_id]: bill }));
    }
    setBillModal(null);
  }

  async function markSold(batch) {
    const today = new Date().toISOString().slice(0, 10);
    const r = await fetch(`${API}/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: 'sold', end_date: batch.end_date ?? today }),
    });
    const j = await r.json();
    if (j.data) setBatches(p => p.map(x => x.id === j.data.id ? j.data : x));
  }

  async function del(id) {
    if (!confirm('Delete this batch? This will also remove linked mortality records.')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setBatches(p => p.filter(x => x.id !== id));
  }

  const active = batches.filter(b => b.status === 'active');
  const sold = batches.filter(b => b.status !== 'active');

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bird size={20} className="text-amber-500" /> Batches
          </h1>
          {!loading && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{active.length} active batch{active.length !== 1 ? 'es' : ''}</p>}
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">
          <Plus size={15} /> New Batch
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Bird size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No batches yet. Start your first batch!</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {active.map(b => (
                <BatchCard key={b.id} batch={b} deaths={deaths[b.id]} bill={bills[b.id]}
                  onEdit={() => setModal(b)} onDelete={() => del(b.id)} onMarkSold={markSold}
                  onUploadBill={batch => setBillModal({ flockId: batch.id, existingBill: bills[batch.id] ?? null })}
                  onViewExpenses={viewExpenses} />
              ))}
            </div>
          )}

          {sold.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sold.map(b => (
                  <BatchCard key={b.id} batch={b} deaths={deaths[b.id]} bill={bills[b.id]}
                    onEdit={() => setModal(b)} onDelete={() => del(b.id)} onMarkSold={markSold}
                    onUploadBill={batch => setBillModal({ flockId: batch.id, existingBill: bills[batch.id] ?? null })}
                    onViewExpenses={viewExpenses} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <BatchModal
          initial={modal === 'add' ? null : modal}
          initialDeaths={modal === 'add' ? 0 : (deaths[modal.id] ?? 0)}
          onClose={() => setModal(null)}
          onSave={onSave}
        />
      )}

      {billModal && (
        <PoultryBillModal
          flockId={billModal.flockId}
          existingBill={billModal.existingBill}
          onClose={() => setBillModal(null)}
          onSaved={onBillSaved}
        />
      )}
    </div>
  );
}
