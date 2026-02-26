import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createTestDb, seedStore } from '../../tests/db-helper';
import { TEST_STORE_HASH, TEST_ACCESS_TOKEN, mockOrder, mockProducts } from '../../tests/fixtures';

let testDb: Database.Database;

vi.mock('../../db', () => ({
  getDb: () => testDb,
  initDatabase: vi.fn(),
}));

const mockListOrders = vi.fn();
const mockGetOrder = vi.fn();
const mockGetOrderProducts = vi.fn();

vi.mock('../../services/bigcommerce', () => ({
  BigCommerceClient: vi.fn().mockImplementation(() => ({
    listOrders: mockListOrders,
    getOrder: mockGetOrder,
    getOrderProducts: mockGetOrderProducts,
  })),
}));

const { default: app } = await import('../../app');

describe('Orders routes', () => {
  beforeEach(() => {
    testDb = createTestDb();
    seedStore(testDb, TEST_STORE_HASH, TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('GET /api/order', () => {
    it('returns orders from BigCommerce', async () => {
      mockListOrders.mockResolvedValue([mockOrder]);

      const res = await request(app)
        .get('/api/order')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(1001);
    });

    it('returns empty array when no orders', async () => {
      mockListOrders.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/order')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('passes query params to BigCommerce client', async () => {
      mockListOrders.mockResolvedValue([]);

      await request(app)
        .get('/api/order')
        .query({ store_hash: TEST_STORE_HASH, status_id: '0', limit: '10', page: '2' });

      expect(mockListOrders).toHaveBeenCalledWith({
        status_id: 0,
        limit: 10,
        page: 2,
      });
    });

    it('returns empty array on BigCommerce error', async () => {
      mockListOrders.mockRejectedValue(new Error('API error'));

      const res = await request(app)
        .get('/api/order')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/order/:id', () => {
    it('returns order with products', async () => {
      mockGetOrder.mockResolvedValue(mockOrder);
      mockGetOrderProducts.mockResolvedValue(mockProducts);

      const res = await request(app)
        .get('/api/order/1001')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1001);
      expect(res.body.products).toHaveLength(2);
    });

    it('returns 400 for non-numeric order ID', async () => {
      const res = await request(app)
        .get('/api/order/abc')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid order ID');
    });

    it('returns 500 on BigCommerce error', async () => {
      mockGetOrder.mockRejectedValue(new Error('API error'));

      const res = await request(app)
        .get('/api/order/1001')
        .query({ store_hash: TEST_STORE_HASH });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Failed to fetch order');
    });
  });
});
