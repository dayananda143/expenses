import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useAccounts, useDeleteAccount, useReorderAccounts } from '../../hooks/useAccounts';
import { WS, fmtUSD, AccountCard, AccountModal, AccountDetailModal, DeleteConfirm } from './shared';
import { useAuth } from '../../contexts/AuthContext';

export default function SavingsPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const { data, isLoading } = useAccounts(WS);
  const deleteAccount = useDeleteAccount(WS);
  const reorder = useReorderAccounts(WS);

  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [localOrder, setLocalOrder] = useState(null);
  const [userTab, setUserTab] = useState('all');

  const dragId = useRef(null);

  const allSavings = (data?.data ?? []).filter((a) => a.type === 'savings');

  // Build user tabs from assigned usernames
  const userNames = [...new Set(allSavings.map((a) => a.belongs_to_username).filter(Boolean))].sort();
  const hasUnassigned = allSavings.some((a) => !a.belongs_to_username);
  const showTabs = userNames.length > 0;

  const activeFilter = allSavings.filter((a) => a.is_active !== 0);
  const userFiltered =
    userTab === 'all'        ? allSavings :
    userTab === '__none__'   ? allSavings.filter((a) => !a.belongs_to_username) :
                               allSavings.filter((a) => a.belongs_to_username === userTab);

  const serverVisible = showInactive ? userFiltered : userFiltered.filter((a) => a.is_active !== 0);
  const visible = localOrder
    ? localOrder.map((id) => serverVisible.find((a) => a.id === id)).filter(Boolean)
    : serverVisible;
  const hiddenCount = userFiltered.length - userFiltered.filter((a) => a.is_active !== 0).length;

  const totalBalance = activeFilter.reduce((s, a) => s + (a.balance ?? 0), 0);
  const tabBalance =
    userTab === 'all'      ? totalBalance :
    userTab === '__none__' ? activeFilter.filter((a) => !a.belongs_to_username).reduce((s, a) => s + (a.balance ?? 0), 0) :
                             activeFilter.filter((a) => a.belongs_to_username === userTab).reduce((s, a) => s + (a.balance ?? 0), 0);

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

  const tabCls = (active) =>
    `px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
      active
        ? 'bg-violet-600 text-white shadow-sm'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savings</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Total: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtUSD(tabBalance)}</span>
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={15} /> Add Account
          </button>
        )}
      </div>

      {/* User tabs */}
      {showTabs && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button className={tabCls(userTab === 'all')} onClick={() => setUserTab('all')}>All</button>
          {userNames.map((name) => (
            <button key={name} className={tabCls(userTab === name)} onClick={() => setUserTab(name)}>
              {name}
            </button>
          ))}
          {hasUnassigned && (
            <button className={tabCls(userTab === '__none__')} onClick={() => setUserTab('__none__')}>
              Unassigned
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && visible.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No savings accounts{userTab !== 'all' ? ' for this user' : ''} yet.</p>
          {userTab === 'all' && <p className="text-xs mt-1">Click &ldquo;Add Account&rdquo; to get started.</p>}
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
          {showInactive ? 'Hide inactive' : `Show ${hiddenCount} inactive account${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}

      {viewAccount && (
        <AccountDetailModal
          a={viewAccount}
          onClose={() => setViewAccount(null)}
          onEdit={(acc) => setModal({ account: acc })}
        />
      )}
      {modal === 'new' && (
        <AccountModal defaultType="savings" onClose={() => setModal(null)} />
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
