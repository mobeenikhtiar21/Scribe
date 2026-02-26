import { Router, Request, Response } from 'express';
import { BigCommerceClient } from '../services/bigcommerce';
import { generateOrderPdf, OrderPdfData } from '../services/pdf';
import { getDb } from '../db';

export const printRouter = Router();

/**
 * POST /:id/print - Generate and return a branded PDF for the order
 */
printRouter.post('/:id/print', async (req: Request, res: Response) => {
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

    const [order, products, shippingAddresses, storeInfo] = await Promise.all([
      bc.getOrder(orderId),
      bc.getOrderProducts(orderId),
      bc.getOrderShippingAddresses(orderId).catch(() => []),
      bc.getStoreInfo().catch(() => ({} as Record<string, unknown>)),
    ]);

    const pdfData: OrderPdfData = {
      id: order.id as number,
      status: order.status as string,
      date_created: order.date_created as string,
      billing_address: order.billing_address as OrderPdfData['billing_address'],
      shipping_addresses: shippingAddresses as OrderPdfData['shipping_addresses'],
      subtotal_inc_tax: order.subtotal_inc_tax as string,
      shipping_cost_inc_tax: order.shipping_cost_inc_tax as string,
      discount_amount: order.discount_amount as string,
      total_inc_tax: order.total_inc_tax as string,
      products: products as unknown as OrderPdfData['products'],
      storeName: (storeInfo.name as string) || undefined,
    };

    const pdf = await generateOrderPdf(pdfData);

    // Audit log
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (store_hash, order_id, action, actor, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeHash, orderId, 'print', req.userEmail || 'unknown', 'PDF generated');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="order-${orderId}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Print error:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});
