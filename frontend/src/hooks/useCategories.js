import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function useCategories() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['categories', workspace],
    queryFn: () => client.get('/categories', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (data) => client.post('/categories', data, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', workspace] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/categories/${id}`, data, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', workspace] });
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspace] });
    },
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (ids) => client.patch('/categories/reorder', { ids }, { params: { workspace } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', workspace] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (id) => client.delete(`/categories/${id}`, { params: { workspace } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', workspace] });
      qc.invalidateQueries({ queryKey: ['expenses', workspace] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspace] });
    },
  });
}

export function useCategorySubtypes(categoryId) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['category-subtypes', categoryId],
    queryFn: () => client.get(`/categories/${categoryId}/subtypes`, { params: { workspace } }),
    enabled: !!categoryId && !!workspace,
  });
}

export function useAllSubtypes() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ['category-subtypes-all', workspace],
    queryFn: () => client.get('/categories/subtypes/all', { params: { workspace } }),
    enabled: !!workspace,
  });
}

export function useCreateSubtype() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ categoryId, name }) => client.post(`/categories/${categoryId}/subtypes`, { name }, { params: { workspace } }),
    onSuccess: (_, { categoryId }) => {
      qc.invalidateQueries({ queryKey: ['category-subtypes', categoryId] });
      qc.invalidateQueries({ queryKey: ['category-subtypes-all', workspace] });
    },
  });
}

export function useDeleteSubtype() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: ({ categoryId, subtypeId }) => client.delete(`/categories/${categoryId}/subtypes/${subtypeId}`, { params: { workspace } }),
    onSuccess: (_, { categoryId }) => {
      qc.invalidateQueries({ queryKey: ['category-subtypes', categoryId] });
      qc.invalidateQueries({ queryKey: ['category-subtypes-all', workspace] });
    },
  });
}
