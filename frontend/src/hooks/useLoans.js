import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: () => client.get('/loans'),
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/loans', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/loans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/loans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useToggleLoanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.patch(`/loans/${id}/status`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}
