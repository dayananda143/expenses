import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Plus, Pencil, Trash2, X, Banknote, CalendarClock, CalendarDays,
  Hash, TrendingDown, Percent, Clock, CreditCard, AlertCircle,
  CheckCircle2, RotateCcw,
} from 'lucide-react';
import { useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan, useToggleLoanStatus } from '../hooks/useLoans';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null || isNaN(n)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtINRCompact(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e7) return '₹' + (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
  return fmtINR(n);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthsLeft(maturityDate) {
  if (!maturityDate) return null;
  const today = new Date(); today.setDate(1); today.setHours(0, 0, 0, 0);
  const end = new Date(maturityDate + 'T00:00:00'); end.setDate(1);
  return (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());
}

function loanProgress(loan) {
  const paid = loan.paid_amount ?? 0;
  const total = loan.total_amount ?? 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (paid / total) * 100));
}

const TYPE_COLORS = {
  'LIC Housing loan': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', avatar: 'bg-blue-600' },
  'SBI Gold loan':    { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', avatar: 'bg-amber-600' },
};

function typeColor(type) {
  return TYPE_COLORS[type] ?? { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400', avatar: 'bg-gray-600' };
}

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

// ── Loan Card ──────────────────────────────────────────────────────────────────

function LoanCard({ loan, onEdit, onDelete, onToggleStatus, isAdmin }) {
  const colors = typeColor(loan.loan_type);
  const pct = loanProgress(loan);
  const ml = monthsLeft(loan.maturity_date);
  const outstanding = loan.future_principal ?? (loan.total_amount - (loan.paid_amount ?? 0));
  const isCompleted = loan.status === 'completed';

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden shadow-sm transition-opacity ${isCompleted ? 'border-emerald-200 dark:border-emerald-800 opacity-80' : 'border-gray-200 dark:border-gray-800'}`}>
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 flex items-center gap-2">
          <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Loan Completed</span>
        </div>
      )}
      <div className="p-4 flex gap-3 items-start">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm ${isCompleted ? 'bg-emerald-500' : colors.avatar}`}>
          {isCompleted ? <CheckCircle2 size={18} /> : loan.loan_type[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{loan.loan_type}</p>
              {loan.ref_no && (
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <Hash size={10} className="shrink-0" />{loan.ref_no}
                </p>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {loan.interest_rate != null ? `${loan.interest_rate}% p.a.` : 'Active'}
            </span>
          </div>

          {/* Amount grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-2.5 py-2">
              <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Loan Amount</p>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mt-0.5">{fmtINRCompact(loan.total_amount)}</p>
            </div>
            <div className={`rounded-xl px-2.5 py-2 ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className={`text-[10px] font-medium uppercase tracking-wide ${isCompleted ? 'text-emerald-500' : 'text-red-500'}`}>Outstanding</p>
              <p className={`text-xs font-bold mt-0.5 ${isCompleted ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-red-700 dark:text-red-300'}`}>
                {isCompleted ? '₹0' : fmtINRCompact(outstanding)}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-2.5 py-2">
              <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wide">EMI / mo</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                {loan.monthly_payment ? fmtINRCompact(loan.monthly_payment) : '—'}
              </p>
            </div>
          </div>

          {/* Financials row */}
          {(loan.future_amount || loan.future_interest) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
              {loan.future_amount && (
                <span className="flex items-center gap-1">
                  <Banknote size={11} />Future Total: <strong className="text-gray-700 dark:text-gray-300">{fmtINR(loan.future_amount)}</strong>
                </span>
              )}
              {loan.future_interest && (
                <span className="flex items-center gap-1">
                  <Percent size={11} />Interest: <strong className="text-red-500">{fmtINR(loan.future_interest)}</strong>
                </span>
              )}
            </div>
          )}

          {/* Dates & period */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
            {loan.start_date && (
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />Start: {fmtDate(loan.start_date)}
              </span>
            )}
            {loan.maturity_date && (
              <span className="flex items-center gap-1">
                <CalendarClock size={11} />Maturity: {fmtDate(loan.maturity_date)}
                {!isCompleted && ml != null && (
                  <span className={`font-medium ml-1 ${ml < 0 ? 'text-red-500' : ml <= 12 ? 'text-amber-500' : 'text-gray-400'}`}>
                    ({ml < 0 ? `${Math.abs(ml)}mo overdue` : ml < 12 ? `${ml}mo left` : `${Math.floor(ml / 12)}y ${ml % 12}mo`})
                  </span>
                )}
              </span>
            )}
            {loan.time_period && (
              <span className="flex items-center gap-1">
                <Clock size={11} />{loan.time_period} months
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>Paid: {fmtINR(loan.paid_amount)}</span>
              <span>{isCompleted ? '100' : pct.toFixed(1)}% repaid</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                style={{ width: isCompleted ? '100%' : `${pct}%` }}
              />
            </div>
          </div>

          {loan.notes && <p className="mt-2 text-xs text-gray-400 italic">{loan.notes}</p>}
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => onToggleStatus(loan.id)}
              title={isCompleted ? 'Mark as Active' : 'Mark as Completed'}
              className={`p-1.5 rounded-lg transition-colors ${isCompleted ? 'text-emerald-500 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
            >
              {isCompleted ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
            </button>
            <button onClick={() => onEdit(loan)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(loan)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

const LOAN_TYPES = ['LIC Housing loan', 'SBI Gold loan', 'Home Loan', 'Personal Loan', 'Car Loan', 'Education Loan', 'Other'];

function LoanModal({ loan, onClose }) {
  const create = useCreateLoan();
  const update = useUpdateLoan();
  const isEdit = !!loan;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: loan ? {
      loan_type:        loan.loan_type,
      ref_no:           loan.ref_no ?? '',
      total_amount:     loan.total_amount,
      future_amount:    loan.future_amount ?? '',
      future_interest:  loan.future_interest ?? '',
      future_principal: loan.future_principal ?? '',
      monthly_payment:  loan.monthly_payment ?? '',
      interest_rate:    loan.interest_rate ?? '',
      time_period:      loan.time_period ?? '',
      maturity_date:    loan.maturity_date ?? '',
      start_date:       loan.start_date ?? '',
      paid_amount:      loan.paid_amount ?? 0,
      notes:            loan.notes ?? '',
    } : { loan_type: 'LIC Housing loan', paid_amount: 0 },
  });

  async function onSubmit(data) {
    const payload = {
      loan_type:        data.loan_type,
      ref_no:           data.ref_no || null,
      total_amount:     parseFloat(data.total_amount),
      future_amount:    data.future_amount ? parseFloat(data.future_amount) : null,
      future_interest:  data.future_interest ? parseFloat(data.future_interest) : null,
      future_principal: data.future_principal ? parseFloat(data.future_principal) : null,
      monthly_payment:  data.monthly_payment ? parseFloat(data.monthly_payment) : null,
      interest_rate:    data.interest_rate ? parseFloat(data.interest_rate) : null,
      time_period:      data.time_period ? parseInt(data.time_period) : null,
      maturity_date:    data.maturity_date || null,
      start_date:       data.start_date || null,
      paid_amount:      parseFloat(data.paid_amount ?? 0),
      notes:            data.notes || null,
    };
    if (isEdit) await update.mutateAsync({ id: loan.id, ...payload });
    else        await create.mutateAsync(payload);
    onClose();
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <CreditCard size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">{isEdit ? 'Edit Loan' : 'Add Loan'}</h2>
            <p className="text-xs text-gray-400">Loan account details</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Loan Type *</label>
              <select {...register('loan_type', { required: true })} className={inputCls}>
                {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Reference / Account No</label>
              <input {...register('ref_no')} className={inputCls} placeholder="Loan reference number" />
            </div>

            <div>
              <label className={labelCls}>Total Loan Amount (₹) *</label>
              <input type="number" step="0.01" min="1" {...register('total_amount', { required: true, min: 1 })} className={inputCls} placeholder="0.00" />
              {errors.total_amount && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className={labelCls}>Paid Amount (₹)</label>
              <input type="number" step="0.01" min="0" {...register('paid_amount')} className={inputCls} placeholder="0.00" />
            </div>

            <div>
              <label className={labelCls}>Monthly EMI (₹)</label>
              <input type="number" step="0.01" min="0" {...register('monthly_payment')} className={inputCls} placeholder="0.00" />
            </div>

            <div>
              <label className={labelCls}>Interest Rate (%)</label>
              <input type="number" step="0.01" min="0" {...register('interest_rate')} className={inputCls} placeholder="9.25" />
            </div>

            <div>
              <label className={labelCls}>Future Total Amount (₹)</label>
              <input type="number" step="0.01" min="0" {...register('future_amount')} className={inputCls} placeholder="0.00" />
            </div>

            <div>
              <label className={labelCls}>Future Interest (₹)</label>
              <input type="number" step="0.01" min="0" {...register('future_interest')} className={inputCls} placeholder="0.00" />
            </div>

            <div>
              <label className={labelCls}>Future Principal (₹)</label>
              <input type="number" step="0.01" min="0" {...register('future_principal')} className={inputCls} placeholder="0.00" />
            </div>

            <div>
              <label className={labelCls}>Tenure (months)</label>
              <input type="number" min="1" {...register('time_period')} className={inputCls} placeholder="120" />
            </div>

            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" {...register('start_date')} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Maturity Date</label>
              <input type="date" {...register('maturity_date')} className={inputCls} />
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
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Loan'}
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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-red-600" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">Delete loan?</h3>
        </div>
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

export default function LoanPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;

  const { data, isLoading } = useLoans();
  const deleteLoan      = useDeleteLoan();
  const toggleStatus    = useToggleLoanStatus();

  const [modal, setModal]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loans = data?.data ?? [];
  const activeLoans = loans.filter(l => l.status !== 'completed');

  const totalBorrowed    = loans.reduce((s, l) => s + (l.total_amount ?? 0), 0);
  const totalEMI         = activeLoans.reduce((s, l) => s + (l.monthly_payment ?? 0), 0);
  const totalOutstanding = activeLoans.reduce((s, l) => {
    if (l.future_principal != null) return s + l.future_principal;
    return s + (l.total_amount - (l.paid_amount ?? 0));
  }, 0);
  const totalInterest    = activeLoans.reduce((s, l) => s + (l.future_interest ?? 0), 0);

  async function handleDelete() {
    await deleteLoan.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans</h1>
          <p className="text-sm text-gray-400 mt-0.5">Loan account settlement overview</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shrink-0"
          >
            <Plus size={15} /> Add Loan
          </button>
        )}
      </div>

      {/* Summary stats — based on active loans only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CreditCard}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          label="Total Borrowed"
          value={fmtINRCompact(totalBorrowed)}
          sub={`${loans.length} loan${loans.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={TrendingDown}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          label="Outstanding"
          value={fmtINRCompact(totalOutstanding)}
          sub="active loans only"
          subColor="text-red-400"
        />
        <StatCard
          icon={Banknote}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          label="Monthly EMI"
          value={totalEMI > 0 ? fmtINRCompact(totalEMI) : '—'}
          sub="active loans only"
        />
        <StatCard
          icon={Percent}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Future Interest"
          value={totalInterest > 0 ? fmtINRCompact(totalInterest) : '—'}
          sub="active loans only"
          subColor="text-amber-500"
        />
      </div>

      {/* Empty state */}
      {loans.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-center py-16">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
            <CreditCard size={22} className="text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No loans added yet</p>
          {isAdmin && (
            <button onClick={() => setModal('new')} className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
              + Add your first loan
            </button>
          )}
        </div>
      )}

      {/* Loan cards */}
      {loans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loans.map(loan => (
            <LoanCard
              key={loan.id}
              loan={loan}
              isAdmin={isAdmin}
              onEdit={l => setModal({ loan: l })}
              onDelete={setDeleteTarget}
              onToggleStatus={id => toggleStatus.mutate(id)}
            />
          ))}
        </div>
      )}

      {modal === 'new' && <LoanModal onClose={() => setModal(null)} />}
      {modal && modal !== 'new' && <LoanModal loan={modal.loan} onClose={() => setModal(null)} />}
      {deleteTarget && (
        <DeleteConfirm
          name={`${deleteTarget.loan_type}${deleteTarget.ref_no ? ` (${deleteTarget.ref_no})` : ''}`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
