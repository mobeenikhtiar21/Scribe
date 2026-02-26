import { Router, Request, Response } from 'express';
import { BigCommerceClient } from '../services/bigcommerce';

export const ordersRouter = Router();

/**
 * GET / - List orders from BigCommerce (optional status_id filter)
 */
ordersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const params: { status_id?: number; limit?: number; page?: number } = {};
    if (req.query.status_id !== undefined) {
      params.status_id = parseInt(String(req.query.status_id), 10);
    }
    if (req.query.limit) {
      params.limit = parseInt(String(req.query.limit), 10);
    }
    if (req.query.page) {
      params.page = parseInt(String(req.query.page), 10);
    }

    const orders = await bc.listOrders(params);
    res.json(Array.isArray(orders) ? orders : []);
  } catch (err) {
    console.error('List orders error:', err);
    // BC returns 204 with empty body when no orders match — handle gracefully
    res.json([]);
  }
});

/**
 * GET /:id - Fetch order details from BigCommerce
 */
ordersRouter.get('/:id', async (req: Request, res: Response) => {
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

    const [order, products] = await Promise.all([
      bc.getOrder(orderId),
      bc.getOrderProducts(orderId),
    ]);

    res.json({ ...order, products });
  } catch (err) {
    console.error('Fetch order error:', err);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});
