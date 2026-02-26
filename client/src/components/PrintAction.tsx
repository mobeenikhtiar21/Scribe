import { useState } from 'react';
import { Box, Button, Text, InlineMessage } from '@bigcommerce/big-design';
import { api } from '../api/client';

interface PrintActionProps {
  orderId: string;
}

export function PrintAction({ orderId }: PrintActionProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrint() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const blob = await api.printOrder(orderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Text>Generate a branded PDF of this order for printing or sharing.</Text>
      <Box marginTop="small">
        <Button isLoading={loading} onClick={handlePrint}>
          Download PDF
        </Button>
      </Box>
      {success && (
        <InlineMessage
          type="success"
          messages={[{ text: 'PDF downloaded successfully.' }]}
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
