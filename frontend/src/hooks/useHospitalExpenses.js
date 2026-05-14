import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

const BASE = '/hospital-expenses';

export function useHospitalExpenses({ month, year, search, page, limit, user_id, category_id, sort, order } = {}) {
  return useQuery({
    queryKey: ['hospital-expenses', { month, year, search, page, limit, user_id, category_id, sort, order }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (month)       params.set('month', month);
      if (year)        params.set('year', year);
      if (search)      params.set('search', search);
      if (page)        params.set('page', page);
      if (limit)       params.set('limit', limit);
      if (user_id)     params.set('user_id', user_id);
      if (category_id) params.set('category_id', category_id);
      if (sort)        params.set('sort', sort);
      if (order)       params.set('order', order);
      return client.get(`${BASE}?${params.toString()}`);
    },
  });
}

export function useHospitalCategories() {
  return useQuery({
    queryKey: ['hospital-categories'],
    queryFn: () => client.get(`${BASE}/categories`),
  });
}

export function useCreateHospitalCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post(`${BASE}/categories`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospital-categories'] }),
  });
}

export function useUpdateHospitalCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`${BASE}/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospital-categories'] }),
  });
}

export function useDeleteHospitalCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`${BASE}/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital-categories'] });
      qc.invalidateQueries({ queryKey: ['hospital-expenses'] });
    },
  });
}

export function useHospitalSummary(year, user_id) {
  return useQuery({
    queryKey: ['hospital-summary', year, user_id],
    queryFn: () => {
      const params = new URLSearchParams();
      if (year)    params.set('year', year);
      if (user_id) params.set('user_id', user_id);
      return client.get(`${BASE}/summary?${params.toString()}`);
    },
  });
}

export function useHospitalUsers() {
  return useQuery({
    queryKey: ['hospital-users'],
    queryFn: () => client.get(`${BASE}/users`),
  });
}

export function useCreateHospitalExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post(BASE, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital-expenses'] });
      qc.invalidateQueries({ queryKey: ['hospital-summary'] });
    },
  });
}

export function useUpdateHospitalExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`${BASE}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital-expenses'] });
      qc.invalidateQueries({ queryKey: ['hospital-summary'] });
    },
  });
}

export function useDeleteHospitalExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`${BASE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital-expenses'] });
      qc.invalidateQueries({ queryKey: ['hospital-summary'] });
    },
  });
}
