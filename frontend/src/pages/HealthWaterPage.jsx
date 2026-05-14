import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, Droplets, ArrowLeft } from 'lucide-react';

const API = '/api/health';
const token = () => localStorage.getItem('expenses_token');

const QUICK_ML = [150, 250, 330, 500, 750, 1000];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function prevDay(d) { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); }
function nextDay(d) { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + 1); return dt.toISOString().slice(0, 10); }
function fmt(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dt = new Date(d + 'T00:00:00');
  return `${days[dt.getDay()]}, ${months[dt.getMonth()]} ${dt.getDate()}`;
}

function fmtTime(created_at) {
  const dt = new Date(created_at.endsWith('Z') ? created_at : created_at + 'Z');
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function HealthWaterPage() {
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({ water_goal_ml: 2000 });
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [wr, sr] = await Promise.all([
      fetch(`${API}/water?date=${date}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]);
    setEntries(wr.data || []);
    setSettings(sr.data || { water_goal_ml: 2000 });
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function addWater(ml) {
    if (!ml || ml <= 0) return;
    setAdding(true);
    await fetch(`${API}/water`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ date, amount_ml: parseInt(ml) }),
    });
    setCustom('');
    await load();
    setAdding(false);
  }

  async function deleteEntry(id) {
    await fetch(`${API}/water/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    load();
  }

  const isToday = date === todayStr();
  const total = entries.reduce((s, e) => s + e.amount_ml, 0);
  const pct = Math.min(total / settings.water_goal_ml, 1);
  const remaining = Math.max(settings.water_goal_ml - total, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/health" className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Droplets size={15} className="text-blue-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Water</h1>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <button onClick={() => setDate(prevDay(date))} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(date)}</p>
          {isToday && <p className="text-xs text-blue-500 font-medium">Today</p>}
        </div>
        <button onClick={() => setDate(nextDay(date))} disabled={isToday} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {total >= 1000 ? `${(total / 1000).toFixed(1)}L` : `${total}ml`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {remaining > 0 ? `${remaining}ml to go · goal ${settings.water_goal_ml}ml` : `Goal reached! 🎉`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-500">{Math.round(pct * 100)}%</p>
            <p className="text-xs text-gray-400">{entries.length} logs</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 1 ? 'bg-blue-600' : 'bg-blue-400'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      {/* Quick add */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Add</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_ML.map(ml => (
            <button key={ml} onClick={() => addWater(ml)} disabled={adding}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors">
              <Droplets size={12} />
              {ml >= 1000 ? `${ml/1000}L` : `${ml}ml`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number" value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Custom amount (ml)"
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={e => e.key === 'Enter' && addWater(custom)}
          />
          <button onClick={() => addWater(custom)} disabled={!custom || adding}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Log */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Droplets size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No water logged for this day</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-50 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Log</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[...entries].reverse().map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Droplets size={14} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {e.amount_ml >= 1000 ? `${(e.amount_ml / 1000).toFixed(2).replace(/\.?0+$/, '')}L` : `${e.amount_ml} ml`}
                  </p>
                  <p className="text-xs text-gray-400">{fmtTime(e.created_at)}</p>
                </div>
                <button onClick={() => deleteEntry(e.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
