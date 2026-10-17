import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Package, Minus, AlertTriangle } from 'lucide-react';
import {
  usePantryItems, useCreatePantryItem, useUpdatePantryItem,
  useAdjustPantryItem, useDeletePantryItem, useReorderPantry,
} from '../hooks/usePantry';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500';

const UNIT_OPTIONS = ['pcs', 'bags', 'kg', 'g', 'lbs', 'bottles', 'cans', 'boxes', 'liters'];

function fmtQty(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function ItemModal({ item, onClose }) {
  const { toast } = useToast();
  const create = useCreatePantryItem();
  const update = useUpdatePantryItem();
  const isEdit = !!item?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: item
      ? { name: item.name, quantity: item.quantity, unit: item.unit, low_stock_at: item.low_stock_at ?? '', notes: item.notes ?? '' }
      : { name: '', quantity: '', unit: 'pcs', low_stock_at: '', notes: '' },
  });

  async function onSubmit(data) {
    try {
      const payload = {
        name: data.name.trim(),
        quantity: parseFloat(data.quantity || 0),
        unit: data.unit?.trim() || 'pcs',
        low_stock_at: data.low_stock_at === '' ? null : parseFloat(data.low_stock_at),
        notes: data.notes?.trim() || null,
      };
      if (isEdit) { await update.mutateAsync({ id: item.id, ...payload }); toast('Item updated'); }
      else        { await create.mutateAsync(payload); toast('Item added'); }
      onClose();
    } catch (err) { toast(err?.error ?? 'Failed to save', 'error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Item' : 'Add Pantry Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Rice, Olive Oil, Paper Towels" autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <input type="number" step="any" min="0" {...register('quantity', { required: 'Required', min: { value: 0, message: '>= 0' } })} className={inputCls} placeholder="0" />
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
              <select {...register('unit')} className={inputCls}>
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Low Stock Alert <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <input type="number" step="any" min="0" {...register('low_stock_at')} className={inputCls} placeholder="e.g. 2 — flag when quantity drops to or below this" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} placeholder="e.g. Brand, store..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PantryPage() {
  const { toast } = useToast();
  const { data, isLoading } = usePantryItems();
  const adjust = useAdjustPantryItem();
  const deleteItem = useDeletePantryItem();
  const reorder = useReorderPantry();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const [filter, setFilter] = useState('all'); // all | low
  const dragId = useRef(null);

  const serverItems = data?.data ?? [];
  const isLow = (i) => i.low_stock_at != null && i.quantity <= i.low_stock_at;
  const lowCount = serverItems.filter(isLow).length;

  const filtered = filter === 'low' ? serverItems.filter(isLow) : serverItems;
  const items = localOrder
    ? localOrder.map((id) => filtered.find((i) => i.id === id)).filter(Boolean)
    : filtered;

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
    { key: 'all', label: 'All' },
    { key: 'low', label: `Low Stock${lowCount ? ` (${lowCount})` : ''}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pantry</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {serverItems.length} item{serverItems.length !== 1 ? 's' : ''}{lowCount ? ` · ${lowCount} low` : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
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
                ? 'bg-teal-600 text-white'
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
          <Package size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">{filter === 'low' ? 'Nothing running low.' : 'No items yet.'}</p>
          {filter !== 'low' && <p className="text-xs text-gray-400 mt-1">Track how much rice, oil, etc. you have on hand.</p>}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const low = isLow(item);
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={handleDrop}
                className={`bg-white dark:bg-gray-900 rounded-xl border p-3 flex flex-col gap-2 group ${low ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${low ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-teal-50 dark:bg-teal-900/20'}`}>
                    {low ? <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" /> : <Package size={13} className="text-teal-600 dark:text-teal-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate" title={item.name}>{item.name}</p>
                    <span className={`text-[11px] font-medium ${low ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                      {low ? `Low · ≤ ${fmtQty(item.low_stock_at)} ${item.unit}` : item.unit}
                    </span>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditItem(item); setShowModal(true); }}
                      className="p-1 text-gray-400 hover:text-teal-600 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {item.notes && <p className="text-[11px] text-gray-400 truncate">{item.notes}</p>}

                {/* Quantity adjuster */}
                <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
                  <button
                    onClick={() => adjust.mutate({ id: item.id, delta: -1 })}
                    disabled={item.quantity <= 0}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="text-sm font-bold text-gray-900 dark:text-white text-center tabular-nums">{fmtQty(item.quantity)}</span>
                  <button
                    onClick={() => adjust.mutate({ id: item.id, delta: 1 })}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                  >
                    <Plus size={13} />
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
