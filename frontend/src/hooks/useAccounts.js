import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useAccounts(workspace) {
  return useQuery({
    queryKey: ['accounts', workspace],
    queryFn: () => client.get('/accounts', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateAccount(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/accounts', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', workspace] }),
  });
}

export function useUpdateAccount(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/accounts/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', workspace] }),
  });
}

export function useDeleteAccount(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/accounts/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', workspace] }),
  });
}

export function useArchiveAccount(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.patch(`/accounts/${id}/archive`, {}, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', workspace] }),
  });
}

export function useReorderAccounts(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => client.patch('/accounts/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', workspace] }),
  });
}
