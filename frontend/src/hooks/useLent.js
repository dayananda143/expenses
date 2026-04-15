import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useLent() {
  return useQuery({
    queryKey: ['lent'],
    queryFn: () => client.get('/lent'),
  });
}

export function useCreateLentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/lent', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lent'] }),
  });
}

export function useUpdateLentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/lent/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lent'] }),
  });
}

export function useDeleteLentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/lent/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lent'] }),
  });
}
