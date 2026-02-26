import { Box, Flex, FlexItem, H2, Text, Badge, HR, Table } from '@bigcommerce/big-design';
import type { Order, OrderProduct } from '../types';

interface OrderSummaryProps {
  order: Order;
}

/** Map order status strings to BigDesign badge variants */
function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'secondary' | 'primary' {
  const s = status.toLowerCase();
  if (s.includes('completed') || s.includes('shipped')) return 'success';
  if (s.includes('pending') || s.includes('awaiting')) return 'warning';
  if (s.includes('cancelled') || s.includes('declined') || s.includes('refund')) return 'danger';
  if (s.includes('draft')) return 'secondary';
  return 'primary';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return `$${num.toFixed(2)}`;
}

export function OrderSummary({ order }: OrderSummaryProps) {
  const customerName = order.billing_address
    ? `${order.billing_address.first_name} ${order.billing_address.last_name}`
    : 'Unknown Customer';

  const hasProducts = order.products && order.products.length > 0;

  return (
    <Box marginBottom="medium">
      {/* Header row: Order # + Status badge */}
      <Flex justifyContent="space-between" alignItems="center">
        <FlexItem>
          <H2 marginBottom="none">Order #{order.id}</H2>
        </FlexItem>
        <FlexItem>
          <Badge label={order.status} variant={statusVariant(order.status)} />
        </FlexItem>
      </Flex>

      {/* Order meta */}
      <Box marginTop="small">
        <Flex flexGap="1.5rem" flexWrap="wrap">
          <FlexItem>
            <Text color="secondary" marginBottom="none">Customer</Text>
            <Text marginBottom="none">{customerName}</Text>
          </FlexItem>
          <FlexItem>
            <Text color="secondary" marginBottom="none">Email</Text>
            <Text marginBottom="none">{order.billing_address?.email || 'N/A'}</Text>
          </FlexItem>
          <FlexItem>
            <Text color="secondary" marginBottom="none">Date</Text>
            <Text marginBottom="none">{formatDate(order.date_created)}</Text>
          </FlexItem>
          <FlexItem>
            <Text color="secondary" marginBottom="none">Total</Text>
            <Text bold marginBottom="none">{formatCurrency(order.total_inc_tax)}</Text>
          </FlexItem>
        </Flex>
      </Box>

      {/* Line items table */}
      {hasProducts && (
        <Box marginTop="medium">
          <Table
            columns={[
              {
                header: 'Product',
                hash: 'name',
                render: ({ name, sku }: OrderProduct) => (
                  <Box>
                    <Text marginBottom="none">{name}</Text>
                    {sku && <Text color="secondary" marginBottom="none"><small>{sku}</small></Text>}
                  </Box>
                ),
              },
              {
                header: 'Qty',
                hash: 'quantity',
                render: ({ quantity }: OrderProduct) => <Text marginBottom="none">{quantity}</Text>,
              },
              {
                header: 'Price',
                hash: 'price_inc_tax',
                render: ({ price_inc_tax }: OrderProduct) => (
                  <Text marginBottom="none">{formatCurrency(price_inc_tax)}</Text>
                ),
              },
              {
                header: 'Total',
                hash: 'total_inc_tax',
                render: ({ total_inc_tax, price_inc_tax, quantity }: OrderProduct) => (
                  <Text marginBottom="none">
                    {formatCurrency(total_inc_tax || String(parseFloat(price_inc_tax) * quantity))}
                  </Text>
                ),
              },
            ]}
            items={order.products}
            stickyHeader
          />
        </Box>
      )}

      <HR marginTop="medium" />
    </Box>
  );
}
