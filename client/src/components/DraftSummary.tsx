import { Box, Flex, FlexItem, Text, Badge, Table } from '@bigcommerce/big-design';
import { FileCopyIcon } from '@bigcommerce/big-design-icons';
import { useState } from 'react';
import type { DraftOrder } from '../types';

interface CartItem {
  name: string;
  sku: string;
  quantity: number;
  sale_price: number;
  extended_sale_price: number;
}

interface DraftSummaryProps {
  draft: DraftOrder;
  cart: Record<string, unknown>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.substring(0, 12) + '...';
  } catch {
    return url.substring(0, 30) + '...';
  }
}

export function DraftSummary({ draft, cart }: DraftSummaryProps) {
  const [copied, setCopied] = useState(false);

  const lineItems = cart.line_items as Record<string, unknown>;
  const physical = (lineItems?.physical_items as CartItem[]) || [];
  const digital = (lineItems?.digital_items as CartItem[]) || [];
  const items = [...physical, ...digital];
  const total = items.reduce((sum, i) => sum + (i.extended_sale_price || 0), 0);

  const customerName = draft.customer_name || 'Guest';
  const customerEmail = draft.customer_email || 'N/A';

  const handleCopy = () => {
    if (draft.checkout_url) {
      copyToClipboard(draft.checkout_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box marginBottom="medium">
      {/* Header */}
      <Flex justifyContent="space-between" alignItems="center">
        <FlexItem>
          <h2 style={{ margin: 0 }}>Order Details</h2>
        </FlexItem>
        <FlexItem>
          <Badge label={draft.status} variant={draft.status === 'open' ? 'warning' : draft.status === 'converted' ? 'success' : 'danger'} />
        </FlexItem>
      </Flex>

      {/* Meta */}
      <Box marginTop="small">
        <Flex flexGap="2rem" flexWrap="wrap" alignItems="flex-start">
          <FlexItem>
            <div className="scribe-meta-label">Customer</div>
            <div className="scribe-meta-value">{customerName}</div>
          </FlexItem>
          <FlexItem>
            <div className="scribe-meta-label">Email</div>
            <div className="scribe-meta-value">{customerEmail}</div>
          </FlexItem>
          <FlexItem>
            <div className="scribe-meta-label">Date</div>
            <div className="scribe-meta-value">{formatDate(draft.created_at)}</div>
          </FlexItem>
          {draft.checkout_url && (
            <FlexItem>
              <div className="scribe-meta-label">Checkout URL</div>
              <div className="scribe-meta-value">
                <a href={draft.checkout_url} target="_blank" rel="noopener noreferrer">
                  {truncateUrl(draft.checkout_url)}
                </a>
                <FileCopyIcon
                  className="scribe-copy-icon"
                  size="medium"
                  title={copied ? 'Copied!' : 'Copy checkout URL'}
                  onClick={handleCopy}
                />
              </div>
            </FlexItem>
          )}
          <FlexItem>
            <div className="scribe-meta-label">Total</div>
            <div className="scribe-meta-value" style={{ fontWeight: 600 }}>{formatCurrency(total)}</div>
          </FlexItem>
        </Flex>
      </Box>

      {/* Line items */}
      {items.length > 0 && (
        <Box style={{ marginTop: '2.5rem' }}>
          <Table
            columns={[
              {
                header: 'Product',
                hash: 'name',
                render: ({ name }: CartItem) => <Text marginBottom="none">{name}</Text>,
              },
              {
                header: 'SKU',
                hash: 'sku',
                render: ({ sku }: CartItem) => (
                  sku
                    ? <span className="scribe-sku-badge">{sku}</span>
                    : <Text marginBottom="none">—</Text>
                ),
              },
              {
                header: 'Qty',
                hash: 'quantity',
                render: ({ quantity }: CartItem) => <Text marginBottom="none">{quantity}</Text>,
              },
              {
                header: 'Price',
                hash: 'sale_price',
                render: ({ sale_price }: CartItem) => (
                  <Text marginBottom="none">{formatCurrency(sale_price)}</Text>
                ),
              },
              {
                header: 'Total',
                hash: 'extended_sale_price',
                render: ({ extended_sale_price }: CartItem) => (
                  <Text marginBottom="none">{formatCurrency(extended_sale_price)}</Text>
                ),
              },
            ]}
            items={items}
            stickyHeader
          />
        </Box>
      )}

    </Box>
  );
}
