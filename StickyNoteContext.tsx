import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { StickyNote, StickyNoteContextType } from './types';

const STICKY_NOTES_STORAGE_KEY = 'retro_os_sticky_notes';

const StickyNoteContext = createContext<StickyNoteContextType | undefined>(undefined);

export const useStickyNotes = (): StickyNoteContextType => {
    const context = useContext(StickyNoteContext);
    if (!context) {
        throw new Error('useStickyNotes must be used within a StickyNoteProvider');
    }
    return context;
};

export const StickyNoteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notes, setNotes] = useState<StickyNote[]>(() => {
        try {
            const state = localStorage.getItem(STICKY_NOTES_STORAGE_KEY);
            return state ? JSON.parse(state) : [];
        } catch { return []; }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STICKY_NOTES_STORAGE_KEY, JSON.stringify(notes));
        } catch (e) {
            console.error("Error saving sticky notes state:", e);
        }
    }, [notes]);

    const getNote = useCallback((id: string) => {
        return notes.find(n => n.id === id);
    }, [notes]);

    const addNote = useCallback(() => {
        const newNote: StickyNote = {
            id: `note-${Date.now()}`,
            content: '',
            color: '#FFF9C4',
        };
        setNotes(prev => [...prev, newNote]);
        return newNote;
    }, []);

    const updateNoteContent = useCallback((id: string, content: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
    }, []);

    const deleteNote = useCallback((id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    }, []);

    const value: StickyNoteContextType = {
        notes,
        getNote,
        addNote,
        updateNoteContent,
        deleteNote,
    };

    return <StickyNoteContext.Provider value={value}>{children}</StickyNoteContext.Provider>;
};
