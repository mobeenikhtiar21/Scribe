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
} from '@bigcommerce/big-design';
import { AddIcon, ArrowDownwardIcon } from '@bigcommerce/big-design-icons';
import { api } from '../api/client';
import type { DraftOrder } from '../types';
import { CreateDraftModal } from './CreateDraftModal';
import { ImportDraftModal } from './ImportDraftModal';

interface DraftOrdersListProps {
  onSelectOrder: (orderId: number) => void;
  onSelectDraft: (draft: DraftOrder) => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'converted') return 'success';
  if (status === 'expired') return 'danger';
  return 'warning';
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

export function DraftOrdersList({ onSelectDraft }: DraftOrdersListProps) {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
            Draft Orders — click a row to open Print, Send, Message, and Notes actions.
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
                header: 'Draft',
                hash: 'cart_id',
                render: (draft: DraftOrder) => (
                  <Text marginBottom="none">
                    <Button variant="subtle" onClick={() => onSelectDraft(draft)}>
                      {draft.cart_id.substring(0, 8)}...
                    </Button>
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
                header: 'Email',
                hash: 'email',
                render: ({ customer_email }: DraftOrder) => (
                  <Text marginBottom="none">{customer_email || 'N/A'}</Text>
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
