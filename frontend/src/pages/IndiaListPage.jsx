import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, GripVertical, ShoppingBag, Package, Check } from 'lucide-react';
import {
  useIndiaList, useCreateIndiaListItem, useUpdateIndiaListItem,
  useToggleIndiaListItem, useDeleteIndiaListItem, useReorderIndiaList,
} from '../hooks/useIndiaList';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500';

const TYPE_OPTIONS = [
  { value: 'buy',    label: 'Buy in India',   icon: ShoppingBag, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { value: 'parcel', label: 'Parcel to US',   icon: Package,     color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20'    },
];

function getTypeConfig(type) {
  return TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0];
}

function ItemModal({ item, onClose }) {
  const { toast } = useToast();
  const create = useCreateIndiaListItem();
  const update = useUpdateIndiaListItem();
  const isEdit = !!item?.id;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: item
      ? { name: item.name, type: item.type, notes: item.notes ?? '' }
      : { name: '', type: 'buy', notes: '' },
  });

  async function onSubmit(data) {
    try {
      const payload = { name: data.name.trim(), type: data.type, notes: data.notes?.trim() || null };
      if (isEdit) { await update.mutateAsync({ id: item.id, ...payload, done: item.done }); toast('Item updated'); }
      else        { await create.mutateAsync(payload); toast('Item added'); }
      onClose();
    } catch (err) { toast(err?.error ?? 'Failed to save', 'error'); }
  }

  const type = watch('type');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Item' : 'Add to India List'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Saree, Sweets, Electronics" autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(({ value, label, icon: Icon, color, bg }) => (
                <label key={value} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium ${
                  type === value
                    ? `border-current ${color} ${bg}`
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                  <input type="radio" value={value} {...register('type')} className="sr-only" />
                  <Icon size={14} />{label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} placeholder="e.g. Brand, size, quantity..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IndiaListPage() {
  const { toast } = useToast();
  const { data, isLoading } = useIndiaList();
  const toggle = useToggleIndiaListItem();
  const deleteItem = useDeleteIndiaListItem();
  const reorder = useReorderIndiaList();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const [filter, setFilter] = useState('all'); // all | buy | parcel | pending | done
  const dragId = useRef(null);

  const serverItems = data?.data ?? [];

  const filtered = serverItems.filter((i) => {
    if (filter === 'buy')     return i.type === 'buy'    && !i.done;
    if (filter === 'parcel')  return i.type === 'parcel' && !i.done;
    if (filter === 'pending') return !i.done;
    if (filter === 'done')    return !!i.done;
    return true;
  });

  const items = localOrder
    ? localOrder.map((id) => filtered.find((i) => i.id === id)).filter(Boolean)
    : filtered;

  const totalCount   = serverItems.length;
  const doneCount    = serverItems.filter((i) => i.done).length;
  const pendingCount = totalCount - doneCount;

  function handleDragStart(id) {
    dragId.current = id;
    setLocalOrder(filtered.map((i) => i.id));
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    setLocalOrder((prev) => {
      const order = prev ?? filtered.map((i) => i.id);
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

  const FILTERS = [
    { key: 'all',     label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'buy',     label: 'Buy' },
    { key: 'parcel',  label: 'Parcel' },
    { key: 'done',    label: 'Done' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">India List</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pendingCount} pending · {doneCount} done
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setLocalOrder(null); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === key
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <ShoppingBag size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">No items here.</p>
          <p className="text-xs text-gray-400 mt-1">Add things to buy in India or parcel to the US.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const typeConfig = getTypeConfig(item.type);
            const Icon = typeConfig.icon;
            return (
              <div
                key={item.id}
                draggable={!item.done}
                onDragStart={() => !item.done && handleDragStart(item.id)}
                onDragOver={(e) => !item.done && handleDragOver(e, item.id)}
                onDrop={() => !item.done && handleDrop()}
                className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 group transition-opacity ${item.done ? 'opacity-60' : ''}`}
              >
                {/* Drag handle */}
                {!item.done && (
                  <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 shrink-0">
                    <GripVertical size={15} />
                  </div>
                )}

                {/* Checkbox */}
                <button
                  onClick={() => toggle.mutate(item.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    item.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                  }`}
                >
                  {item.done && <Check size={11} strokeWidth={3} />}
                </button>

                {/* Type icon */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.bg}`}>
                  <Icon size={13} className={typeConfig.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-gray-800 dark:text-gray-200 truncate ${item.done ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] font-medium ${typeConfig.color}`}>{typeConfig.label}</span>
                    {item.notes && <span className="text-[11px] text-gray-400 truncate">· {item.notes}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditItem(item); setShowModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-orange-600 rounded-md hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
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
