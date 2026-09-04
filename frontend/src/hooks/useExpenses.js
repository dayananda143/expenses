import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useExpenses(params = {}) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['expenses', workspace, params],
    queryFn: () => client.get('/expenses', { params: { workspace, ...params } }),
    enabled: !!workspace,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/expenses', data, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspace] });
      qc.invalidateQueries({ queryKey: ['recurring-preview', workspace] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/expenses/${id}`, data, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspace] });
      qc.invalidateQueries({ queryKey: ['recurring-preview', workspace] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/expenses/${id}`, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspace] });
      qc.invalidateQueries({ queryKey: ['recurring-preview', workspace] });
    },
  });
}

export function useRecurringPreview(month, year) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['recurring-preview', workspace, month, year],
    queryFn: () => client.get('/expenses/recurring-preview', { params: { workspace, month, year } }),
    enabled: !!workspace && !!month && !!year,
  });
}

export function useApplyRecurring() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ month, year, ids }) => client.post('/expenses/apply-recurring', { month, year, ids }, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspace] });
      qc.invalidateQueries({ queryKey: ['recurring-preview', workspace] });
    },
  });
}

export function useImportExpenses() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (rows) => client.post('/expenses/import/csv', { rows }, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspace] });
      qc.invalidateQueries({ queryKey: ['recurring-preview', workspace] });
    },
  });
}
