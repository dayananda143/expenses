import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, DollarSign, Wallet, Check } from 'lucide-react';
import {
  useSalaryEntries,
  useSalarySummary,
  useSalarySettings,
  useUpdateSalarySettings,
  useCreateSalaryEntry,
  useUpdateSalaryEntry,
  useDeleteSalaryEntry,
} from '../hooks/useSalary';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function SortIcon({ field, sort, order }) {
  if (sort !== field) return <ChevronsUpDown size={13} className="text-gray-300 dark:text-gray-600" />;
  return order === 'asc'
    ? <ChevronUp size={13} className="text-emerald-500" />
    : <ChevronDown size={13} className="text-emerald-500" />;
}

function InlineSalaryCard({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const update = useUpdateSalarySettings();
  const { toast } = useToast();

  function startEdit() {
    setInput(value ?? 0);
    setEditing(true);
  }

  async function save() {
    try {
      await update.mutateAsync({ monthly_amount: parseFloat(input) || 0 });
      toast('Monthly salary updated');
      setEditing(false);
    } catch {
      toast('Failed to save', 'error');
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Salary</p>
        {!editing && (
          <button onClick={startEdit} className="text-gray-400 hover:text-emerald-600 transition-colors">
            <Pencil size={12} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-gray-400 text-sm">$</span>
          <input
            autoFocus
            type="number" step="0.01" min="0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 min-w-0 border border-emerald-400 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
          />
          <button onClick={save} className="p-1 text-emerald-600 hover:text-emerald-700"><Check size={14} /></button>
          <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
        </div>
      ) : (
        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(value ?? 0)}</p>
      )}
    </div>
  );
}

function SalaryModal({ entry, onClose }) {
  const { toast } = useToast();
  const create = useCreateSalaryEntry();
  const update = useUpdateSalaryEntry();
  const isEdit = !!entry?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: entry
      ? { description: entry.description, amount: entry.amount, notes: entry.notes ?? '' }
      : {},
  });

  async function onSubmit(data) {
    try {
      const payload = {
        description: data.description,
        amount: data.amount !== '' && data.amount != null ? parseFloat(data.amount) : null,
        notes: data.notes || null,
      };
      if (isEdit) { await update.mutateAsync({ id: entry.id, ...payload }); toast('Entry updated'); }
      else        { await create.mutateAsync(payload); toast('Entry added'); }
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to save', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet size={16} className="text-emerald-500" />
            {isEdit ? 'Edit Entry' : 'Add Entry'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <input {...register('description', { required: 'Required' })} className={inputCls} placeholder="e.g. Rent, Groceries, Insurance" />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number" step="0.01" min="0"
                {...register('amount', { min: { value: 0, message: 'Cannot be negative' } })}
                className={`${inputCls} pl-7`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className={inputCls} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SalaryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [sort, setSort]     = useState('');
  const [order, setOrder]   = useState('desc');
  const [showModal, setShowModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);

  function handleSort(field) {
    if (sort === field) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(field); setOrder('asc'); }
    setPage(1);
  }

  const { data, isLoading, error } = useSalaryEntries({
    search: search || undefined,
    page,
    sort: sort || undefined,
    order,
  });
  const { data: summary } = useSalarySummary();
  const { data: settings } = useSalarySettings();
  const del = useDeleteSalaryEntry();

  const rows  = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  async function handleDelete() {
    try {
      await del.mutateAsync(deleteTarget.id);
      toast('Entry deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet size={20} className="text-emerald-500" />
          Salary
        </h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={15} /> Add Entry
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <InlineSalaryCard value={settings?.monthly_amount} />
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
          <p className={`text-xl font-bold ${(summary?.remaining ?? 0) >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-500 dark:text-red-400'}`}>
            {fmt(summary?.remaining ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          <DollarSign size={11} className="inline" /> USD
        </span>
      </div>

      {/* Table */}
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th onClick={() => handleSort('description')} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-1">Description <SortIcon field="description" sort={sort} order={order} /></span>
                  </th>
                  <th onClick={() => handleSort('amount')} className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-1 flex-row-reverse">Amount (USD) <SortIcon field="amount" sort={sort} order={order} /></span>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                      No entries yet. Add an expense to track against your salary.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{row.description}</p>
                      {row.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{row.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {row.amount != null
                        ? <span className="text-rose-600 dark:text-rose-400">{fmt(row.amount)}</span>
                        : <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditTarget(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{total} records</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2">{page} / {pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && <SalaryModal onClose={() => setShowModal(false)} />}
      {editTarget && <SalaryModal entry={editTarget} onClose={() => setEditTarget(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.description}"${deleteTarget.amount != null ? ` (${fmt(deleteTarget.amount)})` : ''}?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={del.isPending}
        />
      )}
    </div>
  );
}
