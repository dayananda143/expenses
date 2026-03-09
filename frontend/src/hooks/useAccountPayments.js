import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

const WS = 'us';

export function useAccountPayments() {
  return useQuery({
    queryKey: ['account_payments'],
    queryFn: () => client.get('/account-payments', { params: { workspace: WS } }),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/account-payments', data, { params: { workspace: WS } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account_payments'] });
      qc.invalidateQueries({ queryKey: ['accounts', WS] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/account-payments/${id}`, { params: { workspace: WS } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account_payments'] });
      qc.invalidateQueries({ queryKey: ['accounts', WS] });
    },
  });
}
