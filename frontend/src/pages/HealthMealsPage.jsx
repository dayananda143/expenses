import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Utensils, ArrowLeft } from 'lucide-react';

const API = '/api/health';
const token = () => localStorage.getItem('expenses_token');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const MEAL_COLORS = {
  breakfast: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  lunch: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  dinner: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  snack: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function prevDay(d) { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); }
function nextDay(d) { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + 1); return dt.toISOString().slice(0, 10); }
function fmt(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dt = new Date(d + 'T00:00:00');
  return `${days[dt.getDay()]}, ${months[dt.getMonth()]} ${dt.getDate()}`;
}

const EMPTY_FORM = { name: '', meal_type: 'snack', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' };

function MealModal({ date, editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    name: editing.name, meal_type: editing.meal_type,
    calories: editing.calories, protein_g: editing.protein_g,
    carbs_g: editing.carbs_g, fat_g: editing.fat_g,
    notes: editing.notes || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const body = {
      date, meal_type: form.meal_type, name: form.name.trim(),
      calories: parseInt(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      notes: form.notes || null,
    };
    const url = editing ? `${API}/meals/${editing.id}` : `${API}/meals`;
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{editing ? 'Edit Meal' : 'Add Meal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Meal Type</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {MEAL_TYPES.map(t => (
                <button key={t} onClick={() => set('meal_type', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.meal_type === t ? MEAL_COLORS[t] : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {MEAL_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Food / Item *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Oatmeal with berries"
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Calories (kcal)</label>
            <input type="number" value={form.calories} onChange={e => set('calories', e.target.value)} placeholder="0"
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['protein_g', 'Protein (g)', 'text-blue-500'], ['carbs_g', 'Carbs (g)', 'text-amber-600'], ['fat_g', 'Fat (g)', 'text-rose-500']].map(([k, lbl]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lbl}</label>
                <input type="number" step="0.1" value={form[k]} onChange={e => set(k, e.target.value)} placeholder="0"
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="flex-1 px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg font-medium">
            {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HealthMealsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(() => searchParams.get('date') || todayStr());
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/meals?date=${date}`, { headers: { Authorization: `Bearer ${token()}` } });
    const j = await r.json();
    setMeals(j.data || []);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function deleteMeal(id) {
    if (!confirm('Delete this meal?')) return;
    await fetch(`${API}/meals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    load();
  }

  const isToday = date === todayStr();

  // Group by meal type
  const grouped = MEAL_TYPES.reduce((acc, t) => { acc[t] = meals.filter(m => m.meal_type === t); return acc; }, {});

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    protein: acc.protein + m.protein_g,
    carbs: acc.carbs + m.carbs_g,
    fat: acc.fat + m.fat_g,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/health" className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Utensils size={15} className="text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Meals</h1>
        </div>
        <button onClick={() => setModal('add')}
          className="ml-auto flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
          <Plus size={14} /> Add Meal
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <button onClick={() => { const d = prevDay(date); setDate(d); setSearchParams({ date: d }); }} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(date)}</p>
          {isToday && <p className="text-xs text-rose-500 font-medium">Today</p>}
        </div>
        <button onClick={() => { const d = nextDay(date); setDate(d); setSearchParams({ date: d }); }} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><ChevronRight size={18} /></button>
      </div>

      {/* Totals bar */}
      {meals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.calories}</p>
            <p className="text-xs text-gray-400">kcal</p>
          </div>
          {[['P', totals.protein, 'text-blue-500'], ['C', totals.carbs, 'text-amber-600'], ['F', totals.fat, 'text-rose-500']].map(([lbl, val, cls]) => (
            <div key={lbl} className="text-center">
              <p className={`text-sm font-bold ${cls}`}>{Math.round(val)}g</p>
              <p className="text-xs text-gray-400">{lbl}</p>
            </div>
          ))}
        </div>
      )}

      {/* Meals by type */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : meals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Utensils size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No meals logged for this day</p>
          <button onClick={() => setModal('add')} className="mt-3 text-xs text-rose-500 hover:underline">+ Add first meal</button>
        </div>
      ) : (
        MEAL_TYPES.filter(t => grouped[t].length > 0).map(type => (
          <div key={type} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className={`px-4 py-2 border-b ${MEAL_COLORS[type]} border-opacity-50`}>
              <span className="text-xs font-semibold uppercase tracking-wide">{MEAL_LABELS[type]}</span>
              <span className="ml-2 text-xs opacity-70">
                {grouped[type].reduce((s, m) => s + m.calories, 0)} kcal
              </span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {grouped[type].map(meal => (
                <div key={meal.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{meal.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{meal.calories} kcal</span>
                      {meal.protein_g > 0 && <span className="text-xs text-blue-500">P:{meal.protein_g}g</span>}
                      {meal.carbs_g > 0 && <span className="text-xs text-amber-600">C:{meal.carbs_g}g</span>}
                      {meal.fat_g > 0 && <span className="text-xs text-rose-500">F:{meal.fat_g}g</span>}
                    </div>
                    {meal.notes && <p className="text-xs text-gray-400 mt-0.5">{meal.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal(meal)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteMeal(meal.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modal && (
        <MealModal
          date={date}
          editing={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
