import { useState, useEffect, useCallback } from 'react';
import type { Note, Tag } from '@quick-notes/shared';
import { useUpdateNote, useDeleteNote } from '../hooks/useNotes';

interface NoteEditorProps {
  note: Note;
  tags: Tag[];
  onClose: () => void;
}

export function NoteEditor({ note, tags, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    note.tags.map((t) => t.id)
  );
  const [isSynced, setIsSynced] = useState(true);

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // Reset state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSelectedTagIds(note.tags.map((t) => t.id));
    setIsSynced(true);
  }, [note.id, note.title, note.content, note.tags]);

  // Auto-save with debounce
  const save = useCallback(() => {
    if (title === note.title && content === note.content) {
      return;
    }
    
    setIsSynced(false);
    updateNote.mutate(
      {
        id: note.id,
        data: { title, content, tagIds: selectedTagIds },
      },
      {
        onSuccess: () => setIsSynced(true),
      }
    );
  }, [note.id, note.title, note.content, title, content, selectedTagIds, updateNote]);

  useEffect(() => {
    const timer = setTimeout(save, 1000);
    return () => clearTimeout(timer);
  }, [title, content, save]);

  const handleTagToggle = (tagId: string) => {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    
    setSelectedTagIds(newTagIds);
    setIsSynced(false);
    
    updateNote.mutate(
      {
        id: note.id,
        data: { tagIds: newTagIds },
      },
      {
        onSuccess: () => setIsSynced(true),
      }
    );
  };

  const handleDelete = () => {
    if (confirm('Delete this note?')) {
      deleteNote.mutate(note.id);
      onClose();
    }
  };

  return (
    <div className="main-content">
      <div className="editor-header">
        <div className={`sync-indicator ${isSynced ? 'synced' : ''}`}>
          <span className="sync-dot" />
          {isSynced ? 'Saved' : 'Saving...'}
        </div>
        <div className="editor-actions">
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      <div className="editor">
        <input
          type="text"
          className="title-input"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="tag-selector">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className={`tag-option ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
              style={{ background: tag.color }}
              onClick={() => handleTagToggle(tag.id)}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <textarea
          className="content-textarea"
          placeholder="Start writing..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
    </div>
  );
}
