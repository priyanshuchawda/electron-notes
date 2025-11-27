// Shared types for Quick Notes - strictly typed, no anys

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface NoteTag {
  noteId: string;
  tagId: string;
}

// API Request/Response types
export interface CreateNoteRequest {
  title: string;
  content: string;
  tagIds?: string[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tagIds?: string[];
}

export interface CreateTagRequest {
  name: string;
  color: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Search params
export interface SearchNotesParams {
  query?: string;
  tagIds?: string[];
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
