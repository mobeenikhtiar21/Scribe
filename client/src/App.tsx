import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Panel,
  Message,
  ProgressCircle,
} from '@bigcommerce/big-design';
import { api } from './api/client';
import { ActionBar } from './components/ActionBar';
import { OrderSummary } from './components/OrderSummary';
import { PrintAction } from './components/PrintAction';
import { SendAction } from './components/SendAction';
import { MessageAction } from './components/MessageAction';
import { NotesAction } from './components/NotesAction';
import { DraftOrdersList } from './components/DraftOrdersList';
import { DraftSummary } from './components/DraftSummary';
import { DraftPrintAction } from './components/DraftPrintAction';
import { DraftSendAction } from './components/DraftSendAction';
import { DraftMessageAction } from './components/DraftMessageAction';
import { DraftNotesAction } from './components/DraftNotesAction';
import type { ActionView, Order, DraftOrder } from './types';

function App() {
  // Read params from URL (set by /auth/load redirect)
  const params = new URLSearchParams(window.location.search);
  const urlOrderId = params.get('order_id');
  const context = params.get('context');

  // Order mode (from side panel extension click)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(urlOrderId);
  const [order, setOrder] = useState<Order | null>(null);

  // Draft mode (from draft list click)
  const [selectedDraft, setSelectedDraft] = useState<DraftOrder | null>(null);
  const [draftCart, setDraftCart] = useState<Record<string, unknown> | null>(null);

  const [activeView, setActiveView] = useState<ActionView>('print');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback((orderId: string) => {
    setLoading(true);
    setError(null);
    api
      .getOrder(orderId)
      .then((data) => setOrder(data as unknown as Order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchDraft = useCallback((draft: DraftOrder) => {
    setLoading(true);
    setError(null);
    api
      .getDraft(draft.cart_id)
      .then((data) => {
        setDraftCart(data.cart);
        setSelectedDraft(draft);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrder(selectedOrderId);
    }
  }, [selectedOrderId, fetchOrder]);

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(String(orderId));
    setSelectedDraft(null);
    setDraftCart(null);
    setActiveView('print');
  };

  const handleSelectDraft = (draft: DraftOrder) => {
    setSelectedOrderId(null);
    setOrder(null);
    setActiveView('print');
    fetchDraft(draft);
  };

  const handleBackToList = () => {
    setSelectedOrderId(null);
    setSelectedDraft(null);
    setOrder(null);
    setDraftCart(null);
    setError(null);
  };

  // Loading spinner
  if (loading) {
    return (
      <Box padding="medium">
        <div className="scribe-loader-container">
          <ProgressCircle size="large" />
        </div>
      </Box>
    );
  }

  // No selection — show draft orders list
  if (!selectedOrderId && !selectedDraft) {
    if (!context) {
      return (
        <Box padding="medium">
          <h1>Scribe</h1>
          <Message
            type="warning"
            messages={[
              {
                text: 'No session context detected. Access this app through the BigCommerce admin (Apps → Scribe).',
              },
            ]}
          />
        </Box>
      );
    }
    return (
      <DraftOrdersList
        onSelectOrder={handleSelectOrder}
        onSelectDraft={handleSelectDraft}
      />
    );
  }

  // ── Draft Action Panel ──────────────────────────────────────────────
  if (selectedDraft && draftCart) {
    return (
      <Box padding="medium">
        <h1>Order Actions</h1>
        <button className="scribe-back-btn" onClick={handleBackToList}>
          ← All Drafts
        </button>
        <Panel>
          <DraftSummary draft={selectedDraft} cart={draftCart} />
        </Panel>

        <Box marginTop="medium">
          <Panel>
            <ActionBar
              activeView={activeView}
              onViewChange={setActiveView}
              orderId={selectedDraft.cart_id}
              isDraft
            />

            <Box marginTop="medium">
              {activeView === 'print' && <DraftPrintAction cartId={selectedDraft.cart_id} />}
              {activeView === 'send' && <DraftSendAction draft={selectedDraft} />}
              {activeView === 'message' && <DraftMessageAction draft={selectedDraft} />}
              {activeView === 'notes' && <DraftNotesAction cartId={selectedDraft.cart_id} />}
            </Box>
          </Panel>
        </Box>
      </Box>
    );
  }

  // ── Order Action Panel (from side panel extension) ──────────────────
  if (error || !order) {
    return (
      <Box padding="medium">
        <h1>Order Actions</h1>
        {!urlOrderId && (
          <button className="scribe-back-btn" onClick={handleBackToList}>
            ← All Drafts
          </button>
        )}
        <Message
          type="error"
          header="Failed to load order"
          messages={[{ text: error || 'Order not found.' }]}
          actions={[
            {
              text: 'Try Again',
              variant: 'secondary',
              onClick: () => fetchOrder(selectedOrderId!),
            },
          ]}
        />
      </Box>
    );
  }

  return (
    <Box padding="medium">
      <h1>Order Actions</h1>
      {!urlOrderId && (
        <button className="scribe-back-btn" onClick={handleBackToList}>
          ← All Drafts
        </button>
      )}
      <Panel>
        <OrderSummary order={order} />
      </Panel>

      <Box marginTop="medium">
        <Panel>
          <ActionBar
            activeView={activeView}
            onViewChange={setActiveView}
            orderId={selectedOrderId!}
          />

          <Box marginTop="medium">
            {activeView === 'print' && <PrintAction orderId={selectedOrderId!} />}
            {activeView === 'send' && <SendAction orderId={selectedOrderId!} order={order} />}
            {activeView === 'message' && <MessageAction orderId={selectedOrderId!} order={order} />}
            {activeView === 'notes' && <NotesAction orderId={selectedOrderId!} />}
          </Box>
        </Panel>
      </Box>
    </Box>
  );
}

export default App;
