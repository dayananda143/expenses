import { useState } from 'react';
import { ChevronLeft, ChevronRight, HeartPulse, TrendingUp, TrendingDown, Activity, Building2, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useHospitalDashboard } from '../hooks/useHospitalExpenses';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PERSON_COLORS = ['#e11d48','#3b82f6','#10b981','#8b5cf6','#f97316','#14b8a6'];
const CAT_COLORS    = ['#e11d48','#3b82f6','#10b981','#8b5cf6','#f97316','#14b8a6','#6b7280'];

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function StatCard({ label, value, sub, trend, color = 'gray' }) {
  const colors = {
    rose:    'text-rose-600 dark:text-rose-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue:    'text-blue-600 dark:text-blue-400',
    gray:    'text-gray-800 dark:text-gray-100',
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {trend != null && (
        <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${trend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
          {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}% vs last year
        </p>
      )}
    </div>
  );
}

export default function HospitalDashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading } = useHospitalDashboard(year);

  const { yearTotal = 0, yearVisits = 0, lastYearTotal = 0, lastYearVisits = 0,
          allTimeTotal = 0, allTimeVisits = 0, monthly = [], byCategory = [],
          byPerson = [], byHospital = [], topExpenses = [] } = data ?? {};

  const trend = lastYearTotal > 0 ? Math.round(((yearTotal - lastYearTotal) / lastYearTotal) * 100) : null;

  const monthlyData = MONTH_SHORT.map((name, i) => {
    const m = String(i + 1).padStart(2, '0');
    const found = monthly.find((r) => r.month === m);
    return { name, total: found?.total ?? 0, visits: found?.visits ?? 0 };
  });

  const catData = byCategory.filter((c) => c.total > 0).slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HeartPulse size={20} className="text-rose-500" />
          Hospital Dashboard
        </h1>
        {/* Year picker */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[48px] text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} disabled={year >= now.getFullYear()} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && data && (<>
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="This Year" value={fmt(yearTotal)} sub={`${yearVisits} visit${yearVisits !== 1 ? 's' : ''}`} trend={trend} color="rose" />
          <StatCard label="Last Year" value={fmt(lastYearTotal)} sub={`${lastYearVisits} visits`} color="gray" />
          <StatCard label="All Time" value={fmt(allTimeTotal)} sub={`${allTimeVisits} total visits`} color="blue" />
          <StatCard label="Avg per Visit" value={allTimeVisits > 0 ? fmt(allTimeTotal / allTimeVisits) : '—'} sub="all time average" color="gray" />
        </div>

        {/* Monthly bar chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Activity size={15} className="text-rose-500" /> Monthly Spending {year}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => v === 0 ? '' : `$${Math.round(v)}`} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Spent']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={i === now.getMonth() && year === now.getFullYear() ? '#e11d48' : '#fda4af'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category + Per-person */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By Category */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">By Category</p>
            {catData.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No category data</p>
            ) : (
              <div className="flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={catData} dataKey="total" cx={55} cy={55} innerRadius={30} outerRadius={55} paddingAngle={2}>
                    {catData.map((c, i) => <Cell key={i} fill={c.category_color || CAT_COLORS[i % CAT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {catData.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.category_color || CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="truncate text-gray-600 dark:text-gray-400">{c.category_name ?? 'Uncategorized'}</span>
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0">${c.total.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* By Person */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <User size={14} className="text-gray-400" /> By Person
            </p>
            {byPerson.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No data</p>
            ) : (
              <div className="space-y-3">
                {byPerson.map((p, i) => {
                  const total = byPerson.reduce((s, x) => s + x.total, 0);
                  const pct = total > 0 ? (p.total / total) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{p.username}</span>
                        <span className="text-gray-500 dark:text-gray-400">{fmt(p.total)} · {p.visits} visits</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PERSON_COLORS[i % PERSON_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top providers + Top expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Building2 size={14} className="text-gray-400" /> Top Providers
            </p>
            {byHospital.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No provider data</p>
            ) : (
              <div className="space-y-2">
                {byHospital.map((h, i) => {
                  const max = byHospital[0]?.total ?? 1;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="truncate text-gray-600 dark:text-gray-400 max-w-[60%]">{h.hospital}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0">{fmt(h.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-rose-400" style={{ width: `${(h.total / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top 5 Expenses</p>
            {topExpenses.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {topExpenses.map((e, i) => (
                  <div key={e.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-300 dark:text-gray-600 shrink-0">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{e.description}</p>
                        <p className="text-[11px] text-gray-400 truncate">{e.date}{e.hospital ? ` · ${e.hospital}` : ''}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>)}
    </div>
  );
}
