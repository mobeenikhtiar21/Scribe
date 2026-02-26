import { describe, it, expect } from 'vitest';
import { escapeHtml, buildOrderEmail, buildMessageEmail } from '../emailTemplates';

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles string with no special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('buildOrderEmail', () => {
  const baseData = {
    storeName: 'Test Store',
    orderId: 1001,
    customerFirstName: 'John',
    totalIncTax: '125.00',
    products: [
      { name: 'Widget', sku: 'W-1', quantity: 2, price_inc_tax: '50.00', total_inc_tax: '100.00' },
    ],
  };

  it('returns HTML containing store name', () => {
    const html = buildOrderEmail(baseData);
    expect(html).toContain('Test Store');
  });

  it('includes order ID', () => {
    const html = buildOrderEmail(baseData);
    expect(html).toContain('#1001');
  });

  it('greets customer by first name', () => {
    const html = buildOrderEmail(baseData);
    expect(html).toContain('Hello John');
  });

  it('defaults greeting to Customer when no first name', () => {
    const html = buildOrderEmail({ ...baseData, customerFirstName: '' });
    expect(html).toContain('Hello Customer');
  });

  it('includes product name', () => {
    const html = buildOrderEmail(baseData);
    expect(html).toContain('Widget');
  });

  it('includes total formatted as currency', () => {
    const html = buildOrderEmail(baseData);
    expect(html).toContain('$125.00');
  });

  it('includes checkout CTA when checkoutUrl provided', () => {
    const html = buildOrderEmail({ ...baseData, checkoutUrl: 'https://store.com/checkout' });
    expect(html).toContain('Complete Your Purchase');
    expect(html).toContain('https://store.com/checkout');
  });

  it('omits checkout CTA when no checkoutUrl', () => {
    const html = buildOrderEmail(baseData);
    expect(html).not.toContain('Complete Your Purchase');
  });

  it('includes subtotal when provided', () => {
    const html = buildOrderEmail({ ...baseData, subtotalIncTax: '110.00' });
    expect(html).toContain('Subtotal');
    expect(html).toContain('$110.00');
  });

  it('includes shipping when greater than zero', () => {
    const html = buildOrderEmail({ ...baseData, shippingCostIncTax: '15.00' });
    expect(html).toContain('Shipping');
    expect(html).toContain('$15.00');
  });

  it('omits shipping when zero', () => {
    const html = buildOrderEmail({ ...baseData, shippingCostIncTax: '0.00' });
    expect(html).not.toContain('Shipping');
  });

  it('escapes XSS in store name', () => {
    const html = buildOrderEmail({ ...baseData, storeName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('buildMessageEmail', () => {
  const baseData = {
    storeName: 'Test Store',
    orderId: 1001,
    customerFirstName: 'John',
    subject: 'Hello',
    messageBody: 'Your order is ready.',
  };

  it('returns HTML containing store name', () => {
    const html = buildMessageEmail(baseData);
    expect(html).toContain('Test Store');
  });

  it('includes order reference', () => {
    const html = buildMessageEmail(baseData);
    expect(html).toContain('Order #1001');
  });

  it('includes message body', () => {
    const html = buildMessageEmail(baseData);
    expect(html).toContain('Your order is ready.');
  });

  it('converts newlines to <br> tags', () => {
    const html = buildMessageEmail({ ...baseData, messageBody: 'Line 1\nLine 2' });
    expect(html).toContain('Line 1<br>Line 2');
  });

  it('escapes HTML in message body', () => {
    const html = buildMessageEmail({ ...baseData, messageBody: '<b>bold</b>' });
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('includes closing with store name', () => {
    const html = buildMessageEmail(baseData);
    expect(html).toContain('Test Store Team');
  });
});
