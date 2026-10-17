import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { WS } from '../pages/accounts/shared';

export function useNetWorthHistory(months = 12) {
  return useQuery({
    queryKey: ['net-worth-history', WS, months],
    queryFn: () => client.get('/net-worth/history', { params: { workspace: WS, months } }),
  });
}

export function useRecordNetWorthSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => client.post('/net-worth/snapshot', {}, { params: { workspace: WS } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['net-worth-history', WS] }),
  });
}
