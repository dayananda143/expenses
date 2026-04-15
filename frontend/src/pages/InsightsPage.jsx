import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown, TrendingUp, ChevronLeft, ChevronRight, CalendarDays,
  Utensils, Car, ShoppingBag, Film, HeartPulse, Zap, Home, BookOpen,
  Plane, Circle, Coffee, Music, Gamepad2, Dumbbell, Baby, Gift,
  PawPrint, Briefcase, Smartphone, Shirt, Tag, Trophy, Frown,
  CalendarCheck, Wallet, ReceiptText,
} from 'lucide-react';
import client from '../api/client';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useQuery as useQ } from '@tanstack/react-query';

const ICON_MAP = {
  'utensils': Utensils, 'car': Car, 'shopping-bag': ShoppingBag, 'film': Film,
  'heart-pulse': HeartPulse, 'zap': Zap, 'home': Home, 'book-open': BookOpen,
  'plane': Plane, 'circle': Circle, 'coffee': Coffee, 'music': Music,
  'gamepad-2': Gamepad2, 'dumbbell': Dumbbell, 'baby': Baby, 'gift': Gift,
  'paw-print': PawPrint, 'briefcase': Briefcase, 'smartphone': Smartphone, 'shirt': Shirt,
};

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const card = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5';

function MonthNav({ year, month, onChange }) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  function prev() { if (month === 1) onChange(year - 1, 12); else onChange(year, month - 1); }
  function next() { if (month === 12) onChange(year + 1, 1); else onChange(year, month + 1); }
  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <CalendarDays size={15} className="text-emerald-600 shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{MONTH_NAMES[month - 1]} {year}</span>
      </div>
      <button onClick={next} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
      {!isCurrentMonth && (
        <button onClick={() => onChange(now.getFullYear(), now.getMonth() + 1)} className="ml-1 px-2.5 py-1 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors font-medium">Today</button>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { workspace, fmtRound, fmt } = useWorkspace();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', workspace, year, month],
    queryFn: () => client.get('/dashboard', { params: { workspace, year, month } }),
    enabled: !!workspace,
  });

  const { data: salaryData } = useQuery({
    queryKey: ['salary-summary'],
    queryFn: () => client.get('/salary/summary'),
    enabled: workspace === 'us',
  });

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Insights</h1>
        <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {data && (() => {
        const { monthTotal, yearTotal, byCategory, monthly, dowBreakdown, biggestExpense } = data;
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : daysInMonth;
        const dailyAvg = today > 0 ? monthTotal / today : 0;
        const projectedTotal = dailyAvg * daysInMonth;

        const vsPrev = data.prevMonthTotal > 0
          ? Math.round(((monthTotal - data.prevMonthTotal) / data.prevMonthTotal) * 100)
          : null;
        const vsLastYear = data.sameMonthLastYearTotal > 0
          ? Math.round(((monthTotal - data.sameMonthLastYearTotal) / data.sameMonthLastYearTotal) * 100)
          : null;

        // Top categories
        const topCats = [...(byCategory ?? [])].filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 6);
        const catTotal = topCats.reduce((s, c) => s + c.total, 0);

        // Best / worst months
        const monthlyWithNames = (monthly ?? []).map((m) => ({
          ...m,
          label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        })).filter((m) => m.total > 0);
        const bestMonth  = monthlyWithNames.length ? [...monthlyWithNames].sort((a, b) => a.total - b.total)[0]  : null;
        const worstMonth = monthlyWithNames.length ? [...monthlyWithNames].sort((a, b) => b.total - a.total)[0]  : null;

        // Day-of-week
        const maxDow = Math.max(...(dowBreakdown ?? []).map((d) => d.total), 1);

        // Salary
        const salary = salaryData?.salary ?? 0;
        const savingsRate = salary > 0 ? Math.round(((salary - monthTotal) / salary) * 100) : null;

        return (
          <>
            {/* ── 1. Summary cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={card}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{MONTH_NAMES[month - 1]} {year}</span>
                  <TrendingDown size={18} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtRound(monthTotal)}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {vsPrev !== null && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${vsPrev > 0 ? 'text-red-500' : vsPrev < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {vsPrev > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {vsPrev > 0 ? '+' : ''}{vsPrev}% vs {MONTH_NAMES[prevMonth - 1]}
                    </span>
                  )}
                  {vsLastYear !== null && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${vsLastYear > 0 ? 'text-red-500' : vsLastYear < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {vsLastYear > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {vsLastYear > 0 ? '+' : ''}{vsLastYear}% vs {MONTH_NAMES[month - 1]} {prevYear}
                    </span>
                  )}
                </div>
              </div>
              <div className={card}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Full Year {year}</span>
                  <TrendingUp size={18} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtRound(yearTotal)}</p>
                {monthTotal > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">Avg {fmtRound(Math.round(yearTotal / month))} / month this year</p>
                )}
              </div>
            </div>

            {/* ── 2. Daily Average & Projection ── */}
            {monthTotal > 0 && (
              <div className={card}>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck size={15} className="text-blue-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Average</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Per Day</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{fmtRound(Math.round(dailyAvg))}</p>
                    <p className="text-xs text-gray-400 mt-0.5">over {today} day{today !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Projected</p>
                    <p className={`text-xl font-bold mt-0.5 ${projectedTotal > data.prevMonthTotal && data.prevMonthTotal > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {fmtRound(Math.round(projectedTotal))}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">if pace continues</p>
                  </div>
                  {data.prevMonthTotal > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Last Month</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{fmtRound(data.prevMonthTotal)}</p>
                      <p className={`text-xs mt-0.5 font-medium ${projectedTotal > data.prevMonthTotal ? 'text-red-500' : 'text-emerald-500'}`}>
                        {projectedTotal > data.prevMonthTotal ? `+${fmtRound(Math.round(projectedTotal - data.prevMonthTotal))} over` : `${fmtRound(Math.round(data.prevMonthTotal - projectedTotal))} under`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 3. Salary vs Spending ── */}
            {salary > 0 && monthTotal > 0 && (
              <div className={card}>
                <div className="flex items-center gap-2 mb-4">
                  <Wallet size={15} className="text-violet-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Salary vs Spending</h2>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Monthly Salary</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{fmtRound(salary)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Spent</p>
                    <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-0.5">{fmtRound(monthTotal)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{Math.round((monthTotal / salary) * 100)}% of salary</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Savings Rate</p>
                    <p className={`text-xl font-bold mt-0.5 ${savingsRate >= 20 ? 'text-emerald-500' : savingsRate >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                      {savingsRate}%
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{savingsRate >= 20 ? 'Great!' : savingsRate >= 10 ? 'Decent' : savingsRate >= 0 ? 'Low' : 'Over budget'}</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${monthTotal > salary ? 'bg-red-500' : monthTotal / salary > 0.8 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((monthTotal / salary) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>$0</span>
                  <span>{fmtRound(salary)}</span>
                </div>
              </div>
            )}

            {/* ── 4. Top Categories ── */}
            {topCats.length > 0 && (
              <div className={card}>
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={15} className="text-emerald-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Spending Categories</h2>
                </div>
                <div className="space-y-3">
                  {topCats.map((cat, i) => {
                    const pct = catTotal > 0 ? (cat.total / catTotal) * 100 : 0;
                    const I = ICON_MAP[cat.icon] ?? Tag;
                    return (
                      <div key={cat.id} className="cursor-pointer" onClick={() => navigate(`/expenses?month=${month}&year=${year}&category_id=${cat.id}`)}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                            <span className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0" style={{ background: cat.color }}>
                              <I size={11} />
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtRound(cat.total)}</span>
                            <span className="text-xs text-gray-400 ml-1.5">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 5. Best & Worst Months ── */}
            {bestMonth && worstMonth && bestMonth.month !== worstMonth.month && (
              <div className={card}>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={15} className="text-amber-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Best & Worst (Last 12 Months)</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy size={13} className="text-emerald-500" />
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Best Month</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmtRound(bestMonth.total)}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{bestMonth.label}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Frown size={13} className="text-red-500" />
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Worst Month</p>
                    </div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmtRound(worstMonth.total)}</p>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{worstMonth.label}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 6. Day-of-Week Breakdown ── */}
            {dowBreakdown && dowBreakdown.some((d) => d.total > 0) && (
              <div className={card}>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays size={15} className="text-indigo-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Spending by Day of Week</h2>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {dowBreakdown.map((d) => {
                    const pct = maxDow > 0 ? (d.total / maxDow) * 100 : 0;
                    const isWeekend = d.dow === 0 || d.dow === 6;
                    return (
                      <div key={d.dow} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-400">{d.total > 0 ? fmtRound(Math.round(d.total)) : ''}</span>
                        <div className="w-full flex items-end justify-center" style={{ height: '56px' }}>
                          <div
                            className={`w-full rounded-t-md transition-all ${isWeekend ? 'bg-violet-400 dark:bg-violet-500' : 'bg-emerald-400 dark:bg-emerald-500'}`}
                            style={{ height: `${Math.max(pct, d.total > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-medium ${isWeekend ? 'text-violet-500' : 'text-gray-500 dark:text-gray-400'}`}>{DOW_NAMES[d.dow]}</span>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const topDow = [...dowBreakdown].sort((a, b) => b.total - a.total)[0];
                  return topDow?.total > 0 ? (
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      You spend the most on <span className="font-semibold text-gray-600 dark:text-gray-300">{DOW_NAMES[topDow.dow]}s</span> — {fmtRound(topDow.total)} this month
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            {/* ── 7. Biggest Single Expense ── */}
            {biggestExpense && (
              <div className={card}>
                <div className="flex items-center gap-2 mb-4">
                  <ReceiptText size={15} className="text-rose-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Biggest Single Expense</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: biggestExpense.category_color ?? '#6b7280' }}>
                    <ReceiptText size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{biggestExpense.description || biggestExpense.subtype || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {biggestExpense.category_name ?? 'Uncategorized'} · {new Date(biggestExpense.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400 shrink-0">{fmt(biggestExpense.amount)}</p>
                </div>
                {monthTotal > 0 && (
                  <p className="text-xs text-gray-400 mt-3">
                    That's <span className="font-semibold text-gray-600 dark:text-gray-300">{((biggestExpense.amount / monthTotal) * 100).toFixed(0)}%</span> of your total spending this month
                  </p>
                )}
              </div>
            )}

            {/* ── 8. Spending Insights (vs 3-month avg) ── */}
            {data.insights?.length > 0 && (
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Category Trends vs 3-Month Average</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.insights.map((ins) => {
                    const up = ins.changePercent > 0;
                    const I = ICON_MAP[ins.icon] ?? Tag;
                    return (
                      <div
                        key={ins.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        onClick={() => navigate(`/expenses?month=${month}&year=${year}&category_id=${ins.id}`)}
                      >
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: ins.color }}>
                          <I size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{ins.name}</p>
                          <p className="text-xs text-gray-400">{fmtRound(ins.thisMonth)} · avg {fmtRound(Math.round(ins.avg3))}</p>
                        </div>
                        <div className={`text-xs font-semibold flex items-center gap-0.5 shrink-0 ${up ? 'text-red-500' : 'text-emerald-600'}`}>
                          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {up ? '+' : ''}{ins.changePercent}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
