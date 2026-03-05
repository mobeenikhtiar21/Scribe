import { Router, Request, Response } from 'express';
import { BigCommerceClient } from '../services/bigcommerce';
import { getDb } from '../db';
import { generateOrderPdf, OrderPdfData } from '../services/pdf';
import { sendEmail } from '../services/email';
import { buildOrderEmail, buildMessageEmail } from '../services/emailTemplates';

export const draftsRouter = Router();

/**
 * GET / - List all draft orders from our DB
 */
draftsRouter.get('/', (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(250, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const db = getDb();
    const { total: totalItems } = db
      .prepare('SELECT COUNT(*) as total FROM draft_orders WHERE store_hash = ?')
      .get(req.storeHash!) as { total: number };

    const drafts = db
      .prepare('SELECT * FROM draft_orders WHERE store_hash = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(req.storeHash!, limit, offset);

    res.json({ data: drafts, pagination: { page, limit, totalItems } });
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
    let customerName: string | null = null;
    const customerId = cart.customer_id as number | undefined;
    if (customerId) {
      try {
        const custResult = await bc.getCustomers({ 'email:like': customerEmail || undefined } as Record<string, string>);
        const customers = custResult?.data || [];
        const match = customers.find((c) => c.id === customerId) || customers[0];
        if (match) {
          customerName = `${(match.first_name as string) || ''} ${(match.last_name as string) || ''}`.trim() || null;
        }
      } catch {
        // Customer lookup failed — proceed without name
      }
    }

    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO draft_orders (store_hash, cart_id, customer_email, customer_name, checkout_url, total, currency_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.storeHash!, cartId, customerEmail, customerName, checkoutUrl, String(total), currencyCode);

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

// ── Draft Actions (Print, Send, Message, Notes) ──────────────────────

/** Helper: extract line items from a BC cart response into a common format */
function extractCartItems(cart: Record<string, unknown>) {
  const lineItems = cart.line_items as Record<string, unknown>;
  const physical = (lineItems?.physical_items as Record<string, unknown>[]) || [];
  const digital = (lineItems?.digital_items as Record<string, unknown>[]) || [];
  return [...physical, ...digital].map((item) => ({
    name: item.name as string,
    sku: (item.sku as string) || '',
    quantity: item.quantity as number,
    price_inc_tax: String(item.sale_price || 0),
    total_inc_tax: String(item.extended_sale_price || 0),
  }));
}

/**
 * POST /:cartId/print - Generate PDF for a draft order
 */
draftsRouter.post('/:cartId/print', async (req: Request, res: Response) => {
  try {
    const cartId = String(req.params.cartId);
    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const [cartResult, storeInfo] = await Promise.all([
      bc.getCart(cartId),
      bc.getStoreInfo().catch(() => ({} as Record<string, unknown>)),
    ]);
    const cart = cartResult.data;
    const items = extractCartItems(cart);
    const total = items.reduce((sum, i) => sum + parseFloat(i.total_inc_tax), 0);

    // Get customer info from our DB
    const db = getDb();
    const draft = db.prepare('SELECT * FROM draft_orders WHERE cart_id = ?').get(cartId) as Record<string, unknown> | undefined;

    const pdfData: OrderPdfData = {
      id: `DRAFT-${cartId.substring(0, 8)}`,
      status: 'Draft',
      date_created: (draft?.created_at as string) || new Date().toISOString(),
      billing_address: draft?.customer_name ? {
        first_name: (draft.customer_name as string).split(' ')[0] || '',
        last_name: (draft.customer_name as string).split(' ').slice(1).join(' ') || '',
        email: (draft.customer_email as string) || undefined,
      } : undefined,
      total_inc_tax: String(total),
      products: items,
      storeName: (storeInfo.name as string) || undefined,
    };

    const pdf = await generateOrderPdf(pdfData);

    // Audit log
    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeHash, 0, 'print_draft', req.userEmail || 'unknown', `PDF for draft ${cartId}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="draft-${cartId.substring(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Draft print error:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

/**
 * POST /:cartId/send - Email draft order details + checkout link to customer
 */
draftsRouter.post('/:cartId/send', async (req: Request, res: Response) => {
  try {
    const cartId = String(req.params.cartId);
    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const [cartResult, storeInfo] = await Promise.all([
      bc.getCart(cartId),
      bc.getStoreInfo().catch(() => ({} as Record<string, unknown>)),
    ]);
    const cart = cartResult.data;
    const items = extractCartItems(cart);
    const total = items.reduce((sum, i) => sum + parseFloat(i.total_inc_tax), 0);

    const db = getDb();
    const draft = db.prepare('SELECT * FROM draft_orders WHERE cart_id = ?').get(cartId) as Record<string, unknown> | undefined;
    const customerEmail = (cart.email as string) || (draft?.customer_email as string);

    if (!customerEmail) {
      res.status(400).json({ message: 'No customer email found on this draft' });
      return;
    }

    const storeName = (storeInfo.name as string) || 'Store';
    const redirectUrls = cart.redirect_urls as Record<string, string> | undefined;
    const checkoutUrl = redirectUrls?.checkout_url || (draft?.checkout_url as string) || undefined;
    const customerName = (draft?.customer_name as string) || '';

    const html = buildOrderEmail({
      storeName,
      orderId: `DRAFT-${cartId.substring(0, 8)}`,
      customerFirstName: customerName.split(' ')[0] || 'Customer',
      totalIncTax: String(total),
      products: items,
      checkoutUrl,
    });

    await sendEmail({
      to: customerEmail,
      subject: `Your Quote from ${storeName}`,
      html,
    });

    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeHash, 0, 'send_draft', req.userEmail || 'unknown', `Sent draft ${cartId} to ${customerEmail}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Draft send error:', err);
    res.status(500).json({ message: 'Failed to send draft' });
  }
});

/**
 * POST /:cartId/message - Send a custom message to the draft's customer
 */
draftsRouter.post('/:cartId/message', async (req: Request, res: Response) => {
  try {
    const cartId = String(req.params.cartId);
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!subject || !message) {
      res.status(400).json({ message: 'Subject and message are required' });
      return;
    }
    if (subject.length > 200) {
      res.status(400).json({ message: 'Subject must be under 200 characters' });
      return;
    }
    if (message.length > 5000) {
      res.status(400).json({ message: 'Message must be under 5000 characters' });
      return;
    }

    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const [cartResult, storeInfo] = await Promise.all([
      bc.getCart(cartId),
      bc.getStoreInfo().catch(() => ({} as Record<string, unknown>)),
    ]);
    const cart = cartResult.data;

    const db = getDb();
    const draft = db.prepare('SELECT * FROM draft_orders WHERE cart_id = ?').get(cartId) as Record<string, unknown> | undefined;
    const customerEmail = (cart.email as string) || (draft?.customer_email as string);

    if (!customerEmail) {
      res.status(400).json({ message: 'No customer email found on this draft' });
      return;
    }

    const storeName = (storeInfo.name as string) || 'Store';
    const customerName = (draft?.customer_name as string) || '';

    const html = buildMessageEmail({
      storeName,
      orderId: `DRAFT-${cartId.substring(0, 8)}`,
      customerFirstName: customerName.split(' ')[0] || 'Customer',
      subject,
      messageBody: message,
    });

    await sendEmail({ to: customerEmail, subject, html });

    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeHash, 0, 'message_draft', req.userEmail || 'unknown', `Message to ${customerEmail}: ${subject}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Draft message error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

/**
 * GET /:cartId/notes - Get notes for a draft
 */
draftsRouter.get('/:cartId/notes', (req: Request, res: Response) => {
  try {
    const cartId = String(req.params.cartId);
    const db = getDb();
    const notes = db
      .prepare('SELECT * FROM draft_notes WHERE store_hash = ? AND cart_id = ? ORDER BY created_at DESC')
      .all(req.storeHash, cartId);
    res.json({ notes });
  } catch (err) {
    console.error('Get draft notes error:', err);
    res.status(500).json({ message: 'Failed to get notes' });
  }
});

/**
 * POST /:cartId/notes - Add a note to a draft
 */
draftsRouter.post('/:cartId/notes', (req: Request, res: Response) => {
  try {
    const cartId = String(req.params.cartId);
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      res.status(400).json({ message: 'Note content is required' });
      return;
    }
    if (content.length > 2000) {
      res.status(400).json({ message: 'Note must be under 2000 characters' });
      return;
    }

    const author = req.userEmail || 'Staff';
    const db = getDb();
    const result = db
      .prepare('INSERT INTO draft_notes (store_hash, cart_id, author, content) VALUES (?, ?, ?, ?)')
      .run(req.storeHash, cartId, author, content);

    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeHash, 0, 'note_draft', author, `Note on draft ${cartId}`);

    const note = db.prepare('SELECT * FROM draft_notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(note);
  } catch (err) {
    console.error('Add draft note error:', err);
    res.status(500).json({ message: 'Failed to add note' });
  }
});
