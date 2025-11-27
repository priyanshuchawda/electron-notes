import type { 
  Note, 
  Tag, 
  CreateNoteRequest, 
  UpdateNoteRequest, 
  CreateTagRequest,
  ApiResponse,
  PaginatedResponse 
} from '@quick-notes/shared';

export interface ElectronAPI {
  getNotes: (search?: string) => Promise<ApiResponse<PaginatedResponse<Note>>>;
  getNote: (id: string) => Promise<ApiResponse<Note>>;
  createNote: (data: CreateNoteRequest) => Promise<ApiResponse<Note>>;
  updateNote: (id: string, data: UpdateNoteRequest) => Promise<ApiResponse<Note>>;
  deleteNote: (id: string) => Promise<ApiResponse<{ deleted: boolean }>>;
  getTags: () => Promise<ApiResponse<Tag[]>>;
  createTag: (data: CreateTagRequest) => Promise<ApiResponse<Tag>>;
  deleteTag: (id: string) => Promise<ApiResponse<{ deleted: boolean }>>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
