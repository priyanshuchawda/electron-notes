import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import type {
  Note,
  Tag,
  CreateNoteRequest,
  UpdateNoteRequest,
  CreateTagRequest,
  ApiResponse,
  PaginatedResponse,
} from '@quick-notes/shared';

// Query keys for cache management
export const queryKeys = {
  notes: ['notes'] as const,
  note: (id: string) => ['notes', id] as const,
  tags: ['tags'] as const,
};

// Notes hooks
export function useNotes(search?: string) {
  return useQuery({
    queryKey: [...queryKeys.notes, search],
    queryFn: async () => {
      const params = search ? `?query=${encodeURIComponent(search)}` : '';
      const response = await apiClient<ApiResponse<PaginatedResponse<Note>>>(
        `/notes${params}`
      );
      return response.data;
    },
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: queryKeys.note(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient<ApiResponse<Note>>(`/notes/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteRequest) => {
      const response = await apiClient<ApiResponse<Note>>('/notes', {
        method: 'POST',
        body: data,
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateNoteRequest }) => {
      const response = await apiClient<ApiResponse<Note>>(`/notes/${id}`, {
        method: 'PUT',
        body: data,
      });
      return response.data;
    },
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.note(note.id) });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/notes/${id}`, { method: 'DELETE' });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

// Tags hooks
export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const response = await apiClient<ApiResponse<Tag[]>>('/tags');
      return response.data;
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagRequest) => {
      const response = await apiClient<ApiResponse<Tag>>('/tags', {
        method: 'POST',
        body: data,
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/tags/${id}`, { method: 'DELETE' });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}
