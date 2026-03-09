import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccounts, useDeleteAccount, useReorderAccounts } from '../../hooks/useAccounts';
import { WS, fmtUSD, AccountCard, AccountModal, AccountDetailModal, DeleteConfirm } from './shared';

export default function CreditCardsPage() {
  const { data, isLoading } = useAccounts(WS);
  const deleteAccount = useDeleteAccount(WS);
  const reorder = useReorderAccounts(WS);
  const navigate = useNavigate();

  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [localOrder, setLocalOrder] = useState(null); // null = use server order

  const dragId = useRef(null);

  const allCredit = (data?.data ?? []).filter((a) => a.type === 'credit');
  const serverVisible = showInactive ? allCredit : allCredit.filter((a) => a.is_active !== 0);
  const visible = localOrder
    ? localOrder.map((id) => serverVisible.find((a) => a.id === id)).filter(Boolean)
    : serverVisible;
  const hiddenCount = allCredit.length - allCredit.filter((a) => a.is_active !== 0).length;

  const totalOutstanding = allCredit.filter((a) => a.is_active !== 0).reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalLimit       = allCredit.filter((a) => a.is_active !== 0).reduce((s, a) => s + (a.credit_limit ?? 0), 0);

  function handleDragStart(id) {
    dragId.current = id;
    setLocalOrder(serverVisible.map((a) => a.id));
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    setLocalOrder((prev) => {
      const order = prev ?? serverVisible.map((a) => a.id);
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
    await deleteAccount.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  function handlePayment(account) {
    navigate('/accounts/payments', { state: { preselectedId: account.id } });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Cards</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="font-semibold text-rose-600 dark:text-rose-400">{fmtUSD(totalOutstanding)}</span> outstanding
            {totalLimit > 0 && <> of <span className="font-semibold text-gray-600 dark:text-gray-300">{fmtUSD(totalLimit)}</span> limit</>}
          </p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> Add Card
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && visible.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No credit cards yet.</p>
          <p className="text-xs mt-1">Click &ldquo;Add Card&rdquo; to get started.</p>
        </div>
      )}

      {!isLoading && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((a) => (
            <AccountCard
              key={a.id}
              a={a}
              onEdit={(acc) => setModal({ account: acc })}
              onDelete={setDeleteTarget}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPayment={handlePayment}
              onView={setViewAccount}
            />
          ))}
        </div>
      )}

      {!isLoading && hiddenCount > 0 && (
        <button
          onClick={() => setShowInactive((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {showInactive ? 'Hide inactive' : `Show ${hiddenCount} inactive card${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}

      {viewAccount && (
        <AccountDetailModal
          a={viewAccount}
          onClose={() => setViewAccount(null)}
          onEdit={(acc) => setModal({ account: acc })}
          onPayment={handlePayment}
        />
      )}
      {modal === 'new' && (
        <AccountModal defaultType="credit" onClose={() => setModal(null)} />
      )}
      {modal && modal !== 'new' && (
        <AccountModal account={modal.account} onClose={() => setModal(null)} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
