import { useState, useEffect } from 'react';
import { Bird, Skull, ShoppingCart, TrendingUp, TrendingDown, CalendarDays, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CYCLE_DAYS = 60;
const API = '/api/poultry';
const token = () => localStorage.getItem('expenses_token');

const CAT_COLORS = {
  shed: '#f97316', feed: '#f59e0b', medication: '#ef4444', equipment: '#3b82f6',
  utilities: '#a855f7', labor: '#6366f1', sanjay_labor: '#8b5cf6', chicks: '#eab308', other: '#6b7280',
};
const CAT_LABELS = {
  shed: 'Shed', feed: 'Feed', medication: 'Medication', equipment: 'Equipment',
  utilities: 'Utilities', labor: 'Labor', sanjay_labor: 'Sanjay Labor', chicks: 'Chicks', other: 'Other',
};

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function fmtShort(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000);
}

function BatchProgress({ batch }) {
  const deaths = batch.deaths ?? 0;
  const live = Math.max(0, batch.count - deaths);
  const elapsed = daysSince(batch.date_added);
  const endDate = batch.end_date ?? (() => { const d = new Date(batch.date_added + 'T00:00:00'); d.setDate(d.getDate() + CYCLE_DAYS); return d.toISOString().slice(0, 10); })();
  const daysLeft = Math.ceil((new Date(endDate + 'T00:00:00') - Date.now()) / 86400000);
  const totalDays = elapsed + Math.max(0, daysLeft);
  const pct = Math.min(100, Math.round((elapsed / Math.max(1, totalDays)) * 100));
  const isOverdue = daysLeft < 0;

  return (
    <div className="bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{batch.name}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{batch.bird_type}</span>
      </div>
      <div className="flex items-center gap-4 text-center">
        <div className="flex-1"><p className="text-base font-bold text-gray-900 dark:text-white">{live}</p><p className="text-xs text-gray-400">live</p></div>
        <div className="flex-1"><p className="text-base font-bold text-red-500">{deaths}</p><p className="text-xs text-gray-400">deaths</p></div>
        <div className="flex-1">
          <p className={`text-base font-bold ${isOverdue ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'}`}>
            {isOverdue ? `+${Math.abs(daysLeft)}d` : `${daysLeft}d`}
          </p>
          <p className="text-xs text-gray-400">{isOverdue ? 'overdue' : 'left'}</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-1.5 rounded-full ${isOverdue ? 'bg-orange-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1"><CalendarDays size={10} /> Day {elapsed}</span>
          <span>{new Date(endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </div>
  );
}

function fmtMonthYear(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function CustomXAxisTick({ x, y, payload }) {
  const parts = (payload.value ?? '').split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#9ca3af" fontSize={11}>{parts[0]}</text>
      {parts[1] && <text x={0} y={0} dy={24} textAnchor="middle" fill="#9ca3af" fontSize={9}>{parts[1]}</text>}
    </g>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow text-sm space-y-1">
      <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
      <p className="text-amber-600 dark:text-amber-400">Expenses: {fmt(d.total)}</p>
      {d.revenue > 0 && <p className={d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
        {d.profit >= 0 ? 'Profit' : 'Loss'}: {fmt(d.profit)}
      </p>}
    </div>
  );
}

const STAKE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export default function PoultryPage() {
  const [summary, setSummary] = useState(null);
  const [batchExpenses, setBatchExpenses] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [stakes, setStakes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/summary`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/expenses/batch-summary`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/stake`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([s, b, st]) => {
      setSummary(s.data);
      setBatchExpenses(b.data ?? []);
      setStakes(st.data ?? []);
      setSelectedBatch(null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bird size={24} className="text-amber-500" /> Poultry Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
      </div>

      {loading ? (
        <div className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : summary ? (
        <>
          {/* Batch Expenses Bar Chart */}
          {batchExpenses.length > 0 && (() => {
            // Aggregate "All" view
            const allCatMap = {};
            batchExpenses.forEach(b => b.by_category.forEach(c => {
              allCatMap[c.category] = (allCatMap[c.category] ?? 0) + c.total;
            }));
            const allCategories = Object.entries(allCatMap).map(([category, total]) => ({ category, total }));
            const allTotal = batchExpenses.reduce((s, b) => s + b.total, 0);
            const breakdown = selectedBatch
              ? { name: selectedBatch.name, total: selectedBatch.total, cats: selectedBatch.by_category }
              : { name: 'All Batches', total: allTotal, cats: allCategories };

            // Add two-line label: "Batch 4\nSep'25 - Oct'25"
            const chartData = batchExpenses.map(b => {
              const start = fmtMonthYear(b.date_added);
              const end   = fmtMonthYear(b.end_date);
              const range = start && end ? `${start} - ${end}` : start ?? '';
              return { ...b, label: range ? `${b.name}\n${range}` : b.name };
            });

            return (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ShoppingCart size={15} className="text-amber-500" /> Expenses by Batch
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedBatch ? String(selectedBatch.flock_id) : 'all'}
                      onChange={e => setSelectedBatch(e.target.value === 'all' ? null : batchExpenses.find(b => String(b.flock_id) === e.target.value) ?? null)}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="all">All Batches</option>
                      {batchExpenses.map(b => (
                        <option key={b.flock_id} value={String(b.flock_id)}>{b.name}</option>
                      ))}
                    </select>
                    {selectedBatch && (
                      <button onClick={() => setSelectedBatch(null)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Clear filter">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Expenses</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Profit</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Loss</span>
                </div>

                {/* Bar chart — all batches */}
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barCategoryGap="25%" barGap={3}>
                    <XAxis dataKey="label" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} height={46} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251,191,36,0.08)' }} />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]} name="Profit/Loss" style={{ cursor: 'pointer' }}
                      onClick={data => setSelectedBatch(prev => prev?.flock_id === data.flock_id ? null : data)}>
                      {chartData.map((b, i) => (
                        <Cell key={i} fill={b.profit >= 0 ? '#34d399' : '#f87171'}
                          opacity={selectedBatch === null || selectedBatch?.flock_id === b.flock_id ? 1 : 0.4} />
                      ))}
                    </Bar>
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} name="Expenses" style={{ cursor: 'pointer' }}
                      onClick={data => setSelectedBatch(prev => prev?.flock_id === data.flock_id ? null : data)}>
                      {chartData.map((b, i) => (
                        <Cell key={i} fill={selectedBatch === null || selectedBatch?.flock_id === b.flock_id ? '#f59e0b' : '#fde68a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Breakdown */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{breakdown.name}</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmt(breakdown.total)}</p>
                  </div>
                  {breakdown.cats.length === 0 ? (
                    <p className="text-xs text-gray-400">No expenses recorded for this batch.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...breakdown.cats].sort((a, b) => b.total - a.total).map(cat => {
                        const color = CAT_COLORS[cat.category] ?? '#6b7280';
                        const pct = breakdown.total > 0 ? (cat.total / breakdown.total) * 100 : 0;
                        return (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium" style={{ color }}>{CAT_LABELS[cat.category] ?? cat.category}</span>
                              <span className="text-gray-500 dark:text-gray-400">{fmt(cat.total)} <span className="text-gray-400">({pct.toFixed(1)}%)</span></span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Ownership profit cards */}
          {stakes.length > 0 && (() => {
            const allExpenses = batchExpenses.reduce((s, b) => s + b.total, 0);
            const allRevenue = batchExpenses.reduce((s, b) => s + b.revenue, 0);
            const allProfit = allRevenue - allExpenses;
            const expenses = selectedBatch ? selectedBatch.total : allExpenses;
            const revenue = selectedBatch ? selectedBatch.revenue : allRevenue;
            const profit = revenue - expenses;
            const label = selectedBatch ? selectedBatch.name : 'All Batches';
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ownership — {label}</h2>
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Net Pay <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(revenue)}</span></span>
                    <span>− Expenses <span className="font-semibold text-red-500">{fmt(expenses)}</span></span>
                    <span>= Profit <span className={`font-semibold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(profit)}</span></span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {stakes.map((s, i) => {
                    const color = STAKE_COLORS[i % STAKE_COLORS.length];
                    const pct = s.percentage / 100;
                    const shareProfit = profit * pct;
                    const shareNetPay = revenue * pct;
                    const shareExpenses = expenses * pct;
                    return (
                      <div key={s.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                        style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.name}</p>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>{s.percentage}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-0.5">Net Pay share</p>
                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mb-2">{fmt(shareNetPay)}</p>
                        <p className="text-xs text-gray-400 mb-0.5">Expense share</p>
                        <p className="text-base font-bold text-red-500 mb-2">{fmt(shareExpenses)}</p>
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                          <p className="text-xs text-gray-400 mb-0.5">Profit (Net Pay − Expenses)</p>
                          <p className={`text-lg font-bold ${shareProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(shareProfit)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Recent mortality */}
          {summary.recentMortality.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Skull size={15} className="text-red-400" /> Recent mortality
              </h2>
              <div className="space-y-2">
                {summary.recentMortality.map(r => (
                  <div key={r.date} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24 shrink-0">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-red-400"
                        style={{ width: `${Math.min(100, (r.count / (Math.max(...summary.recentMortality.map(x => x.count)) || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Failed to load summary.</p>
      )}

    </div>
  );
}
