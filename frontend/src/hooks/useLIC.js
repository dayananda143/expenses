import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useLIC() {
  return useQuery({
    queryKey: ['lic'],
    queryFn: () => client.get('/lic'),
  });
}

export function useCreateLIC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/lic', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lic'] }),
  });
}

export function useUpdateLIC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/lic/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lic'] }),
  });
}

export function useDeleteLIC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/lic/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lic'] }),
  });
}

export function useReorderLIC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => client.patch('/lic/reorder', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lic'] }),
  });
}
