import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useUmaSbi() {
  return useQuery({
    queryKey: ['uma-sbi'],
    queryFn: () => client.get('/uma-sbi'),
  });
}

export function useCreateUmaSbi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/uma-sbi', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uma-sbi'] }),
  });
}

export function useUpdateUmaSbi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/uma-sbi/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uma-sbi'] }),
  });
}

export function useDeleteUmaSbi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/uma-sbi/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uma-sbi'] }),
  });
}
