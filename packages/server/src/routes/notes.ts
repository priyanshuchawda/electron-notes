import { Elysia, t } from 'elysia';
import { db, generateId } from '../db';
import type { Note, Tag, CreateNoteRequest, UpdateNoteRequest, PaginatedResponse } from '@quick-notes/shared';

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
  const stmt = db.query<TagRow, [string]>(`
    SELECT t.id, t.name, t.color
    FROM tags t
    JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ?
  `);
  return stmt.all(noteId);
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

export const notesRoutes = new Elysia({ prefix: '/notes' })
  // Get all notes with pagination and search
  .get('/', ({ query }) => {
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;
    const search = query.query;

    let rows: NoteRow[];
    let total: number;

    if (search) {
      const searchStmt = db.query<NoteRow, [string, number, number]>(`
        SELECT n.id, n.title, n.content, n.created_at, n.updated_at
        FROM notes n
        JOIN notes_fts fts ON n.rowid = fts.rowid
        WHERE notes_fts MATCH ?
        ORDER BY n.updated_at DESC
        LIMIT ? OFFSET ?
      `);
      rows = searchStmt.all(search, limit, offset);

      const countStmt = db.query<{ count: number }, [string]>(`
        SELECT COUNT(*) as count FROM notes n
        JOIN notes_fts fts ON n.rowid = fts.rowid
        WHERE notes_fts MATCH ?
      `);
      total = countStmt.get(search)?.count ?? 0;
    } else {
      const stmt = db.query<NoteRow, [number, number]>(`
        SELECT id, title, content, created_at, updated_at
        FROM notes
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `);
      rows = stmt.all(limit, offset);

      const countStmt = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM notes');
      total = countStmt.get()?.count ?? 0;
    }

    const response: PaginatedResponse<Note> = {
      items: rows.map(mapRowToNote),
      total,
      limit,
      offset,
    };

    return { success: true, data: response };
  }, {
    query: t.Object({
      query: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  })

  // Get single note
  .get('/:id', ({ params }) => {
    const stmt = db.query<NoteRow, [string]>(`
      SELECT id, title, content, created_at, updated_at
      FROM notes WHERE id = ?
    `);
    const row = stmt.get(params.id);

    if (!row) {
      return { success: false, error: 'Note not found' };
    }

    return { success: true, data: mapRowToNote(row) };
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // Create note
  .post('/', ({ body }) => {
    const id = generateId();
    const now = new Date().toISOString();

    const insertNote = db.query(`
      INSERT INTO notes (id, title, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertNoteTag = db.query(`
      INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)
    `);

    const transaction = db.transaction((data: CreateNoteRequest) => {
      insertNote.run(id, data.title, data.content, now, now);

      if (data.tagIds) {
        for (const tagId of data.tagIds) {
          insertNoteTag.run(id, tagId);
        }
      }
    });

    transaction(body);

    const note: Note = {
      id,
      title: body.title,
      content: body.content,
      createdAt: now,
      updatedAt: now,
      tags: getNoteTags(id),
    };

    return { success: true, data: note };
  }, {
    body: t.Object({
      title: t.String(),
      content: t.String(),
      tagIds: t.Optional(t.Array(t.String())),
    }),
  })

  // Update note
  .put('/:id', ({ params, body }) => {
    const now = new Date().toISOString();

    const existing = db.query<{ id: string }, [string]>('SELECT id FROM notes WHERE id = ?').get(params.id);
    if (!existing) {
      return { success: false, error: 'Note not found' };
    }

    const updates: string[] = ['updated_at = ?'];
    const values: string[] = [now];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.content !== undefined) {
      updates.push('content = ?');
      values.push(body.content);
    }

    values.push(params.id);

    const updateStmt = db.query(`
      UPDATE notes SET ${updates.join(', ')} WHERE id = ?
    `);

    const deleteTagsStmt = db.query('DELETE FROM note_tags WHERE note_id = ?');
    const insertTagStmt = db.query('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)');

    const transaction = db.transaction((data: UpdateNoteRequest) => {
      updateStmt.run(...values);

      if (data.tagIds !== undefined) {
        deleteTagsStmt.run(params.id);
        for (const tagId of data.tagIds) {
          insertTagStmt.run(params.id, tagId);
        }
      }
    });

    transaction(body);

    const stmt = db.query<NoteRow, [string]>(`
      SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?
    `);
    const row = stmt.get(params.id) as NoteRow;

    return { success: true, data: mapRowToNote(row) };
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      title: t.Optional(t.String()),
      content: t.Optional(t.String()),
      tagIds: t.Optional(t.Array(t.String())),
    }),
  })

  // Delete note
  .delete('/:id', ({ params }) => {
    const checkStmt = db.query<{ id: string }, [string]>('SELECT id FROM notes WHERE id = ?');
    const exists = checkStmt.get(params.id);

    if (!exists) {
      return { success: false, error: 'Note not found' };
    }

    const stmt = db.query('DELETE FROM notes WHERE id = ?');
    stmt.run(params.id);

    return { success: true, data: { deleted: true } };
  }, {
    params: t.Object({
      id: t.String(),
    }),
  });
