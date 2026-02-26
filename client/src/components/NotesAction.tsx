import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  FlexItem,
  Textarea,
  Text,
  FormGroup,
  HR,
  InlineMessage,
  Badge,
  ProgressCircle,
} from '@bigcommerce/big-design';
import { api } from '../api/client';
import type { Note } from '../types';

interface NotesActionProps {
  orderId: string;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotesAction({ orderId }: NotesActionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const data = await api.getNotes(orderId);
      setNotes(data.notes as unknown as Note[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.addNote(orderId, { content: newNote });
      setNewNote('');
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Flex justifyContent="center" padding="medium">
        <ProgressCircle size="medium" />
      </Flex>
    );
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

      {/* Add note form */}
      <Box marginBottom="medium">
        <FormGroup>
          <Textarea
            label="Add a note"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            placeholder="Add an internal note about this order..."
          />
        </FormGroup>
        <Button
          isLoading={submitting}
          onClick={handleAddNote}
          disabled={!newNote.trim()}
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

      {/* Notes list */}
      {notes.length === 0 ? (
        <Text color="secondary" marginTop="small">No notes yet for this order.</Text>
      ) : (
        notes.map((note) => (
          <Box
            key={note.id}
            marginTop="small"
            padding="small"
            style={{ background: '#f6f7fc', borderRadius: '4px', borderLeft: '3px solid #3c64f4' }}
          >
            <Flex justifyContent="space-between" alignItems="center">
              <FlexItem>
                <Text bold marginBottom="none">{note.author}</Text>
              </FlexItem>
              <FlexItem>
                <Text color="secondary" marginBottom="none">
                  <small>{formatTimestamp(note.created_at)}</small>
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
