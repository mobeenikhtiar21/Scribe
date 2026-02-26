import { useState } from 'react';
import { Box, Button, Text, InlineMessage, Modal } from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { Order } from '../types';

interface SendActionProps {
  orderId: string;
  order: Order;
}

export function SendAction({ orderId, order }: SendActionProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const customerEmail = order.billing_address?.email;

  async function handleSend() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.sendOrder(orderId);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send order');
    } finally {
      setLoading(false);
    }
  }

  if (!customerEmail) {
    return (
      <Box>
        <InlineMessage
          type="warning"
          messages={[{ text: 'No customer email address found on this order. Cannot send.' }]}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Text>
        Email this order to <strong>{customerEmail}</strong> with a link to complete their purchase.
      </Text>
      <Box marginTop="small">
        <Button isLoading={loading} onClick={() => setConfirmOpen(true)}>
          Send to Customer
        </Button>
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          header="Confirm Send"
          actions={[
            { text: 'Cancel', variant: 'subtle', onClick: () => setConfirmOpen(false) },
            {
              text: 'Send Email',
              onClick: () => {
                setConfirmOpen(false);
                handleSend();
              },
            },
          ]}
        >
          <Text>
            This will send an email to <strong>{customerEmail}</strong> with the full order details.
          </Text>
        </Modal>
      </Box>
      {success && (
        <InlineMessage
          type="success"
          messages={[{ text: `Order sent to ${customerEmail}.` }]}
          marginTop="small"
          onClose={() => setSuccess(false)}
        />
      )}
      {error && (
        <InlineMessage
          type="error"
          messages={[{ text: error }]}
          marginTop="small"
          onClose={() => setError(null)}
        />
      )}
    </Box>
  );
}
