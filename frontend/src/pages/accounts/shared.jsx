// Shared helpers, badges, modal, and card used across accounts pages

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { GripVertical, CreditCard, PiggyBank, Calendar, CalendarClock, Pencil, Trash2, X, EyeOff, AlertTriangle, DollarSign, Percent, Info } from 'lucide-react';
import { useCreateAccount, useUpdateAccount } from '../../hooks/useAccounts';
import { useAuth } from '../../contexts/AuthContext';

// ─── Bank Logo ────────────────────────────────────────────────────────────────

const BANK_CONFIGS = [
  { match: /wells.?fargo/i,        domain: 'wellsfargo.com',       bg: 'bg-red-50 dark:bg-red-900/20'    },
  { match: /\bciti(bank)?\b/i,      domain: 'citibank.com',          bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /citizen/i,             domain: 'citizensbank.com',      bg: 'bg-green-50 dark:bg-green-900/20' },
  { match: /optum/i,               domain: 'optum.com',             bg: 'bg-white dark:bg-gray-800'       },
  { match: /chase/i,               domain: 'chase.com',             bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /amex|american.?express/i, domain: 'americanexpress.com', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { match: /discover/i,            domain: 'discover.com',          bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { match: /capital.?one/i,        domain: 'capitalone.com',        bg: 'bg-red-50 dark:bg-red-900/20'    },
  { match: /bank.?of.?america/i,   domain: 'bankofamerica.com',     bg: 'bg-red-50 dark:bg-red-900/20'    },
  { match: /apple/i,               domain: 'apple.com',             bg: 'bg-gray-50 dark:bg-gray-800'     },
  { match: /paypal/i,              domain: 'paypal.com',            bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /synchrony/i,           domain: 'synchrony.com',         bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { match: /us.?bank/i,            domain: 'usbank.com',            bg: 'bg-red-50 dark:bg-red-900/20'    },
  { match: /401k|principal/i,      domain: 'principal.com',         bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /ally/i,               domain: 'ally.com',              bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { match: /marcus|goldman/i,     domain: 'marcus.com',            bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /sofi/i,               domain: 'sofi.com',              bg: 'bg-green-50 dark:bg-green-900/20' },
  { match: /fidelity/i,           domain: 'fidelity.com',          bg: 'bg-green-50 dark:bg-green-900/20' },
  { match: /vanguard/i,           domain: 'vanguard.com',          bg: 'bg-red-50 dark:bg-red-900/20'    },
  { match: /schwab/i,             domain: 'schwab.com',            bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /td.?bank/i,           domain: 'td.com',                bg: 'bg-green-50 dark:bg-green-900/20' },
  { match: /pnc/i,                domain: 'pnc.com',               bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { match: /fifth.?third/i,       domain: '53.com',                bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /regions/i,            domain: 'regions.com',           bg: 'bg-green-50 dark:bg-green-900/20' },
  { match: /truist/i,             domain: 'truist.com',            bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { match: /navy.?federal/i,      domain: 'navyfederal.org',       bg: 'bg-blue-50 dark:bg-blue-900/20'  },
  { match: /robinhood/i,          domain: 'robinhood.com',         bg: 'bg-green-50 dark:bg-green-900/20' },
];

export function getBankConfig(name) {
  return BANK_CONFIGS.find((b) => b.match.test(name ?? '')) ?? null;
}

const INITIAL_COLORS = [
  'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-purple-500', 'bg-lime-500',
];

function nameToColor(name) {
  let hash = 0;
  for (let i = 0; i < (name?.length ?? 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

export function BankLogo({ name, sizeClass = 'w-9 h-9', fallback }) {
  const bank = getBankConfig(name);
  const [failed, setFailed] = useState(false);

  if (!bank || failed) {
    if (fallback !== undefined) return fallback;
    const initial = (name ?? '?')[0].toUpperCase();
    return (
      <div className={`${sizeClass} rounded-xl flex items-center justify-center shrink-0 ${nameToColor(name)}`}>
        <span className="text-white font-bold leading-none" style={{ fontSize: 'clamp(10px, 40%, 16px)' }}>{initial}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${bank.bg}`}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=64`}
        alt=""
        className="w-full h-full object-contain p-1.5"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export const WS = 'us';

export function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0);
}

export function fmtUSDDecimal(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
}

export function nextDueDate(day, lastPaidDate) {
  if (!day) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  // Base next due: this month's day if not yet passed, else next month
  const baseDue = thisMonth >= today ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, day);
  // If paid within the current cycle (after the previous due date), advance by one more month
  if (lastPaidDate) {
    const paid = new Date(lastPaidDate + 'T00:00:00');
    const cycleStart = new Date(baseDue.getFullYear(), baseDue.getMonth() - 1, day);
    if (paid >= cycleStart) {
      return new Date(baseDue.getFullYear(), baseDue.getMonth() + 1, day);
    }
  }
  return baseDue;
}

export function daysFromToday(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date) - today) / 86400000);
}

export function fmtDate(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fmtFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export function DueBadge({ day, lastPaidDate }) {
  if (!day) return null;
  const due = nextDueDate(day, lastPaidDate);
  const days = daysFromToday(due);
  if (days === null) return null;
  const cls =
    days <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' :
    days <= 7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
  const text =
    days < 0   ? `Overdue ${Math.abs(days)}d` :
    days === 0 ? 'Due today' :
    days === 1 ? 'Due tomorrow' :
                 `Due in ${days}d (${fmtDate(due)})`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <Calendar size={10} />{text}
    </span>
  );
}

// Returns months remaining until promo end (0 if < 1 month, null if no date)
export function promoMonthsLeft(date) {
  if (!date) return null;
  const end = new Date(date + 'T00:00:00');
  const now = new Date();
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return months > 0 ? months : 0;
}

export function PromoBadge({ date }) {
  if (!date) return null;
  const days = daysFromToday(date);
  if (days === null || days < 0) return null;
  const end = new Date(date + 'T00:00:00');
  const now = new Date();
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  const timeLabel = days <= 30
    ? `${days}d`
    : months <= 1 ? '1 mo' : `${months} mo`;
  const cls = days <= 30
    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <CalendarClock size={10} />Promo ends {fmtDate(date)} ({timeLabel})
    </span>
  );
}

// ─── Account Modal ────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

export function AccountModal({ account, defaultType, onClose }) {
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
  const name = watch('name');

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
            <BankLogo name={name} sizeClass="w-8 h-8" fallback={type === 'savings' ? (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                <PiggyBank size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : undefined} />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Account' : 'New Account'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Account Name</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Chase Savings, Amex" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'savings', label: 'Savings', Icon: PiggyBank, activeCs: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
                { value: 'credit',  label: 'Credit',  Icon: CreditCard, activeCs: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400' },
              ].map(({ value, label, Icon, activeCs }) => (
                <label key={value} className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm font-medium ${type === value ? activeCs : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
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
                  <label className={labelCls}>Due Day (1–31)</label>
                  <input type="number" min="1" max="31" {...register('due_day')} className={inputCls} placeholder="e.g. 15" />
                  <p className="text-[10px] text-gray-400 mt-1">Repeats monthly</p>
                </div>
                <div>
                  <label className={labelCls}>Promo APR End</label>
                  <input type="date" {...register('promo_apr_end_date')} className={inputCls} />
                </div>
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>Notes</label>
            <input {...register('notes')} className={inputCls} placeholder="Optional" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-blue-600 rounded" />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active account</span>
              <p className="text-xs text-gray-400">Inactive accounts are hidden by default</p>
            </div>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Account Detail Modal ─────────────────────────────────────────────────────

function DetailRow({ label, value, valueClass }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-right ${valueClass ?? 'text-gray-800 dark:text-gray-200'}`}>{value}</span>
    </div>
  );
}

export function AccountDetailModal({ a, onClose, onEdit, onPayment }) {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const isSavings = a.type === 'savings';
  const pct = a.credit_limit ? Math.min((a.balance / a.credit_limit) * 100, 100) : null;
  const available = a.credit_limit != null ? a.credit_limit - a.balance : null;
  const mo = promoMonthsLeft(a.promo_apr_end_date);
  const minPmt = mo && a.balance ? a.balance / mo : null;
  const dueDate = a.due_day ? nextDueDate(a.due_day, a.last_paid_date) : null;
  const daysUntilDue = dueDate ? daysFromToday(dueDate) : null;
  const promoDays = a.promo_apr_end_date ? daysFromToday(a.promo_apr_end_date) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between ${isSavings ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
          <div className="flex items-center gap-3">
            <BankLogo name={a.name} sizeClass="w-10 h-10" fallback={isSavings ? (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/40">
                <PiggyBank size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : undefined} />
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-white">{a.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{a.type} account{!a.is_active ? ' · Inactive' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Balance hero */}
        <div className="px-5 pt-4 pb-3 text-center border-b border-gray-100 dark:border-gray-800">
          <p className={`text-3xl font-black ${isSavings ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {fmtUSDDecimal(a.balance)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{isSavings ? 'current balance' : 'outstanding balance'}</p>
          {pct !== null && (
            <div className="mt-3 space-y-1">
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>{fmtUSD(available)} available</span>
                <span className={`font-semibold ${pct > 80 ? 'text-red-500' : pct > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>{pct.toFixed(1)}% used</span>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="px-5 py-1">
          {a.credit_limit && (
            <DetailRow label="Credit Limit" value={fmtUSDDecimal(a.credit_limit)} valueClass="text-gray-800 dark:text-gray-200" />
          )}
          {dueDate && (
            <DetailRow
              label="Next Due"
              value={
                <span className="flex items-center gap-1.5">
                  {fmtFullDate(dueDate)}
                  {daysUntilDue !== null && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                      daysUntilDue <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                      daysUntilDue <= 7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      {daysUntilDue === 0 ? 'today' : daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d`}
                    </span>
                  )}
                </span>
              }
            />
          )}
          {a.due_day && (
            <DetailRow label="Due Day" value={`Day ${a.due_day} of every month`} />
          )}
          {a.promo_apr_end_date && promoDays !== null && promoDays >= 0 && (
            <DetailRow
              label="Promo APR Ends"
              value={
                <span className="flex items-center gap-1.5">
                  {fmtFullDate(a.promo_apr_end_date)}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    promoDays <= 30 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  }`}>
                    {promoDays <= 30 ? `${promoDays}d` : `${mo} mo`}
                  </span>
                </span>
              }
            />
          )}
          {minPmt !== null && (
            <DetailRow
              label="Min Monthly Payment"
              value={`${fmtUSDDecimal(minPmt)}/mo`}
              valueClass={mo <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}
            />
          )}
          {a.last_paid_date && (
            <DetailRow label="Last Paid" value={fmtFullDate(a.last_paid_date)} />
          )}
          {a.notes && (
            <DetailRow label="Notes" value={a.notes} />
          )}
          <DetailRow label="Status" value={a.is_active ? 'Active' : 'Inactive'} valueClass={a.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'} />
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 flex gap-2">
          <button
            onClick={() => { onClose(); onEdit(a); }}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <Pencil size={13} /> Edit
          </button>
          {!isSavings && onPayment && isAdmin && (
            <button
              onClick={() => { onClose(); onPayment(a); }}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <DollarSign size={13} /> Record Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

export function AccountCard({ a, onEdit, onDelete, onDragStart, onDragOver, onDrop, onPayment, onView }) {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
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
          <button onClick={() => onView?.(a)} className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity">
            <GripVertical size={15} className="text-gray-300 dark:text-gray-700 cursor-grab shrink-0" />
            <BankLogo name={a.name} sizeClass="w-9 h-9" fallback={isSavings ? (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <PiggyBank size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : undefined} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{a.name}</p>
                {!a.is_active && <EyeOff size={11} className="text-gray-400 shrink-0" />}
                {onView && <Info size={10} className="text-gray-300 dark:text-gray-700 shrink-0" />}
              </div>
              {a.notes && <p className="text-xs text-gray-400 truncate">{a.notes}</p>}
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className={`text-base font-bold ${isSavings ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {fmtUSD(a.balance)}
              </p>
              <p className="text-[11px] text-gray-400">{isSavings ? 'balance' : 'outstanding'}</p>
            </div>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
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
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{fmtUSD(available)} available</span>
                  <span className={`font-semibold ${pct > 80 ? 'text-red-500' : pct > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>{pct.toFixed(0)}% used</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-gray-400">of {fmtUSD(a.credit_limit)} limit</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <DueBadge day={a.due_day} lastPaidDate={a.last_paid_date} />
              <PromoBadge date={a.promo_apr_end_date} />
            </div>
            {(() => {
              const mo = promoMonthsLeft(a.promo_apr_end_date);
              if (!mo || !a.balance) return null;
              const minPmt = a.balance / mo;
              const urgent = mo <= 3;
              return (
                <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg ${urgent ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}>
                  {urgent && <AlertTriangle size={10} />}
                  Pay <span className="font-bold">{fmtUSDDecimal(minPmt)}/mo</span> to clear by promo end ({mo} mo left)
                </div>
              );
            })()}
            <div className="flex flex-wrap items-center gap-2">
              {onPayment && isAdmin && (
                <button
                  onClick={() => onPayment(a)}
                  className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Record Payment
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

export function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-xs text-center space-y-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Delete &ldquo;{name}&rdquo;?</p>
        <p className="text-xs text-gray-400">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}
