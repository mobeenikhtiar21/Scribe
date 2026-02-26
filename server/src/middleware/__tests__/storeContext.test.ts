import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { createTestDb, seedStore } from '../../tests/db-helper';
import { encodeSessionContext } from '../../services/jwt';
import { TEST_STORE_HASH, TEST_ACCESS_TOKEN, TEST_USER_EMAIL, TEST_USER_ID } from '../../tests/fixtures';
import Database from 'better-sqlite3';

let testDb: Database.Database;

// Mock the db module to return our in-memory database
vi.mock('../../db', () => ({
  getDb: () => testDb,
}));

// Import after mock
const { storeContext } = await import('../storeContext');

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    headers: {},
    ...overrides,
  } as Request;
}

function createMockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('storeContext middleware', () => {
  beforeEach(() => {
    testDb = createTestDb();
    seedStore(testDb, TEST_STORE_HASH, TEST_ACCESS_TOKEN);
  });

  afterEach(() => {
    testDb.close();
  });

  it('extracts context from query param', () => {
    const encoded = encodeSessionContext({
      storeHash: TEST_STORE_HASH,
      userId: TEST_USER_ID,
      userEmail: TEST_USER_EMAIL,
    });
    const req = createMockReq({ query: { context: encoded } as any });
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.storeHash).toBe(TEST_STORE_HASH);
    expect(req.accessToken).toBe(TEST_ACCESS_TOKEN);
    expect(req.userId).toBe(TEST_USER_ID);
    expect(req.userEmail).toBe(TEST_USER_EMAIL);
  });

  it('extracts context from x-store-context header', () => {
    const encoded = encodeSessionContext({
      storeHash: TEST_STORE_HASH,
      userId: TEST_USER_ID,
      userEmail: TEST_USER_EMAIL,
    });
    const req = createMockReq({ headers: { 'x-store-context': encoded } });
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.storeHash).toBe(TEST_STORE_HASH);
  });

  it('falls back to store_hash query param (dev mode)', () => {
    const req = createMockReq({ query: { store_hash: TEST_STORE_HASH } as any });
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.storeHash).toBe(TEST_STORE_HASH);
    expect(req.accessToken).toBe(TEST_ACCESS_TOKEN);
  });

  it('falls back to x-store-hash header (dev mode)', () => {
    const req = createMockReq({ headers: { 'x-store-hash': TEST_STORE_HASH } });
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.storeHash).toBe(TEST_STORE_HASH);
  });

  it('returns 401 when no context provided', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Missing store context' });
  });

  it('returns 401 when store not found in database', () => {
    const req = createMockReq({ query: { store_hash: 'nonexistent-store' } as any });
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Store not found. Is the app installed?' });
  });

  it('falls through to store_hash on invalid encoded context', () => {
    const req = createMockReq({
      query: { context: 'not-valid-base64!!!', store_hash: TEST_STORE_HASH } as any,
    });
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.storeHash).toBe(TEST_STORE_HASH);
  });

  it('sets userId and userEmail to undefined in dev mode fallback', () => {
    const req = createMockReq({ query: { store_hash: TEST_STORE_HASH } as any });
    const res = createMockRes();
    const next = vi.fn();

    storeContext(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBeUndefined();
    expect(req.userEmail).toBeUndefined();
  });
});
