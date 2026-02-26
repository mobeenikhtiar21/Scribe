import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { BigCommerceClient } from '../services/bigcommerce';
import {
  verifyBigCommerceJwt,
  extractStoreHash,
  encodeSessionContext,
} from '../services/jwt';

export const authRouter = Router();

const BC_LOGIN_URL = 'https://login.bigcommerce.com';
const CLIENT_ID = process.env.BC_CLIENT_ID || '';
const CLIENT_SECRET = process.env.BC_CLIENT_SECRET || '';
const APP_URL = process.env.BC_APP_URL || 'http://localhost:3000';

// The URL template registered with BigCommerce App Extensions.
// ${id} is replaced by BigCommerce with the actual order ID.
const EXTENSION_URL = '/orders/${id}/scribe';

/**
 * OAuth Install Callback
 * BigCommerce redirects here after a store owner clicks "Install".
 * We exchange the auth code for a permanent access token, then register App Extensions.
 */
authRouter.get('/install', async (req: Request, res: Response) => {
  try {
    const { code, scope, context } = req.query;

    if (!code || !scope || !context) {
      res.status(400).json({ message: 'Missing required OAuth parameters' });
      return;
    }

    // Exchange code for access token
    const tokenRes = await fetch(`${BC_LOGIN_URL}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        scope,
        context,
        grant_type: 'authorization_code',
        redirect_uri: `${APP_URL}/auth/install`,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('OAuth token exchange failed:', errBody);
      res.status(500).json({ message: 'Failed to exchange OAuth code' });
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      scope: string;
      context: string;
      user: { id: number; email: string };
    };

    const storeHash = (context as string).replace('stores/', '');

    // Upsert store in database
    const db = getDb();
    db.prepare(`
      INSERT INTO stores (store_hash, access_token, owner_email, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(store_hash) DO UPDATE SET
        access_token = excluded.access_token,
        owner_email = excluded.owner_email,
        updated_at = datetime('now')
    `).run(storeHash, tokenData.access_token, tokenData.user.email);

    console.log(`App installed on store: ${storeHash}`);

    // Register App Extension (side panel for orders)
    const bc = new BigCommerceClient({
      storeHash,
      accessToken: tokenData.access_token,
    });

    try {
      await bc.registerAppExtension('Scribe Actions', EXTENSION_URL);
      console.log(`App Extension registered for store: ${storeHash}`);
    } catch (extErr) {
      // Extension may already exist from a previous install — log but don't fail
      console.warn('App Extension registration warning:', extErr);
    }

    // Build session context and redirect to the app's landing page
    const sessionContext = encodeSessionContext({
      storeHash,
      userId: tokenData.user.id,
      userEmail: tokenData.user.email,
    });

    res.redirect(`${APP_URL}/panel?context=${sessionContext}`);
  } catch (err) {
    console.error('Install error:', err);
    res.status(500).json({ message: 'Installation failed' });
  }
});

/**
 * Load Callback
 * BigCommerce calls this when a user opens the app or clicks an App Extension.
 *
 * The signed_payload_jwt contains the resolved URL in its "url" claim.
 * For App Extensions: url = "/orders/1042/scribe" (with actual order ID)
 * For normal app load: url = "/"
 *
 * We verify the JWT, build a session context, and redirect to the React frontend.
 */
authRouter.get('/load', async (req: Request, res: Response) => {
  try {
    const signedPayload = req.query.signed_payload_jwt as string | undefined;

    if (!signedPayload) {
      // Dev mode: no JWT, show basic status
      res.json({ status: 'loaded', message: 'Scribe is installed. (dev mode - no JWT)' });
      return;
    }

    // Verify JWT signature
    const payload = verifyBigCommerceJwt(signedPayload);
    const storeHash = extractStoreHash(payload);

    // Verify store exists in our database
    const db = getDb();
    const store = db
      .prepare('SELECT store_hash FROM stores WHERE store_hash = ?')
      .get(storeHash) as { store_hash: string } | undefined;

    if (!store) {
      res.status(401).json({ message: 'Store not found. Please reinstall the app.' });
      return;
    }

    // Build session context for the frontend
    const sessionContext = encodeSessionContext({
      storeHash,
      userId: payload.user.id,
      userEmail: payload.user.email,
    });

    // The JWT's "url" field contains the resolved App Extension URL.
    // For an extension click: "/orders/1042/scribe"
    // For a normal app load: "/"
    const targetUrl = payload.url || '/';

    // Extract order ID from the resolved URL if this is an extension load
    const orderMatch = targetUrl.match(/^\/orders\/(\d+)\/scribe/);
    const orderId = orderMatch ? orderMatch[1] : null;

    // Redirect to the React panel with context
    if (orderId) {
      res.redirect(`${APP_URL}/panel?context=${sessionContext}&order_id=${orderId}`);
    } else {
      res.redirect(`${APP_URL}/panel?context=${sessionContext}`);
    }
  } catch (err) {
    console.error('Load error:', err);
    res.status(401).json({ message: 'Invalid or expired session. Please reload.' });
  }
});

/**
 * Uninstall Callback
 * BigCommerce calls this when the app is uninstalled from a store.
 * We clean up the store's data from our database.
 */
authRouter.get('/uninstall', async (req: Request, res: Response) => {
  try {
    const signedPayload = req.query.signed_payload_jwt as string | undefined;

    if (!signedPayload) {
      res.status(400).json({ message: 'Missing signed payload' });
      return;
    }

    const payload = verifyBigCommerceJwt(signedPayload);
    const storeHash = extractStoreHash(payload);

    // Remove store data
    const db = getDb();
    db.prepare('DELETE FROM notes WHERE store_hash = ?').run(storeHash);
    db.prepare('DELETE FROM audit_log WHERE store_hash = ?').run(storeHash);
    db.prepare('DELETE FROM stores WHERE store_hash = ?').run(storeHash);

    console.log(`App uninstalled from store: ${storeHash}`);

    res.status(200).json({ status: 'uninstalled' });
  } catch (err) {
    console.error('Uninstall error:', err);
    res.status(500).json({ message: 'Uninstall handler failed' });
  }
});

/**
 * Remove User Callback
 * BigCommerce calls this when a user is removed from the app.
 */
authRouter.get('/remove-user', async (req: Request, res: Response) => {
  try {
    const signedPayload = req.query.signed_payload_jwt as string | undefined;

    if (!signedPayload) {
      res.status(400).json({ message: 'Missing signed payload' });
      return;
    }

    const payload = verifyBigCommerceJwt(signedPayload);
    console.log(`User ${payload.user.email} removed from store ${extractStoreHash(payload)}`);

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Remove user error:', err);
    res.status(500).json({ message: 'Remove user handler failed' });
  }
});
