import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useBabyItems() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['baby', workspace],
    queryFn: () => client.get('/baby', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateBabyItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/baby', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby', workspace] }),
  });
}

export function useUpdateBabyItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/baby/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby', workspace] }),
  });
}

export function useToggleBabyItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.patch(`/baby/${id}/toggle`, {}, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby', workspace] }),
  });
}

export function useDeleteBabyItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/baby/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby', workspace] }),
  });
}

export function useReorderBaby() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (ids) => client.patch('/baby/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby', workspace] }),
  });
}
