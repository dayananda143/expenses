import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useLedgerPresets() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['ledger-presets', workspace],
    queryFn: () => client.get('/ledger-presets', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateLedgerPreset() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/ledger-presets', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger-presets', workspace] }),
  });
}

export function useUpdateLedgerPreset() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/ledger-presets/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger-presets', workspace] }),
  });
}

export function useDeleteLedgerPreset() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/ledger-presets/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger-presets', workspace] }),
  });
}
