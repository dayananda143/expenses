import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories } from '../hooks/useCategories';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

const ICONS = [
  'utensils', 'car', 'shopping-bag', 'film', 'heart-pulse',
  'zap', 'home', 'book-open', 'plane', 'circle',
  'coffee', 'music', 'gamepad-2', 'dumbbell', 'baby',
  'gift', 'paw-print', 'briefcase', 'smartphone', 'shirt',
];

const COLORS = [
  '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#ef4444',
  '#eab308', '#14b8a6', '#8b5cf6', '#06b6d4', '#6b7280',
  '#10b981', '#f59e0b', '#84cc16', '#e11d48', '#0ea5e9',
];

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

function CategoryModal({ category, onClose }) {
  const { toast } = useToast();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const isEdit = !!category;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: category
      ? { name: category.name, color: category.color, icon: category.icon }
      : { color: '#10b981', icon: 'circle' },
  });

  const selectedColor = watch('color');
  const selectedIcon  = watch('icon');

  async function onSubmit(data) {
    try {
      if (isEdit) {
        await update.mutateAsync({ id: category.id, ...data });
        toast('Category updated');
      } else {
        await create.mutateAsync(data);
        toast('Category created');
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Food & Dining" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <input type="text" {...register('color')} className={`mt-2 ${inputCls} w-32`} placeholder="#hex" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setValue('icon', icon)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${selectedIcon === icon ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
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

export default function CategoriesPage() {
  const { toast } = useToast();
  const { data, isLoading, error } = useCategories();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ordered, setOrdered] = useState([]);
  const dragId = useRef(null);

  useEffect(() => { setOrdered(data?.data ?? []); }, [data]);

  function openAdd() { setEditCat(null); setShowModal(true); }
  function openEdit(c) { setEditCat(c); setShowModal(true); }

  async function handleDelete() {
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast('Category deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  function onDragStart(id) { dragId.current = id; }

  function onDragOver(e, id) {
    e.preventDefault();
    if (id === dragId.current) return;
    setOrdered((prev) => {
      const from = prev.findIndex((c) => c.id === dragId.current);
      const to   = prev.findIndex((c) => c.id === id);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  function onDrop() {
    reorderCategories.mutate(ordered.map((c) => c.id));
    dragId.current = null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus size={15} /> New Category
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {ordered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">No categories yet. Create one!</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {ordered.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => onDragStart(c.id)}
                  onDragOver={(e) => onDragOver(e, c.id)}
                  onDrop={onDrop}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 shrink-0 touch-none">
                      <GripVertical size={16} />
                    </div>
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: c.color }}>
                      {c.name[0]}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.icon}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CategoryModal category={editCat} onClose={() => { setShowModal(false); setEditCat(null); }} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete category "${deleteTarget.name}"? Expenses in this category will become uncategorised.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteCategory.isPending}
        />
      )}
    </div>
  );
}
