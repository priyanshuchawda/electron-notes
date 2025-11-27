import type { Note } from '@quick-notes/shared';

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NoteList({ notes, selectedId, onSelect }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="notes-list">
        <p style={{ padding: '20px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          No notes yet. Create one!
        </p>
      </div>
    );
  }

  return (
    <div className="notes-list">
      {notes.map((note) => (
        <div
          key={note.id}
          className={`note-item ${selectedId === note.id ? 'active' : ''}`}
          onClick={() => onSelect(note.id)}
        >
          <h3>{note.title || 'Untitled'}</h3>
          <p>{note.content.slice(0, 50) || 'No content'}</p>
          {note.tags.length > 0 && (
            <div className="note-tags">
              {note.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="tag"
                  style={{ background: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
