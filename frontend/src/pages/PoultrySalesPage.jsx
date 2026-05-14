import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const API = '/api/poultry/sales';
const token = () => localStorage.getItem('expenses_token');

const SALE_TYPES = ['eggs', 'birds', 'manure', 'other'];
const UNITS = { eggs: ['dozen', 'tray (30)', 'piece'], birds: ['bird'], manure: ['kg', 'bag'], other: ['unit'] };

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}
function today() { return new Date().toISOString().slice(0, 10); }
function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${last}`;
  return { from, to };
}

function SaleModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ?? { date: today(), sale_type: 'eggs', quantity: '', unit: 'dozen', price: '', total: '', buyer: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const f = (k, v) => setForm(p => {
    const next = { ...p, [k]: v };
    if ((k === 'quantity' || k === 'price') && next.quantity && next.price) {
      next.total = (parseFloat(next.quantity) * parseFloat(next.price)).toFixed(2);
    }
    if (k === 'sale_type') next.unit = UNITS[v]?.[0] ?? 'unit';
    return next;
  });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const method = initial ? 'PATCH' : 'POST';
    const url = initial ? `${API}/${initial.id}` : API;
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({
        ...form,
        quantity: Number(form.quantity),
        price: Number(form.price),
        total: Number(form.total),
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (j.data) onSave(j.data);
  }

  const unitOptions = UNITS[form.sale_type] ?? ['unit'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Sale' : 'Record Sale'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
              <select value={form.sale_type} onChange={e => f('sale_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {SALE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity *</label>
              <input type="number" min="0" step="any" value={form.quantity} onChange={e => f('quantity', e.target.value)} required placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unit</label>
              <select value={form.unit} onChange={e => f('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Price / unit (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => f('price', e.target.value)} required placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total (₹)</label>
              <input type="number" min="0" step="0.01" value={form.total} onChange={e => f('total', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Buyer</label>
            <input value={form.buyer} onChange={e => f('buyer', e.target.value)} placeholder="Optional buyer name"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <input value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Optional..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
              <Check size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PoultrySalesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    setLoading(true);
    const { from, to } = monthRange(year, month);
    const r = await fetch(`${API}?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token()}` } });
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
    if (!confirm('Delete this sale?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setEntries(p => p.filter(x => x.id !== id));
  }

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); }

  const total = entries.reduce((s, e) => s + e.total, 0);
  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-500" /> Sales
        </h1>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
          <Plus size={15} /> Record Sale
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">{monthLabel}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{fmt(total)}</p>
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ChevronRight size={18} /></button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sales for {monthLabel}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 capitalize">{e.sale_type}</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {e.quantity} {e.unit} @ {fmt(e.price)}/{e.unit}
                  </p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {e.buyer && ` · ${e.buyer}`}
                  {e.notes && ` · ${e.notes}`}
                </p>
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{fmt(e.total)}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setModal(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                <button onClick={() => del(e.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <SaleModal initial={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={onSave} />
      )}
    </div>
  );
}
