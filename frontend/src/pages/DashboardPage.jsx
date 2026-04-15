import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, CalendarDays, Download, Utensils, Car, ShoppingBag, Film, HeartPulse, Zap, Home, BookOpen, Plane, Circle, Coffee, Music, Gamepad2, Dumbbell, Baby, Gift, PawPrint, Briefcase, Smartphone, Shirt, CircleDollarSign, Tag, ArrowDownLeft, ArrowUpRight, Wallet, Scale, PiggyBank } from 'lucide-react';
import { useSavings } from '../hooks/useSavings';
import { useLent } from '../hooks/useLent';

const ICON_MAP = {
  'utensils': Utensils, 'car': Car, 'shopping-bag': ShoppingBag, 'film': Film,
  'heart-pulse': HeartPulse, 'zap': Zap, 'home': Home, 'book-open': BookOpen,
  'plane': Plane, 'circle': Circle, 'coffee': Coffee, 'music': Music,
  'gamepad-2': Gamepad2, 'dumbbell': Dumbbell, 'baby': Baby, 'gift': Gift,
  'paw-print': PawPrint, 'briefcase': Briefcase, 'smartphone': Smartphone, 'shirt': Shirt,
};
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
  const navigate = useNavigate();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeIdx, setActiveIdx] = useState(null);

  function handleMonthChange(y, m) { setYear(y); setMonth(m); }

  function handleExportCsv() {
    const token = localStorage.getItem('token');
    const url = `/api/expenses/export/csv?workspace=${workspace}&month=${month}&year=${year}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `expenses-${workspace}-${MONTH_NAMES[month - 1]}-${year}.csv`;
        a.click();
      });
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', workspace, year, month],
    queryFn: () => client.get('/dashboard', { params: { workspace, year, month } }),
    enabled: !!workspace,
  });

  const { data: savingsData } = useSavings();
  const { data: lentData } = useLent();

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
        <div className="flex items-center gap-2">
          <MonthNav year={year} month={month} onChange={handleMonthChange} />
          <button
            onClick={handleExportCsv}
            title={`Export ${MONTH_NAMES[month - 1]} ${year} to CSV`}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Download size={16} />
          </button>
        </div>
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
                <div className={`${card} flex items-start gap-4`}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <ArrowDownLeft size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Credit</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{(data.allTimeCredit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-400 mt-0.5">This month: <span className="text-emerald-600 dark:text-emerald-400 font-medium">₹{(data.monthCredit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                  </div>
                </div>
                <div className={`${card} flex items-start gap-4`}>
                  <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={20} className="text-red-500 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Debit</p>
                    <p className="text-2xl font-bold text-red-500 dark:text-red-400 mt-0.5">₹{(data.allTimeDebit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-400 mt-0.5">This month: <span className="text-red-500 dark:text-red-400 font-medium">₹{(data.monthDebit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                  </div>
                </div>
                <div className={`${card} flex items-start gap-4`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                    <Wallet size={20} className={balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Balance</p>
                    <p className={`text-2xl font-bold mt-0.5 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`}>
                      {balance < 0 && <span className="text-base font-semibold mr-0.5">-</span>}₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{balance >= 0 ? 'Credit exceeds debit' : 'Debit exceeds credit'}</p>
                  </div>
                </div>
              </div>

              {/* Savings / FD Summary Cards */}
              {(() => {
                const allItems   = savingsData?.data ?? [];
                if (allItems.length === 0) return null;
                function estMat(p, r, t, u) {
                  if (!p || !r || !t) return null;
                  const yr = u === 'days' ? t / 365 : t / 12;
                  return p * (1 + (r / 100) * yr);
                }
                function fmtC(n) {
                  if (n == null || isNaN(n)) return '—';
                  if (n >= 1e7) return '₹' + (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + 'Cr';
                  if (n >= 1e5) return '₹' + (n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + 'L';
                  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
                }
                const activeFDs   = allItems.filter((f) => f.type === 'fd'      && f.status === 'active');
                const activeBonds = allItems.filter((f) => f.type === 'bonds'   && f.status === 'active');
                const savAccounts = allItems.filter((f) => f.type === 'savings' && f.status === 'active');
                const fdPrincipal  = activeFDs.reduce((s, f) => s + (f.principal_amount ?? 0), 0);
                const fdMaturity   = activeFDs.reduce((s, f) => s + (f.maturity_amount ?? estMat(f.principal_amount, f.interest_rate, f.tenure_months, f.tenure_unit) ?? 0), 0);
                const fdGain       = fdMaturity - fdPrincipal;
                const bondFaceVal  = activeBonds.reduce((s, f) => s + (f.principal_amount ?? 0), 0);
                const bondMaturity = activeBonds.reduce((s, f) => s + (f.maturity_amount ?? estMat(f.principal_amount, f.interest_rate, f.tenure_months, f.tenure_unit) ?? 0), 0);
                const savBalance      = savAccounts.reduce((s, f) => s + (f.principal_amount ?? 0), 0);
                const lentOutstanding = (lentData?.data ?? []).filter((i) => i.status !== 'returned').reduce((s, i) => s + i.amount, 0);
                const totalWealth    = fdMaturity + bondMaturity + savBalance - lentOutstanding;
                const cards = [
                  { label: 'FD Invested', value: fmtC(fdPrincipal), sub: fdGain > 0 ? `+${fmtC(fdGain)} gain` : `${activeFDs.length} active`, subColor: 'text-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', Icon: 'Landmark', hash: 'fd' },
                  { label: 'Bonds', value: fmtC(bondFaceVal), sub: bondMaturity > bondFaceVal ? `+${fmtC(bondMaturity - bondFaceVal)} gain` : `${activeBonds.length} active`, subColor: 'text-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', Icon: 'ScrollText', hash: 'bonds' },
                  { label: 'Savings', value: fmtC(savBalance), sub: `${savAccounts.length} account${savAccounts.length !== 1 ? 's' : ''}`, subColor: 'text-gray-400', iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', Icon: 'PiggyBank', hash: 'savings' },
                  { label: 'Total Wealth', value: fmtC(totalWealth), sub: 'FD + bonds + savings - lent out', subColor: 'text-gray-400', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', Icon: 'Wallet', hash: 'fd' },
                ];
                const IconMap = { Landmark: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>, ScrollText: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M15 8h-5"/><path d="M15 12h-5"/></svg>, PiggyBank: ({ className }) => <PiggyBank size={18} className={className} />, Wallet: ({ className }) => <Wallet size={18} className={className} /> };
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {cards.map(({ label, value, sub, subColor, iconBg, iconColor, Icon, hash }) => {
                      const I = IconMap[Icon];
                      return (
                        <div key={label} onClick={() => navigate(`/savings#${hash}`)} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                            <I className={iconColor} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
                            {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Recent transactions */}
              {recent.length > 0 && (
                <div className={card}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent in {MONTH_NAMES[month - 1]}</h2>
                    <button
                      onClick={() => navigate(`/expenses?month=${month}&year=${year}`)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      View all
                    </button>
                  </div>
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
        const weeklyBreakdown = data.weeklyBreakdown ?? [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const currentWeek = weeklyBreakdown.find((w) => w.start <= todayStr && todayStr < w.end);
        const monthlyData = monthly.map((m) => ({
          month: format(parseISO(`${m.month}-01`), 'MMM yy'),
          monthKey: m.month,
          total: m.total,
        }));

        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Monthly trend */}
              {monthlyData.length > 0 && (
                <div className={card}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Spending</h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Click a bar to view expenses</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} />
                      <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={(v) => fmtRound(v)} width={60} />
                      <Tooltip
                        formatter={(v) => [fmtRound(v), 'Spent']}
                        contentStyle={tooltipStyle}
                        cursor={{ fill: dark ? '#374151' : '#f3f4f6' }}
                      />
                      <Bar
                        dataKey="total"
                        radius={[4, 4, 0, 0]}
                        style={{ cursor: 'pointer' }}
                        onClick={(data) => {
                          const [y, m] = data.monthKey.split('-').map(Number);
                          navigate(`/expenses?month=${m}&year=${y}`);
                        }}
                      >
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
              {catData.length > 0 && (() => {
                const catTotal = catData.reduce((s, c) => s + c.total, 0);
                const active = activeIdx !== null ? catData[activeIdx] : null;
                return (
                  <div className={card}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {MONTH_NAMES[month - 1]} by Category
                      </h2>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Hover to explore</span>
                    </div>
                    <div className="flex gap-5 items-center">
                      {/* Donut */}
                      <div className="relative shrink-0 w-36 h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={catData}
                              dataKey="total"
                              cx="50%"
                              cy="50%"
                              innerRadius={42}
                              outerRadius={62}
                              paddingAngle={2}
                              strokeWidth={0}
                              onMouseEnter={(_, i) => setActiveIdx(i)}
                              onMouseLeave={() => setActiveIdx(null)}
                            >
                              {catData.map((entry, i) => (
                                <Cell
                                  key={entry.id}
                                  fill={entry.color}
                                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.2}
                                  style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                                  onClick={() => navigate(`/expenses?month=${month}&year=${year}&category_id=${entry.id}`)}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                          {active ? (
                            <>
                              <p className="text-[10px] font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[80px]">{active.name}</p>
                              <p className="text-sm font-bold leading-tight" style={{ color: active.color }}>
                                {catTotal > 0 ? Math.round((active.total / catTotal) * 1000) / 10 : 0}%
                              </p>
                              <p className="text-[9px] text-gray-400 leading-tight">{fmtRound(active.total)}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[10px] text-gray-400">Total</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtRound(catTotal)}</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Legend — 2-column chip grid */}
                      <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-1 max-h-36 overflow-y-auto">
                        {catData.map((entry, i) => {
                          const dimmed = activeIdx !== null && activeIdx !== i;
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer min-w-0"
                              style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.15s' }}
                              onMouseEnter={() => setActiveIdx(i)}
                              onMouseLeave={() => setActiveIdx(null)}
                              onClick={() => navigate(`/expenses?month=${month}&year=${year}&category_id=${entry.id}`)}
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{entry.name}</span>
                              <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                                {catTotal > 0 ? Math.round((entry.total / catTotal) * 1000) / 10 : 0}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Weekly Spending */}
            {weeklyBreakdown.length > 0 && (
              <div className={card}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Weekly Spending — {MONTH_NAMES[month - 1]}</h2>
                  {currentWeek && year === new Date().getFullYear() && month === new Date().getMonth() + 1 && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                      This week: {fmtRound(currentWeek.total)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {weeklyBreakdown.map((w, idx) => {
                    const isCurrentWeek = currentWeek && w.start === currentWeek.start;
                    const maxTotal = Math.max(...weeklyBreakdown.map((x) => x.total), 1);
                    const pct = (w.total / maxTotal) * 100;
                    const startD = new Date(w.start + 'T00:00:00');
                    const endD   = new Date(w.end   + 'T00:00:00'); endD.setDate(endD.getDate() - 1);
                    const fmtD = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div key={w.start}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-medium ${isCurrentWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {isCurrentWeek ? '▶ ' : ''}Week {idx + 1} <span className="font-normal text-gray-400">({fmtD(startD)} – {fmtD(endD)})</span>
                          </span>
                          <span className={`font-semibold ${isCurrentWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {fmtRound(w.total)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isCurrentWeek ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budget Status */}
            {budgetStatus.length > 0 && (() => {
              const now2 = new Date();
              const isCurrentMonth = year === now2.getFullYear() && month === now2.getMonth() + 1;
              const dayOfMonth = isCurrentMonth ? now2.getDate() : new Date(year, month, 0).getDate();
              const daysInMonth = new Date(year, month, 0).getDate();

              return (
                <div className={card}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Budget Status</h2>
                    <button
                      onClick={() => navigate('/budgets')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      Manage budgets
                    </button>
                  </div>
                  <div className="space-y-4">
                    {budgetStatus.map((b) => {
                      const pct = Math.min((b.spent / b.amount) * 100, 100);
                      const over = b.spent > b.amount;

                      // Forecasting (monthly budgets only, when not already over)
                      let forecastMsg = null;
                      if (b.period === 'monthly' && !over && dayOfMonth > 0 && b.spent > 0) {
                        const dailyRate = b.spent / dayOfMonth;
                        const projected = dailyRate * daysInMonth;
                        if (projected > b.amount) {
                          const daysToExceed = Math.floor((b.amount - b.spent) / dailyRate);
                          const exceedDate = new Date(year, month - 1, dayOfMonth + daysToExceed);
                          const exceedStr = exceedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          forecastMsg = { type: 'warn', text: `At this rate, exceeded by ${exceedStr}` };
                        } else {
                          const remaining = b.amount - b.spent;
                          forecastMsg = { type: 'ok', text: `${fmtRound(remaining)} left · projected ${fmtRound(Math.round(projected))}` };
                        }
                      } else if (over) {
                        forecastMsg = { type: 'over', text: `Over by ${fmtRound(b.spent - b.amount)}` };
                      }

                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              {(() => { const I = b.category_icon ? ICON_MAP[b.category_icon] : null; const bg = b.category_color ?? '#6b7280'; return <span className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0" style={{ background: bg }}>{I ? <I size={12} /> : <CircleDollarSign size={12} />}</span>; })()}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {b.category_name ?? 'Overall'} ({b.period})
                              </span>
                              {over ? <AlertTriangle size={13} className="text-red-500" /> : <CheckCircle size={13} className="text-emerald-500" />}
                            </div>
                            <span className={`text-xs font-semibold ${over ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {fmtRound(b.spent)} / {fmtRound(b.amount)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {forecastMsg && (
                            <p className={`text-xs mt-1 ${forecastMsg.type === 'warn' ? 'text-amber-500 dark:text-amber-400' : forecastMsg.type === 'over' ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {forecastMsg.text}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </>
        );
      })()}
    </div>
  );
}
