import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useThanksgivingItems() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['thanksgiving', workspace],
    queryFn: () => client.get('/thanksgiving', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateThanksgivingItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/thanksgiving', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thanksgiving', workspace] }),
  });
}

export function useUpdateThanksgivingItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/thanksgiving/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thanksgiving', workspace] }),
  });
}

export function useToggleThanksgivingItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.patch(`/thanksgiving/${id}/toggle`, {}, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thanksgiving', workspace] }),
  });
}

export function useDeleteThanksgivingItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/thanksgiving/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thanksgiving', workspace] }),
  });
}

export function useReorderThanksgiving() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (ids) => client.patch('/thanksgiving/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thanksgiving', workspace] }),
  });
}
