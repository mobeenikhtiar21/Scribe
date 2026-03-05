import { Router, Request, Response } from 'express';
import { BigCommerceClient } from '../services/bigcommerce';

export const catalogRouter = Router();

/**
 * GET /products - Search products for draft creation form
 */
catalogRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const result = await bc.getProducts({
      keyword: req.query.keyword as string | undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
    });

    res.json(result.data || []);
  } catch (err) {
    console.error('Search products error:', err);
    res.json([]);
  }
});

/**
 * GET /customers - Search customers for draft creation form
 */
catalogRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const bc = new BigCommerceClient({
      storeHash: req.storeHash!,
      accessToken: req.accessToken!,
    });

    const params: Record<string, string | number> = { limit: 20 };
    const search = req.query.keyword as string | undefined;
    if (search) {
      // Search by name or email
      params['name:like'] = search;
    }

    const result = await bc.getCustomers(params as { 'name:like'?: string; limit?: number });
    res.json(result.data || []);
  } catch (err) {
    console.error('Search customers error:', err);
    res.json([]);
  }
});
