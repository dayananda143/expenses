import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

const BASE = '/salary';

export function useSalaryEntries({ search, page, sort, order } = {}) {
  return useQuery({
    queryKey: ['salary-entries', { search, page, sort, order }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (page)   params.set('page', page);
      if (sort)   params.set('sort', sort);
      if (order)  params.set('order', order);
      return client.get(`${BASE}?${params.toString()}`);
    },
  });
}

export function useSalarySummary() {
  return useQuery({
    queryKey: ['salary-summary'],
    queryFn: () => client.get(`${BASE}/summary`),
  });
}

export function useSalarySettings() {
  return useQuery({
    queryKey: ['salary-settings'],
    queryFn: () => client.get(`${BASE}/settings`),
  });
}

export function useUpdateSalarySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.put(`${BASE}/settings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-settings'] });
      qc.invalidateQueries({ queryKey: ['salary-summary'] });
    },
  });
}

export function useCreateSalaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post(BASE, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-entries'] });
      qc.invalidateQueries({ queryKey: ['salary-summary'] });
    },
  });
}

export function useUpdateSalaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`${BASE}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-entries'] });
      qc.invalidateQueries({ queryKey: ['salary-summary'] });
    },
  });
}

export function useDeleteSalaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`${BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-entries'] });
      qc.invalidateQueries({ queryKey: ['salary-summary'] });
    },
  });
}
