import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, Loader2, Users, Home, Trees, Save, ArrowLeft, ChevronRight } from 'lucide-react';

const API = '/api/poultry/stake';
const ASSETS_API = '/api/poultry/farm-assets';
const BATCH_SUMMARY_API = '/api/poultry/expenses/batch-summary';
const token = () => localStorage.getItem('expenses_token');

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StakeModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ?? { name: '', percentage: '', invested: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const method = initial ? 'PATCH' : 'POST';
    const url = initial ? `${API}/${initial.id}` : API;
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, percentage: Number(form.percentage), invested: Number(form.invested) }),
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
          <h2 className="font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Stakeholder' : 'Add Stakeholder'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
            <input value={form.name} onChange={e => f('name', e.target.value)} required placeholder="e.g. Ravi"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stake % *</label>
              <input type="number" min="0" max="100" step="0.01" value={form.percentage} onChange={e => f('percentage', e.target.value)} required placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Invested (₹)</label>
              <input type="number" min="0" step="1" value={form.invested} onChange={e => f('invested', e.target.value)} placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <input value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} placeholder="Optional…"
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

function DonutChart({ stakes }) {
  const total = stakes.reduce((s, x) => s + x.percentage, 0);
  const size = 160;
  const cx = size / 2, cy = size / 2, r = 60, stroke = 24;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = stakes.map((s, i) => {
    const pct = total > 0 ? s.percentage / total : 0;
    const dash = pct * circumference;
    const slice = { dash, gap: circumference - dash, offset, color: COLORS[i % COLORS.length] };
    offset += dash;
    return slice;
  });

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {stakes.length === 0
        ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        : slices.map((sl, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={sl.color} strokeWidth={stroke}
            strokeDasharray={`${sl.dash} ${sl.gap}`}
            strokeDashoffset={-sl.offset} />
        ))}
    </svg>
  );
}

