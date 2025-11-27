import { contextBridge, ipcRenderer } from 'electron';
import type { CreateNoteRequest, UpdateNoteRequest, CreateTagRequest } from '@quick-notes/shared';

contextBridge.exposeInMainWorld('api', {
  // Notes
  getNotes: (search?: string) => ipcRenderer.invoke('notes:getAll', search),
  getNote: (id: string) => ipcRenderer.invoke('notes:get', id),
  createNote: (data: CreateNoteRequest) => ipcRenderer.invoke('notes:create', data),
  updateNote: (id: string, data: UpdateNoteRequest) => ipcRenderer.invoke('notes:update', id, data),
  deleteNote: (id: string) => ipcRenderer.invoke('notes:delete', id),
  
  // Tags
  getTags: () => ipcRenderer.invoke('tags:getAll'),
  createTag: (data: CreateTagRequest) => ipcRenderer.invoke('tags:create', data),
  deleteTag: (id: string) => ipcRenderer.invoke('tags:delete', id),
});
