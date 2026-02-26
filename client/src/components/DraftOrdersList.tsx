import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  H1,
  Text,
  Panel,
  Table,
  Badge,
  ProgressCircle,
  Message,
  Button,
} from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { OrderListItem } from '../types';

interface DraftOrdersListProps {
  onSelectOrder: (orderId: number) => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'secondary' | 'primary' {
  const s = status.toLowerCase();
  if (s.includes('completed') || s.includes('shipped')) return 'success';
  if (s.includes('pending') || s.includes('awaiting')) return 'warning';
  if (s.includes('cancelled') || s.includes('declined') || s.includes('refund')) return 'danger';
  if (s.includes('incomplete')) return 'secondary';
  return 'primary';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return `${currency || '$'}${num.toFixed(2)}`;
}

export function DraftOrdersList({ onSelectOrder }: DraftOrdersListProps) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .listOrders({ status_id: 0, page: currentPage, limit: itemsPerPage })
      .then((data) => setOrders(data as unknown as OrderListItem[]))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentPage]);

  if (loading) {
    return (
      <Box padding="medium">
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
          <ProgressCircle size="large" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box padding="medium">
      <H1>Scribe</H1>
      <Panel>
        <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
          <Text marginBottom="none">
            Draft orders (Incomplete) — click a row to open Print, Send, Message, and Notes actions.
          </Text>
        </Flex>

        {error && (
          <Message
            type="error"
            header="Failed to load orders"
            messages={[{ text: error }]}
            marginBottom="medium"
          />
        )}

        {!error && orders.length === 0 && (
          <Message
            type="info"
            messages={[
              {
                text: 'No draft orders found. Draft orders appear here when created in your BigCommerce admin.',
              },
            ]}
          />
        )}

        {orders.length > 0 && (
          <Table
            columns={[
              {
                header: 'Order #',
                hash: 'id',
                render: ({ id }: OrderListItem) => (
                  <Text marginBottom="none">
                    <Button
                      variant="subtle"
                      onClick={() => onSelectOrder(id)}
                    >
                      #{id}
                    </Button>
                  </Text>
                ),
              },
              {
                header: 'Customer',
                hash: 'customer',
                render: ({ billing_address }: OrderListItem) => (
                  <Text marginBottom="none">
                    {billing_address
                      ? `${billing_address.first_name} ${billing_address.last_name}`
                      : 'N/A'}
                  </Text>
                ),
              },
              {
                header: 'Email',
                hash: 'email',
                render: ({ billing_address }: OrderListItem) => (
                  <Text marginBottom="none">{billing_address?.email || 'N/A'}</Text>
                ),
              },
              {
                header: 'Total',
                hash: 'total',
                render: ({ total_inc_tax, currency_code }: OrderListItem) => (
                  <Text bold marginBottom="none">
                    {formatCurrency(total_inc_tax, currency_code)}
                  </Text>
                ),
              },
              {
                header: 'Date',
                hash: 'date',
                render: ({ date_created }: OrderListItem) => (
                  <Text marginBottom="none">{formatDate(date_created)}</Text>
                ),
              },
              {
                header: 'Status',
                hash: 'status',
                render: ({ status }: OrderListItem) => (
                  <Badge label={status} variant={statusVariant(status)} />
                ),
              },
            ]}
            items={orders}
            stickyHeader
          />
        )}

        {(orders.length >= itemsPerPage || currentPage > 1) && (
          <Flex justifyContent="center" marginTop="medium" flexGap="0.5rem">
            <Button
              variant="secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Text marginBottom="none" style={{ alignSelf: 'center' }}>
              Page {currentPage}
            </Text>
            <Button
              variant="secondary"
              disabled={orders.length < itemsPerPage}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </Flex>
        )}
      </Panel>
    </Box>
  );
}
