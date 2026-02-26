import { describe, it, expect } from 'vitest';
import { generateOrderPdf, OrderPdfData } from '../pdf';

const baseOrder: OrderPdfData = {
  id: 1001,
  status: 'Pending',
  date_created: '2025-01-15T10:30:00Z',
  total_inc_tax: '125.00',
  subtotal_inc_tax: '110.00',
  shipping_cost_inc_tax: '15.00',
  discount_amount: '0.00',
  billing_address: {
    first_name: 'John',
    last_name: 'Doe',
    street_1: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'United States',
  },
  shipping_addresses: [
    {
      first_name: 'John',
      last_name: 'Doe',
      street_1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'United States',
    },
  ],
  products: [
    { name: 'Widget A', sku: 'WA-100', quantity: 2, price_inc_tax: '30.00', total_inc_tax: '60.00' },
    { name: 'Widget B', sku: 'WB-200', quantity: 1, price_inc_tax: '50.00', total_inc_tax: '50.00' },
  ],
  storeName: 'Test Store',
};

describe('generateOrderPdf', () => {
  it('returns a Buffer', async () => {
    const pdf = await generateOrderPdf(baseOrder);
    expect(Buffer.isBuffer(pdf)).toBe(true);
  });

  it('starts with PDF magic bytes (%PDF)', async () => {
    const pdf = await generateOrderPdf(baseOrder);
    const header = pdf.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('produces non-trivial output size', async () => {
    const pdf = await generateOrderPdf(baseOrder);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('handles order with no products', async () => {
    const order = { ...baseOrder, products: [] };
    const pdf = await generateOrderPdf(order);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('handles order with no addresses', async () => {
    const order = { ...baseOrder, billing_address: undefined, shipping_addresses: undefined };
    const pdf = await generateOrderPdf(order);
    expect(Buffer.isBuffer(pdf)).toBe(true);
  });
});
