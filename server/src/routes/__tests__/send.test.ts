import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createTestDb, seedStore } from '../../tests/db-helper';
import {
  TEST_STORE_HASH,
  TEST_ACCESS_TOKEN,
  mockOrder,
  mockOrderNoEmail,
  mockProducts,
  mockStoreInfo,
} from '../../tests/fixtures';

let testDb: Database.Database;

vi.mock('../../db', () => ({
  getDb: () => testDb,
  initDatabase: vi.fn(),
}));

const mockGetOrder = vi.fn();
const mockGetOrderProducts = vi.fn();
const mockGetStoreInfo = vi.fn();

vi.mock('../../services/bigcommerce', () => ({
  BigCommerceClient: vi.fn().mockImplementation(() => ({
    getOrder: mockGetOrder,
    getOrderProducts: mockGetOrderProducts,
    getStoreInfo: mockGetStoreInfo,
  })),
}));

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock('../../services/emailTemplates', () => ({
  buildOrderEmail: vi.fn().mockReturnValue('<html>Order Email</html>'),
}));

const { default: app } = await import('../../app');

describe('Send routes', () => {
  beforeEach(() => {
    testDb = createTestDb();
    seedStore(testDb, TEST_STORE_HASH, TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
    mockGetStoreInfo.mockResolvedValue(mockStoreInfo);
  });

  afterEach(() => {
    testDb.close();
  });

  describe('POST /api/order/:id/send', () => {
    it('sends email and returns success', async () => {
      mockGetOrder.mockResolvedValue(mockOrder);
      mockGetOrderProducts.mockResolvedValue(mockProducts);

      const res = await request(app)
        .post('/api/order/1001/send')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledOnce();
      expect(mockSendEmail.mock.calls[0][0].to).toBe('john@example.com');
    });

    it('returns 400 when customer has no email', async () => {
      mockGetOrder.mockResolvedValue(mockOrderNoEmail);
      mockGetOrderProducts.mockResolvedValue(mockProducts);

      const res = await request(app)
        .post('/api/order/1002/send')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No customer email found on this order');
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid order ID', async () => {
      const res = await request(app)
        .post('/api/order/abc/send')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(400);
    });

    it('creates an audit log entry', async () => {
      mockGetOrder.mockResolvedValue(mockOrder);
      mockGetOrderProducts.mockResolvedValue(mockProducts);

      await request(app)
        .post('/api/order/1001/send')
        .query({ store_hash: TEST_STORE_HASH });

      const audit = testDb.prepare(
        'SELECT * FROM audit_log WHERE store_hash = ? AND order_id = ? AND action = ?'
      ).get(TEST_STORE_HASH, 1001, 'send') as any;

      expect(audit).toBeDefined();
      expect(audit.action).toBe('send');
      expect(audit.detail).toContain('john@example.com');
    });

    it('returns 500 on BigCommerce error', async () => {
      mockGetOrder.mockRejectedValue(new Error('API error'));

      const res = await request(app)
        .post('/api/order/1001/send')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Failed to send order');
    });
  });
});
