/**
 * HTML email templates for Scribe.
 * All emails share a common branded wrapper layout.
 */

interface LineItem {
  name: string;
  sku: string;
  quantity: number;
  price_inc_tax: string;
  total_inc_tax?: string;
}

function $(amount: string | undefined): string {
  const num = parseFloat(amount || '0');
  return `$${num.toFixed(2)}`;
}

/**
 * Escape HTML to prevent XSS when inserting user-provided content.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert plain text line breaks to <br> tags (after escaping).
 */
function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

/**
 * Base email layout wrapper.
 */
function baseLayout(storeName: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(storeName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#2B3648;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(storeName)}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Sent via Scribe on behalf of ${escapeHtml(storeName)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build a line items HTML table for order emails.
 */
function lineItemsTable(products: LineItem[]): string {
  if (!products || products.length === 0) return '';

  const rows = products
    .map((p) => {
      const lineTotal = p.total_inc_tax || String(parseFloat(p.price_inc_tax) * p.quantity);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;">${escapeHtml(p.name)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:center;">${p.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;">${$(p.price_inc_tax)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;">${$(lineTotal)}</td>
        </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:16px 0;">
      <tr style="background-color:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Item</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Price</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Total</th>
      </tr>
      ${rows}
    </table>`;
}

// ── Public Templates ─────────────────────────────────────────────────

export interface OrderEmailData {
  storeName: string;
  orderId: number;
  customerFirstName: string;
  totalIncTax: string;
  subtotalIncTax?: string;
  shippingCostIncTax?: string;
  discountAmount?: string;
  products: LineItem[];
  checkoutUrl?: string;
}

/**
 * "Send Order" email — full order details sent to the customer.
 */
export function buildOrderEmail(data: OrderEmailData): string {
  const greeting = `<p style="font-size:16px;color:#1f2937;margin:0 0 16px;">
    Hello ${escapeHtml(data.customerFirstName || 'Customer')},
  </p>`;

  const intro = `<p style="font-size:14px;color:#4b5563;margin:0 0 20px;">
    Here are the details of your order <strong>#${data.orderId}</strong>.
  </p>`;

  const items = lineItemsTable(data.products);

  // Totals summary
  let totals = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">';
  if (data.subtotalIncTax) {
    totals += `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Subtotal</td><td style="padding:4px 0;font-size:14px;color:#1f2937;text-align:right;">${$(data.subtotalIncTax)}</td></tr>`;
  }
  if (data.shippingCostIncTax && parseFloat(data.shippingCostIncTax) > 0) {
    totals += `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Shipping</td><td style="padding:4px 0;font-size:14px;color:#1f2937;text-align:right;">${$(data.shippingCostIncTax)}</td></tr>`;
  }
  if (data.discountAmount && parseFloat(data.discountAmount) > 0) {
    totals += `<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Discount</td><td style="padding:4px 0;font-size:14px;color:#1f2937;text-align:right;">-${$(data.discountAmount)}</td></tr>`;
  }
  totals += `<tr><td style="padding:8px 0 0;font-size:16px;color:#1f2937;font-weight:700;border-top:2px solid #3C64F4;">Total</td><td style="padding:8px 0 0;font-size:16px;color:#1f2937;font-weight:700;text-align:right;border-top:2px solid #3C64F4;">${$(data.totalIncTax)}</td></tr>`;
  totals += '</table>';

  // CTA button (if checkout URL provided)
  let cta = '';
  if (data.checkoutUrl) {
    cta = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:8px 0 16px;">
            <a href="${escapeHtml(data.checkoutUrl)}" style="display:inline-block;background-color:#3C64F4;color:#ffffff;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">
              Complete Your Purchase
            </a>
          </td>
        </tr>
      </table>`;
  }

  const closing = `<p style="font-size:14px;color:#4b5563;margin:16px 0 0;">
    Thank you for your business!
  </p>`;

  return baseLayout(data.storeName, greeting + intro + items + totals + cta + closing);
}

export interface MessageEmailData {
  storeName: string;
  orderId: number;
  customerFirstName: string;
  subject: string;
  messageBody: string;
}

/**
 * "Message Customer" email — wraps a custom staff message in the branded template.
 * The message body is plain text (escaped and line-break converted).
 */
export function buildMessageEmail(data: MessageEmailData): string {
  const greeting = `<p style="font-size:16px;color:#1f2937;margin:0 0 16px;">
    Hello ${escapeHtml(data.customerFirstName || 'Customer')},
  </p>`;

  const reference = `<p style="font-size:12px;color:#9ca3af;margin:0 0 12px;">
    Regarding Order #${data.orderId}
  </p>`;

  const body = `<div style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 20px;padding:16px;background-color:#f9fafb;border-radius:6px;border-left:3px solid #3C64F4;">
    ${nl2br(data.messageBody)}
  </div>`;

  const closing = `<p style="font-size:14px;color:#4b5563;margin:0;">
    Regards,<br>
    <strong>${escapeHtml(data.storeName)} Team</strong>
  </p>`;

  return baseLayout(data.storeName, greeting + reference + body + closing);
}
