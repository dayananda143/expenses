import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, ShieldCheck, ShieldOff, UserCheck, UserX, CreditCard, HeartPulse, Pencil, Eye, EyeOff } from 'lucide-react';
import client from '../api/client';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

const WORKSPACE_OPTIONS = [
  { value: 'india', label: '🇮🇳 Indian Expenses' },
  { value: 'us',    label: '🇺🇸 US Expenses' },
];

function NewUserModal({ onClose }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { workspaces: ['india', 'us'], accounts_access: false, hospital_access: false, password: 'changeme' },
  });

  const selectedWorkspaces = watch('workspaces') ?? [];

  function toggleWorkspace(ws) {
    const current = selectedWorkspaces.includes(ws)
      ? selectedWorkspaces.filter((w) => w !== ws)
      : [...selectedWorkspaces, ws];
    setValue('workspaces', current);
  }

  async function onSubmit(data) {
    try {
      await client.post('/users', data);
      qc.invalidateQueries({ queryKey: ['users'] });
      toast('User created');
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to create user', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
            <input {...register('username', { required: 'Required' })} className={inputCls} />
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} {...register('password', { required: 'Required', minLength: { value: 4, message: 'Min 4 chars' } })} className={`${inputCls} pr-9`} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workspace Access</label>
            <div className="flex gap-2">
              {WORKSPACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleWorkspace(opt.value)}
                  className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                    selectedWorkspaces.includes(opt.value)
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('accounts_access')} className="rounded text-emerald-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <CreditCard size={13} className="text-blue-500" /> Credit &amp; Savings access
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('hospital_access')} className="rounded text-emerald-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <HeartPulse size={13} className="text-rose-500" /> Hospital expenses access
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_admin')} className="rounded text-emerald-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Admin privileges</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, isSelf, onClose }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      username: user.username,
      password: '',
      workspaces: Array.isArray(user.workspaces) ? user.workspaces : [],
      accounts_access: !!user.accounts_access,
      hospital_access: !!user.hospital_access,
      is_admin: !!user.is_admin,
    },
  });

  const selectedWorkspaces = watch('workspaces') ?? [];

  function toggleWorkspace(ws) {
    const current = selectedWorkspaces.includes(ws)
      ? selectedWorkspaces.filter((w) => w !== ws)
      : [...selectedWorkspaces, ws];
    setValue('workspaces', current);
  }

  async function onSubmit(data) {
    try {
      const payload = { username: data.username, workspaces: data.workspaces, accounts_access: data.accounts_access, hospital_access: data.hospital_access, is_admin: data.is_admin };
      if (data.password) payload.password = data.password;
      await client.patch(`/users/${user.id}`, payload);
      qc.invalidateQueries({ queryKey: ['users'] });
      toast('User updated');
      onClose();
    } catch (err) {
      toast(err?.error ?? 'Failed to update user', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isSelf ? 'My Account' : 'Edit User'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
            <input {...register('username', { required: 'Required' })} className={inputCls} />
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
            <input type="password" {...register('password', { minLength: { value: 4, message: 'Min 4 chars' } })} className={inputCls} placeholder="••••••••" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          {!isSelf && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workspace Access</label>
                <div className="flex gap-2">
                  {WORKSPACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleWorkspace(opt.value)}
                      className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                        selectedWorkspaces.includes(opt.value)
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('accounts_access')} className="rounded text-emerald-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-blue-500" /> Credit &amp; Savings access
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('hospital_access')} className="rounded text-emerald-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <HeartPulse size={13} className="text-rose-500" /> Hospital expenses access
                </span>
              </label>
            </>
          )}
          {!isSelf && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_admin')} className="rounded text-emerald-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Admin privileges</span>
            </label>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => client.get('/users'),
  });

  const patch = useMutation({
    mutationFn: ({ id, ...body }) => client.patch(`/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const del = useMutation({
    mutationFn: (id) => client.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null); },
  });

  const users = data?.data ?? [];

  async function toggle(user, field) {
    try {
      await patch.mutateAsync({ id: user.id, [field]: !user[field] });
      toast('User updated');
    } catch (err) {
      toast(err?.error ?? 'Failed to update', 'error');
    }
  }

  async function toggleWorkspace(user, ws) {
    try {
      const current = Array.isArray(user.workspaces) ? user.workspaces : [];
      const next = current.includes(ws) ? current.filter((w) => w !== ws) : [...current, ws];
      await patch.mutateAsync({ id: user.id, workspaces: next });
      toast('Workspace access updated');
    } catch (err) {
      toast(err?.error ?? 'Failed to update', 'error');
    }
  }

  async function handleDelete() {
    try {
      await del.mutateAsync(deleteTarget.id);
      toast('User deleted');
    } catch (err) {
      toast(err?.error ?? 'Failed to delete', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Users</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus size={15} /> New User
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error?.error} />}

      {!isLoading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Username</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Workspaces</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Credit &amp; Savings</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Hospital</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me?.id;
                const userWorkspaces = Array.isArray(u.workspaces) ? u.workspaces : [];
                return (
                  <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                          {u.username[0].toUpperCase()}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{u.username}</span>
                        {isSelf && <span className="text-xs text-gray-400 dark:text-gray-500">(you)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_admin ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                        {u.is_admin ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
                        {u.is_admin ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {WORKSPACE_OPTIONS.map((opt) => {
                          const hasAccess = u.is_admin || userWorkspaces.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => !isSelf && !u.is_admin && toggleWorkspace(u, opt.value)}
                              disabled={isSelf || u.is_admin}
                              title={u.is_admin ? 'Admins have full access' : opt.label}
                              className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                                hasAccess
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600'
                              } ${!isSelf && !u.is_admin ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
                            >
                              {opt.value === 'india' ? '🇮🇳' : '🇺🇸'}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          <CreditCard size={10} /> Always
                        </span>
                      ) : (
                        <button
                          onClick={() => !isSelf && toggle(u, 'accounts_access')}
                          disabled={isSelf}
                          title={u.accounts_access ? 'Revoke access' : 'Grant access'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            u.accounts_access
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                          } ${isSelf ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <CreditCard size={10} />
                          {u.accounts_access ? 'Enabled' : 'Disabled'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                          <HeartPulse size={10} /> Always
                        </span>
                      ) : (
                        <button
                          onClick={() => !isSelf && toggle(u, 'hospital_access')}
                          disabled={isSelf}
                          title={u.hospital_access ? 'Revoke access' : 'Grant access'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            u.hospital_access
                              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                          } ${isSelf ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <HeartPulse size={10} />
                          {u.hospital_access ? 'Enabled' : 'Disabled'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditTarget(u)} title="Edit user" className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                          <Pencil size={14} />
                        </button>
                        {!isSelf && (
                          <>
                            <button onClick={() => toggle(u, 'is_active')} title={u.is_active ? 'Deactivate' : 'Activate'} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                            {u.username !== 'admin' && (
                              <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showModal && <NewUserModal onClose={() => setShowModal(false)} />}
      {editTarget && <EditUserModal user={editTarget} isSelf={editTarget.id === me?.id} onClose={() => setEditTarget(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete user "${deleteTarget.username}"? All their expenses and data will be deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={del.isPending}
        />
      )}
    </div>
  );
}
