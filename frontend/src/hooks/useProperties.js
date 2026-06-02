import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useProperties() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['properties', workspace],
    queryFn: () => client.get('/properties', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/properties', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties', workspace] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/properties/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties', workspace] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/properties/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties', workspace] }),
  });
}
