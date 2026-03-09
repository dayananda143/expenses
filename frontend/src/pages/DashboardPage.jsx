import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import client from '../api/client';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const card = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function MonthNav({ year, month, onChange }) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }
  function next() {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }
  function goToday() {
    onChange(now.getFullYear(), now.getMonth() + 1);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <CalendarDays size={15} className="text-emerald-600 shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>

      <button
        onClick={next}
        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ChevronRight size={16} />
      </button>

      {!isCurrentMonth && (
        <button
          onClick={goToday}
          className="ml-1 px-2.5 py-1 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors font-medium"
        >
          Today
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { dark } = useTheme();
  const { workspace, fmtRound } = useWorkspace();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  function handleMonthChange(y, m) { setYear(y); setMonth(m); }

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', workspace, year, month],
    queryFn: () => client.get('/dashboard', { params: { workspace, year, month } }),
    enabled: !!workspace,
  });

  const tickColor = dark ? '#9ca3af' : '#6b7280';
  const tooltipStyle = dark
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f9fafb' }
    : { backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#111827' };

  const selectedMonthKey = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <MonthNav year={year} month={month} onChange={handleMonthChange} />
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {data && (() => {
        const { monthTotal, yearTotal, byCategory, monthly, recent, budgetStatus } = data;

        if (workspace === 'india') {
          const balance = (data.allTimeCredit ?? 0) - (data.allTimeDebit ?? 0);
          const monthBalance = (data.monthCredit ?? 0) - (data.monthDebit ?? 0);
          return (
            <>
              {/* Ledger stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`${card} border-l-4 border-emerald-500`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Credit</span>
                    <TrendingUp size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{(data.allTimeCredit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-gray-400 mt-0.5">This month: ₹{(data.monthCredit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className={`${card} border-l-4 border-red-500`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Debit</span>
                    <TrendingDown size={16} className="text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-red-500 dark:text-red-400">₹{(data.allTimeDebit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-gray-400 mt-0.5">This month: ₹{(data.monthDebit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className={`${card} border-l-4 ${balance >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Balance</span>
                    <TrendingUp size={16} className={balance >= 0 ? 'text-blue-500' : 'text-orange-500'} />
                  </div>
                  <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`}>
                    ₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{balance >= 0 ? 'Credit exceeds debit' : 'Debit exceeds credit'}</p>
                </div>
              </div>

              {/* Recent transactions */}
              {recent.length > 0 && (
                <div className={card}>
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Recent in {MONTH_NAMES[month - 1]}</h2>
                  <div className="space-y-2">
                    {recent.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${e.type === 'credit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {e.type === 'credit' ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-red-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.description}</p>
                            <p className="text-xs text-gray-400">{e.date}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${e.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {e.type === 'credit' ? '+' : '-'}₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recent.length === 0 && (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  No entries for {MONTH_NAMES[month - 1]} {year}.
                </div>
              )}
            </>
          );
        }

        const catData = byCategory.filter((c) => c.total > 0);
        const monthlyData = monthly.map((m) => ({
          month: format(parseISO(`${m.month}-01`), 'MMM yy'),
          monthKey: m.month,
          total: m.total,
        }));

        return (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={card}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {MONTH_NAMES[month - 1]} {year}
                  </span>
                  <TrendingDown size={18} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtRound(monthTotal)}</p>
              </div>
              <div className={card}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Full Year {year}</span>
                  <TrendingUp size={18} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtRound(yearTotal)}</p>
              </div>
            </div>

            {/* Budget Status */}
            {budgetStatus.length > 0 && (
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Budget Status</h2>
                <div className="space-y-4">
                  {budgetStatus.map((b) => {
                    const pct = Math.min((b.spent / b.amount) * 100, 100);
                    const over = b.spent > b.amount;
                    return (
                      <div key={b.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {over
                              ? <AlertTriangle size={14} className="text-red-500" />
                              : <CheckCircle size={14} className="text-emerald-500" />
                            }
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {b.category_name ?? 'Overall'} ({b.period})
                            </span>
                          </div>
                          <span className={`text-xs font-semibold ${over ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {fmtRound(b.spent)} / {fmtRound(b.amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Monthly trend */}
              {monthlyData.length > 0 && (
                <div className={card}>
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Spending</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} />
                      <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={(v) => fmtRound(v)} width={60} />
                      <Tooltip
                        formatter={(v) => [fmtRound(v), 'Spent']}
                        contentStyle={tooltipStyle}
                        cursor={{ fill: dark ? '#374151' : '#f3f4f6' }}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {monthlyData.map((entry) => (
                          <Cell
                            key={entry.monthKey}
                            fill={entry.monthKey === selectedMonthKey ? '#059669' : '#10b981'}
                            opacity={entry.monthKey === selectedMonthKey ? 1 : 0.6}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* By category */}
              {catData.length > 0 && (
                <div className={card}>
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    {MONTH_NAMES[month - 1]} by Category
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={catData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {catData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmtRound(v)} contentStyle={tooltipStyle} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, color: tickColor }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent expenses */}
            {recent.length > 0 && (
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Recent in {MONTH_NAMES[month - 1]}
                </h2>
                <div className="space-y-3">
                  {recent.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: e.category_color ?? '#6b7280' }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.description}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{e.category_name ?? 'Uncategorised'} · {e.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmtRound(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && monthTotal === 0 && recent.length === 0 && (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                No expenses recorded for {MONTH_NAMES[month - 1]} {year}.
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
