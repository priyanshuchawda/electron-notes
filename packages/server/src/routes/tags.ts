import { Elysia, t } from 'elysia';
import { db, generateId } from '../db';
import type { Tag } from '@quick-notes/shared';

interface TagRow {
  id: string;
  name: string;
  color: string;
}

export const tagsRoutes = new Elysia({ prefix: '/tags' })
  // Get all tags
  .get('/', () => {
    const stmt = db.query<TagRow, []>('SELECT id, name, color FROM tags ORDER BY name');
    const rows = stmt.all();
    return { success: true, data: rows as Tag[] };
  })

  // Create tag
  .post('/', ({ body }) => {
    const id = generateId();
    const stmt = db.query('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)');
    
    try {
      stmt.run(id, body.name, body.color);
      const tag: Tag = { id, name: body.name, color: body.color };
      return { success: true, data: tag };
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        return { success: false, error: 'Tag already exists' };
      }
      throw error;
    }
  }, {
    body: t.Object({
      name: t.String(),
      color: t.String(),
    }),
  })

  // Update tag
  .put('/:id', ({ params, body }) => {
    const updates: string[] = [];
    const values: string[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.color !== undefined) {
      updates.push('color = ?');
      values.push(body.color);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    values.push(params.id);

    const checkStmt = db.query<TagRow, [string]>('SELECT id, name, color FROM tags WHERE id = ?');
    const existing = checkStmt.get(params.id);

    if (!existing) {
      return { success: false, error: 'Tag not found' };
    }

    const stmt = db.query(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    const getStmt = db.query<TagRow, [string]>('SELECT id, name, color FROM tags WHERE id = ?');
    const tag = getStmt.get(params.id) as TagRow;

    return { success: true, data: tag as Tag };
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      color: t.Optional(t.String()),
    }),
  })

  // Delete tag
  .delete('/:id', ({ params }) => {
    const checkStmt = db.query<{ id: string }, [string]>('SELECT id FROM tags WHERE id = ?');
    const exists = checkStmt.get(params.id);

    if (!exists) {
      return { success: false, error: 'Tag not found' };
    }

    const stmt = db.query('DELETE FROM tags WHERE id = ?');
    stmt.run(params.id);

    return { success: true, data: { deleted: true } };
  }, {
    params: t.Object({
      id: t.String(),
    }),
  });
