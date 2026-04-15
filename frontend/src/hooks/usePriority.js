import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function usePriority() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['priority', workspace],
    queryFn: () => client.get('/priority', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreatePriorityItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/priority', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priority', workspace] }),
  });
}

export function useUpdatePriorityItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/priority/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priority', workspace] }),
  });
}

export function useDeletePriorityItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/priority/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priority', workspace] }),
  });
}

export function useArchivePriorityItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.patch(`/priority/${id}/archive`, {}, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priority', workspace] }),
  });
}

export function useReorderPriority() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (ids) => client.patch('/priority/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priority', workspace] }),
  });
}
