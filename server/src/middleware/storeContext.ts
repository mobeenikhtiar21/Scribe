import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { decodeSessionContext } from '../services/jwt';

// Extend Express Request to include store context
declare global {
  namespace Express {
    interface Request {
      storeHash?: string;
      accessToken?: string;
      userId?: number;
      userEmail?: string;
    }
  }
}

/**
 * Middleware that extracts the store context from the request.
 *
 * The React frontend passes the encoded session context (from /auth/load)
 * as a query param `context` or header `x-store-context` with every API call.
 *
 * Fallback: `store_hash` query param or `x-store-hash` header (dev mode).
 */
export function storeContext(req: Request, res: Response, next: NextFunction): void {
  let storeHash: string | undefined;
  let userId: number | undefined;
  let userEmail: string | undefined;

  // Try encoded session context first (production flow)
  const encodedContext =
    (req.query.context as string) ||
    (req.headers['x-store-context'] as string);

  if (encodedContext) {
    try {
      const session = decodeSessionContext(encodedContext);
      storeHash = session.storeHash;
      userId = session.userId;
      userEmail = session.userEmail;
    } catch {
      // Fall through to other methods
    }
  }

  // Fallback: direct store_hash param or header (dev mode)
  if (!storeHash) {
    storeHash =
      (req.query.store_hash as string) ||
      (req.headers['x-store-hash'] as string);
  }

  if (!storeHash) {
    res.status(401).json({ message: 'Missing store context' });
    return;
  }

  const db = getDb();
  const store = db
    .prepare('SELECT store_hash, access_token FROM stores WHERE store_hash = ?')
    .get(storeHash) as { store_hash: string; access_token: string } | undefined;

  if (!store) {
    res.status(401).json({ message: 'Store not found. Is the app installed?' });
    return;
  }

  req.storeHash = store.store_hash;
  req.accessToken = store.access_token;
  req.userId = userId;
  req.userEmail = userEmail;
  next();
}
