import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { WS } from '../pages/accounts/shared';

export function useReturns() {
  return useQuery({
    queryKey: ['returns', WS],
    queryFn: () => client.get('/returns', { params: { workspace: WS } }),
  });
}

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/returns', data, { params: { workspace: WS } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns', WS] }),
  });
}

export function useUpdateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/returns/${id}`, data, { params: { workspace: WS } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns', WS] }),
  });
}

export function useToggleReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.patch(`/returns/${id}/toggle`, {}, { params: { workspace: WS } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns', WS] }),
  });
}

export function useDeleteReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/returns/${id}`, { params: { workspace: WS } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns', WS] }),
  });
}
