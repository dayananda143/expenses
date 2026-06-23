import { useState, useEffect, useRef } from 'react';
import { Car, DollarSign, CalendarClock, Wallet, Pencil, X, Check, CreditCard, Trash2, SquarePen, CalendarDays } from 'lucide-react';
import {
  useCarFinance,
  useUpdateCarFinance,
  useRecordCarFinancePayment,
  useUpdateCarFinancePayment,
  useDeleteCarFinancePayment,
  useImportCarFinance,
} from '../../hooks/useCarFinance';
import { useAuth } from '../../contexts/AuthContext';

const WS = 'us';

// Legacy localStorage keys from before car finance moved to the shared database.
const LEGACY_CONFIG_KEY   = 'car_finance_config';
const LEGACY_PAYMENTS_KEY = 'car_finance_payments';

function loadLegacyData() {
  try {
    const config = JSON.parse(localStorage.getItem(LEGACY_CONFIG_KEY) ?? 'null');
    const payments = JSON.parse(localStorage.getItem(LEGACY_PAYMENTS_KEY) ?? 'null') ?? [];
    if (config && (config.totalAmount > 0 || config.remainingAmount > 0 || payments.length > 0)) {
      return { config, payments };
    }
  } catch {}
  return null;
}

function toUiConfig(row) {
  return {
    totalAmount:     row?.total_amount ?? 0,
    remainingAmount: row?.remaining_amount ?? 0,
    remainingMonths: row?.remaining_months ?? 0,
    dueDate:         row?.due_date ?? '',
  };
}

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide';

