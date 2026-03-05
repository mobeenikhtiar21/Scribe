import { useState } from 'react';
import { Box, Button, Input, Textarea, Text, FormGroup, InlineMessage, Modal } from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { DraftOrder } from '../types';

interface DraftMessageActionProps {
  draft: DraftOrder;
}

export function DraftMessageAction({ draft }: DraftMessageActionProps) {
  const customerEmail = draft.customer_email || '';
  const [subject, setSubject] = useState('Regarding Your Quote');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function requestSend() {
    if (!message.trim()) {
      setError('Please enter a message.');
      return;
    }
    setConfirmOpen(true);
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.messageDraftCustomer(draft.cart_id, { subject, message });
      setSuccess(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  }

  if (!customerEmail) {
    return (
      <Box>
        <InlineMessage
          type="warning"
          messages={[{ text: 'No customer email address found on this draft. Cannot send a message.' }]}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Text>Send a direct message to the customer about this draft order.</Text>
      <Box marginTop="small">
        <FormGroup>
          <Input label="To" value={customerEmail} disabled readOnly />
        </FormGroup>
        <FormGroup>
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </FormGroup>
        <FormGroup>
          <Textarea
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Type your message to the customer..."
          />
        </FormGroup>
        <Button isLoading={loading} onClick={requestSend} disabled={!message.trim()}>
          Send Message
        </Button>
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          header="Confirm Send"
          actions={[
            { text: 'Cancel', variant: 'subtle', onClick: () => setConfirmOpen(false) },
            {
              text: 'Send Message',
              onClick: () => {
                setConfirmOpen(false);
                handleSend();
              },
            },
          ]}
        >
          <Text>
            This will send an email to <strong>{customerEmail}</strong> with the subject &quot;{subject}&quot;.
          </Text>
        </Modal>
      </Box>
      {success && (
        <InlineMessage
          type="success"
          messages={[{ text: `Message sent to ${customerEmail}.` }]}
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
