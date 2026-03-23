import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useSavings() {
  return useQuery({
    queryKey: ['savings'],
    queryFn: () => client.get('/savings'),
  });
}

export function useCreateSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/savings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
}

export function useUpdateSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/savings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
}

export function useDeleteSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/savings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
}

export function useReorderSavings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => client.patch('/savings/reorder', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
}
