import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Pencil, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../hooks/useExpenses';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

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

export default function IndiaLedgerPage() {
  const { toast } = useToast();
  const today = new Date().toLocaleDateString('en-CA');

  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [activeType, setActiveType] = useState('debit');

  const create = useCreateExpense();
  const update = useUpdateExpense();
  const deleteExp = useDeleteExpense();

  const params = {
    page,
    limit: pageSize,
    sort: 'date',
    order: 'desc',
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading } = useExpenses(params);
  const expenses = data?.data ?? [];
  const pagination = data?.pagination;

  const totalCredit = expenses.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const totalDebit = expenses.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { description: '', amount: '', date: today, notes: '' },
  });

  async function onSubmit(data) {
    try {
      await create.mutateAsync({ description: data.description, amount: parseFloat(data.amount), date: data.date, type: activeType, notes: data.notes || null });
      toast(activeType === 'credit' ? 'Credit recorded' : 'Debit recorded');
      reset({ description: '', amount: '', date: today, notes: '' });
    } catch (err) {
      toast(err?.error ?? 'Failed to save', 'error');
    }
  }

  async function handleDelete() {
    try {
      await deleteExp.mutateAsync(deleteTarget.id);
      toast('Entry deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ledger</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track credits and debits</p>
      </div>

      {/* Add entry form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        {/* Type toggle */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => setActiveType('debit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${activeType === 'debit' ? 'bg-red-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <TrendingDown size={15} /> Debit
          </button>
          <button
            type="button"
            onClick={() => setActiveType('credit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${activeType === 'credit' ? 'bg-emerald-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <TrendingUp size={15} /> Credit
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <input
              {...register('description', { required: 'Required' })}
              className={inputCls}
              placeholder="Description"
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
                className={inputCls}
                placeholder="Amount"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <input type="date" {...register('date', { required: 'Required' })} className={inputCls} />
            </div>
          </div>
          <div>
            <textarea
              {...register('notes')}
              rows={2}
              className={inputCls + ' resize-none'}
              placeholder="Notes (optional)"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors ${activeType === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isSubmitting ? 'Saving...' : `Add ${activeType === 'credit' ? 'Credit' : 'Debit'}`}
          </button>
        </form>
      </div>

      {/* Transactions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header + filters */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 flex-wrap">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Transactions</h2>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium ml-auto">
            {[['', 'All'], ['credit', 'Credit'], ['debit', 'Debit']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setTypeFilter(val); setPage(1); }}
                className={`px-3 py-1.5 transition-colors ${typeFilter === val ? (val === 'credit' ? 'bg-emerald-500 text-white' : val === 'debit' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900') : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-32"
            />
          </div>
        </div>

        {isLoading && <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}

        {!isLoading && expenses.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">No entries found.</p>
        )}

        {!isLoading && expenses.length > 0 && (
          <>
            <div>
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 group">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${e.type === 'credit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {e.type === 'credit'
                      ? <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                      : <TrendingDown size={14} className="text-red-500 dark:text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{e.description}</p>
                    <p className="text-xs text-gray-400">{e.date}{e.notes ? ` · ${e.notes}` : ''}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${e.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {e.type === 'credit' ? '+' : '-'}₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => setEditTarget(e)}
                    className="p-1.5 text-gray-300 dark:text-gray-700 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(e)}
                    className="p-1.5 text-gray-300 dark:text-gray-700 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed">
                  <ChevronLeft size={14} />
                </button>
                {buildPages(page, pagination.total_pages).map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={p + i} className="text-xs text-gray-300 px-1">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)} className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{p}</button>
                  )
                )}
                <button onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={page === pagination.total_pages} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.description}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteExp.isPending}
        />
      )}

      {editTarget && (
        <EditModal
          entry={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => {
            try {
              await update.mutateAsync({ id: editTarget.id, ...data });
              toast('Entry updated');
              setEditTarget(null);
            } catch (err) {
              toast(err?.error ?? 'Failed to update', 'error');
            }
          }}
          isSaving={update.isPending}
        />
      )}
    </div>
  );
}

function EditModal({ entry, onClose, onSave, isSaving }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      description: entry.description,
      amount: entry.amount,
      date: entry.date,
      type: entry.type,
      notes: entry.notes ?? '',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Edit Entry</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Type</label>
            <select {...register('type')} className={inputCls}>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <input {...register('description', { required: 'Required' })} className={inputCls} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Amount</label>
              <input type="number" step="0.01" min="0.01" {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} className={inputCls} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Date</label>
              <input type="date" {...register('date', { required: 'Required' })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Notes (optional)</label>
            <textarea {...register('notes')} rows={2} className={inputCls + ' resize-none'} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
