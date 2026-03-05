import { useState } from 'react';
import {
  Modal,
  Box,
  Text,
  Textarea,
  Flex,
  Message,
  ProgressCircle,
} from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { DraftOrder } from '../types';

interface ImportDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (draft: DraftOrder) => void;
}

export function ImportDraftModal({ isOpen, onClose, onImported }: ImportDraftModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const draft = await api.importDraft(url.trim());
      onImported(draft as unknown as DraftOrder);
      setUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header="Import Draft Order"
      actions={[
        { text: 'Cancel', variant: 'subtle', onClick: handleClose },
        {
          text: loading ? 'Importing...' : 'Import',
          onClick: handleImport,
          disabled: loading || !url.trim(),
        },
      ]}
    >
      <Box>
        <Text>
          Paste the checkout URL from a BigCommerce draft order. This is the URL from the admin
          panel that contains a <code>quoteToken</code> parameter.
        </Text>

        {error && (
          <Message
            type="error"
            messages={[{ text: error }]}
            marginBottom="medium"
          />
        )}

        <Textarea
          label="Draft Order URL"
          placeholder="https://store.mybigcommerce.com/cart.php?action=loadSavedQuote&quoteToken=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          rows={3}
        />

        {loading && (
          <Flex justifyContent="center" marginTop="medium">
            <ProgressCircle size="small" />
          </Flex>
        )}
      </Box>
    </Modal>
  );
}
