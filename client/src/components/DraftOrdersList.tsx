import { useState, useEffect, useCallback } from 'react';
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
  Small,
} from '@bigcommerce/big-design';
import { AddIcon, ArrowDownwardIcon } from '@bigcommerce/big-design-icons';
import { api } from '../api/client';
import type { DraftOrder } from '../types';
import { CreateDraftModal } from './CreateDraftModal';
import { ImportDraftModal } from './ImportDraftModal';

interface DraftOrdersListProps {
  onSelectOrder: (orderId: number) => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'secondary' | 'primary' {
  if (status === 'converted') return 'success';
  if (status === 'expired') return 'danger';
  return 'warning'; // open
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: string | null, currency: string | null): string {
  if (!amount) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return `${currency || '$'}${num.toFixed(2)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

export function DraftOrdersList({ onSelectOrder: _onSelectOrder }: DraftOrdersListProps) {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadDrafts = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .listDrafts()
      .then((data) => setDrafts(data as unknown as DraftOrder[]))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const handleDelete = async (cartId: string) => {
    try {
      await api.deleteDraft(cartId);
      setDrafts((prev) => prev.filter((d) => d.cart_id !== cartId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft');
    }
  };

  const handleCopy = (cartId: string, url: string) => {
    copyToClipboard(url);
    setCopiedId(cartId);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
            Draft Orders — create new drafts or import existing ones from BigCommerce admin.
          </Text>
          <Flex flexGap="0.5rem">
            <Button
              variant="secondary"
              iconLeft={<ArrowDownwardIcon />}
              onClick={() => setShowImportModal(true)}
            >
              Import Draft
            </Button>
            <Button
              iconLeft={<AddIcon />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Draft
            </Button>
          </Flex>
        </Flex>

        {error && (
          <Message
            type="error"
            header="Error"
            messages={[{ text: error }]}
            marginBottom="medium"
          />
        )}

        {!error && drafts.length === 0 && (
          <Message
            type="info"
            messages={[
              {
                text: 'No draft orders yet. Create a new draft or import one from the BigCommerce admin.',
              },
            ]}
          />
        )}

        {drafts.length > 0 && (
          <Table
            columns={[
              {
                header: 'Cart ID',
                hash: 'cart_id',
                render: ({ cart_id }: DraftOrder) => (
                  <Text marginBottom="none">
                    <Small>{cart_id.substring(0, 8)}...</Small>
                  </Text>
                ),
              },
              {
                header: 'Customer',
                hash: 'customer',
                render: ({ customer_name, customer_email }: DraftOrder) => (
                  <Text marginBottom="none">
                    {customer_name || customer_email || 'Guest'}
                  </Text>
                ),
              },
              {
                header: 'Total',
                hash: 'total',
                render: ({ total, currency_code }: DraftOrder) => (
                  <Text bold marginBottom="none">
                    {formatCurrency(total, currency_code)}
                  </Text>
                ),
              },
              {
                header: 'Date',
                hash: 'date',
                render: ({ created_at }: DraftOrder) => (
                  <Text marginBottom="none">{formatDate(created_at)}</Text>
                ),
              },
              {
                header: 'Status',
                hash: 'status',
                render: ({ status }: DraftOrder) => (
                  <Badge label={status} variant={statusVariant(status)} />
                ),
              },
              {
                header: 'Checkout URL',
                hash: 'checkout_url',
                render: ({ cart_id, checkout_url }: DraftOrder) =>
                  checkout_url ? (
                    <Button
                      variant="subtle"
                      onClick={() => handleCopy(cart_id, checkout_url)}
                    >
                      {copiedId === cart_id ? 'Copied!' : 'Copy URL'}
                    </Button>
                  ) : (
                    <Text marginBottom="none">—</Text>
                  ),
              },
              {
                header: '',
                hash: 'actions',
                render: ({ cart_id }: DraftOrder) => (
                  <Button
                    variant="subtle"
                    onClick={() => handleDelete(cart_id)}
                  >
                    Delete
                  </Button>
                ),
              },
            ]}
            items={drafts}
            stickyHeader
          />
        )}
      </Panel>

      <CreateDraftModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          loadDrafts();
        }}
      />

      <ImportDraftModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => {
          setShowImportModal(false);
          loadDrafts();
        }}
      />
    </Box>
  );
}
