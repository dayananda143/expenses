import { useState, useRef } from 'react';
import { useLocation, useNavigate as useNav } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Plus, GripVertical, Pencil, Trash2, X,
  Landmark, TrendingUp, CalendarClock, BadgePercent,
  PiggyBank, Building2, ArrowRight, Wallet, ScrollText, HandCoins, Check, Clock, AlertCircle,
} from 'lucide-react';
import { useSavings, useCreateSaving, useUpdateSaving, useDeleteSaving, useReorderSavings, useSavingsUsers } from '../hooks/useSavings';
import { useLent, useCreateLentItem, useUpdateLentItem, useDeleteLentItem } from '../hooks/useLent';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null || isNaN(n)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtINRCompact(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e7) return '₹' + (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + 'L';
  return fmtINR(n);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(maturityDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(maturityDate + 'T00:00:00') - today) / 86400000);
}

function tenureProgress(startDate, maturityDate) {
  if (!startDate || !maturityDate) return 0;
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end   = new Date(maturityDate + 'T00:00:00').getTime();
  const now   = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

function estimatedMaturity(principal, rate, tenure, unit = 'months') {
  if (!principal || !rate || !tenure) return null;
  const t = unit === 'days' ? tenure / 365 : tenure / 12;
  return principal * (1 + (rate / 100) * t);
}

function fmtTenure(tenure, unit) {
  return `${tenure} ${unit === 'days' ? (tenure === 1 ? 'day' : 'days') : (tenure === 1 ? 'month' : 'months')}`;
}

const COLORS = ['bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
function nameColor(name) {
  let h = 0;
  for (let i = 0; i < (name?.length ?? 0); i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

// ── FD Card ────────────────────────────────────────────────────────────────────

const FD_STATUS = {
  active:  { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  matured: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',             dot: 'bg-blue-500'    },
  broken:  { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 dot: 'bg-red-500'     },
};

function FDCard({ fd, onEdit, onDelete, onDragStart, onDragOver, onDrop, isAdmin }) {
  const days    = fd.maturity_date ? daysLeft(fd.maturity_date) : null;
  const pct     = fd.start_date && fd.maturity_date ? tenureProgress(fd.start_date, fd.maturity_date) : null;
  const matAmt  = fd.maturity_amount ?? estimatedMaturity(fd.principal_amount, fd.interest_rate, fd.tenure_months, fd.tenure_unit);
  const gain    = matAmt != null ? matAmt - fd.principal_amount : null;
  const status  = FD_STATUS[fd.status] ?? FD_STATUS.active;

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
      draggable={isAdmin}
      onDragStart={() => isAdmin && onDragStart(fd.id)}
      onDragOver={(e) => { e.preventDefault(); isAdmin && onDragOver(e, fd.id); }}
      onDrop={() => isAdmin && onDrop()}
    >
      <div className="p-4 flex gap-3 items-start">
        {isAdmin && (
          <div className="mt-1 cursor-grab text-gray-200 dark:text-gray-700 hover:text-gray-400 shrink-0">
            <GripVertical size={15} />
          </div>
        )}

        {/* Initial */}
        <div className={`w-10 h-10 rounded-xl ${nameColor(fd.bank_name)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
          {(fd.bank_name?.[0] ?? '?').toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{fd.bank_name}</p>
              {fd.fd_number && <p className="text-[11px] text-gray-400 mt-0.5">FD# {fd.fd_number}</p>}
              {fd.belongs_to_username && (
                <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {fd.belongs_to_username}
                </span>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {fd.status.charAt(0).toUpperCase() + fd.status.slice(1)}
            </span>
          </div>

          {/* Amount row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Principal</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{fmtINR(fd.principal_amount)}</p>
            </div>
            <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 flex-1 min-w-0">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">
                Maturity{!fd.maturity_amount && matAmt ? ' (est.)' : ''}
              </p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{fmtINR(matAmt)}</p>
            </div>
            {gain != null && gain > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2 min-w-0">
                <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Gain</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">+{fmtINR(gain)}</p>
              </div>
            )}
          </div>

          {/* Details row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            {fd.interest_rate > 0 && (
              <span className="flex items-center gap-1">
                <BadgePercent size={11} />{fd.interest_rate}% p.a.
                {fd.tenure_months ? <span className="text-gray-300 dark:text-gray-600">· {fmtTenure(fd.tenure_months, fd.tenure_unit)}</span> : null}
              </span>
            )}
            {fd.maturity_date && (
              <span className="flex items-center gap-1">
                <CalendarClock size={11} />{fmtDate(fd.maturity_date)}
                {fd.status === 'active' && days !== null && (
                  <span className={`font-medium ${days < 0 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                    ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {pct !== null && fd.status === 'active' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">{pct.toFixed(0)}%</span>
            </div>
          )}

          {fd.notes && <p className="mt-2 text-xs text-gray-400 italic">{fd.notes}</p>}
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => onEdit(fd)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(fd)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Savings Card ───────────────────────────────────────────────────────────────

function SavingsCard({ fd, onEdit, onDelete, onDragStart, onDragOver, onDrop, isAdmin }) {
  const isActive = fd.status === 'active';

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex gap-3 items-center shadow-sm"
      draggable={isAdmin}
      onDragStart={() => isAdmin && onDragStart(fd.id)}
      onDragOver={(e) => { e.preventDefault(); isAdmin && onDragOver(e, fd.id); }}
      onDrop={() => isAdmin && onDrop()}
    >
      {isAdmin && (
        <div className="cursor-grab text-gray-200 dark:text-gray-700 hover:text-gray-400 shrink-0">
          <GripVertical size={15} />
        </div>
      )}

      <div className={`w-10 h-10 rounded-xl ${nameColor(fd.bank_name)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
        {(fd.bank_name?.[0] ?? '?').toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{fd.bank_name}</p>
          {!isActive && (
            <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Inactive
            </span>
          )}
          {fd.belongs_to_username && (
            <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              {fd.belongs_to_username}
            </span>
          )}
        </div>
        {fd.fd_number && <p className="text-[11px] text-gray-400 mt-0.5">A/C# {fd.fd_number}</p>}
        {fd.notes && <p className="text-xs text-gray-400 italic mt-0.5 truncate">{fd.notes}</p>}
      </div>

      <div className="text-right shrink-0">
        <p className={`text-lg font-bold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
          {fmtINR(fd.principal_amount)}
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => onEdit(fd)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(fd)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Bond Card ──────────────────────────────────────────────────────────────────

const BOND_STATUS = {
  active:  { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  dot: 'bg-amber-500'  },
  matured: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       dot: 'bg-blue-500'   },
  broken:  { cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',           dot: 'bg-gray-400'   },
};

function BondCard({ fd, onEdit, onDelete, onDragStart, onDragOver, onDrop, isAdmin }) {
  const days   = fd.maturity_date ? daysLeft(fd.maturity_date) : null;
  const pct    = fd.start_date && fd.maturity_date ? tenureProgress(fd.start_date, fd.maturity_date) : null;
  const matAmt = fd.maturity_amount ?? estimatedMaturity(fd.principal_amount, fd.interest_rate, fd.tenure_months, fd.tenure_unit);
  const gain   = matAmt != null ? matAmt - fd.principal_amount : null;
  const status = BOND_STATUS[fd.status] ?? BOND_STATUS.active;

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
      draggable={isAdmin}
      onDragStart={() => isAdmin && onDragStart(fd.id)}
      onDragOver={(e) => { e.preventDefault(); isAdmin && onDragOver(e, fd.id); }}
      onDrop={() => isAdmin && onDrop()}
    >
      <div className="p-4 flex gap-3 items-start">
        {isAdmin && (
          <div className="mt-1 cursor-grab text-gray-200 dark:text-gray-700 hover:text-gray-400 shrink-0">
            <GripVertical size={15} />
          </div>
        )}

        <div className={`w-10 h-10 rounded-xl ${nameColor(fd.bank_name)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
          {(fd.bank_name?.[0] ?? '?').toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{fd.bank_name}</p>
              {fd.fd_number && <p className="text-[11px] text-gray-400 mt-0.5">Bond# {fd.fd_number}</p>}
              {fd.belongs_to_username && (
                <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {fd.belongs_to_username}
                </span>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {fd.status === 'broken' ? 'Sold' : fd.status.charAt(0).toUpperCase() + fd.status.slice(1)}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Face Value</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{fmtINR(fd.principal_amount)}</p>
            </div>
            <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 flex-1 min-w-0">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">
                Maturity{!fd.maturity_amount && matAmt ? ' (est.)' : ''}
              </p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">{fmtINR(matAmt)}</p>
            </div>
            {gain != null && gain > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2 min-w-0">
                <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Gain</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">+{fmtINR(gain)}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            {fd.interest_rate > 0 && (
              <span className="flex items-center gap-1">
                <BadgePercent size={11} />{fd.interest_rate}% coupon
                {fd.tenure_months ? <span className="text-gray-300 dark:text-gray-600">· {fmtTenure(fd.tenure_months, fd.tenure_unit)}</span> : null}
              </span>
            )}
            {fd.maturity_date && (
              <span className="flex items-center gap-1">
                <CalendarClock size={11} />{fmtDate(fd.maturity_date)}
                {fd.status === 'active' && days !== null && (
                  <span className={`font-medium ${days < 0 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                    ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})
                  </span>
                )}
              </span>
            )}
          </div>

          {pct !== null && fd.status === 'active' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">{pct.toFixed(0)}%</span>
            </div>
          )}

          {fd.notes && <p className="mt-2 text-xs text-gray-400 italic">{fd.notes}</p>}
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => onEdit(fd)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(fd)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function EntryModal({ entry, defaultType, onClose }) {
  const createFD = useCreateSaving();
  const updateFD = useUpdateSaving();
  const { data: usersData } = useSavingsUsers();
  const allUsers = usersData?.data ?? [];
  const isEdit = !!entry;
  const entryType = entry?.type ?? defaultType ?? 'fd';
  const isFD    = entryType === 'fd';
  const isBond  = entryType === 'bonds';
  const hasDates = isFD || isBond;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: entry ? {
      bank_name: entry.bank_name,
      fd_number: entry.fd_number ?? '',
      principal_amount: entry.principal_amount,
      interest_rate: entry.interest_rate ?? '',
      tenure_months: entry.tenure_months ?? '',
      tenure_unit: entry.tenure_unit ?? 'months',
      start_date: entry.start_date ?? '',
      maturity_date: entry.maturity_date ?? '',
      maturity_amount: entry.maturity_amount ?? '',
      status: entry.status,
      notes: entry.notes ?? '',
      belongs_to_user_id: entry.belongs_to_user_id ?? '',
    } : {
      status: 'active',
      tenure_months: hasDates ? 12 : '',
      tenure_unit: 'months',
      interest_rate: '',
      belongs_to_user_id: '',
    },
  });

  const principal   = parseFloat(watch('principal_amount')) || 0;
  const rate        = parseFloat(watch('interest_rate')) || 0;
  const tenure      = parseInt(watch('tenure_months')) || 0;
  const tenureUnit  = watch('tenure_unit') || 'months';
  const estimated   = hasDates ? estimatedMaturity(principal, rate, tenure, tenureUnit) : null;

  async function onSubmit(data) {
    const payload = {
      ...data,
      type: entryType,
      principal_amount: parseFloat(data.principal_amount),
      interest_rate: data.interest_rate ? parseFloat(data.interest_rate) : 0,
      tenure_months: data.tenure_months ? parseInt(data.tenure_months) : null,
      tenure_unit: data.tenure_unit || 'months',
      maturity_amount: data.maturity_amount ? parseFloat(data.maturity_amount) : null,
      start_date: data.start_date || null,
      maturity_date: data.maturity_date || null,
      fd_number: data.fd_number || null,
      notes: data.notes || null,
      belongs_to_user_id: data.belongs_to_user_id ? parseInt(data.belongs_to_user_id) : null,
    };
    if (isEdit) await updateFD.mutateAsync({ id: entry.id, ...payload });
    else        await createFD.mutateAsync(payload);
    onClose();
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors placeholder-gray-400';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isFD ? 'bg-emerald-100 dark:bg-emerald-900/30' : isBond ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
            {isFD ? <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" /> : isBond ? <ScrollText size={16} className="text-amber-600 dark:text-amber-400" /> : <PiggyBank size={16} className="text-blue-600 dark:text-blue-400" />}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">
              {isEdit ? `Edit ${isFD ? 'FD' : isBond ? 'Bond' : 'Savings Account'}` : `Add ${isFD ? 'Bank FD' : isBond ? 'Bond' : 'Savings Account'}`}
            </h2>
            <p className="text-xs text-gray-400">{isFD ? 'Fixed Deposit details' : isBond ? 'Bond investment details' : 'Savings account details'}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Bank Name *</label>
              <input {...register('bank_name', { required: true })} className={inputCls} placeholder="e.g. SBI, HDFC, ICICI" autoFocus />
              {errors.bank_name && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className={labelCls}>Belongs To</label>
              <select {...register('belongs_to_user_id')} className={inputCls}>
                <option value="">— Unassigned —</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>{isFD ? 'FD Number' : isBond ? 'Bond Number / ISIN' : 'Account Number'}</label>
              <input {...register('fd_number')} className={inputCls} placeholder="Optional" />
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select {...register('status')} className={inputCls}>
                <option value="active">Active</option>
                {isFD || isBond ? (
                  <>
                    <option value="matured">Matured</option>
                    <option value="broken">{isBond ? 'Sold' : 'Broken'}</option>
                  </>
                ) : (
                  <option value="broken">Inactive</option>
                )}
              </select>
            </div>

            <div>
              <label className={labelCls}>{isFD ? 'Principal Amount (₹) *' : isBond ? 'Face Value (₹) *' : 'Balance (₹) *'}</label>
              <input type="number" step="0.01" min="1" {...register('principal_amount', { required: true, min: 1 })} className={inputCls} placeholder="0.00" />
              {errors.principal_amount && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            {(isFD || isBond) && (
              <div>
                <label className={labelCls}>{isBond ? 'Coupon Rate (% p.a.) *' : 'Interest Rate (% p.a.) *'}</label>
                <input type="number" step="0.01" min="0" {...register('interest_rate', { required: true })} className={inputCls} placeholder="e.g. 7.5" />
              </div>
            )}

            {hasDates && (
              <>
                <div>
                  <label className={labelCls}>Tenure *</label>
                  <div className="flex gap-2">
                    <input type="number" min="1" {...register('tenure_months', { required: true, min: 1 })} className={inputCls} placeholder="e.g. 12" />
                    <select {...register('tenure_unit')} className="px-2.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0">
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Maturity Amount (₹)</label>
                  <input type="number" step="0.01" min="0" {...register('maturity_amount')} className={inputCls} placeholder={estimated ? `≈ ${fmtINR(estimated)}` : 'Auto-calculated'} />
                  <p className="text-[11px] text-gray-400 mt-1">Leave blank to use simple interest estimate</p>
                </div>

                <div>
                  <label className={labelCls}>Start Date *</label>
                  <input type="date" {...register('start_date', { required: true })} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Maturity Date *</label>
                  <input type="date" {...register('maturity_date', { required: true })} className={inputCls} />
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea {...register('notes')} className={inputCls} rows={2} placeholder="Optional notes..." />
            </div>
          </div>

          {hasDates && estimated > 0 && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl px-4 py-3">
              <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-sm text-emerald-700 dark:text-emerald-400">
                Estimated maturity: <span className="font-bold">{fmtINR(estimated)}</span>
                <span className="text-xs ml-2 opacity-70">gain: +{fmtINR(estimated - principal)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : `Add ${isFD ? 'FD' : isBond ? 'Bond' : 'Account'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

// ── Lent Modal ─────────────────────────────────────────────────────────────────

const inputClsLent = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500';

function LentModal({ item, onClose, onCreate, onUpdate }) {
  const isEdit = !!item;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: item
      ? { person: item.person, amount: item.amount, notes: item.notes ?? '', date_lent: item.date_lent ?? '', due_date: item.due_date ?? '', status: item.status }
      : { person: '', amount: '', notes: '', date_lent: new Date().toISOString().slice(0, 10), due_date: '', status: 'pending' },
  });

  async function onSubmit(data) {
    const payload = { ...data, amount: parseFloat(data.amount), notes: data.notes || null, due_date: data.due_date || null };
    if (isEdit) await onUpdate.mutateAsync({ id: item.id, ...payload });
    else await onCreate.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Lent Entry' : 'Add Lent Entry'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Person / Name *</label>
            <input {...register('person', { required: 'Required' })} className={inputClsLent} placeholder="e.g. Ravi, Sunita" autoFocus />
            {errors.person && <p className="text-xs text-red-500 mt-1">{errors.person.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₹) *</label>
            <input type="number" step="0.01" min="0.01" {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} className={inputClsLent} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date Lent</label>
              <input type="date" {...register('date_lent')} className={inputClsLent} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" {...register('due_date')} className={inputClsLent} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
            <select {...register('status')} className={inputClsLent}>
              <option value="pending">Pending</option>
              <option value="partial">Partially Returned</option>
              <option value="returned">Fully Returned</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputClsLent} resize-none`} placeholder="e.g. For wedding expenses" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Lent List ──────────────────────────────────────────────────────────────────

function LentList({ items, isAdmin, onEdit, onDelete }) {
  const STATUS_CONFIG = {
    pending:  { label: 'Pending',           Icon: Clock,        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    partial:  { label: 'Partial',           Icon: AlertCircle,  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'   },
    returned: { label: 'Fully Returned',    Icon: Check,        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  };
  const pending  = items.filter((i) => i.status !== 'returned');
  const returned = items.filter((i) => i.status === 'returned');
  const totalPending = pending.reduce((s, i) => s + i.amount, 0);

  function fmtD(d) {
    if (!d) return null;
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function renderItem(item) {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    const Icon = cfg.Icon;
    const overdue = item.due_date && item.status !== 'returned' && new Date(item.due_date + 'T00:00:00') < new Date();
    return (
      <div key={item.id} className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 flex items-start gap-3 group ${overdue ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'}`}>
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
          <HandCoins size={18} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.person}</p>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.cls}`}>
              <Icon size={10} />{cfg.label}
            </span>
          </div>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-400">
            {item.date_lent && <span>Lent: {fmtD(item.date_lent)}</span>}
            {item.due_date  && <span className={overdue ? 'text-red-500 font-semibold' : ''}>Due: {fmtD(item.due_date)}{overdue ? ' (overdue)' : ''}</span>}
          </div>
          {item.notes && <p className="text-xs text-gray-400 mt-1 italic">{item.notes}</p>}
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onEdit(item)} className="p-1.5 text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Pencil size={13} /></button>
            <button onClick={() => onDelete(item)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding ({pending.length})</p>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{pending.map(renderItem)}</div>
        </div>
      )}
      {returned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Returned ({returned.length})</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{returned.map(renderItem)}</div>
        </div>
      )}
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delete entry?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          <strong className="text-gray-700 dark:text-gray-300">{name}</strong> will be permanently removed.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function IndiaSavingsPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;

  const { data, isLoading } = useSavings();
  const deleteEntry = useDeleteSaving();
  const reorder     = useReorderSavings();

  const { data: lentData, isLoading: lentLoading } = useLent();
  const createLent = useCreateLentItem();
  const updateLent = useUpdateLentItem();
  const deleteLent = useDeleteLentItem();

  const location = useLocation();
  const navHash  = useNav();
  const VALID_TABS = ['fd', 'bonds', 'savings', 'lent'];
  const hashTab = location.hash.replace('#', '');
  const tab = VALID_TABS.includes(hashTab) ? hashTab : 'fd';
  function setTab(t) { navHash(`#${t}`, { replace: true }); setLocalOrder(null); }

  // Redirect bare /savings to /savings#fd
  if (!VALID_TABS.includes(hashTab)) {
    navHash('/savings#fd', { replace: true });
  }

  const [modal, setModal]           = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const dragId = useRef(null);

  const all         = data?.data ?? [];
  const fds         = all.filter((f) => (f.type ?? 'fd') === 'fd');
  const bonds       = all.filter((f) => f.type === 'bonds');
  const savAccounts = all.filter((f) => f.type === 'savings');
  const lentItems   = lentData?.data ?? [];
  const current     = tab === 'fd' ? fds : tab === 'bonds' ? bonds : tab === 'savings' ? savAccounts : lentItems;

  const visible = localOrder
    ? localOrder.map((id) => current.find((f) => f.id === id)).filter(Boolean)
    : current;

  // Totals
  const activeFDs    = fds.filter((f) => f.status === 'active');
  const fdPrincipal  = activeFDs.reduce((s, f) => s + (f.principal_amount ?? 0), 0);
  const fdMaturity   = activeFDs.reduce((s, f) => s + (f.maturity_amount ?? estimatedMaturity(f.principal_amount, f.interest_rate, f.tenure_months, f.tenure_unit) ?? 0), 0);
  const fdGain       = fdMaturity - fdPrincipal;
  const activeBonds  = bonds.filter((f) => f.status === 'active');
  const bondFaceVal  = activeBonds.reduce((s, f) => s + (f.principal_amount ?? 0), 0);
  const bondMaturity = activeBonds.reduce((s, f) => s + (f.maturity_amount ?? estimatedMaturity(f.principal_amount, f.interest_rate, f.tenure_months, f.tenure_unit) ?? 0), 0);
  const savBalance   = savAccounts.filter((f) => f.status === 'active').reduce((s, f) => s + (f.principal_amount ?? 0), 0);
  const lentOutstanding = lentItems.filter((i) => i.status !== 'returned').reduce((s, i) => s + i.amount, 0);
  const lentCount = lentItems.filter((i) => i.status !== 'returned').length;
  const totalWealth  = fdMaturity + bondMaturity + savBalance - lentOutstanding;

  function handleDragStart(id) {
    dragId.current = id;
    setLocalOrder(current.map((f) => f.id));
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    setLocalOrder((prev) => {
      const order = prev ?? current.map((f) => f.id);
      const from  = order.indexOf(dragId.current);
      const to    = order.indexOf(id);
      if (from < 0 || to < 0) return prev;
      const next  = [...order];
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

  async function handleDelete() {
    if (tab === 'lent') {
      await deleteLent.mutateAsync(deleteTarget.id);
    } else {
      await deleteEntry.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  const tabCls = (t) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
      tab === t
        ? t === 'fd'      ? 'bg-emerald-600 text-white'
        : t === 'bonds'   ? 'bg-amber-500 text-white'
        : t === 'savings' ? 'bg-violet-600 text-white'
        :                   'bg-rose-600 text-white'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your FDs and savings accounts</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
          >
            <Plus size={15} /> Add {tab === 'fd' ? 'FD' : tab === 'bonds' ? 'Bond' : tab === 'savings' ? 'Account' : 'Lent Entry'}
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-none">
        <StatCard
          icon={Landmark}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          label="FD Invested"
          value={fmtINRCompact(fdPrincipal)}
          sub={fdGain > 0 ? `+${fmtINRCompact(fdGain)} gain` : `${activeFDs.length} active`}
          subColor={fdGain > 0 ? 'text-emerald-500' : undefined}
        />
        <StatCard
          icon={ScrollText}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Bonds"
          value={fmtINRCompact(bondFaceVal)}
          sub={bondMaturity > bondFaceVal ? `+${fmtINRCompact(bondMaturity - bondFaceVal)} gain` : `${activeBonds.length} active`}
          subColor={bondMaturity > bondFaceVal ? 'text-amber-500' : undefined}
        />
        <StatCard
          icon={PiggyBank}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
          label="Savings"
          value={fmtINRCompact(savBalance)}
          sub={`${savAccounts.filter(f => f.status === 'active').length} account${savAccounts.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={HandCoins}
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          iconColor="text-rose-600 dark:text-rose-400"
          label="Lent Out"
          value={lentOutstanding > 0 ? fmtINRCompact(lentOutstanding) : '—'}
          sub={lentCount > 0 ? `${lentCount} pending` : 'all returned'}
          subColor={lentCount > 0 ? 'text-rose-500' : 'text-gray-400'}
        />
        <StatCard
          icon={Wallet}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          label="Total Wealth"
          value={fmtINRCompact(totalWealth)}
          sub="FD + bonds + savings - lent out"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button className={tabCls('fd')} onClick={() => setTab('fd')}>
          <Building2 size={13} /> FD
          <span className="bg-white/30 dark:bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full">{fds.length}</span>
        </button>
        <button className={tabCls('bonds')} onClick={() => setTab('bonds')}>
          <ScrollText size={13} /> Bonds
          <span className="bg-white/30 dark:bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full">{bonds.length}</span>
        </button>
        <button className={tabCls('savings')} onClick={() => setTab('savings')}>
          <PiggyBank size={13} /> Savings
          <span className="bg-white/30 dark:bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full">{savAccounts.length}</span>
        </button>
        <button className={tabCls('lent')} onClick={() => setTab('lent')}>
          <HandCoins size={13} /> Lent
          <span className="bg-white/30 dark:bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full">{lentItems.length}</span>
        </button>
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-center py-16">
          <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center ${tab === 'fd' ? 'bg-emerald-50 dark:bg-emerald-900/20' : tab === 'bonds' ? 'bg-amber-50 dark:bg-amber-900/20' : tab === 'savings' ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
            {tab === 'fd'      ? <Building2  size={22} className="text-emerald-400" />
           : tab === 'bonds'   ? <ScrollText size={22} className="text-amber-400"   />
           : tab === 'savings' ? <PiggyBank  size={22} className="text-violet-400"  />
           :                     <HandCoins  size={22} className="text-rose-400"    />}
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            No {tab === 'fd' ? 'FDs' : tab === 'bonds' ? 'bonds' : tab === 'savings' ? 'savings accounts' : 'lent entries'} yet
          </p>
          {isAdmin && (
            <button
              onClick={() => setModal('new')}
              className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              + Add your first {tab === 'fd' ? 'FD' : tab === 'bonds' ? 'bond' : tab === 'savings' ? 'account' : 'lent entry'}
            </button>
          )}
        </div>
      )}

      {/* Lent list */}
      {tab === 'lent' && lentItems.length > 0 && (
        <LentList items={lentItems} isAdmin={isAdmin} onCreate={() => setModal('new')} onEdit={(e) => setModal({ lent: e })} onDelete={setDeleteTarget} deleteLent={deleteLent} />
      )}

      {/* FD / Bonds / Savings list */}
      {tab !== 'lent' && visible.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((entry) =>
            tab === 'fd' ? (
              <FDCard key={entry.id} fd={entry} isAdmin={isAdmin} onEdit={(e) => setModal({ entry: e })} onDelete={setDeleteTarget} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
            ) : tab === 'bonds' ? (
              <BondCard key={entry.id} fd={entry} isAdmin={isAdmin} onEdit={(e) => setModal({ entry: e })} onDelete={setDeleteTarget} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
            ) : (
              <SavingsCard key={entry.id} fd={entry} isAdmin={isAdmin} onEdit={(e) => setModal({ entry: e })} onDelete={setDeleteTarget} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
            )
          )}
        </div>
      )}

      {modal === 'new' && tab !== 'lent' && <EntryModal defaultType={tab} onClose={() => setModal(null)} />}
      {modal && modal !== 'new' && !modal.lent && <EntryModal entry={modal.entry} onClose={() => setModal(null)} />}
      {modal === 'new' && tab === 'lent' && <LentModal onClose={() => setModal(null)} onCreate={createLent} />}
      {modal?.lent && <LentModal item={modal.lent} onClose={() => setModal(null)} onUpdate={updateLent} />}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.bank_name ?? deleteTarget.person}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
