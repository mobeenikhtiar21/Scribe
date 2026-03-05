import { Box, Flex, FlexItem, H2, Text, Badge, HR, Table, Input, Button } from '@bigcommerce/big-design';
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
          <H2 marginBottom="none">Draft Order</H2>
        </FlexItem>
        <FlexItem>
          <Badge label={draft.status} variant={draft.status === 'open' ? 'warning' : draft.status === 'converted' ? 'success' : 'danger'} />
        </FlexItem>
      </Flex>

      {/* Meta */}
      <Box marginTop="small">
        <Flex flexGap="1.5rem" flexWrap="wrap">
          <FlexItem>
            <Text color="secondary" marginBottom="none">Customer</Text>
            <Text marginBottom="none">{customerName}</Text>
          </FlexItem>
          <FlexItem>
            <Text color="secondary" marginBottom="none">Email</Text>
            <Text marginBottom="none">{customerEmail}</Text>
          </FlexItem>
          <FlexItem>
            <Text color="secondary" marginBottom="none">Date</Text>
            <Text marginBottom="none">{formatDate(draft.created_at)}</Text>
          </FlexItem>
          <FlexItem>
            <Text color="secondary" marginBottom="none">Total</Text>
            <Text bold marginBottom="none">{formatCurrency(total)}</Text>
          </FlexItem>
        </Flex>
      </Box>

      {/* Checkout URL */}
      {draft.checkout_url && (
        <Box marginTop="small">
          <Text color="secondary" marginBottom="none">Checkout URL</Text>
          <Flex flexGap="0.5rem" alignItems="center" marginTop="xxSmall">
            <Box style={{ flex: 1 }}>
              <Input
                value={draft.checkout_url}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </Box>
            <Button variant="secondary" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </Flex>
        </Box>
      )}

      {/* Line items */}
      {items.length > 0 && (
        <Box marginTop="medium">
          <Table
            columns={[
              {
                header: 'Product',
                hash: 'name',
                render: ({ name, sku }: CartItem) => (
                  <Box>
                    <Text marginBottom="none">{name}</Text>
                    {sku && <Text color="secondary" marginBottom="none"><small>{sku}</small></Text>}
                  </Box>
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

      <HR marginTop="medium" />
    </Box>
  );
}
