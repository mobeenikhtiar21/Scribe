import { useState } from 'react';
import { Box, Button, Text, InlineMessage, Modal } from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { DraftOrder } from '../types';

interface DraftSendActionProps {
  draft: DraftOrder;
}

export function DraftSendAction({ draft }: DraftSendActionProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const customerEmail = draft.customer_email;

  async function handleSend() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.sendDraft(draft.cart_id);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send draft');
    } finally {
      setLoading(false);
    }
  }

  if (!customerEmail) {
    return (
      <Box>
        <InlineMessage
          type="warning"
          messages={[{ text: 'No customer email found on this draft. Cannot send.' }]}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Text>
        Email this draft order to <strong>{customerEmail}</strong> with a checkout link to complete their purchase.
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
            This will send an email to <strong>{customerEmail}</strong> with the draft order details and a checkout link.
          </Text>
        </Modal>
      </Box>
      {success && (
        <InlineMessage
          type="success"
          messages={[{ text: `Draft sent to ${customerEmail}.` }]}
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
