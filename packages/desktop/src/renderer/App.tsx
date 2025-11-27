import { useState, useMemo } from 'react';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import {
  useNotes,
  useNote,
  useCreateNote,
  useTags,
  useCreateTag,
} from './hooks/useNotes';

export function App() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notesData, isLoading: notesLoading } = useNotes(searchQuery || undefined);
  const { data: selectedNote } = useNote(selectedNoteId);
  const { data: tags = [] } = useTags();

  const createNote = useCreateNote();
  const createTag = useCreateTag();

  const notes = useMemo(() => notesData?.items ?? [], [notesData]);

  const handleCreateNote = () => {
    createNote.mutate(
      { title: 'New Note', content: '' },
      {
        onSuccess: (note) => setSelectedNoteId(note.id),
      }
    );
  };

  const handleCreateTag = () => {
    const name = prompt('Tag name:');
    if (!name) return;

    const colors = ['#e94560', '#4ade80', '#60a5fa', '#f59e0b', '#a855f7'];
    const color = colors[Math.floor(Math.random() * colors.length)] ?? '#e94560';

    createTag.mutate({ name, color });
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>📝 Quick Notes</h1>
          <input
            type="text"
            className="search-input"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {notesLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <NoteList
            notes={notes}
            selectedId={selectedNoteId}
            onSelect={setSelectedNoteId}
          />
        )}

        <div style={{ padding: '15px', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '10px' }}
            onClick={handleCreateNote}
          >
            + New Note
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={handleCreateTag}
          >
            + New Tag
          </button>
        </div>
      </div>

      {selectedNote ? (
        <NoteEditor
          note={selectedNote}
          tags={tags}
          onClose={() => setSelectedNoteId(null)}
        />
      ) : (
        <div className="main-content">
          <div className="empty-state">
            <h2>Select a note or create a new one</h2>
            <p>Your notes will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}
