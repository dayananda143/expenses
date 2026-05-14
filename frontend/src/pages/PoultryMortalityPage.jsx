import { useState, useEffect } from 'react';
import { Skull, Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const MORTALITY_API = '/api/poultry/mortality';
const FLOCK_API = '/api/poultry/flock';
const token = () => localStorage.getItem('expenses_token');

const CAUSES = ['disease', 'injury', 'predator', 'heat stress', 'unknown', 'other'];

function today() { return new Date().toISOString().slice(0, 10); }
function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${last}`;
  return { from, to };
}

function MortalityModal({ initial, flocks, onClose, onSave }) {
  const [form, setForm] = useState(initial ?? { flock_id: '', date: today(), count: '', cause: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const method = initial ? 'PATCH' : 'POST';
    const url = initial ? `${MORTALITY_API}/${initial.id}` : MORTALITY_API;
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, flock_id: form.flock_id || null, count: Number(form.count) }),
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
          <h2 className="font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Entry' : 'Log Mortality'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Count *</label>
              <input type="number" min="1" value={form.count} onChange={e => f('count', e.target.value)} required placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Flock (optional)</label>
            <select value={form.flock_id} onChange={e => f('flock_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="">All flocks</option>
              {flocks.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cause</label>
            <select value={form.cause} onChange={e => f('cause', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="">— select cause —</option>
              {CAUSES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <input value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Optional details..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
              <Check size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PoultryMortalityPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState([]);
  const [flocks, setFlocks] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(FLOCK_API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(j => setFlocks(j.data ?? []));
  }, []);

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    setLoading(true);
    const { from, to } = monthRange(year, month);
    const r = await fetch(`${MORTALITY_API}?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token()}` } });
    const j = await r.json();
    setEntries(j.data ?? []);
    setLoading(false);
  }

  function onSave(row) {
    setEntries(p => {
      const idx = p.findIndex(x => x.id === row.id);
      return idx >= 0 ? p.map(x => x.id === row.id ? row : x) : [row, ...p];
    });
    setModal(null);
  }

  async function del(id) {
    if (!confirm('Delete this entry?')) return;
    await fetch(`${MORTALITY_API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setEntries(p => p.filter(x => x.id !== id));
  }

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); }

  const total = entries.reduce((s, e) => s + e.count, 0);
  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const byCause = entries.reduce((acc, e) => {
    const key = e.cause || 'unknown';
    acc[key] = (acc[key] ?? 0) + e.count;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Skull size={20} className="text-red-500" /> Mortality
        </h1>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
          <Plus size={15} /> Log Deaths
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">{monthLabel}</p>
          <p className="text-sm text-red-600 dark:text-red-400">{total} bird{total !== 1 ? 's' : ''} lost</p>
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ChevronRight size={18} /></button>
      </div>

      {/* Cause breakdown */}
      {Object.keys(byCause).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCause).map(([cause, count]) => (
            <span key={cause} className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-xs font-medium text-red-700 dark:text-red-300 capitalize">
              {cause} · {count}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Skull size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No mortality recorded for {monthLabel}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <Skull size={16} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{e.count} bird{e.count !== 1 ? 's' : ''}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {e.flock_name && ` · ${e.flock_name}`}
                  {e.cause && ` · ${e.cause}`}
                </p>
                {e.notes && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{e.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setModal(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                <button onClick={() => del(e.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <MortalityModal
          initial={modal === 'add' ? null : modal}
          flocks={flocks}
          onClose={() => setModal(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}
