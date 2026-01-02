import React, { useState, useEffect } from 'react';
import { useStickyNotes } from '../../StickyNoteContext';
import { StickyNote } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  noteId: string;
}

export const StickyNoteWindow: React.FC<AppProps> = ({ noteId }) => {
    const { getNote, updateNoteContent } = useStickyNotes();
    
    const note = getNote(noteId);
    
    // Use local state for the textarea to avoid re-rendering on every keystroke
    const [text, setText] = useState(note?.content || '');
    
    // Update local state if the note prop changes (e.g., loaded from storage)
    useEffect(() => {
        if(note) {
            setText(note.content);
        }
    }, [note]);

    // Debounced update to the global context
    useEffect(() => {
        const handler = setTimeout(() => {
            if (note && text !== note.content) {
                updateNoteContent(noteId, text);
            }
        }, 500); // 500ms debounce time

        return () => {
            clearTimeout(handler);
        };
    }, [text, noteId, note, updateNoteContent]);


    if (!note) {
        return <div className="p-2 text-xs text-red-500">Note not found.</div>;
    }

    return (
        <textarea
            value={text}
            onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
            className="w-full h-full p-2 bg-transparent text-black resize-none focus:outline-none"
            style={{ fontFamily: "'Cutive Mono', monospace" }}
            placeholder="Your note here..."
        />
    );
};