import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  H1,
  Panel,
  Message,
  ProgressCircle,
  Button,
} from '@bigcommerce/big-design';
import { api } from './api/client';
import { ActionBar } from './components/ActionBar';
import { OrderSummary } from './components/OrderSummary';
import { PrintAction } from './components/PrintAction';
import { SendAction } from './components/SendAction';
import { MessageAction } from './components/MessageAction';
import { NotesAction } from './components/NotesAction';
import { DraftOrdersList } from './components/DraftOrdersList';
import type { ActionView, Order } from './types';

function App() {
  // Read params from URL (set by /auth/load redirect)
  const params = new URLSearchParams(window.location.search);
  const urlOrderId = params.get('order_id');
  const context = params.get('context');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(urlOrderId);
  const [order, setOrder] = useState<Order | null>(null);
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

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrder(selectedOrderId);
    }
  }, [selectedOrderId, fetchOrder]);

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(String(orderId));
    setActiveView('print');
  };

  const handleBackToList = () => {
    setSelectedOrderId(null);
    setOrder(null);
    setError(null);
  };

  // Loading spinner while fetching order detail
  if (loading) {
    return (
      <Box padding="medium">
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
          <ProgressCircle size="large" />
        </Flex>
      </Box>
    );
  }

  // No order selected — show draft orders list
  if (!selectedOrderId) {
    if (!context) {
      return (
        <Box padding="medium">
          <H1>Scribe</H1>
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
    return <DraftOrdersList onSelectOrder={handleSelectOrder} />;
  }

  // Error state with retry
  if (error || !order) {
    return (
      <Box padding="medium">
        <H1>Scribe Actions</H1>
        {!urlOrderId && (
          <Button variant="subtle" onClick={handleBackToList} marginBottom="medium">
            ← Back to Draft Orders
          </Button>
        )}
        <Message
          type="error"
          header="Failed to load order"
          messages={[{ text: error || 'Order not found.' }]}
          actions={[
            {
              text: 'Try Again',
              variant: 'secondary',
              onClick: () => fetchOrder(selectedOrderId),
            },
          ]}
        />
      </Box>
    );
  }

  // Order loaded — show action panel
  return (
    <Box padding="medium">
      <H1>Scribe Actions</H1>
      {!urlOrderId && (
        <Button variant="subtle" onClick={handleBackToList} marginBottom="medium">
          ← Back to Draft Orders
        </Button>
      )}
      <Panel>
        <OrderSummary order={order} />
        <ActionBar
          activeView={activeView}
          onViewChange={setActiveView}
          orderId={selectedOrderId}
        />

        <Box marginTop="medium">
          {activeView === 'print' && <PrintAction orderId={selectedOrderId} />}
          {activeView === 'send' && <SendAction orderId={selectedOrderId} order={order} />}
          {activeView === 'message' && <MessageAction orderId={selectedOrderId} order={order} />}
          {activeView === 'notes' && <NotesAction orderId={selectedOrderId} />}
        </Box>
      </Panel>
    </Box>
  );
}

export default App;
