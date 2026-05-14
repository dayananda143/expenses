import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, Utensils, Droplets, Scale, ChevronLeft, ChevronRight, Settings, Upload, Download, Copy, Check } from 'lucide-react';

const API = '/api/health';
const token = () => localStorage.getItem('expenses_token');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

function fmtFull(d) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dt = new Date(d + 'T00:00:00');
  return `${days[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

// ── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({ selected, onSelect, calYear, calMonth, onPrevMonth, onNextMonth, monthData, settings }) {
  const today = todayStr();

  // build day grid (always 6 rows × 7 cols)
  const firstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - firstDow + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
  }

  // build lookup maps from monthData
  const calMap = {};
  (monthData?.calories || []).forEach(r => { calMap[r.date] = r.total; });
  const waterMap = {};
  (monthData?.water || []).forEach(r => { waterMap[r.date] = r.total_ml; });
  const weightSet = new Set((monthData?.weight || []).map(r => r.date));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {MONTHS[calMonth - 1]} {calYear}
        </span>
        <button onClick={onNextMonth}
          disabled={calYear === new Date().getFullYear() && calMonth === new Date().getMonth() + 1}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = dateStr(calYear, calMonth, day);
          const isToday = ds === today;
          const isSelected = ds === selected;
          const isFuture = ds > today;

          const cal = calMap[ds] || 0;
          const water = waterMap[ds] || 0;
          const hasWeight = weightSet.has(ds);
          const hasData = cal > 0 || water > 0 || hasWeight;

          // calorie fill level (0-1) for background shade
          const calFill = settings ? Math.min(cal / settings.calorie_goal, 1) : 0;
          const waterFill = settings ? Math.min(water / settings.water_goal_ml, 1) : 0;

          return (
            <button
              key={ds}
              onClick={() => !isFuture && onSelect(ds)}
              disabled={isFuture}
              className={`
                relative flex flex-col items-center justify-start pt-1 pb-1.5 rounded-lg text-xs font-medium transition-all
                ${isFuture ? 'opacity-25 cursor-default' : 'cursor-pointer'}
                ${isSelected
                  ? 'bg-rose-500 text-white shadow-sm'
                  : isToday
                  ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 ring-1 ring-rose-300 dark:ring-rose-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
            >
              <span className="leading-none">{day}</span>

              {/* Activity dots */}
              {hasData && !isFuture && (
                <div className="flex gap-0.5 mt-1">
                  {cal > 0 && (
                    <span className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-white/70' :
                      calFill >= 1 ? 'bg-red-400' : 'bg-rose-400'
                    }`} />
                  )}
                  {water > 0 && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-blue-400'}`} />
                  )}
                  {hasWeight && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-purple-400'}`} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        {[['bg-rose-400','Meals'], ['bg-blue-400','Water'], ['bg-purple-400','Weight']].map(([cls, lbl]) => (
          <span key={lbl} className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className={`w-1.5 h-1.5 rounded-full ${cls}`} />
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Ring ──────────────────────────────────────────────────────────────────────

function RingProgress({ value, max, color, size = 80, strokeWidth = 8, label, sublabel }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" className={color} />
      </svg>
      <div className="text-center">
        <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400">{sublabel}</p>
      </div>
    </div>
  );
}

// ── Settings Modal ─────────────────────────────────────────────────────────────

function SettingsModal({ settings, onClose, onSave }) {
  const [form, setForm] = useState({ ...settings });

  async function handleSave() {
    await fetch(`${API}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Health Goals</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Daily Calorie Goal (kcal)</label>
            <input type="number" value={form.calorie_goal}
              onChange={e => setForm(f => ({ ...f, calorie_goal: parseInt(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Daily Water Goal (ml)</label>
            <input type="number" value={form.water_goal_ml}
              onChange={e => setForm(f => ({ ...f, water_goal_ml: parseInt(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Weight Unit</label>
            <select value={form.weight_unit}
              onChange={e => setForm(f => ({ ...f, weight_unit: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500">
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers for meal-plan format ───────────────────────────────────────────────

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function mealTypeFromTime(timeStr) {
  // e.g. "7:00 AM", "1:00 PM", "9:30 PM"
  const [hm, period] = timeStr.trim().split(' ');
  let h = parseInt(hm.split(':')[0]);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  if (h < 10) return 'breakfast';
  if (h < 13) return 'snack';   // mid-morning
  if (h < 17) return 'lunch';
  if (h < 20) return 'snack';   // evening
  if (h < 22) return 'dinner';
  return 'snack';                // late night
}

function nextMonday() {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function convertMealPlan(json, startDate) {
  const meals = [];
  for (const dayObj of json.weekly_plan) {
    const idx = DAY_ORDER.indexOf(dayObj.day);
    if (idx === -1) continue;
    const date = addDays(startDate, idx);
    const tip = dayObj.nutritionist_tip || '';
    for (const m of dayObj.meals) {
      meals.push({
        date,
        meal_type: mealTypeFromTime(m.time),
        name: m.name,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        notes: [m.portion, m.nutrients, tip ? `Tip: ${tip}` : ''].filter(Boolean).join(' · '),
      });
    }
  }
  return meals;
}

// ── Import / Export Modal ─────────────────────────────────────────────────────

function ImportExportModal({ onClose, onImported }) {
  const fileRef = useRef();
  const [status, setStatus]   = useState(null);
  const [importing, setImporting] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo,   setExportTo]   = useState(todayStr());

  const [tab, setTab] = useState('file'); // 'file' | 'paste' | 'prompt'
  const [pasteText, setPasteText] = useState('');
  const [copied, setCopied] = useState(false);

  // meal-plan preview state
  const [planJson,     setPlanJson]     = useState(null); // parsed weekly_plan JSON
  const [planStart,    setPlanStart]    = useState(nextMonday());
  const [planPreview,  setPlanPreview]  = useState([]); // converted meals preview

  function buildPreview(json, start) {
    setPlanJson(json);
    setPlanStart(start);
    setPlanPreview(convertMealPlan(json, start));
  }

  function processJson(json) {
    if (json.weekly_plan) {
      buildPreview(json, planStart);
      return;
    }
    doImport({
      meals:  Array.isArray(json.meals)  ? json.meals  : Array.isArray(json) ? json : [],
      water:  Array.isArray(json.water)  ? json.water  : [],
      weight: Array.isArray(json.weight) ? json.weight : [],
    });
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus(null);
    setPlanJson(null);
    setPlanPreview([]);
    let json;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setStatus({ type: 'error', msg: 'Invalid JSON file.' });
      fileRef.current.value = '';
      return;
    }
    processJson(json);
    fileRef.current.value = '';
  }

  const MEAL_PLAN_PROMPT = `You are a senior nutritionist with 25 years of experience at Mayo Clinic, specializing in maternal nutrition and South Indian cuisine.

Generate a 7-day South Indian pregnancy meal plan as a JSON object.

## My preferences (edit before sending):
- Trimester: 1st / 2nd / 3rd  ← pick one
- Vegetarian or Non-vegetarian: ← pick one
- Foods I like: idli, dosa, sambar, rice, ragi  ← add/remove
- Foods I dislike or want to avoid: ← list here
- Any allergies: ← list here
- Daily calorie target: 1800–2000 kcal  ← adjust if needed

## Output rules:
- Return ONLY the raw JSON, no explanation, no markdown code fences, no extra text
- Every meal must have realistic portion sizes (e.g. "2 idlis · 1 small bowl sambar")
- Include 6 meals per day: breakfast ~7am, mid-morning ~10am, lunch ~1pm, evening ~4pm, dinner ~7pm, night ~9pm
- Each day must have a nutritionist_tip with a practical tip for that day
- Use this EXACT JSON structure:

{
  "plan_info": {
    "title": "...",
    "trimester": "...",
    "daily_calories": "...",
    "meals_per_day": 6,
    "focus_nutrients": ["Folate", "Iron", "Calcium"],
    "daily_targets": {
      "protein": "~75g",
      "folate": "400mcg",
      "calcium": "1000mg",
      "iron": "27mg",
      "water": "2.5L"
    },
    "foods_to_avoid": []
  },
  "weekly_plan": [
    {
      "day": "Monday",
      "meals": [
        {
          "time": "7:00 AM",
          "name": "meal name here",
          "portion": "exact portion sizes",
          "nutrients": "key nutrients provided",
          "key_nutrient": "Iron"
        }
      ],
      "nutritionist_tip": "practical tip for this day"
    }
  ]
}

Days must be in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
key_nutrient must be one of: Folate, Iron, Calcium, Protein.`;

  function handleCopyPrompt() {
    navigator.clipboard.writeText(MEAL_PLAN_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePaste() {
    setStatus(null);
    setPlanJson(null);
    setPlanPreview([]);
    let json;
    try {
      json = JSON.parse(pasteText.trim());
    } catch {
      setStatus({ type: 'error', msg: 'Invalid JSON — check for missing brackets or commas.' });
      return;
    }
    processJson(json);
  }

  async function doImport(payload) {
    setImporting(true);
    const r = await fetch(`${API}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    setImporting(false);

    if (!r.ok) { setStatus({ type: 'error', msg: j.error || 'Import failed.' }); return; }

    const { imported, skipped } = j.data;
    const lines = [];
    if (imported.meals  > 0) lines.push(`${imported.meals} meals`);
    if (imported.water  > 0) lines.push(`${imported.water} water logs`);
    if (imported.weight > 0) lines.push(`${imported.weight} weight entries`);
    const skippedTotal = skipped.meals + skipped.water + skipped.weight;
    setStatus({
      type: lines.length ? 'ok' : 'warn',
      msg: lines.length
        ? `Imported: ${lines.join(', ')}.${skippedTotal > 0 ? ` ${skippedTotal} rows skipped.` : ''}`
        : 'Nothing imported — check your JSON format.',
    });
    if (lines.length) onImported();
    setPlanJson(null);
    setPlanPreview([]);
  }

  async function confirmPlanImport() {
    const meals = convertMealPlan(planJson, planStart);
    await doImport({ meals, water: [], weight: [] });
    fileRef.current.value = '';
  }

  function handleExport() {
    const params = new URLSearchParams({ to: exportTo });
    if (exportFrom) params.set('from', exportFrom);
    fetch(`${API}/export?${params}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `health-export${exportFrom ? `-${exportFrom}` : ''}-to-${exportTo}.json`;
        link.click();
      });
  }

  // group preview by date for display
  const previewByDate = planPreview.reduce((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Import / Export</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>

        {/* Always-mounted hidden input — keeps fileRef.current valid at all times */}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          disabled={importing}
          onChange={handleFile}
        />

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Import ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Import from JSON</p>

            {!planJson ? (
              <>
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-3">
                  {[['file', 'Upload file'], ['paste', 'Paste JSON'], ['prompt', 'Get prompt']].map(([t, lbl]) => (
                    <button key={t} onClick={() => { setTab(t); setStatus(null); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        tab === t
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}>{lbl}</button>
                  ))}
                </div>

                {tab === 'file' ? (
                  <button
                    onClick={() => fileRef.current.click()}
                    disabled={importing}
                    className={`flex items-center gap-2 w-full px-4 py-4 rounded-xl border-2 border-dashed transition-colors text-left
                      ${importing ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-rose-400 dark:hover:border-rose-500 cursor-pointer'}`}>
                    <Upload size={16} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {importing ? 'Importing…' : 'Click to choose a .json file'}
                    </span>
                  </button>
                ) : tab === 'paste' ? (
                  <div className="space-y-2">
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder='Paste your JSON here…&#10;&#10;{ "weekly_plan": [...] }&#10;— or —&#10;{ "meals": [...], "water": [...] }'
                      rows={7}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-xs text-gray-800 dark:text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                    />
                    <button
                      onClick={handlePaste}
                      disabled={importing || !pasteText.trim()}
                      className="w-full py-2 text-sm bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white rounded-lg font-medium transition-colors">
                      {importing ? 'Importing…' : 'Import'}
                    </button>
                  </div>
                ) : (
                  /* Prompt tab */
                  <div className="space-y-3">
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl px-4 py-3 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                      <p className="font-semibold mb-1">How to use:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-rose-600 dark:text-rose-400">
                        <li>Copy the prompt below</li>
                        <li>Edit your preferences (trimester, veg/non-veg, food likes)</li>
                        <li>Paste into <strong>claude.ai</strong> and send</li>
                        <li>Copy the JSON output it gives you</li>
                        <li>Come back here → <strong>Paste JSON</strong> tab → Import</li>
                      </ol>
                    </div>

                    <div className="relative">
                      <pre className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-[10px] text-gray-700 dark:text-gray-300 font-mono overflow-auto max-h-56 leading-relaxed whitespace-pre-wrap break-words">
                        {MEAL_PLAN_PROMPT}
                      </pre>
                    </div>

                    <button
                      onClick={handleCopyPrompt}
                      className={`flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium rounded-xl transition-colors ${
                        copied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white'
                      }`}>
                      {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy prompt</>}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ── Meal-plan preview + start-date picker ── */
              <div className="space-y-3">
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    Meal plan detected: {planJson.plan_info?.title || 'Weekly plan'}
                  </p>
                  {planJson.plan_info?.trimester && (
                    <p className="text-xs text-rose-500 mt-0.5">{planJson.plan_info.trimester}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Week starts on
                  </label>
                  <input type="date" value={planStart}
                    onChange={e => buildPreview(planJson, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
                  <p className="text-xs text-gray-400 mt-1">Monday = Day 1 · Sunday = Day 7</p>
                </div>

                {/* Preview table */}
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Preview — {planPreview.length} meals across {Object.keys(previewByDate).length} days
                    </p>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                    {Object.entries(previewByDate).map(([date, items]) => (
                      <div key={date}>
                        <div className="px-3 py-1.5 bg-gray-50/50 dark:bg-gray-800/50">
                          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        {items.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize shrink-0 ${
                              m.meal_type === 'breakfast' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                              m.meal_type === 'lunch'     ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                              m.meal_type === 'dinner'    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' :
                              'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300'
                            }`}>{m.meal_type}</span>
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{m.name}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setPlanJson(null); setPlanPreview([]); fileRef.current.value = ''; }}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                  <button onClick={confirmPlanImport} disabled={importing}
                    className="flex-1 px-3 py-2 text-xs bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg font-medium">
                    {importing ? 'Importing…' : `Import ${planPreview.length} meals`}
                  </button>
                </div>
              </div>
            )}

            {status && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                status.type === 'ok'   ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' :
                status.type === 'warn' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' :
                'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>{status.msg}</div>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* ── Export ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Export to JSON</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs text-gray-400">From (optional)</label>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400">To</label>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
            </div>
            <button onClick={handleExport}
              className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-gray-900 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors">
              <Download size={14} /> Download JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const today = todayStr();
  const navigate = useNavigate();
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // calendar month state, starts at current month
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  const loadSummary = useCallback(async () => {
    const r = await fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token()}` } });
    const j = await r.json();
    setSummary({ settings: j.data });
  }, []);

  const loadMonth = useCallback(async () => {
    const r = await fetch(`${API}/monthly?year=${calYear}&month=${calMonth}`, { headers: { Authorization: `Bearer ${token()}` } });
    const j = await r.json();
    setMonthData(j.data);
  }, [calYear, calMonth]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadMonth(); }, [loadMonth]);

  function prevMonth() {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  // clicking a day navigates to meals page for that date
  function handleSelect(ds) {
    navigate(`/health/meals?date=${ds}`);
  }

  if (!summary) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { settings } = summary;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <HeartPulse size={18} className="text-rose-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Health & Diet</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowImport(true)}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Import / Export">
            <Upload size={16} />
          </button>
          <button onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Goals">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Calendar — full width, big */}
      <Calendar
        selected={date}
        onSelect={handleSelect}
        calYear={calYear}
        calMonth={calMonth}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        monthData={monthData}
        settings={settings}
      />

      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={loadSummary} />
      )}

      {showImport && (
        <ImportExportModal
          onClose={() => setShowImport(false)}
          onImported={() => { loadSummary(); loadMonth(); }}
        />
      )}
    </div>
  );
}
