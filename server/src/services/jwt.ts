import jwt from 'jsonwebtoken';

const CLIENT_ID = process.env.BC_CLIENT_ID || '';
const CLIENT_SECRET = process.env.BC_CLIENT_SECRET || '';

/**
 * Decoded BigCommerce signed_payload_jwt payload.
 * Sent on /auth/load, /auth/uninstall, and /auth/remove-user callbacks.
 */
export interface BigCommerceJwtPayload {
  aud: string;          // App's Client ID
  iss: string;          // "bc"
  iat: number;
  nbf: number;
  exp: number;
  jti: string;
  sub: string;          // "stores/{store_hash}"
  user: {
    id: number;
    email: string;
    locale?: string;
  };
  owner: {
    id: number;
    email: string;
  };
  url: string;          // Resolved App Extension URL (e.g., "/orders/1042/scribe")
  channel_id: number | null;
}

/**
 * Verify a BigCommerce signed_payload_jwt.
 * Returns the decoded payload or throws if invalid.
 */
export function verifyBigCommerceJwt(token: string): BigCommerceJwtPayload {
  const decoded = jwt.verify(token, CLIENT_SECRET, {
    algorithms: ['HS256'],
    audience: CLIENT_ID,
    issuer: 'bc',
  });

  return decoded as BigCommerceJwtPayload;
}

/**
 * Extract the store_hash from the JWT "sub" claim.
 * sub format: "stores/{store_hash}"
 */
export function extractStoreHash(payload: BigCommerceJwtPayload): string {
  return payload.sub.replace('stores/', '');
}

/**
 * Session context passed to the React frontend via URL.
 * Encoded as base64 to keep URL clean.
 */
export interface SessionContext {
  storeHash: string;
  userId: number;
  userEmail: string;
}

/**
 * Encode session context as a base64 URL-safe string.
 */
export function encodeSessionContext(ctx: SessionContext): string {
  return Buffer.from(JSON.stringify(ctx)).toString('base64url');
}

/**
 * Decode session context from a base64 URL-safe string.
 */
export function decodeSessionContext(encoded: string): SessionContext {
  const json = Buffer.from(encoded, 'base64url').toString('utf-8');
  return JSON.parse(json) as SessionContext;
}
