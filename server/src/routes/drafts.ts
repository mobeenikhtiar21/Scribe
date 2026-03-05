import { Router, Request, Response } from 'express';
import { BigCommerceClient } from '../services/bigcommerce';
import { getDb } from '../db';

export const draftsRouter = Router();

/**
 * GET / - List all draft orders from our DB
 */
draftsRouter.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const drafts = db
      .prepare('SELECT * FROM draft_orders WHERE store_hash = ? ORDER BY created_at DESC')
      .all(req.storeHash!);
    res.json(drafts);
  } catch (err) {
    console.error('List drafts error:', err);
    res.status(500).json({ message: 'Failed to list draft orders' });
  }
});

/**
 * POST / - Create a draft order via Cart API + save to DB
 */
draftsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { line_items, customer_id, customer_email, customer_name } = req.body;
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      res.status(400).json({ message: 'line_items is required and must be a non-empty array' });
      return;
    }

    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const result = await bc.createCart(line_items, customer_id);
    const cart = result.data;
    const cartId = cart.id as string;
    const redirectUrls = cart.redirect_urls as Record<string, string> | undefined;
    const checkoutUrl = redirectUrls?.checkout_url || '';

    // Calculate total from line items in cart response
    const physicalItems = ((cart.line_items as Record<string, unknown>)?.physical_items as Record<string, unknown>[]) || [];
    const digitalItems = ((cart.line_items as Record<string, unknown>)?.digital_items as Record<string, unknown>[]) || [];
    const allItems = [...physicalItems, ...digitalItems];
    const total = allItems.reduce((sum, item) => sum + ((item.extended_sale_price as number) || 0), 0);
    const currencyCode = (cart.currency as Record<string, unknown>)?.code as string || '';

    const db = getDb();
    db.prepare(`
      INSERT INTO draft_orders (store_hash, cart_id, customer_email, customer_name, checkout_url, total, currency_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.storeHash!, cartId, customer_email || null, customer_name || null, checkoutUrl, String(total), currencyCode);

    const draft = db.prepare('SELECT * FROM draft_orders WHERE cart_id = ?').get(cartId);
    res.status(201).json(draft);
  } catch (err) {
    console.error('Create draft error:', err);
    res.status(500).json({ message: 'Failed to create draft order' });
  }
});

/**
 * POST /import - Import an existing draft by parsing the checkout URL JWT
 */
draftsRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'url is required' });
      return;
    }

    // Extract cart ID from the URL
    // Format: https://...cart.php?action=loadSavedQuote&quoteToken=<JWT>
    let cartId: string | null = null;

    try {
      const parsed = new URL(url);
      const quoteToken = parsed.searchParams.get('quoteToken');
      if (quoteToken) {
        // JWT is base64url encoded: header.payload.signature
        const parts = quoteToken.split('.');
        if (parts.length >= 2) {
          // Base64url decode the payload
          const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
          cartId = decoded?.domain?.cart?.id || decoded?.cart_id || null;
        }
      }
    } catch {
      // Try a simpler cartId extraction if URL parsing fails
    }

    if (!cartId) {
      res.status(400).json({ message: 'Could not extract cart ID from the provided URL. Ensure it contains a quoteToken parameter.' });
      return;
    }

    // Verify the cart exists in BigCommerce
    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const result = await bc.getCart(cartId);
    const cart = result.data;
    const redirectUrls = cart.redirect_urls as Record<string, string> | undefined;
    const checkoutUrl = redirectUrls?.checkout_url || url;

    const physicalItems = ((cart.line_items as Record<string, unknown>)?.physical_items as Record<string, unknown>[]) || [];
    const digitalItems = ((cart.line_items as Record<string, unknown>)?.digital_items as Record<string, unknown>[]) || [];
    const allItems = [...physicalItems, ...digitalItems];
    const total = allItems.reduce((sum, item) => sum + ((item.extended_sale_price as number) || 0), 0);
    const currencyCode = (cart.currency as Record<string, unknown>)?.code as string || '';

    // Extract customer info from cart if available
    const customerEmail = (cart.email as string) || null;

    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO draft_orders (store_hash, cart_id, customer_email, checkout_url, total, currency_code)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.storeHash!, cartId, customerEmail, checkoutUrl, String(total), currencyCode);

    const draft = db.prepare('SELECT * FROM draft_orders WHERE cart_id = ?').get(cartId);
    res.status(201).json(draft);
  } catch (err) {
    console.error('Import draft error:', err);
    res.status(500).json({ message: 'Failed to import draft order' });
  }
});

/**
 * GET /:cartId - Get single draft details from BC Cart API
 */
draftsRouter.get('/:cartId', async (req: Request, res: Response) => {
  try {
    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const cartId = String(req.params.cartId);
    const result = await bc.getCart(cartId);
    const db = getDb();
    const dbRecord = db.prepare('SELECT * FROM draft_orders WHERE cart_id = ?').get(cartId);

    res.json({ cart: result.data, draft: dbRecord || null });
  } catch (err) {
    console.error('Get draft error:', err);
    res.status(500).json({ message: 'Failed to fetch draft order' });
  }
});

/**
 * DELETE /:cartId - Delete draft from DB and optionally from BC
 */
draftsRouter.delete('/:cartId', async (req: Request, res: Response) => {
  try {
    const cartId = String(req.params.cartId);

    // Try to delete from BigCommerce (ignore errors — cart may already be gone)
    try {
      const bc = new BigCommerceClient({
        storeHash: req.storeHash!,
        accessToken: req.accessToken!,
      });
      await bc.deleteCart(cartId);
    } catch {
      // Cart may already be expired or converted
    }

    const db = getDb();
    db.prepare('DELETE FROM draft_orders WHERE cart_id = ? AND store_hash = ?').run(cartId, req.storeHash!);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete draft error:', err);
    res.status(500).json({ message: 'Failed to delete draft order' });
  }
});
