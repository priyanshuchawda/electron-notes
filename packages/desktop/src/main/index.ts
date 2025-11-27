import { app, BrowserWindow, ipcMain, powerMonitor, nativeTheme } from 'electron';
import { join } from 'path';
import * as db from './database';
import type { CreateNoteRequest, UpdateNoteRequest, CreateTagRequest } from '@quick-notes/shared';

const isDev = !app.isPackaged;

// ============================================
// PERFORMANCE & BATTERY OPTIMIZATIONS
// ============================================

// Disable hardware acceleration when on battery (saves power)
let isOnBattery = false;

// Reduce animation frame rate when app is in background
let isAppFocused = true;

// Cache for faster startup
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// GPU optimizations for better performance
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Memory optimizations
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Quick Notes',
    icon: isDev ? undefined : join(__dirname, '../../build/icon.png'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e2e' : '#ffffff',
    show: false, // Don't show until ready (faster perceived load)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      // Performance optimizations
      spellcheck: false, // Disable if not needed
      enableWebSQL: false,
      backgroundThrottling: true, // Throttle when in background (battery saving)
    },
  });

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Battery optimization: reduce activity when on battery
  mainWindow.on('focus', () => {
    isAppFocused = true;
    mainWindow.webContents.setFrameRate(60);
  });

  mainWindow.on('blur', () => {
    isAppFocused = false;
    // Reduce frame rate when not focused (battery saving)
    if (isOnBattery) {
      mainWindow.webContents.setFrameRate(30);
    }
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

  // Battery monitoring for power-aware optimizations
  powerMonitor.on('on-battery', () => {
    isOnBattery = true;
    console.log('Switched to battery power - enabling power saving mode');
  });

  powerMonitor.on('on-ac', () => {
    isOnBattery = false;
    console.log('Switched to AC power - full performance mode');
  });

  // Check initial power state (isOnBatteryPower returns true if on battery)
  isOnBattery = powerMonitor.isOnBatteryPower?.() ?? false;

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
