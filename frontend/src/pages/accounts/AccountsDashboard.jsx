import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { TrendingUp, CreditCard, PiggyBank, AlertCircle, Calendar, X, GripVertical } from 'lucide-react';
import { useAccounts, useReorderAccounts } from '../../hooks/useAccounts';
import { useAccountPayments, useCreatePayment } from '../../hooks/useAccountPayments';
import { useAuth } from '../../contexts/AuthContext';
import { WS, fmtUSD, fmtUSDDecimal, fmtFullDate, nextDueDate, daysFromToday, DueBadge, AccountDetailModal, AccountModal, BankLogo } from './shared';

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

function QuickPaymentModal({ account, onClose }) {
  const create = useCreatePayment();
  const today = new Date().toLocaleDateString('en-CA');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { amount: '', date: today, notes: '' },
  });

  async function onSubmit(data) {
    await create.mutateAsync({
      account_id: account.id,
      amount: parseFloat(data.amount),
      date: data.date,
      notes: data.notes?.trim() || null,
      workspace: WS,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <BankLogo name={account.name} sizeClass="w-8 h-8" />
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{account.name}</p>
              <p className="text-xs text-rose-500 font-medium">{fmtUSD(account.balance)} outstanding</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (USD)</label>
              <input
                type="number" step="0.01" min="0.01"
                placeholder="0.00"
                autoFocus
                {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
                className={inputCls}
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" {...register('date', { required: 'Required' })} className={inputCls} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <input {...register('notes')} className={inputCls} placeholder="e.g. Monthly payment" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [editAccount, setEditAccount] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const dragId = useRef(null);
  const reorder = useReorderAccounts(WS);

  const baseList = tab === 'credit' ? credits : savings;
  const list = localOrder
    ? localOrder.map((id) => baseList.find((a) => a.id === id)).filter(Boolean)
    : baseList;
  const total = baseList.reduce((s, a) => s + (a.balance ?? 0), 0);

  function handleDragStart(id) {
    dragId.current = id;
    setLocalOrder(baseList.map((a) => a.id));
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    setLocalOrder((prev) => {
      const order = prev ?? baseList.map((a) => a.id);
      const from = order.indexOf(dragId.current);
      const to = order.indexOf(id);
      if (from < 0 || to < 0) return prev;
      const next = [...order];
      next.splice(from, 1);
      next.splice(to, 0, dragId.current);
      return next;
    });
  }

  function handleDrop() {
    if (localOrder) reorder.mutate(localOrder);
    dragId.current = null;
    setLocalOrder(null);
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Active Accounts</h2>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold">
          <button
            onClick={() => { setTab('credit'); setLocalOrder(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${tab === 'credit' ? 'bg-rose-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <CreditCard size={12} /> Credit ({credits.length})
          </button>
          <button
            onClick={() => { setTab('savings'); setLocalOrder(null); }}
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
                <div
                  key={a.id}
                  draggable
                  onDragStart={() => handleDragStart(a.id)}
                  onDragOver={(e) => handleDragOver(e, a.id)}
                  onDrop={handleDrop}
                  className="flex items-center gap-2 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 group"
                >
                  <div className="p-1 text-gray-300 dark:text-gray-700 cursor-grab active:cursor-grabbing shrink-0">
                    <GripVertical size={13} />
                  </div>
                  <button
                    onClick={() => setViewAccount(a)}
                    className="flex-1 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl px-2 py-0.5 -mx-2 transition-colors text-left min-w-0"
                  >
                    <BankLogo name={a.name} sizeClass="w-8 h-8" fallback={isSavings ? (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                        <PiggyBank size={14} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : undefined} />
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
                </div>
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
          onEdit={(acc) => { setViewAccount(null); setEditAccount(acc); }}
        />
      )}
      {editAccount && (
        <AccountModal account={editAccount} onClose={() => setEditAccount(null)} />
      )}
    </div>
  );
}

function UserStatSection({ label, accts }) {
  const savings = accts.filter((a) => a.type === 'savings');
  const credits = accts.filter((a) => a.type === 'credit');
  const totalSavings     = savings.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalOutstanding = credits.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalCreditLimit = credits.reduce((s, a) => s + (a.credit_limit ?? 0), 0);
  const totalAvailable   = totalCreditLimit - totalOutstanding;
  const netWorth         = totalSavings - totalOutstanding;

  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
    </div>
  );
}

export default function AccountsDashboard() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const { data: acctData, isLoading: acctLoading } = useAccounts(WS);
  const { data: pmtData, isLoading: pmtLoading } = useAccountPayments();
  const [payingAccount, setPayingAccount] = useState(null);

  const accounts = acctData?.data ?? [];
  const payments = pmtData?.data ?? [];

  const activeAccounts = accounts.filter((a) => a.is_active !== 0);

  // Users that have at least one account assigned
  const userNames = [...new Set(activeAccounts.map((a) => a.belongs_to_username).filter(Boolean))].sort();

  const allSavings = activeAccounts.filter((a) => a.type === 'savings');
  const allCredits = activeAccounts.filter((a) => a.type === 'credit');

  const upcomingDue = useMemo(() => {
    return allCredits
      .filter((a) => a.due_day)
      .map((a) => {
        const due = nextDueDate(a.due_day, a.last_paid_date);
        const days = daysFromToday(due);
        return { ...a, due, days };
      })
      .filter((a) => a.days !== null && a.days <= 30)
      .sort((a, b) => a.days - b.days);
  }, [allCredits]);

  const recentPayments = payments.slice(0, 5);

  if (acctLoading || pmtLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Overview of your credit &amp; savings accounts</p>
      </div>

      {/* Stat sections — All + per user */}
      <div className="space-y-6">
        <UserStatSection label="All" accts={activeAccounts} />
        {userNames.map((name) => (
          <UserStatSection
            key={name}
            label={name}
            accts={activeAccounts.filter((a) => a.belongs_to_username === name)}
          />
        ))}
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
            <div className="space-y-2">
              {upcomingDue.map((a) => (
                isAdmin ? (
                  <button
                    key={a.id}
                    onClick={() => setPayingAccount(a)}
                    className="w-full flex items-center justify-between gap-3 px-2 py-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                    title="Click to record a payment"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogo name={a.name} sizeClass="w-7 h-7" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{a.name}</p>
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fmtUSD(a.balance)} outstanding</p>
                      </div>
                    </div>
                    <DueBadge day={a.due_day} lastPaidDate={a.last_paid_date} />
                  </button>
                ) : (
                  <div key={a.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogo name={a.name} sizeClass="w-7 h-7" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{a.name}</p>
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fmtUSD(a.balance)} outstanding</p>
                      </div>
                    </div>
                    <DueBadge day={a.due_day} lastPaidDate={a.last_paid_date} />
                  </div>
                )
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
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BankLogo name={p.account_name} sizeClass="w-7 h-7" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.account_name}</p>
                      {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                    </div>
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
        <AccountsBreakdown savings={allSavings} credits={allCredits} />
      )}

      {payingAccount && (
        <QuickPaymentModal account={payingAccount} onClose={() => setPayingAccount(null)} />
      )}
    </div>
  );
}
