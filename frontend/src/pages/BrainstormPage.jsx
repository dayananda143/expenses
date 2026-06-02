import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, Sparkles, Trash2, Pencil, X, ChevronRight, IndianRupee } from 'lucide-react';
import { useBrainstormList, useCreateBrainstormItem, useUpdateBrainstormItem, useDeleteBrainstormItem } from '../hooks/useBrainstorm';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500';

function fmt(n) {
  return Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function ItemModal({ item, onClose }) {
  const { toast } = useToast();
  const create = useCreateBrainstormItem();
  const update = useUpdateBrainstormItem();
  const isEdit = !!item?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: item
      ? { name: item.name, total_amount: item.total_amount, notes: item.notes ?? '' }
      : { name: '', total_amount: '', notes: '' },
  });

  async function onSubmit(data) {
    try {
      const payload = {
        name: data.name.trim(),
        total_amount: Number(data.total_amount),
        notes: data.notes?.trim() || null,
      };
      if (isEdit) {
        await update.mutateAsync({ id: item.id, ...payload });
        toast('Updated');
      } else {
        await create.mutateAsync(payload);
        toast('Added');
      }
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to save', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Goal' : 'New Brainstorm Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className={inputCls}
              placeholder="e.g. New Phone, Bike, Vacation"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount Required (₹) *</label>
            <input
              {...register('total_amount', {
                required: 'Amount is required',
                min: { value: 1, message: 'Must be greater than 0' },
                valueAsNumber: true,
              })}
              type="number"
              step="1"
              min="1"
              className={inputCls}
              placeholder="e.g. 50000"
            />
            {errors.total_amount && <p className="text-xs text-red-500 mt-1">{errors.total_amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes <span className="text-xs text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Any details..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-violet-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BrainstormPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, isLoading } = useBrainstormList();
  const deleteItem = useDeleteBrainstormItem();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const items = data?.data ?? [];
  const totalRequired = items.reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPaid = items.reduce((s, i) => s + Number(i.paid_amount), 0);

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync(deleteTarget.id);
      toast('Deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Brainstorm</h1>
          <p className="text-sm text-gray-400 mt-0.5">{items.length} goal{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus size={15} /> Add Goal
        </button>
      </div>

      {/* Summary strip */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-4">
            <p className="text-xs text-violet-500 dark:text-violet-400 font-medium mb-1">Total Required</p>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-300 flex items-center gap-0.5">
              <IndianRupee size={15} className="shrink-0" />{fmt(totalRequired)}
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Total Paid</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
              <IndianRupee size={15} className="shrink-0" />{fmt(totalPaid)}
            </p>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {!isLoading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <Sparkles size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">No goals yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add a goal with a target amount to start tracking.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const total = Number(item.total_amount);
            const paid = Number(item.paid_amount);
            const remaining = Math.max(0, total - paid);
            const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
            const done = paid >= total;

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/brainstorm/${item.id}`)}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                      {done && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                          DONE
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-0.5 text-violet-600 dark:text-violet-400 font-medium">
                        <IndianRupee size={11} />{fmt(total)} required
                      </span>
                      <span className="flex items-center gap-0.5 text-red-500 font-medium">
                        <IndianRupee size={11} />{fmt(remaining)} left
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-violet-600 rounded-md hover:bg-violet-50 dark:hover:bg-violet-900/20 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 ml-1" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-violet-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{pct.toFixed(0)}% funded</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ItemModal item={editItem} onClose={() => { setShowModal(false); setEditItem(null); }} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteItem.isPending}
        />
      )}
    </div>
  );
}
