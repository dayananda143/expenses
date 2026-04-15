import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useIndiaList() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['india-list', workspace],
    queryFn: () => client.get('/india-list', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateIndiaListItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/india-list', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['india-list', workspace] }),
  });
}

export function useUpdateIndiaListItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/india-list/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['india-list', workspace] }),
  });
}

export function useToggleIndiaListItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.patch(`/india-list/${id}/toggle`, {}, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['india-list', workspace] }),
  });
}

export function useDeleteIndiaListItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/india-list/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['india-list', workspace] }),
  });
}

export function useReorderIndiaList() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (ids) => client.patch('/india-list/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['india-list', workspace] }),
  });
}
