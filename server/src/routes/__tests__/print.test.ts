import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createTestDb, seedStore } from '../../tests/db-helper';
import {
  TEST_STORE_HASH,
  TEST_ACCESS_TOKEN,
  mockOrder,
  mockProducts,
  mockShippingAddresses,
  mockStoreInfo,
} from '../../tests/fixtures';

let testDb: Database.Database;

vi.mock('../../db', () => ({
  getDb: () => testDb,
  initDatabase: vi.fn(),
}));

const mockGetOrder = vi.fn();
const mockGetOrderProducts = vi.fn();
const mockGetOrderShippingAddresses = vi.fn();
const mockGetStoreInfo = vi.fn();

vi.mock('../../services/bigcommerce', () => ({
  BigCommerceClient: vi.fn().mockImplementation(() => ({
    getOrder: mockGetOrder,
    getOrderProducts: mockGetOrderProducts,
    getOrderShippingAddresses: mockGetOrderShippingAddresses,
    getStoreInfo: mockGetStoreInfo,
  })),
}));

// Use real PDF generation for integration-level verification
const { default: app } = await import('../../app');

describe('Print routes', () => {
  beforeEach(() => {
    testDb = createTestDb();
    seedStore(testDb, TEST_STORE_HASH, TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
    mockGetOrder.mockResolvedValue(mockOrder);
    mockGetOrderProducts.mockResolvedValue(mockProducts);
    mockGetOrderShippingAddresses.mockResolvedValue(mockShippingAddresses);
    mockGetStoreInfo.mockResolvedValue(mockStoreInfo);
  });

  afterEach(() => {
    testDb.close();
  });

  describe('POST /api/order/:id/print', () => {
    it('returns a PDF response', async () => {
      const res = await request(app)
        .post('/api/order/1001/print')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('sets Content-Disposition with order ID filename', async () => {
      const res = await request(app)
        .post('/api/order/1001/print')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.headers['content-disposition']).toContain('order-1001.pdf');
    });

    it('returns PDF magic bytes', async () => {
      const res = await request(app)
        .post('/api/order/1001/print')
        .query({ store_hash: TEST_STORE_HASH })
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      const header = (res.body as Buffer).subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('creates an audit log entry', async () => {
      await request(app)
        .post('/api/order/1001/print')
        .query({ store_hash: TEST_STORE_HASH });

      const audit = testDb.prepare(
        'SELECT * FROM audit_log WHERE store_hash = ? AND order_id = ? AND action = ?'
      ).get(TEST_STORE_HASH, 1001, 'print') as any;

      expect(audit).toBeDefined();
      expect(audit.action).toBe('print');
      expect(audit.detail).toBe('PDF generated');
    });

    it('returns 400 for invalid order ID', async () => {
      const res = await request(app)
        .post('/api/order/abc/print')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid order ID');
    });
  });
});
