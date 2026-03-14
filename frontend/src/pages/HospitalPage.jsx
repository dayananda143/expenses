import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, HeartPulse, DollarSign, User, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';
import {
  useHospitalExpenses,
  useHospitalSummary,
  useHospitalUsers,
  useCreateHospitalExpense,
  useUpdateHospitalExpense,
  useDeleteHospitalExpense,
} from '../hooks/useHospitalExpenses';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500';
const selectCls = `${inputCls} appearance-none`;

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function SortIcon({ field, sort, order }) {
  if (sort !== field) return <ChevronsUpDown size={13} className="text-gray-300 dark:text-gray-600" />;
  return order === 'asc'
    ? <ChevronUp size={13} className="text-rose-500" />
    : <ChevronDown size={13} className="text-rose-500" />;
}

function MonthYearPicker({ month, year, onChange, onClear }) {
  const now = new Date();
  function prev() {
    if (month === null) { onChange(now.getMonth() + 1, now.getFullYear()); return; }
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  }
  function next() {
    if (month === null) { onChange(now.getMonth() + 1, now.getFullYear()); return; }
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={prev} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <ChevronLeft size={14} />
      </button>
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 min-w-[110px] justify-between">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {month !== null ? `${MONTHS[month - 1]} ${year}` : 'All time'}
        </span>
        {month !== null && (
          <button onClick={onClear} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1">
            <X size={12} />
          </button>
        )}
      </div>
      <button onClick={next} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function HospitalModal({ expense, hospitalUsers, isAdmin, onClose }) {
  const { toast } = useToast();
  const create = useCreateHospitalExpense();
  const update = useUpdateHospitalExpense();
  const isEdit = !!expense?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: expense
      ? {
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          hospital: expense.hospital ?? '',
          notes: expense.notes ?? '',
          assigned_to: expense.user_id ?? '',
        }
      : {
          date: new Date().toLocaleDateString('en-CA'),
          assigned_to: '',
        },
  });

  async function onSubmit(data) {
    try {
      const payload = {
        ...data,
        amount: data.amount !== '' && data.amount != null ? parseFloat(data.amount) : null,
        hospital: data.hospital || null,
        notes: data.notes || null,
        assigned_to: data.assigned_to ? parseInt(data.assigned_to) : undefined,
      };
      if (isEdit) { await update.mutateAsync({ id: expense.id, ...payload }); toast('Expense updated'); }
      else        { await create.mutateAsync(payload); toast('Expense added'); }
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to save', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HeartPulse size={16} className="text-rose-500" />
            {isEdit ? 'Edit Expense' : 'Add Hospital Expense'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assign to User *
              </label>
              <select {...register('assigned_to', { required: 'Required' })} className={selectCls}>
                <option value="">— Select user —</option>
                {(hospitalUsers ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
              {errors.assigned_to && <p className="text-xs text-red-500 mt-1">{errors.assigned_to.message}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <input {...register('description', { required: 'Required' })} className={inputCls} placeholder="e.g. ER visit, Lab tests" />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number" step="0.01" min="0"
                {...register('amount', { min: { value: 0, message: 'Cannot be negative' } })}
                className={`${inputCls} pl-7`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
            <input type="date" {...register('date', { required: 'Required' })} className={inputCls} />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hospital / Provider</label>
            <input {...register('hospital')} className={inputCls} placeholder="e.g. City General Hospital" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className={inputCls} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-rose-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HospitalPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const fileRef = useRef(null);

  const now = new Date();
  const [month, setMonth]   = useState(null);
  const [year, setYear]     = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [limit, setLimit]   = useState(10);
  const [filterUser, setFilterUser] = useState('');
  const [sort, setSort]   = useState('date');
  const [order, setOrder] = useState('desc');
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function handleSort(field) {
    if (sort === field) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(field); setOrder('asc'); }
    setPage(1);
  }

  const { data: usersData } = useHospitalUsers();
  const hospitalUsers = usersData?.data ?? [];

  const { data, isLoading, error } = useHospitalExpenses({
    month: month ?? undefined,
    year: month ? year : undefined,
    search: search || undefined,
    page,
    limit,
    sort,
    order,
    user_id: isAdmin && filterUser ? filterUser : undefined,
  });
  const { data: summary } = useHospitalSummary(year, isAdmin && filterUser ? filterUser : undefined);
  const del = useDeleteHospitalExpense();

  const rows  = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  function handleExport() {
    const qp = {};
    if (month) { qp.month = month; qp.year = year; } else if (year) { qp.year = year; }
    if (search) qp.search = search;
    if (isAdmin && filterUser) qp.user_id = filterUser;
    const queryStr = new URLSearchParams(qp).toString();
    const url = `/api/hospital-expenses/export/csv${queryStr ? `?${queryStr}` : ''}`;
    const token = localStorage.getItem('expenses_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `hospital-expenses-${now.toISOString().split('T')[0]}.csv`;
        a.click();
      });
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async ({ data: importRows }) => {
        try {
          const token = localStorage.getItem('expenses_token');
          const res = await fetch('/api/hospital-expenses/import/csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ rows: importRows }),
          });
          const result = await res.json();
          if (!res.ok) throw result;
          toast(`Imported ${result.imported} record(s)${result.errors.length ? ` (${result.errors.length} skipped)` : ''}`);
        } catch (err) { toast(err?.error ?? 'Import failed', 'error'); }
      },
    });
    e.target.value = '';
  }

  async function handleDelete() {
    try {
      await del.mutateAsync(deleteTarget.id);
      toast('Expense deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  const colSpan = isAdmin ? 6 : 4;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HeartPulse size={20} className="text-rose-500" />
            Hospital Expenses
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-7">
            {total} record{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Show</span>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-medium">
              {[5, 10, 15, 20, 25].map((n) => (
                <button key={n} onClick={() => { setLimit(n); setPage(1); }}
                  className={`px-2.5 py-1 transition-colors ${limit === n ? 'bg-rose-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download size={15} /><span className="hidden sm:inline">Export</span>
          </button>
          {isAdmin && (
            <>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload size={15} /><span className="hidden sm:inline">Import</span>
              </button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                <Plus size={15} /> Add Expense
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Year ({year})</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{fmt(summary.yearTotal)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">All Time</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{fmt(summary.allTime)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <MonthYearPicker
          month={month}
          year={year}
          onChange={(m, y) => { setMonth(m); setYear(y); setPage(1); }}
          onClear={() => { setMonth(null); setPage(1); }}
        />
        {isAdmin && (
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <User size={14} className="text-gray-400 shrink-0" />
            <select
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
              className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">All users</option>
              {hospitalUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
        )}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          <DollarSign size={11} className="inline" /> USD
        </span>
      </div>

      {/* Table */}
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {(['date', 'description'] ).map((field) => (
                    <th key={field} onClick={() => handleSort(field)} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors">
                      <span className="inline-flex items-center gap-1 capitalize">{field} <SortIcon field={field} sort={sort} order={order} /></span>
                    </th>
                  ))}
                  {isAdmin && <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">User</th>}
                  <th onClick={() => handleSort('hospital')} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-1">Hospital <SortIcon field="hospital" sort={sort} order={order} /></span>
                  </th>
                  <th onClick={() => handleSort('amount')} className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-1 flex-row-reverse">Amount (USD) <SortIcon field="amount" sort={sort} order={order} /></span>
                  </th>
                  {isAdmin && <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                      No hospital expenses found.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{row.description}</p>
                      {row.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{row.notes}</p>}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <User size={10} />
                          {row.username ?? '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.hospital ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {row.amount != null
                        ? <span className="text-rose-600 dark:text-rose-400">{fmt(row.amount)}</span>
                        : <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditTarget(row)} className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              {(() => {
                const range = [];
                for (let i = 1; i <= pages; i++) {
                  if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) range.push(i);
                }
                const withEllipsis = [];
                let prev = null;
                for (const p of range) {
                  if (prev !== null && p - prev > 1) withEllipsis.push('...' + p);
                  withEllipsis.push(p);
                  prev = p;
                }
                return (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft size={14} />
                    </button>
                    {withEllipsis.map((p, i) =>
                      typeof p === 'string'
                        ? <span key={p + i} className="text-xs text-gray-300 dark:text-gray-600 px-1">…</span>
                        : <button key={p} onClick={() => setPage(p)}
                            className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {p}
                          </button>
                    )}
                    <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {showModal && (
        <HospitalModal
          isAdmin={isAdmin}
          hospitalUsers={hospitalUsers}
          onClose={() => setShowModal(false)}
        />
      )}
      {editTarget && (
        <HospitalModal
          expense={editTarget}
          isAdmin={isAdmin}
          hospitalUsers={hospitalUsers}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.description}" (${fmt(deleteTarget.amount)})?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={del.isPending}
        />
      )}
    </div>
  );
}
