import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '../hooks/useProperties';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

function fmtINR(n) {
  if (n == null || n === '') return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function PropertyModal({ property, onClose }) {
  const { toast } = useToast();
  const create = useCreateProperty();
  const update = useUpdateProperty();
  const isEdit = !!property?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: property
      ? { name: property.name, area: property.area ?? '', actual_price: property.actual_price ?? '', appreciated_value: property.appreciated_value ?? '', purchase_date: property.purchase_date ?? '', sold_date: property.sold_date ?? '', sold_amount: property.sold_amount ?? '', notes: property.notes ?? '' }
      : { name: '', area: '', actual_price: '', appreciated_value: '', purchase_date: '', sold_date: '', sold_amount: '', notes: '' },
  });

  async function onSubmit(data) {
    try {
      const payload = {
        name: data.name.trim(),
        area: data.area?.trim() || null,
        actual_price: data.actual_price !== '' ? Number(data.actual_price) : null,
        appreciated_value: data.appreciated_value !== '' ? Number(data.appreciated_value) : null,
        purchase_date: data.purchase_date || null,
        sold_date: data.sold_date || null,
        sold_amount: data.sold_amount !== '' ? Number(data.sold_amount) : null,
        notes: data.notes?.trim() || null,
      };
      if (isEdit) { await update.mutateAsync({ id: property.id, ...payload }); toast('Property updated'); }
      else        { await create.mutateAsync(payload); toast('Property added'); }
      onClose();
    } catch (err) { toast(err?.error ?? 'Failed to save', 'error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Property' : 'Add Property'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Name *</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Kameswar Nagar Plot" autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area</label>
              <input {...register('area')} className={inputCls} placeholder="e.g. 1200 sq ft" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Purchased</label>
              <input type="date" {...register('purchase_date')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Price (₹)</label>
              <input type="number" step="1" min="0" {...register('actual_price')} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Appreciated Value (₹)</label>
              <input type="number" step="1" min="0" {...register('appreciated_value')} className={inputCls} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Sold</label>
              <input type="date" {...register('sold_date')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sold Amount (₹)</label>
              <input type="number" step="1" min="0" {...register('sold_amount')} className={inputCls} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} placeholder="Any details..." />
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

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PropertyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const { data, isLoading } = useProperties();
  const deleteProperty = useDeleteProperty();

  const [tab, setTab] = useState('current');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allProperties = data?.data ?? [];
  const current = allProperties.filter(p => !p.sold_date && !p.sold_amount);
  const sold    = allProperties.filter(p => p.sold_date || p.sold_amount);
  const properties = tab === 'current' ? current : sold;

  async function handleDelete() {
    try {
      await deleteProperty.mutateAsync(deleteTarget.id);
      toast('Deleted');
      setDeleteTarget(null);
    } catch (err) { toast(err?.error ?? 'Failed to delete', 'error'); }
  }

  const tabCls = (t) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ` +
    (tab === t
      ? 'bg-emerald-600 text-white'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Property</h1>
          <p className="text-sm text-gray-400 mt-0.5">{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={15} /> Add Property
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button className={tabCls('current')} onClick={() => setTab('current')}>
          Current <span className="ml-1 text-xs opacity-75">({current.length})</span>
        </button>
        <button className={tabCls('sold')} onClick={() => setTab('sold')}>
          Sold <span className="ml-1 text-xs opacity-75">({sold.length})</span>
        </button>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && properties.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <Building2 size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">No {tab} properties.</p>
          {isAdmin && tab === 'current' && (
            <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-emerald-600 hover:underline">+ Add your first property</button>
          )}
        </div>
      )}

      {!isLoading && properties.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Area</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actual Price</th>
                  {tab === 'current' && (
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appreciated Value</th>
                  )}
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Purchased</th>
                  {tab === 'sold' && (
                    <>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Sold</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sold Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit / Loss</th>
                    </>
                  )}
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {properties.map((p) => {
                  const gain = p.appreciated_value != null && p.actual_price != null
                    ? p.appreciated_value - p.actual_price
                    : null;
                  const profit = p.sold_amount != null && p.actual_price != null
                    ? p.sold_amount - p.actual_price
                    : null;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                        {p.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.area || '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200 font-medium">{fmtINR(p.actual_price)}</td>
                      {tab === 'current' && (
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmtINR(p.appreciated_value)}</span>
                          {gain != null && gain > 0 && (
                            <p className="text-xs text-emerald-500 mt-0.5">+{fmtINR(gain)}</p>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{fmtDate(p.purchase_date)}</td>
                      {tab === 'sold' && (
                        <>
                          <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{fmtDate(p.sold_date)}</td>
                          <td className="px-4 py-3 text-right font-medium text-orange-600 dark:text-orange-400">{fmtINR(p.sold_amount)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {profit != null ? (
                              <span className={profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                {profit >= 0 ? '+' : ''}{fmtINR(profit)}
                              </span>
                            ) : '—'}
                          </td>
                        </>
                      )}
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditItem(p); setShowModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <PropertyModal property={editItem} onClose={() => { setShowModal(false); setEditItem(null); }} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteProperty.isPending}
        />
      )}
    </div>
  );
}