export default function PoultryStakePage() {
  const [stakes, setStakes] = useState([]);
  const [assets, setAssets] = useState({ land_value: 0, shed_value: 0, notes: '' });
  const [batchSummary, setBatchSummary] = useState([]);
  const [assetForm, setAssetForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAssets, setSavingAssets] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedStake, setSelectedStake] = useState(null); // detail view

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [sr, ar, br] = await Promise.all([
      fetch(API, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(ASSETS_API, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(BATCH_SUMMARY_API, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]);
    setStakes(sr.data ?? []);
    setAssets(ar.data ?? { land_value: 0, shed_value: 0, notes: '' });
    setBatchSummary(br.data ?? []);
    setLoading(false);
  }

  async function saveAssets(e) {
    e.preventDefault();
    setSavingAssets(true);
    const r = await fetch(ASSETS_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...assetForm, land_value: Number(assetForm.land_value) || 0, shed_value: Number(assetForm.shed_value) || 0, acres: Number(assetForm.acres) || 0 }),
    });
    const j = await r.json();
    setSavingAssets(false);
    if (j.data) { setAssets(j.data); setAssetForm(null); }
  }

  function onSave(row) {
    setStakes(p => {
      const idx = p.findIndex(x => x.id === row.id);
      return idx >= 0 ? p.map(x => x.id === row.id ? row : x) : [...p, row];
    });
    setModal(null);
  }

  async function del(id) {
    if (!confirm('Remove this stakeholder?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setStakes(p => p.filter(x => x.id !== id));
  }

  const totalPct = stakes.reduce((s, x) => s + x.percentage, 0);
  const totalInvested = stakes.reduce((s, x) => s + x.invested, 0);
  const farmTotal = (assets.land_value ?? 0) + (assets.shed_value ?? 0);

  if (loading) return (
    <div className="py-20 flex justify-center"><Loader2 size={24} className="text-amber-500 animate-spin" /></div>
  );

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selectedStake) {
    const stakeIdx = stakes.findIndex(s => s.id === selectedStake.id);
    const color = COLORS[stakeIdx % COLORS.length];
    const pct = selectedStake.percentage / 100;
    const totalExpenses = batchSummary.reduce((s, b) => s + b.total, 0);
    const totalRevenue = batchSummary.reduce((s, b) => s + b.revenue, 0);
    const totalProfit = totalRevenue - totalExpenses;
    return (
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedStake(null)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
              {selectedStake.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{selectedStake.percentage}% stake · Batch profit breakdown</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/40" style={{ borderLeftWidth: 3, borderLeftColor: '#059669' }}>
            <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Net Pay Share</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">{fmt(totalRevenue * pct)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800/40" style={{ borderLeftWidth: 3, borderLeftColor: '#ef4444' }}>
            <p className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">Expense Share</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">{fmt(totalExpenses * pct)}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ borderLeftWidth: 3, borderLeftColor: color, background: color + '11', borderColor: color + '44' }}>
            <p className="text-xs font-semibold uppercase" style={{ color }}>Profit Share</p>
            <p className="text-lg font-bold mt-1" style={{ color }}>{fmt(totalProfit * pct)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700" style={{ borderLeftWidth: 3, borderLeftColor: '#6b7280' }}>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Stake</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{selectedStake.percentage}%</p>
          </div>
        </div>

        {/* Batch table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Pay</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color }}>{selectedStake.percentage}% Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {batchSummary.map(b => {
                  const profit = b.revenue - b.total;
                  const share = profit * pct;
                  return (
                    <tr key={b.flock_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.name}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{fmt(b.revenue)}</td>
                      <td className="px-4 py-3 text-right text-red-500 font-medium">{fmt(b.total)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(profit)}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: share >= 0 ? color : '#ef4444' }}>{fmt(share)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-semibold">
                  <td className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Total</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{fmt(totalRevenue)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{fmt(totalExpenses)}</td>
                  <td className={`px-4 py-3 text-right ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(totalProfit)}</td>
                  <td className="px-4 py-3 text-right text-base font-bold" style={{ color }}>{fmt(totalProfit * pct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-amber-500" /> Stake Holdings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {stakes.length} stakeholder{stakes.length !== 1 ? 's' : ''} · {totalPct.toFixed(1)}% allocated
          </p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
          <Plus size={15} /> Add Stakeholder
        </button>
      </div>

      {/* Farm Assets card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-900 dark:text-white">Farm Asset Values</p>
          {assetForm === null
            ? <button onClick={() => setAssetForm({ land_value: String(assets.land_value ?? ''), shed_value: String(assets.shed_value ?? ''), acres: String(assets.acres ?? ''), notes: assets.notes ?? '' })}
                className="text-xs text-amber-600 hover:underline flex items-center gap-1"><Pencil size={12} /> Edit</button>
            : null}
        </div>

        {assetForm !== null ? (
          <form onSubmit={saveAssets} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Trees size={12} /> Land Value (₹)
                </label>
                <div className="flex gap-2">
                  <input type="number" min="0" step="1" value={assetForm.land_value}
                    onChange={e => setAssetForm(p => ({ ...p, land_value: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 bg-white dark:bg-gray-800">
                    <input type="number" min="0" step="0.01" value={assetForm.acres} placeholder="0"
                      onChange={e => setAssetForm(p => ({ ...p, acres: e.target.value }))}
                      className="w-14 py-2 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none text-center" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">acre</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Home size={12} /> Shed Value (₹)
                </label>
                <input type="number" min="0" step="1" value={assetForm.shed_value}
                  onChange={e => setAssetForm(p => ({ ...p, shed_value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setAssetForm(null)}
                className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={savingAssets}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50">
                <Save size={13} /> {savingAssets ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide flex items-center justify-center gap-1"><Trees size={12} /> Land</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">{fmt(assets.land_value ?? 0)}</p>
              {(assets.acres > 0) && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300 text-xs font-medium">
                  {assets.acres} acre
                </span>
              )}
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide flex items-center justify-center gap-1"><Home size={12} /> Shed</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{fmt(assets.shed_value ?? 0)}</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide">Total Farm</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{fmt(farmTotal)}</p>
            </div>
          </div>
        )}
      </div>

      {stakes.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Users size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No stakeholders yet</p>
          <button onClick={() => setModal('add')} className="mt-3 text-sm text-amber-500 hover:underline">Add the first one</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut + legend */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center gap-4">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ownership Split</p>
            <div className="relative">
              <DonutChart stakes={stakes} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalPct.toFixed(0)}%</p>
                <p className="text-xs text-gray-400">allocated</p>
              </div>
            </div>
            <div className="w-full space-y-2">
              {stakes.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{s.name}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.percentage}%</span>
                </div>
              ))}
            </div>
            {totalInvested > 0 && (
              <div className="w-full pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Invested</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totalInvested)}</p>
              </div>
            )}
          </div>

          {/* Stakeholder cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
            {stakes.map((s, i) => {
              const color = COLORS[i % COLORS.length];
              const pct = s.percentage / 100;
              const landShare = (assets.land_value ?? 0) * pct;
              const shedShare = (assets.shed_value ?? 0) * pct;
              const totalShare = farmTotal * pct;
              return (
                <div key={s.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md transition-shadow"
                  style={{ borderLeftWidth: 4, borderLeftColor: color }}
                  onClick={() => setSelectedStake(s)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-base flex items-center gap-1">{s.name} <ChevronRight size={14} className="text-gray-400" /></p>
                      {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setModal(s)} className="p-1.5 text-gray-400 hover:text-amber-500 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => del(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Stake % + bar */}
                  <div className="mt-3">
                    <p className="text-3xl font-bold" style={{ color }}>{s.percentage}%</p>
                    <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(s.percentage, 100)}%`, background: color }} />
                    </div>
                  </div>

                  {/* Asset breakdown */}
                  {farmTotal > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 flex items-center justify-center gap-0.5"><Trees size={10} /> Land</p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-0.5">{fmt(landShare)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 flex items-center justify-center gap-0.5"><Home size={10} /> Shed</p>
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{fmt(shedShare)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{fmt(totalShare)}</p>
                      </div>
                    </div>
                  )}

                  {/* Invested */}
                  {s.invested > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <p className="text-xs text-gray-400">Cash Invested</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(s.invested)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal && (
        <StakeModal initial={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={onSave} />
      )}
    </div>
  );
}
