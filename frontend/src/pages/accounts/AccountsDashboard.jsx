import { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { TrendingUp, TrendingDown, CreditCard, PiggyBank, AlertCircle, Calendar, X, Car, Landmark } from 'lucide-react';
import { useAccounts, useReorderAccounts } from '../../hooks/useAccounts';
import { useAccountPayments, useCreatePayment } from '../../hooks/useAccountPayments';
import { useAuth } from '../../contexts/AuthContext';
import { WS, fmtUSD, fmtUSDDecimal, fmtFullDate, fmtDate, nextDueDate, daysFromToday, DueBadge, AccountDetailModal, AccountModal, BankLogo } from './shared';

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

function CarFinancePaymentModal({ onClose }) {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [amount, setAmount] = useState('');
  const [date, setDate]     = useState(todayStr);
  const [error, setError]   = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    const cfg = JSON.parse(localStorage.getItem('car_finance_config') || '{}');
    if (!amt || amt <= 0)              { setError('Enter a valid amount.');           return; }
    if (!date)                         { setError('Select a date.');                  return; }
    if (amt > (cfg.remainingAmount ?? 0)) { setError('Amount exceeds remaining balance.'); return; }

    let nextDueDate = cfg.dueDate;
    if (cfg.dueDate) {
      const day = parseInt(cfg.dueDate.split('-')[2]);
      const paid = new Date(date + 'T00:00:00');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), day);
      const baseDue = thisMonthDue >= today ? thisMonthDue : new Date(now.getFullYear(), now.getMonth() + 1, day);
      const cycleStart = new Date(baseDue.getFullYear(), baseDue.getMonth() - 1, day);
      const next = paid >= cycleStart
        ? new Date(baseDue.getFullYear(), baseDue.getMonth() + 1, day)
        : baseDue;
      nextDueDate = next.toLocaleDateString('en-CA');
    }

    const nextConfig = {
      ...cfg,
      remainingAmount: Math.max(0, (cfg.remainingAmount ?? 0) - amt),
      remainingMonths: Math.max(0, (cfg.remainingMonths ?? 0) - 1),
      dueDate: nextDueDate,
    };
    const existing = JSON.parse(localStorage.getItem('car_finance_payments') || '[]');
    const nextPayments = [{ id: Date.now(), date, amount: amt }, ...existing];
    localStorage.setItem('car_finance_config', JSON.stringify(nextConfig));
    localStorage.setItem('car_finance_payments', JSON.stringify(nextPayments));
    window.dispatchEvent(new CustomEvent('carFinanceUpdated'));
    onClose();
  }

  const cfg = JSON.parse(localStorage.getItem('car_finance_config') || '{}');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <Car size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Car Finance</p>
              <p className="text-xs text-rose-500 font-medium">{fmtUSD(cfg.remainingAmount ?? 0)} remaining</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (USD)</label>
              <input
                type="number" step="0.01" min="0.01"
                placeholder="0.00"
                autoFocus
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); setError(''); }}
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 -mt-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-1.5">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={15} className={iconColor} />
      </span>
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

const is401k = (a) => /401k|principal/i.test(a.name ?? '');

