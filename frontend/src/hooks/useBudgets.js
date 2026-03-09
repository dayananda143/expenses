import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useBudgets() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['budgets', workspace],
    queryFn: () => client.get('/budgets', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/budgets', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', workspace] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/budgets/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', workspace] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/budgets/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', workspace] }),
  });
}

export function useReorderBudgets() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (ids) => client.patch('/budgets/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', workspace] }),
  });
}
