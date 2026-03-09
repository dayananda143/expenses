import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, GripVertical,
  CreditCard, PiggyBank, CalendarClock, Calendar,
  EyeOff, Eye, TrendingUp, Wallet, ShieldCheck, AlertCircle, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  useAccounts, useCreateAccount, useUpdateAccount,
  useDeleteAccount, useReorderAccounts,
} from '../hooks/useAccounts';

// Accounts are workspace-agnostic here — stored under 'us', displayed in USD
const WS = 'us';
const USD_CFG = { currency: 'USD', locale: 'en-US' };

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextDueDate(day) {
  if (!day) return null;
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return thisMonth >= today ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, day);
}

function daysFromToday(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date) - today) / 86400000);
}

function fmtDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function DueBadge({ day }) {
  if (!day) return null;
  const due = nextDueDate(day);
  const days = daysFromToday(due);
  if (days === null) return null;
  const cls =
    days <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' :
    days <= 7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
  const text =
    days < 0   ? `Due ${Math.abs(days)}d overdue` :
    days === 0 ? 'Due today' :
    days === 1 ? 'Due tomorrow' :
                 `Due in ${days}d (${fmtDate(due)})`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <Calendar size={10} />{text}
    </span>
  );
}

function PromoBadge({ date }) {
  if (!date) return null;
  const days = daysFromToday(date);
  if (days === null || days < 0) return null;
  const cls = days <= 30
    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <CalendarClock size={10} />Promo ends {fmtDate(date)}{days <= 30 ? ` (${days}d)` : ''}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming payments ────────────────────────────────────────────────────────

function UpcomingPayments({ creditAccounts }) {
  const upcoming = creditAccounts
    .filter(a => a.due_day && a.is_active)
    .map(a => ({ ...a, dueDate: nextDueDate(a.due_day), days: daysFromToday(nextDueDate(a.due_day)) }))
    .filter(a => a.days !== null && a.days <= 30)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={15} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Upcoming Payments</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">next 30 days</span>
      </div>
      <div className="space-y-2">
        {upcoming.map(a => {
          const urgency =
            a.days <= 3 ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10' :
            a.days <= 7 ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10' :
                          'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40';
          const dayLabel = a.days === 0 ? 'Today' : a.days === 1 ? 'Tomorrow' : `in ${a.days}d`;
          return (
            <div key={a.id} className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${urgency}`}>
              <div className="flex items-center gap-2.5">
                <CreditCard size={14} className="text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{a.name}</p>
                  <p className="text-xs text-gray-400">{fmtDate(a.dueDate)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{fmt(a.balance)}</p>
                <p className="text-xs text-gray-400">{dayLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({ a, onEdit, onDelete, onDragStart, onDragOver, onDrop }) {
  const isSavings = a.type === 'savings';
  const pct = a.credit_limit ? Math.min((a.balance / a.credit_limit) * 100, 100) : null;
  const available = a.credit_limit != null ? a.credit_limit - a.balance : null;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(a.id)}
      onDragOver={(e) => onDragOver(e, a.id)}
      onDrop={onDrop}
      className={`group relative rounded-2xl border transition-all hover:shadow-md ${
        isSavings
          ? 'border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-gray-900 hover:border-emerald-300 dark:hover:border-emerald-700'
          : 'border-rose-100 dark:border-rose-900/40 bg-white dark:bg-gray-900 hover:border-rose-300 dark:hover:border-rose-700'
      } ${!a.is_active ? 'opacity-60' : ''}`}
    >
      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${isSavings ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      <div className="px-5 py-4 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <GripVertical size={15} className="text-gray-300 dark:text-gray-700 cursor-grab shrink-0" />
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSavings ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
              {isSavings
                ? <PiggyBank size={16} className="text-emerald-600 dark:text-emerald-400" />
                : <CreditCard size={16} className="text-rose-600 dark:text-rose-400" />
              }
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{a.name}</p>
                {!a.is_active && <EyeOff size={11} className="text-gray-400 shrink-0" />}
              </div>
              {a.notes && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.notes}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className={`text-base font-bold ${isSavings ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {fmt(a.balance)}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{isSavings ? 'balance' : 'outstanding'}</p>
            </div>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                <Pencil size={12} />
              </button>
              <button onClick={() => onDelete(a)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
        {!isSavings && (
          <div className="ml-12 mt-3 space-y-2">
            {pct !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>{fmt(available)} available</span>
                  <span className={`font-semibold ${pct > 80 ? 'text-red-500' : pct > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>{pct.toFixed(0)}% used</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-gray-400">of {fmt(a.credit_limit)} limit</p>
              </div>
            )}
            {(a.due_day || a.promo_apr_end_date) && (
              <div className="flex flex-wrap gap-1.5">
                <DueBadge day={a.due_day} />
                <PromoBadge date={a.promo_apr_end_date} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

function AccountModal({ account, defaultType, onClose }) {
  const create = useCreateAccount(WS);
  const update = useUpdateAccount(WS);
  const isEdit = !!account;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: account ? {
      name: account.name, type: account.type, balance: account.balance,
      credit_limit: account.credit_limit ?? '', due_day: account.due_day ?? '',
      promo_apr_end_date: account.promo_apr_end_date ?? '',
      is_active: account.is_active !== 0, notes: account.notes ?? '',
    } : { type: defaultType ?? 'savings', balance: '', credit_limit: '', due_day: '', promo_apr_end_date: '', is_active: true, notes: '' },
  });
  const type = watch('type');

  async function onSubmit(data) {
    const payload = {
      ...data,
      balance: parseFloat(data.balance || 0),
      credit_limit: data.type === 'credit' && data.credit_limit ? parseFloat(data.credit_limit) : null,
      due_day: data.type === 'credit' && data.due_day ? parseInt(data.due_day) : null,
      promo_apr_end_date: data.type === 'credit' && data.promo_apr_end_date ? data.promo_apr_end_date : null,
      is_active: data.is_active,
    };
    if (isEdit) await update.mutateAsync({ id: account.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${type === 'credit' ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {type === 'credit' ? <CreditCard size={14} className="text-rose-600 dark:text-rose-400" /> : <PiggyBank size={14} className="text-emerald-600 dark:text-emerald-400" />}
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Account' : 'New Account'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className={labelCls}>Account Name</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Chase Savings, Amex Credit" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'savings', label: 'Savings', Icon: PiggyBank, activeCs: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
                { value: 'credit',  label: 'Credit',  Icon: CreditCard, activeCs: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400' },
              ].map(({ value, label, Icon, activeCs }) => (
                <label key={value} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm font-medium ${type === value ? activeCs : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                  <input type="radio" value={value} {...register('type')} className="sr-only" />
                  <Icon size={14} />{label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>{type === 'credit' ? 'Outstanding Balance' : 'Balance'} (USD)</label>
            <input type="number" step="0.01" min="0" {...register('balance', { required: 'Required' })} className={inputCls} placeholder="0.00" />
            {errors.balance && <p className="text-xs text-red-500 mt-1">{errors.balance.message}</p>}
          </div>
          {type === 'credit' && (
            <>
              <div>
                <label className={labelCls}>Credit Limit (USD)</label>
                <input type="number" step="0.01" min="0" {...register('credit_limit')} className={inputCls} placeholder="e.g. 5000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><span className="flex items-center gap-1"><Calendar size={9} />Due Day</span></label>
                  <input type="number" min="1" max="31" {...register('due_day', { min: { value: 1, message: '1–31' }, max: { value: 31, message: '1–31' } })} className={inputCls} placeholder="1–31" />
                  {errors.due_day && <p className="text-xs text-red-500 mt-1">{errors.due_day.message}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">Repeats monthly</p>
                </div>
                <div>
                  <label className={labelCls}><span className="flex items-center gap-1"><CalendarClock size={9} />Promo End</span></label>
                  <input type="date" {...register('promo_apr_end_date')} className={inputCls} />
                </div>
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>Notes</label>
            <input {...register('notes')} className={inputCls} placeholder="Optional — bank, last 4 digits…" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-emerald-600 rounded" />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active account</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">Inactive accounts are hidden by default</p>
            </div>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  if (!user?.accounts_access) {
    navigate('/workspace', { replace: true });
    return null;
  }

  const { data, isLoading } = useAccounts(WS);
  const deleteAccount = useDeleteAccount(WS);
  const reorder       = useReorderAccounts(WS);

  const [modal, setModal]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ordered, setOrdered]           = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const dragId = useRef(null);

  useEffect(() => { setOrdered(data?.data ?? []); }, [data]);

  function onDragStart(id) { dragId.current = id; }
  function onDragOver(e, id) {
    e.preventDefault();
    if (id === dragId.current) return;
    setOrdered(prev => {
      const from = prev.findIndex(a => a.id === dragId.current);
      const to   = prev.findIndex(a => a.id === id);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }
  function onDrop() {
    reorder.mutate(ordered.map(a => a.id));
    dragId.current = null;
  }

  async function handleDelete() {
    await deleteAccount.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const active   = ordered.filter(a => a.is_active);
  const inactive = ordered.filter(a => !a.is_active);
  const savings  = active.filter(a => a.type === 'savings');
  const credit   = active.filter(a => a.type === 'credit');

  const totalSavings     = savings.reduce((s, a) => s + (a.balance || 0), 0);
  const totalOutstanding = credit.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLimit       = credit.reduce((s, a) => s + (a.credit_limit || 0), 0);
  const totalAvailable   = Math.max(0, totalLimit - totalOutstanding);
  const netWorth         = totalSavings - totalOutstanding;

  const cardProps = { onEdit: (a) => setModal({ account: a }), onDelete: setDeleteTarget, onDragStart, onDragOver, onDrop };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workspace')}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CreditCard size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">Credit &amp; Savings</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5">USD</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setModal({ defaultType: 'savings' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus size={13} /> Add Account
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
        )}

        {/* Stats */}
        {!isLoading && active.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={TrendingUp}
              iconBg={netWorth >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}
              iconColor={netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
              label="Net Worth" value={fmt(netWorth)} sub="savings − outstanding"
            />
            <StatCard
              icon={PiggyBank} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400"
              label="Total Savings" value={fmt(totalSavings)} sub={`${savings.length} account${savings.length !== 1 ? 's' : ''}`}
            />
            <StatCard
              icon={CreditCard} iconBg="bg-rose-100 dark:bg-rose-900/30" iconColor="text-rose-600 dark:text-rose-400"
              label="Outstanding" value={fmt(totalOutstanding)} sub={`${credit.length} card${credit.length !== 1 ? 's' : ''}`}
            />
            <StatCard
              icon={ShieldCheck} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400"
              label="Available Credit" value={fmt(totalAvailable)}
              sub={totalLimit > 0 ? `of ${fmt(totalLimit)} limit` : 'no limit set'}
            />
          </div>
        )}

        {/* Upcoming payments */}
        {!isLoading && <UpcomingPayments creditAccounts={credit} />}

        {/* Empty state */}
        {!isLoading && ordered.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 py-16 text-center">
            <Wallet size={28} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No accounts yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-5">Add your savings and credit card accounts</p>
            <button onClick={() => setModal({ defaultType: 'savings' })} className="mx-auto flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              <Plus size={13} /> Add First Account
            </button>
          </div>
        )}

        {/* Savings */}
        {!isLoading && savings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank size={14} className="text-emerald-500" />
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Savings</h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{savings.length}</span>
              </div>
              <button onClick={() => setModal({ defaultType: 'savings' })} className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">
                <Plus size={12} /> Add
              </button>
            </div>
            {savings.map(a => <AccountCard key={a.id} a={a} {...cardProps} />)}
          </div>
        )}

        {/* Credit */}
        {!isLoading && credit.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-rose-500" />
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Cards</h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{credit.length}</span>
              </div>
              <button onClick={() => setModal({ defaultType: 'credit' })} className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">
                <Plus size={12} /> Add
              </button>
            </div>
            {credit.map(a => <AccountCard key={a.id} a={a} {...cardProps} />)}
          </div>
        )}

        {/* Add buttons when one section is empty but the other isn't */}
        {!isLoading && active.length > 0 && savings.length === 0 && (
          <button onClick={() => setModal({ defaultType: 'savings' })} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
            <Plus size={13} /> Add Savings Account
          </button>
        )}
        {!isLoading && active.length > 0 && credit.length === 0 && (
          <button onClick={() => setModal({ defaultType: 'credit' })} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-2xl text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
            <Plus size={13} /> Add Credit Card
          </button>
        )}

        {/* Inactive */}
        {!isLoading && inactive.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => setShowInactive(v => !v)} className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 uppercase tracking-wide transition-colors">
              {showInactive ? <Eye size={12} /> : <EyeOff size={12} />}
              Inactive ({inactive.length})
            </button>
            {showInactive && <div className="space-y-2">{inactive.map(a => <AccountCard key={a.id} a={a} {...cardProps} />)}</div>}
          </div>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <AccountModal account={modal.account ?? null} defaultType={modal.defaultType} onClose={() => setModal(null)} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-xs text-center space-y-4">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Delete &ldquo;{deleteTarget.name}&rdquo;?</p>
            <p className="text-xs text-gray-400">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
