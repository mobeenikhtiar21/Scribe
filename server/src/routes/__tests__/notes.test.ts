import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createTestDb, seedStore } from '../../tests/db-helper';
import { TEST_STORE_HASH, TEST_ACCESS_TOKEN, TEST_USER_EMAIL } from '../../tests/fixtures';

let testDb: Database.Database;

vi.mock('../../db', () => ({
  getDb: () => testDb,
  initDatabase: vi.fn(),
}));

vi.mock('../../services/bigcommerce', () => ({
  BigCommerceClient: vi.fn(),
}));

const { default: app } = await import('../../app');

describe('Notes routes', () => {
  beforeEach(() => {
    testDb = createTestDb();
    seedStore(testDb, TEST_STORE_HASH, TEST_ACCESS_TOKEN);
  });

  afterEach(() => {
    testDb.close();
  });

  describe('GET /:id/notes', () => {
    it('returns empty notes array for order with no notes', async () => {
      const res = await request(app)
        .get('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.body.notes).toEqual([]);
    });

    it('returns notes in descending order', async () => {
      testDb.prepare(
        "INSERT INTO notes (store_hash, order_id, author, content, created_at) VALUES (?, ?, ?, ?, '2025-01-01 10:00:00')"
      ).run(TEST_STORE_HASH, 1001, 'Staff', 'First note');
      testDb.prepare(
        "INSERT INTO notes (store_hash, order_id, author, content, created_at) VALUES (?, ?, ?, ?, '2025-01-01 11:00:00')"
      ).run(TEST_STORE_HASH, 1001, 'Staff', 'Second note');

      const res = await request(app)
        .get('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(2);
      expect(res.body.notes[0].content).toBe('Second note');
      expect(res.body.notes[1].content).toBe('First note');
    });

    it('returns 400 for invalid order ID', async () => {
      const res = await request(app)
        .get('/api/order/abc/notes')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid order ID');
    });

    it('only returns notes for the requesting store', async () => {
      seedStore(testDb, 'other-store', 'other-token');
      testDb.prepare(
        'INSERT INTO notes (store_hash, order_id, author, content) VALUES (?, ?, ?, ?)'
      ).run('other-store', 1001, 'Staff', 'Other store note');
      testDb.prepare(
        'INSERT INTO notes (store_hash, order_id, author, content) VALUES (?, ?, ?, ?)'
      ).run(TEST_STORE_HASH, 1001, 'Staff', 'My store note');

      const res = await request(app)
        .get('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.body.notes).toHaveLength(1);
      expect(res.body.notes[0].content).toBe('My store note');
    });
  });

  describe('POST /:id/notes', () => {
    it('creates a note and returns 201', async () => {
      const res = await request(app)
        .post('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ content: 'Test note' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Test note');
      expect(res.body.store_hash).toBe(TEST_STORE_HASH);
      expect(res.body.order_id).toBe(1001);
      expect(res.body.id).toBeDefined();
    });

    it('defaults author to Staff when no userEmail', async () => {
      const res = await request(app)
        .post('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ content: 'Test note' });

      expect(res.body.author).toBe('Staff');
    });

    it('returns 400 when content is missing', async () => {
      const res = await request(app)
        .post('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH })
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Note content is required');
    });

    it('returns 400 when content exceeds 2000 characters', async () => {
      const res = await request(app)
        .post('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ content: 'x'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Note must be under 2000 characters');
    });

    it('returns 400 when content is whitespace only', async () => {
      const res = await request(app)
        .post('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Note content is required');
    });

    it('creates an audit log entry', async () => {
      await request(app)
        .post('/api/order/1001/notes')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ content: 'Audit test' });

      const audit = testDb.prepare(
        'SELECT * FROM audit_log WHERE store_hash = ? AND order_id = ? AND action = ?'
      ).get(TEST_STORE_HASH, 1001, 'note') as any;

      expect(audit).toBeDefined();
      expect(audit.action).toBe('note');
      expect(audit.detail).toBe('Note added');
    });
  });
});
