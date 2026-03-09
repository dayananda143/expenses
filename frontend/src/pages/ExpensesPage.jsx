import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Copy, Download, Upload, X, Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Papa from 'papaparse';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useImportExpenses } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';
const selectCls = `${inputCls} appearance-none`;

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

function SortIcon({ field, sort, order }) {
  if (sort !== field) return <ChevronsUpDown size={13} className="text-gray-300 dark:text-gray-600" />;
  return order === 'asc'
    ? <ChevronUp size={13} className="text-emerald-500" />
    : <ChevronDown size={13} className="text-emerald-500" />;
}

function ExpenseModal({ expense, categories, onClose }) {
  const { toast } = useToast();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const isEdit = !!expense?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: expense
      ? { description: expense.description, amount: expense.amount, date: expense.date, category_id: expense.category_id ?? '', notes: expense.notes ?? '' }
      : { date: new Date().toLocaleDateString('en-CA') },
  });

  async function onSubmit(data) {
    try {
      const payload = { ...data, amount: parseFloat(data.amount), category_id: data.category_id || null };
      if (isEdit) { await update.mutateAsync({ id: expense.id, ...payload }); toast('Expense updated'); }
      else        { await create.mutateAsync(payload); toast('Expense added'); }
      onClose(data.date);
    } catch (err) { toast(err?.error ?? 'Failed to save expense', 'error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
              <input {...register('description', { required: 'Required' })} className={inputCls} placeholder="e.g. Lunch at restaurant" />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
              <input type="number" step="0.01" min="0.01" {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} className={inputCls} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input type="date" {...register('date', { required: 'Required' })} className={inputCls} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select {...register('category_id', { required: 'Category is required' })} className={selectCls}>
                <option value="">— Select a category —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
            </div>
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

export default function ExpensesPage() {
  const { toast } = useToast();
  const { workspace, fmt } = useWorkspace();
  const now = new Date();

  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filters, setFilters] = useState({ category_id: '', search: '' });
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const fileRef = useRef(null);

  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  // Build params — use month/year filter OR date_from/date_to
  const params = {
    page, limit: 50, sort, order,
    ...(filterMonth !== null ? { month: filterMonth, year: filterYear } : {}),
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  };
  const { data, isLoading, error } = useExpenses(params);
  const deleteExp = useDeleteExpense();
  const importExp = useImportExpenses();

  const expenses = data?.data ?? [];
  const pagination = data?.pagination;

  function openAdd() { setEditExpense(null); setShowModal(true); }
  function openEdit(e) { setEditExpense(e); setShowModal(true); }
  function openCopy(e) { setEditExpense({ ...e, id: null }); setShowModal(true); }

  function handleSort(field) {
    if (sort === field) setOrder((o) => o === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setOrder('desc'); }
    setPage(1);
  }

  function setFilter(key, val) { setFilters((f) => ({ ...f, [key]: val })); setPage(1); }

  function handleMonthChange(m, y) { setFilterMonth(m); setFilterYear(y); setPage(1); }
  function clearMonthFilter() { setFilterMonth(null); setPage(1); }

  async function handleDelete() {
    try { await deleteExp.mutateAsync(deleteTarget.id); toast('Expense deleted'); setDeleteTarget(null); }
    catch (err) { toast(err?.error ?? 'Failed to delete', 'error'); }
  }

  function handleExport() {
    const qp = { workspace, sort, order, ...params };
    delete qp.page; delete qp.limit;
    const queryStr = new URLSearchParams(Object.fromEntries(Object.entries(qp).filter(([, v]) => v !== undefined && v !== ''))).toString();
    const url = `/api/expenses/export/csv?${queryStr}`;
    const token = localStorage.getItem('expenses_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `expenses-${workspace}-${now.toISOString().split('T')[0]}.csv`;
        a.click();
      });
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async ({ data: rows }) => {
        try {
          const result = await importExp.mutateAsync(rows);
          toast(`Imported ${result.imported} expense(s)${result.errors.length ? ` (${result.errors.length} skipped)` : ''}`);
        } catch (err) { toast(err?.error ?? 'Import failed', 'error'); }
      },
    });
    e.target.value = '';
  }

  const btnOutline = 'flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';

  const thCls = (field) =>
    `px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expenses</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className={btnOutline}><Download size={15} /> Export</button>
          <button onClick={() => fileRef.current?.click()} className={btnOutline}><Upload size={15} /> Import</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className={`${inputCls} pl-8`}
            />
          </div>
          <select value={filters.category_id} onChange={(e) => setFilter('category_id', e.target.value)} className={selectCls}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <MonthYearPicker month={filterMonth} year={filterYear} onChange={handleMonthChange} onClear={clearMonthFilter} />
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {expenses.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">No expenses found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <th className={thCls('date')} onClick={() => handleSort('date')}>
                        <span className="flex items-center gap-1">Date <SortIcon field="date" sort={sort} order={order} /></span>
                      </th>
                      <th className={thCls('description')} onClick={() => handleSort('description')}>
                        <span className="flex items-center gap-1">Description <SortIcon field="description" sort={sort} order={order} /></span>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Category</th>
                      <th className={thCls('amount')} onClick={() => handleSort('amount')}>
                        <span className="flex items-center gap-1 justify-end">Amount <SortIcon field="amount" sort={sort} order={order} /></span>
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{e.date}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{e.description}</p>
                          {e.notes && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{e.notes}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {e.category_name ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: e.category_color + '22', color: e.category_color }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.category_color }} />
                              {e.category_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(e.amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openCopy(e)} title="Duplicate" className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Copy size={14} />
                            </button>
                            <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget(e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{pagination.total} total</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Previous</button>
                    <span className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400">{page} / {pagination.total_pages}</span>
                    <button onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={page === pagination.total_pages} className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showModal && (
        <ExpenseModal expense={editExpense} categories={categories} onClose={(savedDate) => {
          setShowModal(false);
          setEditExpense(null);
          if (savedDate) {
            const d = new Date(savedDate + 'T00:00:00');
            setFilterMonth(d.getMonth() + 1);
            setFilterYear(d.getFullYear());
          }
        }} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.description}" (${fmt(deleteTarget.amount)})?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteExp.isPending}
        />
      )}
    </div>
  );
}
