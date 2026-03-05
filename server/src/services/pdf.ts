import PDFDocument from 'pdfkit';

interface Address {
  first_name: string;
  last_name: string;
  email?: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

interface LineItem {
  name: string;
  sku: string;
  quantity: number;
  price_inc_tax: string;
  total_inc_tax?: string;
}

export interface OrderPdfData {
  id: number | string;
  status: string;
  date_created: string;
  billing_address?: Address;
  shipping_addresses?: Address[];
  subtotal_inc_tax?: string;
  shipping_cost_inc_tax?: string;
  discount_amount?: string;
  total_inc_tax: string;
  products?: LineItem[];
  storeName?: string;
}

const COLORS = {
  primary: '#2B3648',
  secondary: '#6B7B8D',
  accent: '#3C64F4',
  border: '#D1D5DB',
  bg: '#F9FAFB',
  white: '#FFFFFF',
};

function $(amount: string | undefined): string {
  const num = parseFloat(amount || '0');
  return `$${num.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatAddress(addr: Address): string[] {
  const lines: string[] = [];
  lines.push(`${addr.first_name} ${addr.last_name}`);
  if (addr.street_1) lines.push(addr.street_1);
  if (addr.street_2) lines.push(addr.street_2);
  if (addr.city || addr.state || addr.zip) {
    const parts = [addr.city, addr.state].filter(Boolean).join(', ');
    lines.push(addr.zip ? `${parts} ${addr.zip}` : parts);
  }
  if (addr.country) lines.push(addr.country);
  if (addr.phone) lines.push(addr.phone);
  if (addr.email) lines.push(addr.email);
  return lines;
}

/**
 * Generate a professional PDF invoice for the given order.
 * Returns a Buffer containing the PDF.
 */
export function generateOrderPdf(order: OrderPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Header ───────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .fillColor(COLORS.primary)
      .text(order.storeName || 'Invoice', doc.page.margins.left, 50);

    doc
      .fontSize(10)
      .fillColor(COLORS.secondary)
      .text('INVOICE', doc.page.margins.left + pageWidth - 100, 50, {
        width: 100,
        align: 'right',
      });

    // Accent line under header
    doc
      .moveTo(doc.page.margins.left, 80)
      .lineTo(doc.page.margins.left + pageWidth, 80)
      .strokeColor(COLORS.accent)
      .lineWidth(2)
      .stroke();

    // ── Order Meta ───────────────────────────────────────────────────
    const metaY = 95;

    doc
      .fontSize(9)
      .fillColor(COLORS.secondary)
      .text('ORDER NUMBER', doc.page.margins.left, metaY);
    doc
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text(`#${order.id}`, doc.page.margins.left, metaY + 13);

    doc
      .fontSize(9)
      .fillColor(COLORS.secondary)
      .text('DATE', doc.page.margins.left + 150, metaY);
    doc
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text(formatDate(order.date_created), doc.page.margins.left + 150, metaY + 13);

    doc
      .fontSize(9)
      .fillColor(COLORS.secondary)
      .text('STATUS', doc.page.margins.left + 330, metaY);
    doc
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text(order.status, doc.page.margins.left + 330, metaY + 13);

    // ── Addresses ────────────────────────────────────────────────────
    const addrY = 140;

    if (order.billing_address) {
      doc
        .fontSize(9)
        .fillColor(COLORS.secondary)
        .text('BILL TO', doc.page.margins.left, addrY);

      const billingLines = formatAddress(order.billing_address);
      doc.fontSize(10).fillColor(COLORS.primary);
      billingLines.forEach((line, i) => {
        doc.text(line, doc.page.margins.left, addrY + 14 + i * 14);
      });
    }

    if (order.shipping_addresses && order.shipping_addresses.length > 0) {
      const shipAddr = order.shipping_addresses[0];
      doc
        .fontSize(9)
        .fillColor(COLORS.secondary)
        .text('SHIP TO', doc.page.margins.left + 250, addrY);

      const shippingLines = formatAddress(shipAddr);
      doc.fontSize(10).fillColor(COLORS.primary);
      shippingLines.forEach((line, i) => {
        doc.text(line, doc.page.margins.left + 250, addrY + 14 + i * 14);
      });
    }

    // ── Line Items Table ─────────────────────────────────────────────
    const tableTop = 250;
    const colX = {
      item: doc.page.margins.left,
      sku: doc.page.margins.left + 220,
      qty: doc.page.margins.left + 310,
      price: doc.page.margins.left + 370,
      total: doc.page.margins.left + pageWidth - 60,
    };

    // Table header background
    doc
      .rect(doc.page.margins.left, tableTop, pageWidth, 22)
      .fillColor(COLORS.primary)
      .fill();

    doc.fontSize(9).fillColor(COLORS.white);
    doc.text('ITEM', colX.item + 8, tableTop + 6);
    doc.text('SKU', colX.sku, tableTop + 6);
    doc.text('QTY', colX.qty, tableTop + 6, { width: 40, align: 'center' });
    doc.text('PRICE', colX.price, tableTop + 6, { width: 60, align: 'right' });
    doc.text('TOTAL', colX.total, tableTop + 6, { width: 60, align: 'right' });

    // Table rows
    let rowY = tableTop + 28;
    const products = order.products || [];

    products.forEach((item, index) => {
      const lineTotal = item.total_inc_tax || String(parseFloat(item.price_inc_tax) * item.quantity);

      // Alternating row background
      if (index % 2 === 0) {
        doc
          .rect(doc.page.margins.left, rowY - 4, pageWidth, 22)
          .fillColor(COLORS.bg)
          .fill();
      }

      doc.fontSize(10).fillColor(COLORS.primary);
      doc.text(item.name, colX.item + 8, rowY, { width: 200, lineBreak: false });
      doc.fontSize(9).fillColor(COLORS.secondary);
      doc.text(item.sku || '—', colX.sku, rowY, { width: 80, lineBreak: false });
      doc.text(String(item.quantity), colX.qty, rowY, { width: 40, align: 'center' });
      doc.text($(item.price_inc_tax), colX.price, rowY, { width: 60, align: 'right' });
      doc.fontSize(10).fillColor(COLORS.primary);
      doc.text($(lineTotal), colX.total, rowY, { width: 60, align: 'right' });

      rowY += 22;
    });

    // Table bottom border
    doc
      .moveTo(doc.page.margins.left, rowY)
      .lineTo(doc.page.margins.left + pageWidth, rowY)
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .stroke();

    // ── Totals ───────────────────────────────────────────────────────
    const totalsX = doc.page.margins.left + pageWidth - 180;
    let totalsY = rowY + 15;

    function totalRow(label: string, value: string, bold = false) {
      doc.fontSize(10).fillColor(COLORS.secondary).text(label, totalsX, totalsY, { width: 100 });
      doc
        .fontSize(bold ? 12 : 10)
        .fillColor(COLORS.primary)
        .text(value, totalsX + 100, totalsY, { width: 80, align: 'right' });
      totalsY += bold ? 22 : 18;
    }

    if (order.subtotal_inc_tax) {
      totalRow('Subtotal', $(order.subtotal_inc_tax));
    }
    if (order.shipping_cost_inc_tax && parseFloat(order.shipping_cost_inc_tax) > 0) {
      totalRow('Shipping', $(order.shipping_cost_inc_tax));
    }
    if (order.discount_amount && parseFloat(order.discount_amount) > 0) {
      totalRow('Discount', `-${$(order.discount_amount)}`);
    }

    // Total divider
    doc
      .moveTo(totalsX, totalsY)
      .lineTo(totalsX + 180, totalsY)
      .strokeColor(COLORS.accent)
      .lineWidth(1.5)
      .stroke();
    totalsY += 8;

    totalRow('Total', $(order.total_inc_tax), true);

    // ── Footer ───────────────────────────────────────────────────────
    const footerY = doc.page.height - doc.page.margins.bottom - 30;
    doc
      .fontSize(8)
      .fillColor(COLORS.secondary)
      .text(
        `Generated by Scribe  •  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        doc.page.margins.left,
        footerY,
        { width: pageWidth, align: 'center' }
      );

    doc.end();
  });
}
