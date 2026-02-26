import { Router, Request, Response } from 'express';
import { BigCommerceClient } from '../services/bigcommerce';
import { sendEmail } from '../services/email';
import { buildMessageEmail } from '../services/emailTemplates';
import { getDb } from '../db';

export const messageRouter = Router();

/**
 * POST /:id/message - Send a custom message to the customer.
 * The message body is treated as plain text (HTML is escaped).
 */
messageRouter.post('/:id/message', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(String(req.params.id), 10);
    if (isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid order ID' });
      return;
    }

    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!subject || !message) {
      res.status(400).json({ message: 'Subject and message are required' });
      return;
    }

    // Enforce reasonable limits
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

    const [order, storeInfo] = await Promise.all([
      bc.getOrder(orderId),
      bc.getStoreInfo().catch(() => ({} as Record<string, unknown>)),
    ]);

    const billingAddress = order.billing_address as {
      email?: string;
      first_name?: string;
    } | undefined;
    const customerEmail = billingAddress?.email;

    if (!customerEmail) {
      res.status(400).json({ message: 'No customer email found on this order' });
      return;
    }

    const storeName = (storeInfo.name as string) || 'Store';

    // Build email — messageBody is escaped inside the template builder
    const html = buildMessageEmail({
      storeName,
      orderId,
      customerFirstName: billingAddress?.first_name || 'Customer',
      subject,
      messageBody: message,
    });

    await sendEmail({
      to: customerEmail,
      subject,
      html,
    });

    // Audit log
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(
      req.storeHash,
      orderId,
      'message',
      req.userEmail || 'unknown',
      `Message to ${customerEmail}: ${subject}`
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Message error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});
