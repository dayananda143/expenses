import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, GripVertical, Target, Archive, ArchiveX, ChevronDown, ChevronUp } from 'lucide-react';
import { usePriority, useCreatePriorityItem, useUpdatePriorityItem, useDeletePriorityItem, useReorderPriority, useArchivePriorityItem } from '../hooks/usePriority';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

function ItemModal({ item, onClose }) {
  const { toast } = useToast();
  const { fmt } = useWorkspace();
  const create = useCreatePriorityItem();
  const update = useUpdatePriorityItem();
  const isEdit = !!item?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: item
      ? { name: item.name, budget: item.budget, saved: item.saved, notes: item.notes ?? '' }
      : { name: '', budget: '', saved: '0', notes: '' },
  });

  async function onSubmit(data) {
    try {
      const payload = { name: data.name.trim(), budget: parseFloat(data.budget), saved: parseFloat(data.saved ?? 0), notes: data.notes?.trim() || null };
      if (isEdit) { await update.mutateAsync({ id: item.id, ...payload }); toast('Item updated'); }
      else        { await create.mutateAsync(payload); toast('Item added'); }
      onClose();
    } catch (err) { toast(err?.error ?? 'Failed to save', 'error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Item' : 'Add Priority Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. New Laptop, Emergency Fund" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Budget *</label>
              <input type="number" step="0.01" min="0.01" {...register('budget', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} className={inputCls} placeholder="0.00" />
              {errors.budget && <p className="text-xs text-red-500 mt-1">{errors.budget.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saved So Far</label>
              <input type="number" step="0.01" min="0" {...register('saved')} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} placeholder="e.g. Saving $200/month" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PriorityCard({ item, idx, onEdit, onDelete, onArchive, onDragStart, onDragOver, onDrop, fmt, isArchived }) {
  const pct = Math.min((item.saved / item.budget) * 100, 100);
  const remaining = item.budget - item.saved;
  const done = item.saved >= item.budget;

  return (
    <div
      draggable={!isArchived}
      onDragStart={() => !isArchived && onDragStart(item.id)}
      onDragOver={(e) => !isArchived && onDragOver(e, item.id)}
      onDrop={() => !isArchived && onDrop()}
      className={`bg-white dark:bg-gray-900 rounded-xl border p-4 flex gap-3 group transition-opacity ${
        isArchived ? 'border-gray-100 dark:border-gray-800 opacity-70' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Drag handle + rank */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        {!isArchived && (
          <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400">
            <GripVertical size={16} />
          </div>
        )}
        {isArchived
          ? <Archive size={14} className="text-gray-300 dark:text-gray-600" />
          : <span className="text-xs font-bold text-gray-300 dark:text-gray-600">#{idx + 1}</span>
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate ${isArchived ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{item.name}</p>
            {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
            {isArchived && item.archived_at && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                Archived {new Date(item.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onArchive(item)}
              title={isArchived ? 'Unarchive' : 'Archive'}
              className="p-1.5 text-gray-400 hover:text-violet-600 rounded-md hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            >
              {isArchived ? <ArchiveX size={13} /> : <Archive size={13} />}
            </button>
            {!isArchived && (
              <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                <Pencil size={13} />
              </button>
            )}
            <button onClick={() => onDelete(item)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : pct > 66 ? 'bg-emerald-400' : pct > 33 ? 'bg-amber-400' : 'bg-blue-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Amounts */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(item.saved)}</span> saved of {fmt(item.budget)}
          </span>
          {done
            ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">Completed!</span>
            : <span className="text-gray-400">{fmt(remaining)} to go · {pct.toFixed(0)}%</span>
          }
        </div>
      </div>
    </div>
  );
}

export default function PriorityPage() {
  const { toast } = useToast();
  const { fmt } = useWorkspace();
  const { data, isLoading } = usePriority();
  const deleteItem = useDeletePriorityItem();
  const archiveItem = useArchivePriorityItem();
  const reorder = useReorderPriority();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const dragId = useRef(null);

  const allItems    = data?.data ?? [];
  const activeItems = allItems.filter((i) => !i.archived);
  const archivedItems = allItems.filter((i) => i.archived);

  const serverItems = activeItems;
  const items = localOrder
    ? localOrder.map((id) => serverItems.find((i) => i.id === id)).filter(Boolean)
    : serverItems;

  const totalBudget = activeItems.reduce((s, i) => s + i.budget, 0);
  const totalSaved  = activeItems.reduce((s, i) => s + i.saved, 0);

  function handleDragStart(id) {
    dragId.current = id;
    setLocalOrder(serverItems.map((i) => i.id));
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    setLocalOrder((prev) => {
      const order = prev ?? serverItems.map((i) => i.id);
      const from = order.indexOf(dragId.current);
      const to   = order.indexOf(id);
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
    try {
      await deleteItem.mutateAsync(deleteTarget.id);
      toast('Item deleted');
      setDeleteTarget(null);
    } catch (err) { toast(err?.error ?? 'Failed to delete', 'error'); }
  }

  async function handleArchive(item) {
    try {
      await archiveItem.mutateAsync(item.id);
      toast(item.archived ? 'Item unarchived' : 'Item archived');
    } catch (err) { toast(err?.error ?? 'Failed to archive', 'error'); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Priority List</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track savings goals in order of priority</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Summary */}
      {activeItems.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Target</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{fmt(totalBudget)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Saved</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(totalSaved)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmt(totalBudget - totalSaved)} remaining</p>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {!isLoading && activeItems.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <Target size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">No priority items yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add items you're saving toward, in order of priority.</p>
        </div>
      )}

      {/* Active items */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <PriorityCard
              key={item.id}
              item={item}
              idx={idx}
              fmt={fmt}
              isArchived={false}
              onEdit={(i) => { setEditItem(i); setShowModal(true); }}
              onDelete={setDeleteTarget}
              onArchive={handleArchive}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* Archived section */}
      {!isLoading && archivedItems.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <Archive size={13} />
            Archived ({archivedItems.length})
          </button>
          {showArchived && (
            <div className="space-y-3 mt-3">
              {archivedItems.map((item) => (
                <PriorityCard
                  key={item.id}
                  item={item}
                  idx={0}
                  fmt={fmt}
                  isArchived={true}
                  onEdit={() => {}}
                  onDelete={setDeleteTarget}
                  onArchive={handleArchive}
                  onDragStart={() => {}}
                  onDragOver={() => {}}
                  onDrop={() => {}}
                />
              ))}
            </div>
          )}
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
