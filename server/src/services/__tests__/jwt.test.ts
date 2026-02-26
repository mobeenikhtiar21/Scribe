import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  verifyBigCommerceJwt,
  extractStoreHash,
  encodeSessionContext,
  decodeSessionContext,
  BigCommerceJwtPayload,
} from '../jwt';

const CLIENT_SECRET = process.env.BC_CLIENT_SECRET!;
const CLIENT_ID = process.env.BC_CLIENT_ID!;

function createTestJwt(overrides: Partial<BigCommerceJwtPayload> = {}): string {
  const payload: BigCommerceJwtPayload = {
    aud: CLIENT_ID,
    iss: 'bc',
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: 'test-jti',
    sub: 'stores/abc123',
    user: { id: 1, email: 'user@example.com' },
    owner: { id: 1, email: 'owner@example.com' },
    url: '/orders/100/scribe',
    channel_id: null,
    ...overrides,
  };
  return jwt.sign(payload, CLIENT_SECRET, { algorithm: 'HS256' });
}

describe('verifyBigCommerceJwt', () => {
  it('decodes a valid JWT', () => {
    const token = createTestJwt();
    const payload = verifyBigCommerceJwt(token);
    expect(payload.sub).toBe('stores/abc123');
    expect(payload.user.email).toBe('user@example.com');
  });

  it('throws on invalid signature', () => {
    const token = jwt.sign({ aud: CLIENT_ID, iss: 'bc', sub: 'stores/x' }, 'wrong-secret', {
      algorithm: 'HS256',
    });
    expect(() => verifyBigCommerceJwt(token)).toThrow();
  });

  it('throws on wrong audience', () => {
    const token = jwt.sign(
      { aud: 'wrong-aud', iss: 'bc', sub: 'stores/x' },
      CLIENT_SECRET,
      { algorithm: 'HS256' }
    );
    expect(() => verifyBigCommerceJwt(token)).toThrow();
  });

  it('throws on wrong issuer', () => {
    const token = jwt.sign(
      { aud: CLIENT_ID, iss: 'not-bc', sub: 'stores/x' },
      CLIENT_SECRET,
      { algorithm: 'HS256' }
    );
    expect(() => verifyBigCommerceJwt(token)).toThrow();
  });
});

describe('extractStoreHash', () => {
  it('extracts store hash from sub claim', () => {
    const payload = { sub: 'stores/abc123' } as BigCommerceJwtPayload;
    expect(extractStoreHash(payload)).toBe('abc123');
  });

  it('handles store hash with special characters', () => {
    const payload = { sub: 'stores/store-hash-123' } as BigCommerceJwtPayload;
    expect(extractStoreHash(payload)).toBe('store-hash-123');
  });
});

describe('encodeSessionContext / decodeSessionContext', () => {
  it('round-trips session context', () => {
    const ctx = { storeHash: 'abc123', userId: 42, userEmail: 'staff@example.com' };
    const encoded = encodeSessionContext(ctx);
    const decoded = decodeSessionContext(encoded);
    expect(decoded).toEqual(ctx);
  });

  it('encoded value is base64url (no +, /, =)', () => {
    const ctx = { storeHash: 'abc123', userId: 42, userEmail: 'staff@example.com' };
    const encoded = encodeSessionContext(ctx);
    expect(encoded).not.toMatch(/[+/=]/);
  });
});
