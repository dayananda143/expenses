import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useCarFinance(workspace) {
  return useQuery({
    queryKey: ['car-finance', workspace],
    queryFn: () => client.get('/car-finance', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useUpdateCarFinance(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.put('/car-finance', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['car-finance', workspace] }),
  });
}

export function useRecordCarFinancePayment(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/car-finance/payments', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['car-finance', workspace] }),
  });
}

export function useUpdateCarFinancePayment(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/car-finance/payments/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['car-finance', workspace] }),
  });
}

export function useDeleteCarFinancePayment(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/car-finance/payments/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['car-finance', workspace] }),
  });
}

export function useImportCarFinance(workspace) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/car-finance/import', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['car-finance', workspace] }),
  });
}
