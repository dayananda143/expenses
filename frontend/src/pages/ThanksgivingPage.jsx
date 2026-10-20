import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Pencil, CheckCircle2, Circle, X, Wheat, ExternalLink } from 'lucide-react';
import { useThanksgivingItems, useCreateThanksgivingItem, useUpdateThanksgivingItem, useToggleThanksgivingItem, useDeleteThanksgivingItem } from '../hooks/useThanksgiving';
import { useWorkspace } from '../contexts/WorkspaceContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ThanksgivingPage() {
  const { fmt } = useWorkspace();
  const { data, isLoading } = useThanksgivingItems();
  const toggleItem = useToggleThanksgivingItem();
  const deleteItem = useDeleteThanksgivingItem();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const items = data?.data ?? [];
  const pending = items.filter((i) => !i.purchased);
  const purchased = items.filter((i) => i.purchased);
  const pendingTotal = pending.reduce((s, i) => s + (i.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Thanksgiving</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pendingTotal > 0 && <><span className="font-semibold text-amber-600 dark:text-amber-400">{fmt(pendingTotal)}</span> remaining across {pending.length} item{pending.length !== 1 ? 's' : ''}</>}
            {pendingTotal === 0 && pending.length > 0 && `${pending.length} item${pending.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <Wheat size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">No items yet.</p>
          <p className="text-xs text-gray-400 mt-1">Track what you need to buy for Thanksgiving here.</p>
        </div>
      )}

      {!isLoading && pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">To Get ({pending.length})</h2>
          {pending.map((item) => (
            <ThanksgivingRow key={item.id} item={item} fmt={fmt} onToggle={() => toggleItem.mutate(item.id)} onEdit={() => { setEditTarget(item); setShowModal(true); }} onDelete={() => setDeleteTarget(item)} />
          ))}
        </div>
      )}

      {!isLoading && purchased.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Purchased ({purchased.length})</h2>
          {purchased.map((item) => (
            <ThanksgivingRow key={item.id} item={item} fmt={fmt} onToggle={() => toggleItem.mutate(item.id)} onEdit={() => { setEditTarget(item); setShowModal(true); }} onDelete={() => setDeleteTarget(item)} />
          ))}
        </div>
      )}

      {showModal && (
        <ThanksgivingModal item={editTarget} onClose={() => { setShowModal(false); setEditTarget(null); }} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">Delete <span className="font-semibold">{deleteTarget.name}</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button
                onClick={async () => { await deleteItem.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
                disabled={deleteItem.isPending}
                className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteItem.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThanksgivingRow({ item, fmt, onToggle, onEdit, onDelete }) {
  const isPurchased = !!item.purchased;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${isPurchased ? 'border-gray-100 dark:border-gray-800 opacity-60' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900`}>
      <button onClick={onToggle} className="shrink-0 text-gray-300 dark:text-gray-700 hover:text-emerald-500 transition-colors">
        {isPurchased ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold text-gray-800 dark:text-gray-200 truncate ${isPurchased ? 'line-through' : ''}`}>{item.name}</p>
        {(item.link || item.notes) && (
          <p className="text-xs text-gray-400 truncate flex items-center gap-1">
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 text-blue-500 hover:underline shrink-0">
                <ExternalLink size={10} /> Link
              </a>
            )}
            {item.link && item.notes && <span>·</span>}
            {item.notes && <span className="truncate">{item.notes}</span>}
          </p>
        )}
      </div>
      {item.amount != null && <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{fmt(item.amount)}</p>}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ThanksgivingModal({ item, onClose }) {
  const create = useCreateThanksgivingItem();
  const update = useUpdateThanksgivingItem();
  const isEdit = !!item;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: item ? {
      name: item.name, link: item.link ?? '', amount: item.amount ?? '', notes: item.notes ?? '',
    } : { name: '', link: '', amount: '', notes: '' },
  });

  async function onSubmit(data) {
    const payload = { ...data, amount: data.amount === '' ? null : parseFloat(data.amount) };
    if (isEdit) await update.mutateAsync({ id: item.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Item' : 'New Thanksgiving Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Item Name *</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Turkey, Pumpkin Pie" autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Link <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <input type="url" {...register('link')} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Amount <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <input type="number" step="0.01" min="0" {...register('amount')} className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <label className={labelCls}>Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
