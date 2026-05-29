import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useTrips() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['trips', workspace],
    queryFn: () => client.get('/trips', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/trips', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', workspace] }),
  });
}

export function useUpdateTrip() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/trips/${id}`, data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', workspace] }),
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/trips/${id}`, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', workspace] }),
  });
}

export function useAssignExpenseToTrip() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ expenseId, tripId }) =>
      client.patch(`/expenses/${expenseId}/trip`, { trip_id: tripId ?? null }, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['trips', workspace] });
    },
  });
}

export function useTripExpenses(tripId) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['trip-expenses', tripId, workspace],
    queryFn: () => client.get(`/trips/${tripId}/expenses`, { params: { workspace } }),
    enabled: !!workspace && !!tripId,
  });
}
