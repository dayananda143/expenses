import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function usePantryItems() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['pantry', workspace],
    queryFn: () => client.get('/pantry', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreatePantryItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/pantry', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', workspace] }),
  });
}

export function useUpdatePantryItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/pantry/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', workspace] }),
  });
}

export function useAdjustPantryItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, delta }) => client.patch(`/pantry/${id}/adjust`, { delta }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', workspace] }),
  });
}

export function useDeletePantryItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/pantry/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', workspace] }),
  });
}

export function useReorderPantry() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (ids) => client.patch('/pantry/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', workspace] }),
  });
}
