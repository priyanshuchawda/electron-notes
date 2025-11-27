import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import type { Note, Tag, CreateNoteRequest, UpdateNoteRequest, PaginatedResponse } from '@quick-notes/shared';

let db: SqlJsDatabase;
const dbDir = app.getPath('userData');
const dbPath = join(dbDir, 'notes.db');

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

// Debounced save to reduce disk I/O (battery friendly)
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 1000; // Save at most once per second

// In-memory cache for frequently accessed data
const notesCache = new Map<string, Note>();
const tagsCache: Tag[] = [];
let tagsCacheValid = false;

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  
  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database or create new
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema with optimized indexes
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
    CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
  `);

  // Enable WAL mode for better concurrent performance (if supported)
  try {
    db.run('PRAGMA journal_mode = WAL');
  } catch {
    // WAL not supported in sql.js, ignore
  }
  
  // Optimize for speed
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA cache_size = 10000');
  db.run('PRAGMA temp_store = MEMORY');
  
  saveDatabase();
}

function saveDatabase(): void {
  // Debounced save to reduce disk writes (better for SSD longevity & battery)
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
    saveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
}

// Force immediate save (for critical operations)
function saveDatabaseNow(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Invalidate caches when data changes
function invalidateCache(noteId?: string): void {
  if (noteId) {
    notesCache.delete(noteId);
  } else {
    notesCache.clear();
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface TagRow {
  id: string;
  name: string;
  color: string;
}

function getNoteTags(noteId: string): Tag[] {
  const stmt = db.prepare(`
    SELECT t.id, t.name, t.color FROM tags t
    JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?
  `);
  stmt.bind([noteId]);
  
  const tags: Tag[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as TagRow;
    tags.push(row);
  }
  stmt.free();
  return tags;
}

function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: getNoteTags(row.id),
  };
}

// Notes API
export function getNotes(search?: string, limit = 50, offset = 0): PaginatedResponse<Note> {
  let query: string;
  let params: (string | number)[];

  if (search) {
    query = `
      SELECT id, title, content, created_at, updated_at FROM notes
      WHERE title LIKE ? OR content LIKE ?
      ORDER BY updated_at DESC LIMIT ? OFFSET ?
    `;
    params = [`%${search}%`, `%${search}%`, limit, offset];
  } else {
    query = `
      SELECT id, title, content, created_at, updated_at FROM notes
      ORDER BY updated_at DESC LIMIT ? OFFSET ?
    `;
    params = [limit, offset];
  }

  const stmt = db.prepare(query);
  stmt.bind(params);
  
  const rows: NoteRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as NoteRow);
  }
  stmt.free();

  const countResult = db.exec('SELECT COUNT(*) as count FROM notes');
  const total = countResult[0]?.values[0]?.[0] as number ?? 0;

  return { items: rows.map(mapRowToNote), total, limit, offset };
}

export function getNote(id: string): Note | null {
  const stmt = db.prepare('SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?');
  stmt.bind([id]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as NoteRow;
    stmt.free();
    return mapRowToNote(row);
  }
  stmt.free();
  return null;
}

export function createNote(data: CreateNoteRequest): Note {
  const id = generateId();
  const now = new Date().toISOString();

  db.run('INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', 
    [id, data.title, data.content, now, now]);

  if (data.tagIds) {
    for (const tagId of data.tagIds) {
      db.run('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }

  saveDatabase();
  return { id, title: data.title, content: data.content, createdAt: now, updatedAt: now, tags: getNoteTags(id) };
}

export function updateNote(id: string, data: UpdateNoteRequest): Note | null {
  const existing = getNote(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  if (data.title !== undefined) {
    db.run('UPDATE notes SET title = ?, updated_at = ? WHERE id = ?', [data.title, now, id]);
  }
  if (data.content !== undefined) {
    db.run('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?', [data.content, now, id]);
  }
  if (data.tagIds !== undefined) {
    db.run('DELETE FROM note_tags WHERE note_id = ?', [id]);
    for (const tagId of data.tagIds) {
      db.run('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }

  saveDatabase();
  return getNote(id);
}

export function deleteNote(id: string): boolean {
  const existing = getNote(id);
  if (!existing) return false;
  
  db.run('DELETE FROM note_tags WHERE note_id = ?', [id]);
  db.run('DELETE FROM notes WHERE id = ?', [id]);
  saveDatabase();
  return true;
}

// Tags API
export function getTags(): Tag[] {
  const stmt = db.prepare('SELECT id, name, color FROM tags ORDER BY name');
  const tags: Tag[] = [];
  while (stmt.step()) {
    tags.push(stmt.getAsObject() as unknown as TagRow);
  }
  stmt.free();
  return tags;
}

export function createTag(name: string, color: string): Tag | null {
  const id = generateId();
  try {
    db.run('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)', [id, name, color]);
    saveDatabase();
    return { id, name, color };
  } catch {
    return null;
  }
}

export function deleteTag(id: string): boolean {
  db.run('DELETE FROM note_tags WHERE tag_id = ?', [id]);
  db.run('DELETE FROM tags WHERE id = ?', [id]);
  saveDatabase();
  return true;
}
