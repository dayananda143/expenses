import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pencil, Scale, ArrowLeft, TrendingDown, TrendingUp, Minus } from 'lucide-react';

const API = '/api/health';
const token = () => localStorage.getItem('expenses_token');

function todayStr() { return new Date().toISOString().slice(0, 10); }

function fmt(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dt = new Date(d + 'T00:00:00');
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

const EMPTY = { date: todayStr(), weight: '', unit: 'kg', notes: '' };

function WeightModal({ editing, defaultUnit, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    date: editing.date, weight: editing.weight, unit: editing.unit, notes: editing.notes || '',
  } : { ...EMPTY, unit: defaultUnit || 'kg' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.date || !form.weight) return;
    setSaving(true);
    const url = editing ? `${API}/weight/${editing.id}` : `${API}/weight`;
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ date: form.date, weight: parseFloat(form.weight), unit: form.unit, notes: form.notes || null }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{editing ? 'Edit Entry' : 'Log Weight'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Weight *</label>
              <input type="number" step="0.1" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="0.0"
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.weight || !form.date}
            className="flex-1 px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg font-medium">
            {saving ? 'Saving…' : editing ? 'Update' : 'Log'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HealthWeightPage() {
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({ weight_unit: 'kg' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [wr, sr] = await Promise.all([
      fetch(`${API}/weight?limit=60`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]);
    setEntries(wr.data || []);
    setSettings(sr.data || { weight_unit: 'kg' });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    await fetch(`${API}/weight/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    load();
  }

  // Chart: use last 30 entries ordered oldest→newest
  const chartData = [...entries].reverse().slice(-30);
  const minW = Math.min(...chartData.map(e => e.weight));
  const maxW = Math.max(...chartData.map(e => e.weight));
  const range = maxW - minW || 1;

  // Trend: compare latest vs 7 entries ago
  const latest = entries[0];
  const weekAgo = entries[6];
  const diff = latest && weekAgo ? (latest.weight - weekAgo.weight) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/health" className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Scale size={15} className="text-purple-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Weight</h1>
        </div>
        <button onClick={() => setModal('add')}
          className="ml-auto flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
          <Plus size={14} /> Log Weight
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Scale size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No weight entries yet</p>
          <button onClick={() => setModal('add')} className="mt-3 text-xs text-purple-500 hover:underline">+ Log your first weight</button>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{latest.weight} <span className="text-lg text-gray-400">{latest.unit}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Latest · {fmt(latest.date)}</p>
              </div>
              {diff !== null && (
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold ${
                  diff < 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                  diff > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                  'bg-gray-50 dark:bg-gray-800 text-gray-500'
                }`}>
                  {diff < 0 ? <TrendingDown size={15} /> : diff > 0 ? <TrendingUp size={15} /> : <Minus size={15} />}
                  {diff === 0 ? 'No change' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${latest.unit}`}
                </div>
              )}
            </div>

            {/* Mini chart */}
            {chartData.length >= 2 && (
              <div className="flex items-end gap-0.5 h-16 mt-2">
                {chartData.map((e, i) => {
                  const h = Math.max(((e.weight - minW) / range) * 52 + 8, 4);
                  const isLatest = i === chartData.length - 1;
                  return (
                    <div key={e.id} title={`${e.weight}${e.unit} · ${fmt(e.date)}`}
                      className={`flex-1 rounded-t-sm transition-all ${isLatest ? 'bg-purple-500' : 'bg-purple-200 dark:bg-purple-900/40'}`}
                      style={{ height: `${h}px` }} />
                  );
                })}
              </div>
            )}

            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-400">{chartData[0] ? fmt(chartData[0].date) : ''}</p>
              <p className="text-xs text-gray-400">{chartData[chartData.length-1] ? fmt(chartData[chartData.length-1].date) : ''}</p>
            </div>
          </div>

          {/* Stats row */}
          {entries.length >= 2 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Highest', value: `${Math.max(...entries.map(e => e.weight))} ${entries[0].unit}` },
                { label: 'Lowest', value: `${Math.min(...entries.map(e => e.weight))} ${entries[0].unit}` },
                { label: 'Entries', value: entries.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Entry list */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">History</p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {entries.map((e, i) => {
                const prev = entries[i + 1];
                const change = prev ? e.weight - prev.weight : null;
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{e.weight} {e.unit}</p>
                        {change !== null && (
                          <span className={`text-xs font-medium ${change < 0 ? 'text-emerald-500' : change > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmt(e.date)}{e.notes ? ` · ${e.notes}` : ''}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setModal(e)} className="p-1.5 text-gray-400 hover:text-purple-500 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteEntry(e.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {modal && (
        <WeightModal
          editing={modal === 'add' ? null : modal}
          defaultUnit={settings.weight_unit}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
