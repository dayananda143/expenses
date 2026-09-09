import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Pencil, CheckCircle2, Circle, X, RotateCcw } from 'lucide-react';
import { useReturns, useCreateReturn, useUpdateReturn, useToggleReturn, useDeleteReturn } from '../../hooks/useReturns';
import { useAccounts } from '../../hooks/useAccounts';
import { WS, fmtUSDDecimal } from './shared';
import { useAuth } from '../../contexts/AuthContext';

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

export default function ReturnsPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const { data, isLoading } = useReturns();
  const { data: accountsData } = useAccounts(WS);
  const creditCards = (accountsData?.data ?? []).filter((a) => a.type === 'credit' && !a.archived);

  const toggleReturn = useToggleReturn();
  const deleteReturn = useDeleteReturn();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const items = data?.data ?? [];
  const pending = items.filter((r) => r.status === 'pending');
  const returned = items.filter((r) => r.status === 'returned');
  const pendingTotal = pending.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Returns</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{fmtUSDDecimal(pendingTotal)}</span> pending across {pending.length} item{pending.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={15} /> Add Return
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <RotateCcw size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No returns tracked yet.</p>
          {isAdmin && <p className="text-xs mt-1">Click &ldquo;Add Return&rdquo; to log an item awaiting a refund.</p>}
        </div>
      )}

      {!isLoading && pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Pending ({pending.length})</h2>
          {pending.map((r) => (
            <ReturnRow key={r.id} r={r} isAdmin={isAdmin} onToggle={() => toggleReturn.mutate(r.id)} onEdit={() => { setEditTarget(r); setShowModal(true); }} onDelete={() => setDeleteTarget(r)} />
          ))}
        </div>
      )}

      {!isLoading && returned.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Returned ({returned.length})</h2>
          {returned.map((r) => (
            <ReturnRow key={r.id} r={r} isAdmin={isAdmin} onToggle={() => toggleReturn.mutate(r.id)} onEdit={() => { setEditTarget(r); setShowModal(true); }} onDelete={() => setDeleteTarget(r)} />
          ))}
        </div>
      )}

      {showModal && (
        <ReturnModal
          item={editTarget}
          creditCards={creditCards}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">Delete return for <span className="font-semibold">{deleteTarget.item_name}</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button
                onClick={async () => { await deleteReturn.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
                disabled={deleteReturn.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteReturn.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReturnRow({ r, isAdmin, onToggle, onEdit, onDelete }) {
  const isReturned = r.status === 'returned';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${isReturned ? 'border-gray-100 dark:border-gray-800 opacity-60' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900`}>
      <button onClick={onToggle} className="shrink-0 text-gray-300 dark:text-gray-700 hover:text-emerald-500 transition-colors">
        {isReturned ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold text-gray-800 dark:text-gray-200 truncate ${isReturned ? 'line-through' : ''}`}>{r.item_name}</p>
        <p className="text-xs text-gray-400">
          {r.date}{r.account_name ? ` · ${r.account_name}` : ''}{r.notes ? ` · ${r.notes}` : ''}
        </p>
      </div>
      <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{fmtUSDDecimal(r.amount)}</p>
      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function ReturnModal({ item, creditCards, onClose }) {
  const create = useCreateReturn();
  const update = useUpdateReturn();
  const isEdit = !!item;
  const today = new Date().toLocaleDateString('en-CA');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: item ? {
      item_name: item.item_name, amount: item.amount, account_id: item.account_id ?? '',
      date: item.date, notes: item.notes ?? '', status: item.status,
    } : { item_name: '', amount: '', account_id: '', date: today, notes: '', status: 'pending' },
  });

  async function onSubmit(data) {
    const payload = { ...data, amount: parseFloat(data.amount), account_id: data.account_id || null };
    if (isEdit) await update.mutateAsync({ id: item.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Return' : 'New Return'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Item Name</label>
            <input {...register('item_name', { required: 'Required' })} className={inputCls} placeholder="e.g. Nike shoes" />
            {errors.item_name && <p className="text-xs text-red-500 mt-1">{errors.item_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (USD)</label>
              <input type="number" step="0.01" min="0.01" {...register('amount', { required: 'Required', min: { value: 0.01, message: '> 0' } })} className={inputCls} placeholder="0.00" />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" {...register('date', { required: 'Required' })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Credit Card</label>
            <select {...register('account_id')} className={inputCls}>
              <option value="">— Select card —</option>
              {creditCards.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <input {...register('notes')} className={inputCls} placeholder="Optional" />
          </div>
          {isEdit && (
            <div>
              <label className={labelCls}>Status</label>
              <select {...register('status')} className={inputCls}>
                <option value="pending">Pending</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
