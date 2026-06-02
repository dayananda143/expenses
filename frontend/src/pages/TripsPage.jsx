import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, MapPin, Calendar, Receipt, ChevronDown, ChevronUp, Plane, Tag } from 'lucide-react';
import { useTrips, useCreateTrip, useUpdateTrip, useDeleteTrip, useTripExpenses } from '../hooks/useTrips';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

function TripModal({ trip, onClose }) {
  const { toast } = useToast();
  const create = useCreateTrip();
  const update = useUpdateTrip();
  const isEdit = !!trip?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: trip
      ? { name: trip.name, destination: trip.destination ?? '', start_date: trip.start_date ?? '', end_date: trip.end_date ?? '', notes: trip.notes ?? '' }
      : { name: '', destination: '', start_date: '', end_date: '', notes: '' },
  });

  async function onSubmit(data) {
    try {
      const payload = {
        name: data.name.trim(),
        destination: data.destination?.trim() || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        notes: data.notes?.trim() || null,
      };
      if (isEdit) { await update.mutateAsync({ id: trip.id, ...payload }); toast('Trip updated'); }
      else        { await create.mutateAsync(payload); toast('Trip created'); }
      onClose();
    } catch (err) { toast(err?.error ?? 'Failed to save trip', 'error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Trip' : 'New Trip'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trip Name *</label>
            <input {...register('name', { required: 'Name is required' })} className={inputCls} placeholder="e.g. NYC Weekend" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <input {...register('destination')} className={inputCls} placeholder="e.g. New York, NY" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" {...register('start_date')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input type="date" {...register('end_date')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TripExpenses({ tripId }) {
  const { fmt } = useWorkspace();
  const { data, isLoading } = useTripExpenses(tripId);
  const expenses = data?.data ?? [];

  if (isLoading) return <div className="py-3 text-center text-xs text-gray-400">Loading expenses...</div>;

  if (expenses.length === 0) return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
      No expenses assigned to this trip yet.
    </div>
  );

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5 max-h-72 overflow-y-auto">
      {expenses.map((e) => (
        <div key={e.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{e.date}</span>
            </div>
            {e.subtype && (
              <div className="mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  {e.subtype}
                </span>
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white ml-3 shrink-0">{fmt(e.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TripsPage() {
  const { toast } = useToast();
  const { fmt } = useWorkspace();
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;

  const [showModal, setShowModal] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading, error } = useTrips();
  const deleteTrip = useDeleteTrip();
  const trips = data?.data ?? [];

  async function handleDelete() {
    try {
      await deleteTrip.mutateAsync(deleteTarget.id);
      toast('Trip deleted');
      setDeleteTarget(null);
      if (expandedId === deleteTarget.id) setExpandedId(null);
    } catch (err) { toast(err?.error ?? 'Failed to delete trip', 'error'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trips</h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {trips.length} trip{trips.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditTrip(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={15} /> New Trip
          </button>
        )}
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && trips.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <Plane size={20} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No trips yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Create a trip to group and track related expenses</p>
          {isAdmin && (
            <button
              onClick={() => { setEditTrip(null); setShowModal(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={14} /> New Trip
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && trips.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Plane size={13} className="text-emerald-600 dark:text-emerald-400" />
                    </span>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{trip.name}</h3>
                  </div>
                  {trip.destination && (
                    <div className="flex items-center gap-1 mt-1.5 ml-9">
                      <MapPin size={11} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{trip.destination}</span>
                    </div>
                  )}
                  {(trip.start_date || trip.end_date) && (
                    <div className="flex items-center gap-1 mt-0.5 ml-9">
                      <Calendar size={11} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {trip.start_date ?? '?'}
                        {trip.end_date && trip.end_date !== trip.start_date ? ` → ${trip.end_date}` : ''}
                      </span>
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditTrip(trip); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(trip)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {trip.notes && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 ml-9 line-clamp-2">{trip.notes}</p>
              )}

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Receipt size={11} />
                    {trip.expense_count} expense{trip.expense_count !== 1 ? 's' : ''}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(trip.total_amount)}</span>
                </div>
                {trip.expense_count > 0 && (
                  <button
                    onClick={() => setExpandedId(expandedId === trip.id ? null : trip.id)}
                    className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                  >
                    {expandedId === trip.id
                      ? <><ChevronUp size={12} /> Hide</>
                      : <><ChevronDown size={12} /> View</>}
                  </button>
                )}
              </div>

              {expandedId === trip.id && <TripExpenses tripId={trip.id} />}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TripModal trip={editTrip} onClose={() => { setShowModal(false); setEditTrip(null); }} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete trip "${deleteTarget.name}"? Expenses will be unassigned but not deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteTrip.isPending}
        />
      )}
    </div>
  );
}
