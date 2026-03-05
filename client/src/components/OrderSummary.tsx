import { Box, Flex, FlexItem, Text, Small, Badge, Table } from '@bigcommerce/big-design';
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
          <h2 style={{ margin: 0 }}>Order #{order.id}</h2>
        </FlexItem>
        <FlexItem>
          <Badge label={order.status} variant={statusVariant(order.status)} />
        </FlexItem>
      </Flex>

      {/* Order meta */}
      <Box marginTop="small">
        <Flex flexGap="2rem" flexWrap="wrap">
          <FlexItem>
            <div className="scribe-meta-label">Customer</div>
            <div className="scribe-meta-value">{customerName}</div>
          </FlexItem>
          <FlexItem>
            <div className="scribe-meta-label">Email</div>
            <div className="scribe-meta-value">{order.billing_address?.email || 'N/A'}</div>
          </FlexItem>
          <FlexItem>
            <div className="scribe-meta-label">Date</div>
            <div className="scribe-meta-value">{formatDate(order.date_created)}</div>
          </FlexItem>
          <FlexItem>
            <div className="scribe-meta-label">Total</div>
            <div className="scribe-meta-value" style={{ fontWeight: 600 }}>{formatCurrency(order.total_inc_tax)}</div>
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
                    {sku && <Small color="secondary">{sku}</Small>}
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
    </Box>
  );
}
