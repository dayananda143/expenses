import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp, ChevronLeft, ChevronRight, CalendarDays, Utensils, Car, ShoppingBag, Film, HeartPulse, Zap, Home, BookOpen, Plane, Circle, Coffee, Music, Gamepad2, Dumbbell, Baby, Gift, PawPrint, Briefcase, Smartphone, Shirt, Tag } from 'lucide-react';
import client from '../api/client';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import { useWorkspace } from '../contexts/WorkspaceContext';

const ICON_MAP = {
  'utensils': Utensils, 'car': Car, 'shopping-bag': ShoppingBag, 'film': Film,
  'heart-pulse': HeartPulse, 'zap': Zap, 'home': Home, 'book-open': BookOpen,
  'plane': Plane, 'circle': Circle, 'coffee': Coffee, 'music': Music,
  'gamepad-2': Gamepad2, 'dumbbell': Dumbbell, 'baby': Baby, 'gift': Gift,
  'paw-print': PawPrint, 'briefcase': Briefcase, 'smartphone': Smartphone, 'shirt': Shirt,
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const card = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5';

function MonthNav({ year, month, onChange }) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function prev() { if (month === 1) onChange(year - 1, 12); else onChange(year, month - 1); }
  function next() { if (month === 12) onChange(year + 1, 1); else onChange(year, month + 1); }

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ChevronLeft size={16} />
      </button>
      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <CalendarDays size={15} className="text-emerald-600 shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{MONTH_NAMES[month - 1]} {year}</span>
      </div>
      <button onClick={next} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ChevronRight size={16} />
      </button>
      {!isCurrentMonth && (
        <button
          onClick={() => onChange(now.getFullYear(), now.getMonth() + 1)}
          className="ml-1 px-2.5 py-1 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors font-medium"
        >
          Today
        </button>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { workspace, fmtRound } = useWorkspace();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', workspace, year, month],
    queryFn: () => client.get('/dashboard', { params: { workspace, year, month } }),
    enabled: !!workspace,
  });

  const prevMonth  = month === 1 ? 12 : month - 1;
  const prevYear   = month === 1 ? year - 1 : year;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Insights</h1>
        <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {data && (() => {
        const { monthTotal, yearTotal } = data;
        const vsPrev = data.prevMonthTotal > 0
          ? Math.round(((monthTotal - data.prevMonthTotal) / data.prevMonthTotal) * 100)
          : null;
        const vsLastYear = data.sameMonthLastYearTotal > 0
          ? Math.round(((monthTotal - data.sameMonthLastYearTotal) / data.sameMonthLastYearTotal) * 100)
          : null;

        return (
          <>
            {/* Summary cards */}
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
                      {vsPrev > 0 ? <TrendingUp size={11} /> : vsPrev < 0 ? <TrendingDown size={11} /> : null}
                      {vsPrev > 0 ? '+' : ''}{vsPrev}% vs {MONTH_NAMES[prevMonth - 1]}
                    </span>
                  )}
                  {vsLastYear !== null && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${vsLastYear > 0 ? 'text-red-500' : vsLastYear < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {vsLastYear > 0 ? <TrendingUp size={11} /> : vsLastYear < 0 ? <TrendingDown size={11} /> : null}
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    Avg {fmtRound(Math.round(yearTotal / month))} / month this year
                  </p>
                )}
              </div>
            </div>

            {/* Spending Insights */}
            {data.insights?.length > 0 ? (
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Spending Insights</h2>
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
                          <p className="text-xs text-gray-400 dark:text-gray-500">{fmtRound(ins.thisMonth)} this month</p>
                        </div>
                        <div className={`text-xs font-semibold flex items-center gap-0.5 shrink-0 ${up ? 'text-red-500' : 'text-emerald-600'}`}>
                          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {up ? '+' : ''}{ins.changePercent}%
                          <span className="text-gray-400 font-normal ml-0.5">vs 3-mo avg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              !isLoading && (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Not enough data yet for spending insights. Keep tracking expenses!
                </div>
              )
            )}
          </>
        );
      })()}
    </div>
  );
}
