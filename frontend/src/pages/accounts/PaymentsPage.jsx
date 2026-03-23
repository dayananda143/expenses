import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Trash2, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import { useAccountPayments, useCreatePayment, useDeletePayment } from '../../hooks/useAccountPayments';
import { WS, fmtUSDDecimal, fmtFullDate, BankLogo } from './shared';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

function buildPages(cur, total) {
  const delta = 1;
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= cur - delta && i <= cur + delta)) pages.push(i);
  }
  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev !== null && p - prev > 1) withEllipsis.push('...' + p);
    withEllipsis.push(p);
    prev = p;
  }
  return withEllipsis;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const location = useLocation();
  const preselectedId = location.state?.preselectedId ?? '';

  const { data: acctData } = useAccounts(WS);
  const { data: pmtData, isLoading } = useAccountPayments();
  const create = useCreatePayment();
  const del = useDeletePayment();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterAccountId, setFilterAccountId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const creditAccounts = (acctData?.data ?? []).filter((a) => a.type === 'credit' && a.is_active !== 0);
  const payments = pmtData?.data ?? [];
  const filteredPayments = filterAccountId ? payments.filter((p) => p.account_id === parseInt(filterAccountId)) : payments;
  const filteredTotal = filteredPayments.reduce((s, p) => s + p.amount, 0);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const pagedPayments = filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize);

  const today = new Date().toLocaleDateString('en-CA');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { account_id: preselectedId ? String(preselectedId) : '', amount: '', date: today, notes: '' },
  });

  useEffect(() => {
    if (preselectedId) {
      reset({ account_id: String(preselectedId), amount: '', date: today, notes: '' });
    }
  }, [preselectedId]);

  async function onSubmit(data) {
    await create.mutateAsync({
      account_id: parseInt(data.account_id),
      amount: parseFloat(data.amount),
      date: data.date,
      notes: data.notes?.trim() || null,
      workspace: WS,
    });
    reset({ account_id: data.account_id, amount: '', date: today, notes: '' });
  }

  async function handleDelete() {
    await del.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  function handleFilterChange(val) {
    setFilterAccountId(val);
    setPage(1);
  }

  function handlePageSizeChange(n) {
    setPageSize(n);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
        <p className="text-sm text-gray-400 mt-0.5">Record payments made toward credit cards</p>
      </div>

      {/* Record payment form — admin only */}
      {isAdmin && <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">Record a Payment</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>Credit Card</label>
            <select {...register('account_id', { required: 'Select a card' })} className={inputCls}>
              <option value="">Select a card…</option>
              {creditAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {fmtUSDDecimal(a.balance)} outstanding</option>
              ))}
            </select>
            {errors.account_id && <p className="text-xs text-red-500 mt-1">{errors.account_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (USD)</label>
              <input
                type="number" step="0.01" min="0.01"
                placeholder="0.00"
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Recording…' : 'Record Payment'}
          </button>
        </form>
      </div>}

      {/* Payment history */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Payment History</h2>
            {filteredPayments.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {payments.length > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Show</span>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
                    {[5, 10, 15, 20, 25].map((n) => (
                      <button
                        key={n}
                        onClick={() => handlePageSizeChange(n)}
                        className={`px-2.5 py-1 transition-colors ${pageSize === n ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <select
                  value={filterAccountId}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Cards</option>
                  {creditAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && payments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No payments recorded yet.</p>
        )}

        {!isLoading && payments.length > 0 && filteredPayments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No payments for this card.</p>
        )}

        {!isLoading && filteredPayments.length > 0 && (
          <>
            <div className="space-y-1">
              {pagedPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 group"
                >
                  <BankLogo name={p.account_name} sizeClass="w-8 h-8" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.account_name}</p>
                    {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtUSDDecimal(p.amount)}</p>
                    <p className="text-[11px] text-gray-400">{fmtFullDate(p.date)}</p>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="p-1.5 text-gray-300 dark:text-gray-700 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {buildPages(safePage, totalPages).map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={p + i} className="text-xs text-gray-300 dark:text-gray-600 px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${p === safePage ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>{filterAccountId ? 'Filtered total' : 'Total paid'}</span>
              <span>{fmtUSDDecimal(filteredTotal)}</span>
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete this payment of ${fmtUSDDecimal(deleteTarget.amount)} for "${deleteTarget.account_name}"? The balance will be restored.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={del.isPending}
        />
      )}
    </div>
  );
}
