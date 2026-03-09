import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, CreditCard, PiggyBank, AlertCircle, Calendar } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import { useAccountPayments } from '../../hooks/useAccountPayments';
import { WS, fmtUSD, fmtUSDDecimal, fmtFullDate, nextDueDate, daysFromToday, DueBadge, AccountDetailModal } from './shared';

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

function AccountsBreakdown({ savings, credits }) {
  const [tab, setTab] = useState('credit');
  const [viewAccount, setViewAccount] = useState(null);
  const list = tab === 'credit' ? credits : savings;
  const total = list.reduce((s, a) => s + (a.balance ?? 0), 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Active Accounts</h2>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold">
          <button
            onClick={() => setTab('credit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${tab === 'credit' ? 'bg-rose-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <CreditCard size={12} /> Credit ({credits.length})
          </button>
          <button
            onClick={() => setTab('savings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${tab === 'savings' ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <PiggyBank size={12} /> Savings ({savings.length})
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No {tab} accounts</p>
      ) : (
        <>
          <div className="space-y-2">
            {list.map((a) => {
              const isSavings = a.type === 'savings';
              const pct = a.credit_limit ? Math.min((a.balance / a.credit_limit) * 100, 100) : null;
              return (
                <button
                  key={a.id}
                  onClick={() => setViewAccount(a)}
                  className="w-full flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl px-2 -mx-2 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSavings ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                    {isSavings
                      ? <PiggyBank size={14} className="text-emerald-600 dark:text-emerald-400" />
                      : <CreditCard size={14} className="text-rose-600 dark:text-rose-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{a.name}</p>
                    {pct !== null && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${isSavings ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {fmtUSD(a.balance)}
                  </p>
                </button>
              );
            })}
          </div>
          <div className={`mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-xs font-semibold ${tab === 'credit' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            <span>Total {tab === 'credit' ? 'outstanding' : 'balance'}</span>
            <span>{fmtUSD(total)}</span>
          </div>
        </>
      )}
      {viewAccount && (
        <AccountDetailModal
          a={viewAccount}
          onClose={() => setViewAccount(null)}
          onEdit={() => setViewAccount(null)}
        />
      )}
    </div>
  );
}

export default function AccountsDashboard() {
  const { data: acctData, isLoading: acctLoading } = useAccounts(WS);
  const { data: pmtData, isLoading: pmtLoading } = useAccountPayments();

  const accounts = acctData?.data ?? [];
  const payments = pmtData?.data ?? [];

  const activeAccounts = accounts.filter((a) => a.is_active !== 0);
  const savings = activeAccounts.filter((a) => a.type === 'savings');
  const credits = activeAccounts.filter((a) => a.type === 'credit');

  const totalSavings    = savings.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalOutstanding = credits.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalCreditLimit = credits.reduce((s, a) => s + (a.credit_limit ?? 0), 0);
  const totalAvailable  = totalCreditLimit - totalOutstanding;
  const netWorth        = totalSavings - totalOutstanding;

  const upcomingDue = useMemo(() => {
    return credits
      .filter((a) => a.due_day)
      .map((a) => {
        const due = nextDueDate(a.due_day, a.last_paid_date);
        const days = daysFromToday(due);
        return { ...a, due, days };
      })
      .filter((a) => a.days !== null && a.days <= 30)
      .sort((a, b) => a.days - b.days);
  }, [credits]);

  const recentPayments = payments.slice(0, 5);

  if (acctLoading || pmtLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Overview of your credit &amp; savings accounts</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          iconBg={netWorth >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}
          iconColor={netWorth >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}
          label="Net Worth"
          value={fmtUSD(netWorth)}
          sub={netWorth >= 0 ? 'savings exceed debt' : 'debt exceeds savings'}
          subColor={netWorth >= 0 ? 'text-blue-500' : 'text-red-400'}
        />
        <StatCard
          icon={PiggyBank}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          label="Total Savings"
          value={fmtUSD(totalSavings)}
          sub={`${savings.length} account${savings.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={CreditCard}
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          iconColor="text-rose-600 dark:text-rose-400"
          label="Outstanding"
          value={fmtUSD(totalOutstanding)}
          sub={`${credits.length} card${credits.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={AlertCircle}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Available Credit"
          value={fmtUSD(totalAvailable >= 0 ? totalAvailable : 0)}
          sub={totalCreditLimit > 0 ? `of ${fmtUSD(totalCreditLimit)} limit` : 'no credit limit set'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming payments */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Upcoming Due Dates</h2>
            <span className="ml-auto text-xs text-gray-400">next 30 days</span>
          </div>
          {upcomingDue.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No payments due in the next 30 days</p>
          ) : (
            <div className="space-y-3">
              {upcomingDue.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{a.name}</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fmtUSD(a.balance)} outstanding</p>
                  </div>
                  <DueBadge day={a.due_day} lastPaidDate={a.last_paid_date} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Payments</h2>
            <Link to="/accounts/payments" className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">View all →</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No payments recorded yet</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.account_name}</p>
                    {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtUSDDecimal(p.amount)}</p>
                    <p className="text-[11px] text-gray-400">{fmtFullDate(p.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accounts breakdown */}
      {activeAccounts.length > 0 && (
        <AccountsBreakdown savings={savings} credits={credits} />
      )}
    </div>
  );
}
