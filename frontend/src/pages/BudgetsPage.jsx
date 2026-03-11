import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, useReorderBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

function BudgetModal({ budget, categories, onClose }) {
  const { toast } = useToast();
  const { config } = useWorkspace();
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const isEdit = !!budget;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: budget
      ? { category_id: budget.category_id ?? '', amount: budget.amount, period: budget.period }
      : { period: 'monthly' },
  });

  async function onSubmit(data) {
    try {
      const payload = { ...data, amount: parseFloat(data.amount), category_id: data.category_id || null };
      if (isEdit) {
        await update.mutateAsync({ id: budget.id, ...payload });
        toast('Budget updated');
      } else {
        await create.mutateAsync(payload);
        toast('Budget created');
      }
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to save', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Budget' : 'New Budget'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select {...register('category_id')} className={inputCls}>
              <option value="">Overall (all spending)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Amount ({config?.currency}) *</label>
            <input type="number" step="1" min="1" {...register('amount', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })} className={inputCls} />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period</label>
            <select {...register('period')} className={inputCls}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const { toast } = useToast();
  const { fmtRound } = useWorkspace();
  const { data, isLoading, error } = useBudgets();
  const { data: catData } = useCategories();
  const deleteBudget = useDeleteBudget();
  const reorderBudgets = useReorderBudgets();
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ordered, setOrdered] = useState([]);
  const dragId = useRef(null);
  const dragOverId = useRef(null);

  const serverBudgets = data?.data ?? [];
  const categories = catData?.data ?? [];

  useEffect(() => { setOrdered(serverBudgets); }, [data]);

  function openAdd() { setEditBudget(null); setShowModal(true); }
  function openEdit(b) { setEditBudget(b); setShowModal(true); }

  async function handleDelete() {
    try {
      await deleteBudget.mutateAsync(deleteTarget.id);
      toast('Budget deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  function onDragStart(id) { dragId.current = id; }

  function onDragOver(e, id) {
    e.preventDefault();
    if (id === dragId.current) return;
    dragOverId.current = id;
    setOrdered((prev) => {
      const from = prev.findIndex((b) => b.id === dragId.current);
      const to   = prev.findIndex((b) => b.id === id);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  function onDrop() {
    const ids = ordered.map((b) => b.id);
    reorderBudgets.mutate(ids);
    dragId.current = null;
    dragOverId.current = null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Budgets</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus size={15} /> New Budget
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && (
        <div className="space-y-4">
          {ordered.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
              No budgets yet. Create one to start tracking limits!
            </div>
          ) : (
            ordered.map((b) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => onDragStart(b.id)}
                onDragOver={(e) => onDragOver(e, b.id)}
                onDrop={onDrop}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-default"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 shrink-0 touch-none">
                      <GripVertical size={16} />
                    </div>
                    {b.category_color && (
                      <span className="w-9 h-9 rounded-lg shrink-0" style={{ background: b.category_color }} />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {b.category_name ?? 'Overall Spending'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{b.period} budget</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fmtRound(b.amount)}</span>
                    <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(b)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <BudgetModal budget={editBudget} categories={categories} onClose={() => { setShowModal(false); setEditBudget(null); }} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete budget for "${deleteTarget.category_name ?? 'Overall Spending'}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteBudget.isPending}
        />
      )}
    </div>
  );
}
