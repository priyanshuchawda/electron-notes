import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import * as db from './database';
import type { CreateNoteRequest, UpdateNoteRequest, CreateTagRequest } from '@quick-notes/shared';

const isDev = !app.isPackaged;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Quick Notes',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// IPC Handlers for database operations
function setupIpcHandlers(): void {
  // Notes
  ipcMain.handle('notes:getAll', (_, search?: string) => {
    return { success: true, data: db.getNotes(search) };
  });

  ipcMain.handle('notes:get', (_, id: string) => {
    const note = db.getNote(id);
    return note ? { success: true, data: note } : { success: false, error: 'Note not found' };
  });

  ipcMain.handle('notes:create', (_, data: CreateNoteRequest) => {
    const note = db.createNote(data);
    return { success: true, data: note };
  });

  ipcMain.handle('notes:update', (_, id: string, data: UpdateNoteRequest) => {
    const note = db.updateNote(id, data);
    return note ? { success: true, data: note } : { success: false, error: 'Note not found' };
  });

  ipcMain.handle('notes:delete', (_, id: string) => {
    const deleted = db.deleteNote(id);
    return deleted ? { success: true, data: { deleted: true } } : { success: false, error: 'Note not found' };
  });

  // Tags
  ipcMain.handle('tags:getAll', () => {
    return { success: true, data: db.getTags() };
  });

  ipcMain.handle('tags:create', (_, data: CreateTagRequest) => {
    const tag = db.createTag(data.name, data.color);
    return tag ? { success: true, data: tag } : { success: false, error: 'Tag already exists' };
  });

  ipcMain.handle('tags:delete', (_, id: string) => {
    const deleted = db.deleteTag(id);
    return deleted ? { success: true, data: { deleted: true } } : { success: false, error: 'Tag not found' };
  });
}

app.whenReady().then(async () => {
  await db.initDatabase();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
