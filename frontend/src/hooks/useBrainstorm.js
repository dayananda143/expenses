import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useBrainstormList() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['brainstorm', workspace],
    queryFn: () => client.get('/brainstorm', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useBrainstormItem(id) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['brainstorm', workspace, id],
    queryFn: () => client.get(`/brainstorm/${id}`, { params: { workspace } }),
    enabled: !!workspace && !!id,
  });
}

export function useCreateBrainstormItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/brainstorm', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brainstorm', workspace] }),
  });
}

export function useUpdateBrainstormItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/brainstorm/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brainstorm', workspace] }),
  });
}

export function useUpdateBrainstormPaid() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, paid_amount }) => client.patch(`/brainstorm/${id}/pay`, { paid_amount }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brainstorm', workspace] }),
  });
}

export function useDeleteBrainstormItem() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/brainstorm/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brainstorm', workspace] }),
  });
}

export function useBrainstormRecords(itemId) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['brainstorm-records', workspace, itemId],
    queryFn: () => client.get(`/brainstorm/${itemId}/records`, { params: { workspace } }),
    enabled: !!workspace && !!itemId,
  });
}

export function useAddBrainstormRecord(itemId) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post(`/brainstorm/${itemId}/records`, data, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brainstorm-records', workspace, itemId] });
      qc.invalidateQueries({ queryKey: ['brainstorm', workspace] });
    },
  });
}

export function useUpdateBrainstormRecord(itemId) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/brainstorm/${itemId}/records/${id}`, data, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brainstorm-records', workspace, itemId] });
      qc.invalidateQueries({ queryKey: ['brainstorm', workspace] });
    },
  });
}

export function useDeleteBrainstormRecord(itemId) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (recordId) => client.delete(`/brainstorm/${itemId}/records/${recordId}`, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brainstorm-records', workspace, itemId] });
      qc.invalidateQueries({ queryKey: ['brainstorm', workspace] });
    },
  });
}
