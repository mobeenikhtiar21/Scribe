import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Panel,
  Table,
  Badge,
  ProgressCircle,
  Message,
  Button,
  OffsetPagination,
} from '@bigcommerce/big-design';
import { AddIcon, ArrowDownwardIcon, AssignmentIcon, DeleteIcon } from '@bigcommerce/big-design-icons';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  const loadDrafts = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .listDrafts({ page: currentPage, limit: itemsPerPage })
      .then((res) => {
        setDrafts(res.data as unknown as DraftOrder[]);
        setTotalItems(res.pagination.totalItems);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentPage, itemsPerPage]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  if (loading) {
    return (
      <Box padding="medium">
        <div className="scribe-loader-container">
          <ProgressCircle size="large" />
        </div>
      </Box>
    );
  }

  return (
    <Box padding="medium">
      <h1>Draft Orders</h1>
      <Text color="secondary" marginBottom="small">
        Select a draft order to print, send, message, or add notes.
      </Text>
      <Panel>
        <Flex justifyContent="flex-end" alignItems="center" marginBottom="small">
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
          <div className="scribe-empty-state">
            <AssignmentIcon size="xxxLarge" color="secondary60" />
            <h2 style={{ marginTop: '16px', marginBottom: '4px' }}>No Draft Orders Yet</h2>
            <Text color="secondary">
              Create a new draft order or import one from the BigCommerce admin to get started.
            </Text>
            <Button
              marginTop="small"
              iconLeft={<AddIcon />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First Draft
            </Button>
          </div>
        )}

        {drafts.length > 0 && (
          <>
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
                {
                  header: '',
                  hash: 'actions',
                  render: (draft: DraftOrder) => (
                    <Button
                      variant="subtle"
                      title="Delete draft"
                      iconOnly={<DeleteIcon color="danger" size="medium" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        api.deleteDraft(draft.cart_id).then(() => loadDrafts());
                      }}
                    />
                  ),
                },
              ]}
              items={drafts}
              stickyHeader
            />
            <OffsetPagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[10, 25, 50]}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(perPage) => {
                setItemsPerPage(perPage);
                setCurrentPage(1);
              }}
            />
          </>
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
