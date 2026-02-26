import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createTestDb, seedStore } from '../../tests/db-helper';
import {
  TEST_STORE_HASH,
  TEST_ACCESS_TOKEN,
  mockOrder,
  mockOrderNoEmail,
  mockStoreInfo,
} from '../../tests/fixtures';

let testDb: Database.Database;

vi.mock('../../db', () => ({
  getDb: () => testDb,
  initDatabase: vi.fn(),
}));

const mockGetOrder = vi.fn();
const mockGetStoreInfo = vi.fn();

vi.mock('../../services/bigcommerce', () => ({
  BigCommerceClient: vi.fn().mockImplementation(() => ({
    getOrder: mockGetOrder,
    getStoreInfo: mockGetStoreInfo,
  })),
}));

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock('../../services/emailTemplates', () => ({
  buildMessageEmail: vi.fn().mockReturnValue('<html>Message Email</html>'),
}));

const { default: app } = await import('../../app');

describe('Message routes', () => {
  beforeEach(() => {
    testDb = createTestDb();
    seedStore(testDb, TEST_STORE_HASH, TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
    mockGetStoreInfo.mockResolvedValue(mockStoreInfo);
  });

  afterEach(() => {
    testDb.close();
  });

  describe('POST /api/order/:id/message', () => {
    it('sends message and returns success', async () => {
      mockGetOrder.mockResolvedValue(mockOrder);

      const res = await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: 'Hello', message: 'Your order is ready.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledOnce();
      expect(mockSendEmail.mock.calls[0][0].to).toBe('john@example.com');
      expect(mockSendEmail.mock.calls[0][0].subject).toBe('Hello');
    });

    it('returns 400 when subject is missing', async () => {
      const res = await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ message: 'Body only' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Subject and message are required');
    });

    it('returns 400 when message body is missing', async () => {
      const res = await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: 'Subject only' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Subject and message are required');
    });

    it('returns 400 when subject is whitespace only', async () => {
      const res = await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: '   ', message: 'Body' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Subject and message are required');
    });

    it('returns 400 when message is whitespace only', async () => {
      const res = await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: 'Hello', message: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Subject and message are required');
    });

    it('returns 400 when subject exceeds 200 characters', async () => {
      const res = await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: 'x'.repeat(201), message: 'Body' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Subject must be under 200 characters');
    });

    it('returns 400 when message exceeds 5000 characters', async () => {
      const res = await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: 'Hello', message: 'x'.repeat(5001) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Message must be under 5000 characters');
    });

    it('returns 400 when customer has no email', async () => {
      mockGetOrder.mockResolvedValue(mockOrderNoEmail);

      const res = await request(app)
        .post('/api/order/1002/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: 'Hello', message: 'Body' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No customer email found on this order');
    });

    it('creates an audit log entry', async () => {
      mockGetOrder.mockResolvedValue(mockOrder);

      await request(app)
        .post('/api/order/1001/message')
        .query({ store_hash: TEST_STORE_HASH })
        .send({ subject: 'Hello', message: 'Your order is ready.' });

      const audit = testDb.prepare(
        'SELECT * FROM audit_log WHERE store_hash = ? AND order_id = ? AND action = ?'
      ).get(TEST_STORE_HASH, 1001, 'message') as any;

      expect(audit).toBeDefined();
      expect(audit.action).toBe('message');
      expect(audit.detail).toContain('john@example.com');
      expect(audit.detail).toContain('Hello');
    });
  });
});
