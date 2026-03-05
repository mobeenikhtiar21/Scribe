import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  FlexItem,
  Text,
  Small,
  Textarea,
  Button,
  FormGroup,
  InlineMessage,
  HR,
  Badge,
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
      <Flex justifyContent="space-between" alignItems="center" marginBottom="small">
        <FlexItem>
          <Text bold marginBottom="none">Internal Notes</Text>
        </FlexItem>
        <FlexItem>
          <Badge label={`${notes.length}`} variant="secondary" />
        </FlexItem>
      </Flex>

      <Box marginBottom="medium">
        <FormGroup>
          <Textarea
            label="Add a note"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Add an internal note about this draft..."
          />
        </FormGroup>
        <Button
          isLoading={loading}
          onClick={handleAdd}
          disabled={!content.trim()}
        >
          Add Note
        </Button>
      </Box>

      {error && (
        <InlineMessage
          type="error"
          messages={[{ text: error }]}
          marginBottom="small"
          onClose={() => setError(null)}
        />
      )}

      <HR />

      {notes.length === 0 ? (
        <Text color="secondary" marginTop="small">No notes yet for this draft.</Text>
      ) : (
        notes.map((note) => (
          <Box key={note.id} marginTop="small" padding="small" className="scribe-note-card">
            <Flex justifyContent="space-between" alignItems="center">
              <FlexItem>
                <Text bold marginBottom="none">{note.author}</Text>
              </FlexItem>
              <FlexItem>
                <Text color="secondary" marginBottom="none">
                  <Small>{formatDate(note.created_at)}</Small>
                </Text>
              </FlexItem>
            </Flex>
            <Text marginTop="xxSmall" marginBottom="none" style={{ whiteSpace: 'pre-wrap' }}>
              {note.content}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
