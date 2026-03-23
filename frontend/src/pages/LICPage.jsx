import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Plus, GripVertical, Pencil, Trash2, X,
  CalendarClock, ShieldCheck, Banknote, User, Hash, TrendingUp, CalendarDays,
} from 'lucide-react';
import { useLIC, useCreateLIC, useUpdateLIC, useDeleteLIC, useReorderLIC } from '../hooks/useLIC';
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

function daysLeft(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date + 'T00:00:00') - today) / 86400000);
}

function maturityProgress(startDate, maturityDate) {
  if (!startDate || !maturityDate) return 0;
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end   = new Date(maturityDate + 'T00:00:00').getTime();
  const now   = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

const COLORS = ['bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
function nameColor(name) {
  let h = 0;
  for (let i = 0; i < (name?.length ?? 0); i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

const STATUS_STYLES = {
  active:      { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  matured:     { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',             dot: 'bg-blue-500'    },
  surrendered: { badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',                dot: 'bg-gray-400'    },
};

// ── Stat Card ──────────────────────────────────────────────────────────────────

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

// ── Policy Card ────────────────────────────────────────────────────────────────

function PolicyCard({ policy, onEdit, onDelete, onDragStart, onDragOver, onDrop, isAdmin }) {
  const days   = daysLeft(policy.maturity_date);
  const pct    = maturityProgress(policy.start_date, policy.maturity_date);
  const st     = STATUS_STYLES[policy.status] ?? STATUS_STYLES.active;

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
      draggable={isAdmin}
      onDragStart={() => isAdmin && onDragStart(policy.id)}
      onDragOver={(e) => { e.preventDefault(); isAdmin && onDragOver(e, policy.id); }}
      onDrop={() => isAdmin && onDrop()}
    >
      <div className="p-4 flex gap-3 items-start">
        {isAdmin && (
          <div className="mt-1 cursor-grab text-gray-200 dark:text-gray-700 hover:text-gray-400 shrink-0">
            <GripVertical size={15} />
          </div>
        )}

        {/* Initial avatar */}
        <div className={`w-10 h-10 rounded-xl ${nameColor(policy.name)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
          {(policy.name?.[0] ?? 'L').toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{policy.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                <Hash size={10} className="shrink-0" />{policy.lic_number}
              </p>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
            </span>
          </div>

          {/* Amount boxes */}
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2 flex-1 min-w-0">
              <p className="text-[10px] text-rose-500 font-medium uppercase tracking-wide">Sum Assured</p>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-0.5">{fmtINR(policy.amount)}</p>
            </div>
            {policy.premium && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Premium</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-0.5">{fmtINR(policy.premium)}</p>
              </div>
            )}
          </div>

          {/* Dates row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />Start: {fmtDate(policy.start_date)}
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock size={11} />Maturity: {fmtDate(policy.maturity_date)}
              {policy.status === 'active' && (
                <span className={`font-medium ml-1 ${days < 0 ? 'text-red-500' : days <= 365 ? 'text-amber-500' : 'text-gray-400'}`}>
                  ({days < 0 ? `${Math.abs(days)}d overdue` : days < 365 ? `${days}d left` : `${Math.floor(days / 365)}y left`})
                </span>
              )}
            </span>
          </div>

          {/* Progress bar */}
          {policy.status === 'active' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">{pct.toFixed(0)}%</span>
            </div>
          )}

          {policy.notes && <p className="mt-2 text-xs text-gray-400 italic">{policy.notes}</p>}
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => onEdit(policy)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(policy)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function PolicyModal({ policy, onClose }) {
  const create  = useCreateLIC();
  const update  = useUpdateLIC();
  const isEdit  = !!policy;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: policy ? {
      lic_number:    policy.lic_number,
      name:          policy.name,
      amount:        policy.amount,
      start_date:    policy.start_date,
      maturity_date: policy.maturity_date,
      premium:       policy.premium ?? '',
      status:        policy.status,
      notes:         policy.notes ?? '',
    } : { status: 'active' },
  });

  async function onSubmit(data) {
    const payload = {
      ...data,
      amount:  parseFloat(data.amount),
      premium: data.premium ? parseFloat(data.premium) : null,
      notes:   data.notes || null,
    };
    if (isEdit) await update.mutateAsync({ id: policy.id, ...payload });
    else        await create.mutateAsync(payload);
    onClose();
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors placeholder-gray-400';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">
              {isEdit ? 'Edit LIC Policy' : 'Add LIC Policy'}
            </h2>
            <p className="text-xs text-gray-400">Life Insurance Corporation policy details</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Policy Name *</label>
              <input {...register('name', { required: true })} className={inputCls} placeholder="e.g. Jeevan Anand, Jeevan Labh" autoFocus />
              {errors.name && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className={labelCls}>LIC Number *</label>
              <input {...register('lic_number', { required: true })} className={inputCls} placeholder="Policy number" />
              {errors.lic_number && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select {...register('status')} className={inputCls}>
                <option value="active">Active</option>
                <option value="matured">Matured</option>
                <option value="surrendered">Surrendered</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Sum Assured (₹) *</label>
              <input type="number" step="0.01" min="1" {...register('amount', { required: true, min: 1 })} className={inputCls} placeholder="0.00" />
              {errors.amount && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className={labelCls}>Premium (₹)</label>
              <input type="number" step="0.01" min="0" {...register('premium')} className={inputCls} placeholder="Annual / term premium" />
            </div>

            <div>
              <label className={labelCls}>Start Date *</label>
              <input type="date" {...register('start_date', { required: true })} className={inputCls} />
              {errors.start_date && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className={labelCls}>Maturity Date *</label>
              <input type="date" {...register('maturity_date', { required: true })} className={inputCls} />
              {errors.maturity_date && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea {...register('notes')} className={inputCls} rows={2} placeholder="Optional notes..." />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delete policy?</h3>
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

export default function LICPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;

  const { data, isLoading } = useLIC();
  const deletePolicy = useDeleteLIC();
  const reorder      = useReorderLIC();

  const [modal, setModal]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [localOrder, setLocalOrder]     = useState(null);
  const dragId = useRef(null);

  const policies = data?.data ?? [];
  const visible  = localOrder
    ? localOrder.map((id) => policies.find((p) => p.id === id)).filter(Boolean)
    : policies;

  const active       = policies.filter((p) => p.status === 'active');
  const totalAssured = active.reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalPremium = active.filter((p) => p.premium).reduce((s, p) => s + (p.premium ?? 0), 0);
  const nextMaturity = active
    .map((p) => ({ ...p, days: daysLeft(p.maturity_date) }))
    .filter((p) => p.days > 0)
    .sort((a, b) => a.days - b.days)[0];

  function handleDragStart(id) {
    dragId.current = id;
    setLocalOrder(policies.map((p) => p.id));
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    setLocalOrder((prev) => {
      const order = prev ?? policies.map((p) => p.id);
      const from  = order.indexOf(dragId.current);
      const to    = order.indexOf(id);
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

  async function handleDelete() {
    await deletePolicy.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LIC Policies</h1>
          <p className="text-sm text-gray-400 mt-0.5">Life Insurance Corporation of India</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors shadow-sm shrink-0"
          >
            <Plus size={15} /> Add Policy
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={ShieldCheck}
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          iconColor="text-rose-600 dark:text-rose-400"
          label="Total Assured"
          value={fmtINRCompact(totalAssured)}
          sub={`${active.length} active polic${active.length !== 1 ? 'ies' : 'y'}`}
        />
        <StatCard
          icon={Banknote}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Total Premium"
          value={totalPremium > 0 ? fmtINRCompact(totalPremium) : '—'}
          sub="per term"
        />
        <StatCard
          icon={CalendarClock}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          label="Next Maturity"
          value={nextMaturity ? fmtDate(nextMaturity.maturity_date) : '—'}
          sub={nextMaturity ? `${nextMaturity.name}` : 'no active policies'}
          subColor="text-blue-500"
        />
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-center py-16">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20">
            <ShieldCheck size={22} className="text-rose-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No LIC policies added yet</p>
          {isAdmin && (
            <button
              onClick={() => setModal('new')}
              className="mt-3 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
            >
              + Add your first policy
            </button>
          )}
        </div>
      )}

      {/* List */}
      {visible.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              isAdmin={isAdmin}
              onEdit={(p) => setModal({ policy: p })}
              onDelete={setDeleteTarget}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {modal === 'new' && <PolicyModal onClose={() => setModal(null)} />}
      {modal && modal !== 'new' && <PolicyModal policy={modal.policy} onClose={() => setModal(null)} />}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
