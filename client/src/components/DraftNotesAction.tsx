import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Textarea,
  Button,
  InlineMessage,
  HR,
} from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { Note } from '../types';

interface DraftNotesActionProps {
  cartId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DraftNotesAction({ cartId }: DraftNotesActionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(() => {
    api
      .getDraftNotes(cartId)
      .then((data) => setNotes(data.notes as unknown as Note[]))
      .catch((err) => setError(err.message));
  }, [cartId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  async function handleAdd() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.addDraftNote(cartId, { content: content.trim() });
      setContent('');
      fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Text>Internal notes for this draft order. Only visible to staff.</Text>

      <Box marginTop="small">
        <Textarea
          label="New Note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Add a note about this draft..."
        />
        <Button
          isLoading={loading}
          onClick={handleAdd}
          disabled={!content.trim()}
          marginTop="xSmall"
        >
          Add Note
        </Button>
      </Box>

      {error && (
        <InlineMessage
          type="error"
          messages={[{ text: error }]}
          marginTop="small"
          onClose={() => setError(null)}
        />
      )}

      {notes.length > 0 && (
        <Box marginTop="medium">
          <HR />
          {notes.map((note) => (
            <Box key={note.id} marginTop="small" padding="small" style={{ background: '#f9fafb', borderRadius: 4 }}>
              <Flex justifyContent="space-between">
                <Text bold marginBottom="none">{note.author}</Text>
                <Text color="secondary" marginBottom="none">{formatDate(note.created_at)}</Text>
              </Flex>
              <Text marginBottom="none" marginTop="xxSmall">{note.content}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
