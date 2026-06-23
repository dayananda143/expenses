import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, IndianRupee, DollarSign, Pencil, Trash2, X, Wallet, Target, TrendingDown, ClipboardList, Plus, HandCoins } from 'lucide-react';
import {
  useBrainstormItem, useUpdateBrainstormItem, useDeleteBrainstormItem,
  useBrainstormRecords, useAddBrainstormRecord, useUpdateBrainstormRecord, useDeleteBrainstormRecord,
} from '../hooks/useBrainstorm';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500';

function fmt(n, currency = 'INR') {
  return Number(n ?? 0).toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN', { maximumFractionDigits: 0 });
}

function curOf(item) {
  return item?.currency === 'USD' ? 'USD' : 'INR';
}

function EditModal({ item, onClose }) {
  const { toast } = useToast();
  const update = useUpdateBrainstormItem();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: item.name, total_amount: item.total_amount, notes: item.notes ?? '', currency: item.currency ?? 'INR' },
  });

  async function onSubmit(data) {
    try {
      await update.mutateAsync({
        id: item.id,
        name: data.name.trim(),
        total_amount: Number(data.total_amount),
        notes: data.notes?.trim() || null,
        currency: data.currency,
      });
      toast('Updated');
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to update', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit Goal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount Required *</label>
              <input
                {...register('total_amount', { required: 'Required', min: { value: 1, message: 'Must be > 0' }, valueAsNumber: true })}
                type="number" step="1" min="1" className={inputCls}
              />
              {errors.total_amount && <p className="text-xs text-red-500 mt-1">{errors.total_amount.message}</p>}
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
              <select {...register('currency')} className={inputCls}>
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-violet-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordsModal({ item, onClose }) {
  const { toast } = useToast();
  const { data, isLoading } = useBrainstormRecords(String(item.id));
  const addRecord = useAddBrainstormRecord(String(item.id));
  const updateRecord = useUpdateBrainstormRecord(String(item.id));
  const deleteRecord = useDeleteBrainstormRecord(String(item.id));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', amount: '', given_amount: '', notes: '' },
  });

  const records = data?.data ?? [];
  const currency = curOf(item);
  const Cur = currency === 'USD' ? DollarSign : IndianRupee;
  const sym = currency === 'USD' ? '$' : '₹';

  function startEdit(record) {
    setEditTarget(record);
    reset({ name: record.name, amount: record.amount, given_amount: record.given_amount ?? 0, notes: record.notes ?? '' });
  }

  function cancelEdit() {
    setEditTarget(null);
    reset({ name: '', amount: '', given_amount: '', notes: '' });
  }

  async function onSubmit(data) {
    try {
      const payload = {
        name: data.name.trim(),
        amount: Number(data.amount),
        given_amount: Number.isFinite(data.given_amount) ? data.given_amount : 0,
        notes: data.notes?.trim() || null,
      };
      if (editTarget) {
        await updateRecord.mutateAsync({ id: editTarget.id, ...payload });
        toast('Record updated');
      } else {
        await addRecord.mutateAsync(payload);
        toast('Record added');
      }
      cancelEdit();
    } catch (err) {
      toast(err?.error ?? 'Failed to save', 'error');
    }
  }

  async function handleDelete() {
    try {
      await deleteRecord.mutateAsync(deleteTarget.id);
      toast('Deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Records — {item.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{records.length} record{records.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>

        {/* Add form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {editTarget ? `Edit Record — ${editTarget.name}` : 'Add Record'}
          </p>
          <div>
            <input
              {...register('name', { required: true })}
              className={inputCls}
              placeholder="Name (e.g. Token, Advance)"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <input
                {...register('amount', { required: true, min: 1, valueAsNumber: true })}
                type="number" step="1" min="1"
                className={inputCls}
                placeholder={`Amount ${sym}`}
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div className="flex-1">
              <input
                {...register('given_amount', { min: 0, valueAsNumber: true })}
                type="number" step="1" min="0"
                className={inputCls}
                placeholder={`Given so far ${sym}`}
              />
              {errors.given_amount && <p className="text-xs text-red-500 mt-1">Must be ≥ 0</p>}
            </div>
          </div>
          <textarea
            {...register('notes')}
            rows={2}
            className={`${inputCls} resize-none mt-2`}
            placeholder="Sub details (optional) — e.g. paid via UPI, vendor, reference no."
          />
          <div className="flex gap-2 mt-2">
            {editTarget && (
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-violet-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
            >
              {editTarget ? <><Pencil size={14} /> Update</> : <><Plus size={15} /> Add</>}
            </button>
          </div>
        </form>

        {/* Records list */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {isLoading && <LoadingSpinner />}
          {!isLoading && records.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No records yet. Add one above.</p>
          )}
          {!isLoading && records.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                {r.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{r.notes}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                  <Cur size={12} />{fmt(r.amount, currency)}
                </p>
                <p className={`text-[11px] font-medium mt-0.5 ${Number(r.given_amount) >= Number(r.amount)
                  ? 'text-emerald-500'
                  : Number(r.given_amount) > 0 ? 'text-amber-500' : 'text-gray-400'
                }`}>
                  {sym}{fmt(r.given_amount, currency)} given
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(r)}
                  className="p-1.5 text-gray-400 hover:text-violet-600 rounded-md hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleteTarget(r)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total footer */}
        {records.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Settled</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <Cur size={13} />{fmt(records.reduce((s, r) => s + Number(r.amount), 0), currency)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Given</p>
              <p className="text-sm font-bold text-amber-500 flex items-center gap-0.5">
                <Cur size={13} />{fmt(records.reduce((s, r) => s + Number(r.given_amount), 0), currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete record "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteRecord.isPending}
        />
      )}
    </div>
  );
}

export default function BrainstormDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useBrainstormItem(id);
  const deleteItem = useDeleteBrainstormItem();

  const [showEdit, setShowEdit] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const item = data?.data;

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync(id);
      toast('Deleted');
      navigate('/brainstorm');
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  if (isLoading) return <LoadingSpinner />;
  if (!item) return (
    <div className="text-center py-20 text-gray-400">
      <p>Goal not found.</p>
      <button onClick={() => navigate('/brainstorm')} className="mt-3 text-violet-600 text-sm hover:underline">Go back</button>
    </div>
  );

  const total = Number(item.total_amount);
  const paid = Number(item.paid_amount);
  const given = Number(item.given_amount ?? 0);
  const remaining = Math.max(0, total - paid);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const pctGiven = total > 0 ? Math.min(100, (given / total) * 100) : 0;
  const done = paid >= total;
  const fullyGiven = given >= total;
  const currency = curOf(item);
  const Cur = currency === 'USD' ? DollarSign : IndianRupee;
  const sym = currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/brainstorm')}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
              {fullyGiven && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  COMPLETE
                </span>
              )}
              {!fullyGiven && given > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  IN PROGRESS
                </span>
              )}
            </div>
            {item.notes && <p className="text-sm text-gray-400 mt-0.5">{item.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 - Total Required */}
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-800/50 flex items-center justify-center">
              <Target size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Total Required</p>
          </div>
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300 flex items-center gap-0.5">
            <Cur size={18} className="shrink-0" />{fmt(total, currency)}
          </p>
          <p className="text-xs text-violet-500 dark:text-violet-500 mt-1">Target amount</p>
        </div>

        {/* Card 2 - Amount Settled */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
              <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Amount Settled</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
            <Cur size={18} className="shrink-0" />{fmt(paid, currency)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">{pct.toFixed(1)}% of goal</p>
        </div>

        {/* Card 3 - Amount Given */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
              <HandCoins size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Amount Given</p>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
            <Cur size={18} className="shrink-0" />{fmt(given, currency)}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{pctGiven.toFixed(1)}% of goal handed over</p>
        </div>

        {/* Card 4 - Remaining */}
        <div className={`rounded-xl border p-5 ${done
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done
              ? 'bg-emerald-100 dark:bg-emerald-800/50'
              : 'bg-red-100 dark:bg-red-800/50'
            }`}>
              <TrendingDown size={16} className={done ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} />
            </div>
            <p className={`text-sm font-medium ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              Remaining
            </p>
          </div>
          <p className={`text-2xl font-bold flex items-center gap-0.5 ${done
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-red-600 dark:text-red-400'
          }`}>
            <Cur size={18} className="shrink-0" />{fmt(remaining, currency)}
          </p>
          <p className={`text-xs mt-1 ${done ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-500'}`}>
            {done ? 'Goal reached!' : 'Still needed'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{pctGiven.toFixed(1)}% given</p>
        </div>
        <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-emerald-200 dark:bg-emerald-900/70 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${pctGiven}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-gray-400">{sym}0</span>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Given {sym}{fmt(given, currency)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-300 dark:bg-emerald-800" /> Settled {sym}{fmt(paid, currency)}
            </span>
          </div>
          <span className="text-xs text-gray-400">{sym}{fmt(total, currency)}</span>
        </div>
      </div>

      {/* Detail button */}
      <button
        onClick={() => setShowRecords(true)}
        className="w-full bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
      >
        <ClipboardList size={16} /> Detail
      </button>

      {showEdit && <EditModal item={item} onClose={() => setShowEdit(false)} />}
      {showRecords && <RecordsModal item={item} onClose={() => setShowRecords(false)} />}
      {showDelete && (
        <ConfirmDialog
          message={`Delete "${item.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleteItem.isPending}
        />
      )}
    </div>
  );
}
