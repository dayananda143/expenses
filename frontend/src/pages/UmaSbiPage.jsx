import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Plus, Pencil, Trash2, X, Banknote, AlertCircle, Landmark,
} from 'lucide-react';
import { useUmaSbi, useCreateUmaSbi, useUpdateUmaSbi, useDeleteUmaSbi } from '../hooks/useUmaSbi';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null || isNaN(n)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function EntryModal({ entry, onClose }) {
  const create = useCreateUmaSbi();
  const update = useUpdateUmaSbi();
  const isEdit = !!entry;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: entry
      ? { description: entry.description, amount: entry.amount, date: entry.date }
      : { date: new Date().toISOString().slice(0, 10) },
  });

  async function onSubmit(data) {
    const payload = {
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      date: data.date,
    };
    if (isEdit) await update.mutateAsync({ id: entry.id, ...payload });
    else        await create.mutateAsync(payload);
    onClose();
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Landmark size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">{isEdit ? 'Edit Entry' : 'Add Entry'}</h2>
            <p className="text-xs text-gray-400">Uma SBI transaction</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Description *</label>
            <input
              {...register('description', { required: true })}
              className={inputCls}
              placeholder="e.g. Monthly payment, Settlement..."
              autoFocus
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>

          <div>
            <label className={labelCls}>Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { required: true })}
              className={inputCls}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <input type="date" {...register('date')} className={inputCls} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ entry, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-red-600" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">Delete entry?</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          <strong className="text-gray-700 dark:text-gray-300">{entry.description}</strong> will be permanently removed.
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

export default function UmaSbiPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;

  const { data, isLoading } = useUmaSbi();
  const deleteEntry = useDeleteUmaSbi();

  const [modal, setModal]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const entries = data?.data ?? [];
  const total   = entries.reduce((s, e) => s + (e.amount ?? 0), 0);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Uma SBI</h1>
          <p className="text-sm text-gray-400 mt-0.5">Transaction ledger</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shrink-0"
          >
            <Plus size={15} /> Add Entry
          </button>
        )}
      </div>

      {/* Total card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <Banknote size={18} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{fmtINR(total)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Entries</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{entries.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
              <Landmark size={22} className="text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No entries yet</p>
            {isAdmin && (
              <button onClick={() => setModal('new')} className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                + Add first entry
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                {isAdmin && <th className="px-4 py-3 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(entry.date)}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{entry.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtINR(entry.amount)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal({ entry })} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(entry)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmtINR(total)}</td>
                {isAdmin && <td />}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {modal === 'new' && <EntryModal onClose={() => setModal(null)} />}
      {modal && modal !== 'new' && <EntryModal entry={modal.entry} onClose={() => setModal(null)} />}
      {deleteTarget && (
        <DeleteConfirm
          entry={deleteTarget}
          onConfirm={async () => { await deleteEntry.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
