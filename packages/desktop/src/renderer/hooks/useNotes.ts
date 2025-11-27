import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Note,
  Tag,
  CreateNoteRequest,
  UpdateNoteRequest,
  CreateTagRequest,
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
    queryFn: async (): Promise<PaginatedResponse<Note>> => {
      const response = await window.api.getNotes(search);
      if (!response.success) throw new Error('Failed to fetch notes');
      return response.data;
    },
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: queryKeys.note(id ?? ''),
    queryFn: async (): Promise<Note | null> => {
      if (!id) return null;
      const response = await window.api.getNote(id);
      if (!response.success) return null;
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteRequest): Promise<Note> => {
      const response = await window.api.createNote(data);
      if (!response.success) throw new Error('Failed to create note');
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
    mutationFn: async ({ id, data }: { id: string; data: UpdateNoteRequest }): Promise<Note> => {
      const response = await window.api.updateNote(id, data);
      if (!response.success) throw new Error('Failed to update note');
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
    mutationFn: async (id: string): Promise<string> => {
      const response = await window.api.deleteNote(id);
      if (!response.success) throw new Error('Failed to delete note');
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
    queryFn: async (): Promise<Tag[]> => {
      const response = await window.api.getTags();
      if (!response.success) throw new Error('Failed to fetch tags');
      return response.data;
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagRequest): Promise<Tag> => {
      const response = await window.api.createTag(data);
      if (!response.success) throw new Error('Failed to create tag');
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
    mutationFn: async (id: string): Promise<string> => {
      const response = await window.api.deleteTag(id);
      if (!response.success) throw new Error('Failed to delete tag');
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}