// Net worth hero: big figure + a savings/debt split donut
function NetWorthHero({ accts }) {
  const savings = accts.filter((a) => a.type === 'savings');
  const credits = accts.filter((a) => a.type === 'credit');
  const totalSavingsAll  = savings.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalOutstanding = credits.reduce((s, a) => s + (a.balance ?? 0), 0);
  const netWorth = totalSavingsAll - totalOutstanding;

  const total = totalSavingsAll + totalOutstanding;
  const savingsPct = total > 0 ? (totalSavingsAll / total) * 100 : 100;
  const debtPct = 100 - savingsPct;
  const circumference = 2 * Math.PI * 38;
  const savingsLen = (savingsPct / 100) * circumference;
  const debtLen = (debtPct / 100) * circumference;

  const positive = netWorth >= 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[20px] border border-gray-200 dark:border-gray-800 shadow-sm p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-[1.1fr_auto] gap-6 items-center">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Net worth</p>
        <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {fmtUSD(netWorth)}
        </p>
        <p className="mt-2.5 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${positive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
            {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {positive ? 'Savings exceed debt' : 'Debt exceeds savings'}
          </span>
          <span><b className="text-gray-700 dark:text-gray-200 font-semibold">{fmtUSD(totalSavingsAll)}</b> saved · <b className="text-gray-700 dark:text-gray-200 font-semibold">{fmtUSD(totalOutstanding)}</b> owed</span>
        </p>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-4 justify-start sm:justify-end">
          <svg width="88" height="88" viewBox="0 0 92 92" className="shrink-0">
            <circle cx="46" cy="46" r="38" fill="none" className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="12" />
            {savingsPct > 0 && (
              <circle cx="46" cy="46" r="38" fill="none" className="stroke-emerald-500" strokeWidth="12"
                strokeDasharray={`${savingsLen} ${circumference}`} strokeLinecap="round" transform="rotate(-90 46 46)" />
            )}
            {debtPct > 0 && (
              <circle cx="46" cy="46" r="38" fill="none" className="stroke-rose-500" strokeWidth="12"
                strokeDasharray={`${debtLen} ${circumference}`} strokeDashoffset={-savingsLen} strokeLinecap="round" transform="rotate(-90 46 46)" />
            )}
          </svg>
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-emerald-500 shrink-0" />
              Savings <b className="text-gray-900 dark:text-white font-bold">{savingsPct.toFixed(0)}%</b>
            </span>
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-rose-500 shrink-0" />
              Debt <b className="text-gray-900 dark:text-white font-bold">{debtPct.toFixed(0)}%</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Horizontal-scroll strip of mini account cards, with a savings/credit toggle
function AccountsStrip({ savings, credits }) {
  const [tab, setTab] = useState('savings');
  const [viewAccount, setViewAccount] = useState(null);
  const [editAccount, setEditAccount] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const dragId = useRef(null);
  const reorder = useReorderAccounts(WS);

  const baseList = tab === 'credit' ? credits : savings;
  const list = localOrder
    ? localOrder.map((id) => baseList.find((a) => a.id === id)).filter(Boolean)
    : baseList;

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
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Accounts</h2>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold shrink-0 ml-auto">
          <button
            onClick={() => { setTab('savings'); setLocalOrder(null); }}
            className={`px-3 py-1.5 transition-colors ${tab === 'savings' ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            Savings · {savings.length}
          </button>
          <button
            onClick={() => { setTab('credit'); setLocalOrder(null); }}
            className={`px-3 py-1.5 transition-colors ${tab === 'credit' ? 'bg-rose-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            Credit · {credits.length}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No {tab} accounts</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pt-3">
          {list.map((a) => {
            const isSavings = a.type === 'savings';
            const pct = a.credit_limit ? Math.min((a.balance / a.credit_limit) * 100, 100) : null;
            return (
              <button
                key={a.id}
                draggable={!isTouch}
                onDragStart={!isTouch ? () => handleDragStart(a.id) : undefined}
                onDragOver={!isTouch ? (e) => handleDragOver(e, a.id) : undefined}
                onDrop={!isTouch ? handleDrop : undefined}
                onClick={() => setViewAccount(a)}
                className="text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 flex flex-col gap-2.5 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BankLogo name={a.name} sizeClass="w-8 h-8" fallback={isSavings ? (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                      <PiggyBank size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                  ) : undefined} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{a.name}</p>
                    {a.belongs_to_username && <p className="text-[11px] text-gray-400 truncate">{a.belongs_to_username}</p>}
                  </div>
                </div>
                <p className={`text-lg font-extrabold tracking-tight ${isSavings ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {fmtUSD(a.balance)}
                </p>
                {pct !== null && (
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>{isSavings ? (a.is_liquid ? 'Liquid' : 'Non-liquid') : (pct !== null ? `${pct.toFixed(0)}% used` : '—')}</span>
                  {a.updated_at && <span>Updated {fmtDate(a.updated_at.split(' ')[0])}</span>}
                </div>
              </button>
            );
          })}
        </div>
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

export default function AccountsDashboard() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const { data: acctData, isLoading: acctLoading } = useAccounts(WS);
  const { data: pmtData, isLoading: pmtLoading } = useAccountPayments();
  const [payingAccount, setPayingAccount] = useState(null);
  const [carPaymentOpen, setCarPaymentOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('all');
  const [carCfg, setCarCfg] = useState(() => { try { return JSON.parse(localStorage.getItem('car_finance_config') || '{}'); } catch { return {}; } });

  useEffect(() => {
    const handler = () => { try { setCarCfg(JSON.parse(localStorage.getItem('car_finance_config') || '{}')); } catch {} };
    window.addEventListener('carFinanceUpdated', handler);
    return () => window.removeEventListener('carFinanceUpdated', handler);
  }, []);

  const accounts = acctData?.data ?? [];
  const payments = pmtData?.data ?? [];

  const activeAccounts = accounts.filter((a) => a.is_active !== 0);

  // Users that have at least one account assigned
  const userNames = [...new Set(activeAccounts.map((a) => a.belongs_to_username).filter(Boolean))].sort();

  const scopedAccounts = selectedUser === 'all' ? activeAccounts : activeAccounts.filter((a) => a.belongs_to_username === selectedUser);
  const allSavings = scopedAccounts.filter((a) => a.type === 'savings' && !is401k(a));
  const all401k = scopedAccounts.filter((a) => a.type === 'savings' && is401k(a));
  const allCredits = scopedAccounts.filter((a) => a.type === 'credit');
  const totalCreditLimit = allCredits.reduce((s, a) => s + (a.credit_limit ?? 0), 0);
  const totalOutstanding = allCredits.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalSavings = allSavings.reduce((s, a) => s + (a.balance ?? 0), 0);
  const total401k = all401k.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalAvailable = totalCreditLimit - totalOutstanding;

  const upcomingDue = useMemo(() => {
    const credits = allCredits
      .filter((a) => a.due_day)
      .map((a) => {
        const due = nextDueDate(a.due_day, a.last_paid_date);
        const days = daysFromToday(due);
        return { ...a, due, days, _type: 'credit' };
      })
      .filter((a) => a.days !== null && a.days <= 30);

    if (carCfg.dueDate) {
      const days = daysFromToday(carCfg.dueDate);
      if (days !== null && days <= 30) {
        credits.push({ _type: 'car', id: '__car__', name: 'Car Finance', dueDate: carCfg.dueDate, days, remainingAmount: carCfg.remainingAmount ?? 0 });
      }
    }

    return credits.sort((a, b) => a.days - b.days);
  }, [allCredits, carCfg]);

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit &amp; Savings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Overview across all accounts</p>
        </div>
        {userNames.length > 0 && (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setSelectedUser('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedUser === 'all' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              All
            </button>
            {userNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedUser(name)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedUser === name ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Net worth hero */}
      <NetWorthHero accts={scopedAccounts} />

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={PiggyBank}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          label="Total Savings"
          value={fmtUSD(totalSavings)}
          sub={`${allSavings.length} account${allSavings.length !== 1 ? 's' : ''}`}
        />
        <StatTile
          icon={CreditCard}
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          iconColor="text-rose-600 dark:text-rose-400"
          label="Outstanding"
          value={fmtUSD(totalOutstanding)}
          sub={`${allCredits.length} card${allCredits.length !== 1 ? 's' : ''}`}
        />
        <StatTile
          icon={AlertCircle}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Available Credit"
          value={fmtUSD(totalAvailable >= 0 ? totalAvailable : 0)}
          sub={totalCreditLimit > 0 ? `of ${fmtUSD(totalCreditLimit)} limit` : 'no limit set'}
        />
        <StatTile
          icon={Landmark}
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          iconColor="text-indigo-600 dark:text-indigo-400"
          label="401k Balance"
          value={fmtUSD(total401k)}
          sub={`${all401k.length} account${all401k.length !== 1 ? 's' : ''}`}
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
            <div className="space-y-2">
              {upcomingDue.map((a) => {
                if (a._type === 'car') {
                  const cls =
                    a.days <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' :
                    a.days <= 7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                                  'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
                  const label =
                    a.days < 0   ? `Overdue ${Math.abs(a.days)}d` :
                    a.days === 0 ? 'Due today' :
                    a.days === 1 ? 'Due tomorrow' :
                                   `Due in ${a.days}d (${fmtDate(a.dueDate)})`;
                  return (
                    <button key="__car__" onClick={() => setCarPaymentOpen(true)} className="w-full flex items-center justify-between gap-3 px-2 py-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                          <Car size={14} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Car Finance</p>
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fmtUSD(a.remainingAmount)} remaining</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${cls}`}>
                        <Calendar size={10} />{label}
                      </span>
                    </button>
                  );
                }
                return isAdmin ? (
                  <button
                    key={a.id}
                    onClick={() => setPayingAccount(a)}
                    className="w-full flex items-center justify-between gap-3 px-2 py-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                    title="Click to record a payment"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogo name={a.name} sizeClass="w-7 h-7" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {a.name}{a.belongs_to_username && <span className="text-gray-400 font-normal"> · {a.belongs_to_username}</span>}
                        </p>
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
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {a.name}{a.belongs_to_username && <span className="text-gray-400 font-normal"> · {a.belongs_to_username}</span>}
                        </p>
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fmtUSD(a.balance)} outstanding</p>
                      </div>
                    </div>
                    <DueBadge day={a.due_day} lastPaidDate={a.last_paid_date} />
                  </div>
                );
              })}
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

      {/* Accounts strip */}
      {scopedAccounts.length > 0 && (
        <AccountsStrip savings={scopedAccounts.filter((a) => a.type === 'savings')} credits={allCredits} />
      )}

      {carPaymentOpen && (
        <CarFinancePaymentModal onClose={() => setCarPaymentOpen(false)} />
      )}
      {payingAccount && (
        <QuickPaymentModal account={payingAccount} onClose={() => setPayingAccount(null)} />
      )}
    </div>
  );
}