export default function CarFinancePage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;

  const { data, isLoading } = useCarFinance(WS);
  const updateCarFinance     = useUpdateCarFinance(WS);
  const recordPayment        = useRecordCarFinancePayment(WS);
  const updatePayment        = useUpdateCarFinancePayment(WS);
  const deletePayment        = useDeleteCarFinancePayment(WS);
  const importCarFinance     = useImportCarFinance(WS);

  const config   = toUiConfig(data?.data?.config);
  const payments = data?.data?.payments ?? [];

  // One-time migration: push pre-existing browser localStorage data into the
  // shared database so it isn't lost and other users can see it.
  const migrationAttempted = useRef(false);
  useEffect(() => {
    if (!isAdmin || isLoading || migrationAttempted.current) return;
    if (config.totalAmount > 0 || config.remainingAmount > 0 || payments.length > 0) return;
    const legacy = loadLegacyData();
    if (!legacy) return;
    migrationAttempted.current = true;
    importCarFinance.mutate(
      { ...legacy.config, payments: legacy.payments },
      {
        onSuccess: () => {
          localStorage.removeItem(LEGACY_CONFIG_KEY);
          localStorage.removeItem(LEGACY_PAYMENTS_KEY);
        },
      }
    );
  }, [isAdmin, isLoading, config.totalAmount, config.remainingAmount, payments.length, importCarFinance]);

  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(config);
  const [paying, setPaying]     = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate]     = useState(today());
  const [payError, setPayError]   = useState('');
  const [editingPayment, setEditingPayment] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate]     = useState('');
  const [editError, setEditError]   = useState('');
  const [deletingPayment, setDeletingPayment] = useState(null);

  const paidAmount = (config.totalAmount ?? 0) - (config.remainingAmount ?? 0);
  const paidPct    = config.totalAmount > 0 ? Math.round((paidAmount / config.totalAmount) * 100) : 0;

  function openEdit() { setDraft(config); setEditing(true); }

  function handleSave() {
    updateCarFinance.mutate({
      totalAmount:     parseFloat(draft.totalAmount)    || 0,
      remainingAmount: parseFloat(draft.remainingAmount) || 0,
      remainingMonths: parseInt(draft.remainingMonths)   || 0,
      dueDate:         draft.dueDate || '',
    }, { onSuccess: () => setEditing(false) });
  }

  function openPay() {
    setPayAmount('');
    setPayDate(today());
    setPayError('');
    setPaying(true);
  }

  function handleRecordPayment() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { setPayError('Enter a valid amount.'); return; }
    if (!payDate)                { setPayError('Select a date.');       return; }

    recordPayment.mutate({ amount, date: payDate }, {
      onSuccess: () => setPaying(false),
      onError: (err) => setPayError(err?.error ?? 'Failed to record payment.'),
    });
  }

  function openEditPayment(p) {
    setEditingPayment(p);
    setEditDate(p.date);
    setEditAmount(String(p.amount));
    setEditError('');
  }

  function handleSaveEditPayment() {
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) { setEditError('Enter a valid amount.'); return; }
    if (!editDate)              { setEditError('Select a date.');         return; }

    updatePayment.mutate({ id: editingPayment.id, amount, date: editDate }, {
      onSuccess: () => setEditingPayment(null),
      onError: (err) => setEditError(err?.error ?? 'Failed to save payment.'),
    });
  }

  function confirmDeletePayment() {
    const p = deletingPayment;
    if (!p) return;
    deletePayment.mutate(p.id, { onSuccess: () => setDeletingPayment(null) });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
            <Car size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Car Finance</h1>
            <p className="text-xs text-gray-400">Loan overview</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={openPay}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors"
            >
              <CreditCard size={13} /> Record Payment
            </button>
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-xl transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              iconBg="bg-violet-100 dark:bg-violet-900/30"
              iconColor="text-violet-600 dark:text-violet-400"
              label="Total Amount"
              value={fmtUSD(config.totalAmount)}
              sub="Original loan"
            />
            <StatCard
              icon={Wallet}
              iconBg="bg-rose-100 dark:bg-rose-900/30"
              iconColor="text-rose-600 dark:text-rose-400"
              label="Remaining Amount"
              value={fmtUSD(config.remainingAmount)}
              sub={config.totalAmount > 0 ? `${paidPct}% paid` : null}
              subColor="text-emerald-500"
            />
            <StatCard
              icon={CalendarClock}
              iconBg="bg-amber-100 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-400"
              label="Remaining Months"
              value={config.remainingMonths}
              sub={config.remainingMonths === 1 ? '1 month left' : config.remainingMonths > 0 ? `${config.remainingMonths} months left` : null}
            />
            <StatCard
              icon={CalendarDays}
              iconBg="bg-sky-100 dark:bg-sky-900/30"
              iconColor="text-sky-600 dark:text-sky-400"
              label="Due Date"
              value={config.dueDate ? fmtDate(config.dueDate) : '—'}
              sub={config.dueDate ? (() => {
                const diff = Math.ceil((new Date(config.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (diff < 0) return 'Overdue';
                if (diff === 0) return 'Due today';
                return `In ${diff} day${diff !== 1 ? 's' : ''}`;
              })() : null}
              subColor={config.dueDate && Math.ceil((new Date(config.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) < 0 ? 'text-red-500' : 'text-sky-500'}
            />
          </div>

          {/* Progress bar */}
          {config.totalAmount > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <span>Repayment progress</span>
                <span>{paidPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Paid: {fmtUSD(paidAmount)}</span>
                <span>Remaining: {fmtUSD(config.remainingAmount)}</span>
              </div>
            </div>
          )}

          {/* Payments table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Payment History</p>
              <span className="text-xs text-gray-400">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
            </div>
            {payments.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">No payments recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                      {isAdmin && <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {payments.map((p, i) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{payments.length - i}</td>
                        <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 font-medium">{fmtDate(p.date)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmtUSD(p.amount)}</td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditPayment(p)}
                                className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                title="Edit payment"
                              >
                                <SquarePen size={13} />
                              </button>
                              <button
                                onClick={() => setDeletingPayment(p)}
                                className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete payment"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm shadow-xl">
            <div className="p-6 space-y-4">
              <div className="w-11 h-11 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Delete payment?</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {fmtDate(deletingPayment.date)} &middot; <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtUSD(deletingPayment.amount)}</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">This will restore the amount to your remaining balance.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeletingPayment(null)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePayment}
                  className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Edit Payment</p>
              <button onClick={() => setEditingPayment(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={editDate}
                  onChange={e => { setEditDate(e.target.value); setEditError(''); }}
                />
              </div>
              <div>
                <label className={labelCls}>Payment Amount (USD)</label>
                <input
                  type="number" min="0.01" step="0.01"
                  autoFocus
                  className={inputCls}
                  placeholder="0.00"
                  value={editAmount}
                  onChange={e => { setEditAmount(e.target.value); setEditError(''); }}
                />
                {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditPayment}
                  className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={15} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment modal */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Record Payment</p>
              <button onClick={() => setPaying(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
                Remaining balance: <span className="font-bold text-gray-900 dark:text-white">{fmtUSD(config.remainingAmount)}</span>
                {config.remainingMonths > 0 && <> &middot; {config.remainingMonths} months left</>}
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={payDate}
                  onChange={e => { setPayDate(e.target.value); setPayError(''); }}
                />
              </div>
              <div>
                <label className={labelCls}>Payment Amount (USD)</label>
                <input
                  type="number" min="0.01" step="0.01"
                  autoFocus
                  className={inputCls}
                  placeholder="0.00"
                  value={payAmount}
                  onChange={e => { setPayAmount(e.target.value); setPayError(''); }}
                />
                {payError && <p className="text-xs text-red-500 mt-1">{payError}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPaying(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={15} /> Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Edit Car Finance</p>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Total Amount (USD)</label>
                <input
                  type="number" min="0" step="0.01"
                  className={inputCls}
                  value={draft.totalAmount}
                  onChange={e => setDraft(d => ({ ...d, totalAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Remaining Amount (USD)</label>
                <input
                  type="number" min="0" step="0.01"
                  className={inputCls}
                  value={draft.remainingAmount}
                  onChange={e => setDraft(d => ({ ...d, remainingAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Remaining Months</label>
                <input
                  type="number" min="0" step="1"
                  className={inputCls}
                  value={draft.remainingMonths}
                  onChange={e => setDraft(d => ({ ...d, remainingMonths: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={draft.dueDate || ''}
                  onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={15} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
