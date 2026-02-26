import { Router, Request, Response } from 'express';
import { BigCommerceClient } from '../services/bigcommerce';
import { sendEmail } from '../services/email';
import { buildOrderEmail } from '../services/emailTemplates';
import { getDb } from '../db';

export const sendRouter = Router();

/**
 * POST /:id/send - Email the full order to the customer.
 * Includes line items, totals, and a checkout link (if available).
 */
sendRouter.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(String(req.params.id), 10);
    if (isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid order ID' });
      return;
    }

    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const [order, products, storeInfo] = await Promise.all([
      bc.getOrder(orderId),
      bc.getOrderProducts(orderId),
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

    // Build the checkout/cart URL if store URL is available
    const storeUrl = (storeInfo.secure_url as string) || (storeInfo.domain as string) || '';
    const checkoutUrl = storeUrl
      ? `${storeUrl.replace(/\/$/, '')}/checkout`
      : undefined;

    const html = buildOrderEmail({
      storeName,
      orderId,
      customerFirstName: billingAddress?.first_name || 'Customer',
      totalIncTax: order.total_inc_tax as string,
      subtotalIncTax: order.subtotal_inc_tax as string | undefined,
      shippingCostIncTax: order.shipping_cost_inc_tax as string | undefined,
      discountAmount: order.discount_amount as string | undefined,
      products: products as unknown as {
        name: string;
        sku: string;
        quantity: number;
        price_inc_tax: string;
        total_inc_tax?: string;
      }[],
      checkoutUrl,
    });

    await sendEmail({
      to: customerEmail,
      subject: `Your Order #${orderId} from ${storeName}`,
      html,
    });

    // Audit log
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeHash, orderId, 'send', req.userEmail || 'unknown', `Sent to ${customerEmail}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ message: 'Failed to send order' });
  }
});
