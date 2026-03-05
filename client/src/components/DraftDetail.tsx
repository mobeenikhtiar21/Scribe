import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Panel,
  Table,
  Button,
  Input,
  Small,
  Badge,
  ProgressCircle,
  Message,
  H2,
} from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { DraftOrder } from '../types';

interface CartItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  sale_price: number;
  extended_sale_price: number;
  image_url?: string;
}

interface DraftDetailProps {
  draft: DraftOrder;
  onBack: () => void;
  onDeleted: () => void;
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

export function DraftDetail({ draft, onBack, onDeleted }: DraftDetailProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getDraft(draft.cart_id)
      .then((data) => {
        const cart = data.cart as Record<string, unknown>;
        const lineItems = cart.line_items as Record<string, unknown>;
        const physical = (lineItems?.physical_items as CartItem[]) || [];
        const digital = (lineItems?.digital_items as CartItem[]) || [];
        setItems([...physical, ...digital]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [draft.cart_id]);

  const handleCopy = () => {
    if (draft.checkout_url) {
      copyToClipboard(draft.checkout_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteDraft(draft.cart_id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Button variant="subtle" onClick={onBack} marginBottom="medium">
        ← Back to Draft Orders
      </Button>

      <Panel>
        <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
          <H2 marginBottom="none">Draft Order</H2>
          <Badge label={draft.status} variant={draft.status === 'open' ? 'warning' : draft.status === 'converted' ? 'success' : 'danger'} />
        </Flex>

        {/* Draft Info */}
        <Box marginBottom="medium">
          <Flex flexGap="2rem" flexWrap="wrap">
            <Box>
              <Small>Cart ID</Small>
              <Text marginBottom="none">{draft.cart_id}</Text>
            </Box>
            <Box>
              <Small>Customer</Small>
              <Text marginBottom="none">{draft.customer_name || draft.customer_email || 'Guest'}</Text>
            </Box>
            {draft.customer_email && (
              <Box>
                <Small>Email</Small>
                <Text marginBottom="none">{draft.customer_email}</Text>
              </Box>
            )}
            <Box>
              <Small>Total</Small>
              <Text bold marginBottom="none">
                {draft.total ? `${draft.currency_code || '$'}${parseFloat(draft.total).toFixed(2)}` : '—'}
              </Text>
            </Box>
          </Flex>
        </Box>

        {/* Checkout URL */}
        {draft.checkout_url && (
          <Box marginBottom="medium">
            <Small>Checkout URL — share this with the customer to complete their purchase</Small>
            <Flex flexGap="0.5rem" alignItems="center" marginTop="xxSmall">
              <Box style={{ flex: 1 }}>
                <Input
                  value={draft.checkout_url}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </Box>
              <Button onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
            </Flex>
          </Box>
        )}

        {/* Cart Items */}
        {error && <Message type="error" messages={[{ text: error }]} marginBottom="medium" />}

        {loading ? (
          <Flex justifyContent="center" padding="medium">
            <ProgressCircle size="medium" />
          </Flex>
        ) : items.length > 0 ? (
          <>
            <Small>Line Items</Small>
            <Table
              columns={[
                {
                  header: 'Product',
                  hash: 'name',
                  render: (item: CartItem) => <Text marginBottom="none">{item.name}</Text>,
                },
                {
                  header: 'SKU',
                  hash: 'sku',
                  render: (item: CartItem) => <Text marginBottom="none">{item.sku || '—'}</Text>,
                },
                {
                  header: 'Qty',
                  hash: 'quantity',
                  render: (item: CartItem) => <Text marginBottom="none">{item.quantity}</Text>,
                },
                {
                  header: 'Price',
                  hash: 'sale_price',
                  render: (item: CartItem) => <Text marginBottom="none">${item.sale_price?.toFixed(2)}</Text>,
                },
                {
                  header: 'Subtotal',
                  hash: 'extended_sale_price',
                  render: (item: CartItem) => (
                    <Text bold marginBottom="none">${item.extended_sale_price?.toFixed(2)}</Text>
                  ),
                },
              ]}
              items={items}
            />
          </>
        ) : (
          !error && <Message type="info" messages={[{ text: 'No items in this cart.' }]} />
        )}

        {/* Actions */}
        <Flex justifyContent="flex-end" marginTop="medium" flexGap="0.5rem">
          <Button
            variant="secondary"
            onClick={handleDelete}
            isLoading={deleting}
          >
            Delete Draft
          </Button>
          {draft.checkout_url && (
            <Button onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Checkout URL'}
            </Button>
          )}
        </Flex>
      </Panel>
    </Box>
  );
}
