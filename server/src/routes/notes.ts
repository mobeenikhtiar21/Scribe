import { Router, Request, Response } from 'express';
import { getDb } from '../db';

export const notesRouter = Router();

/**
 * GET /:id/notes - Get all notes for an order
 */
notesRouter.get('/:id/notes', (req: Request, res: Response) => {
  try {
    const orderId = parseInt(String(req.params.id), 10);
    if (isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid order ID' });
      return;
    }

    const db = getDb();
    const notes = db
      .prepare(
        'SELECT * FROM notes WHERE store_hash = ? AND order_id = ? ORDER BY created_at DESC'
      )
      .all(req.storeHash, orderId);

    res.json({ notes });
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ message: 'Failed to get notes' });
  }
});

/**
 * POST /:id/notes - Add a note to an order
 */
notesRouter.post('/:id/notes', (req: Request, res: Response) => {
  try {
    const orderId = parseInt(String(req.params.id), 10);
    if (isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid order ID' });
      return;
    }

    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      res.status(400).json({ message: 'Note content is required' });
      return;
    }

    if (content.length > 2000) {
      res.status(400).json({ message: 'Note must be under 2000 characters' });
      return;
    }

    // Use the session user email as the author, fall back to 'Staff'
    const author = req.userEmail || 'Staff';

    const db = getDb();
    const result = db
      .prepare(
        'INSERT INTO notes (store_hash, order_id, author, content) VALUES (?, ?, ?, ?)'
      )
      .run(req.storeHash, orderId, author, content);

    // Audit log
    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeHash, orderId, 'note', author, 'Note added');

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(note);
  } catch (err) {
    console.error('Add note error:', err);
    res.status(500).json({ message: 'Failed to add note' });
  }
});
