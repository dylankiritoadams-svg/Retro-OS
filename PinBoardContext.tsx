import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { PinBoardState, PinBoardContextType, PinBoardDocumentNode, PinBoardNoteNode, AnyPinBoardNode } from './types';
import { useFileSystem } from './FileSystemContext';

const PINBOARD_STORAGE_KEY = 'retro_os_pinboard_state';

const PinBoardContext = createContext<PinBoardContextType | undefined>(undefined);

export const usePinBoard = (): PinBoardContextType => {
    const context = useContext(PinBoardContext);
    if (!context) {
        throw new Error('usePinBoard must be used within a PinBoardProvider');
    }
    return context;
};

const createInitialState = (): PinBoardState => ({
    nodes: [],
    viewport: { x: 0, y: 0, zoom: 1 },
});

export const PinBoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { getNode } = useFileSystem();

    const [pinBoardState, setPinBoardState] = useState<PinBoardState>(() => {
        try {
            const stored = localStorage.getItem(PINBOARD_STORAGE_KEY);
            return stored ? JSON.parse(stored) : createInitialState();
        } catch {
            return createInitialState();
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(PINBOARD_STORAGE_KEY, JSON.stringify(pinBoardState));
        } catch (e) {
            console.error("Failed to save PinBoard state:", e);
        }
    }, [pinBoardState]);

    const addNote = useCallback((pos: {x: number, y: number}) => {
        const newNote: PinBoardNoteNode = {
            id: `pbnote-${Date.now()}`,
            type: 'note',
            x: pos.x,
            y: pos.y,
            width: 150,
            height: 100,
            content: 'New Note',
            color: '#fff9c4',
        };
        setPinBoardState(prev => ({ ...prev, nodes: [...prev.nodes, newNote] }));
    }, []);
    
    const addDocument = useCallback((vfsFileId: string, pos: {x: number, y: number}) => {
        const fileNode = getNode(vfsFileId);
        if (!fileNode || fileNode.type !== 'file') return;

        const newDocNode: PinBoardDocumentNode = {
            id: `pbdoc-${Date.now()}`,
            type: 'document',
            vfsFileId: vfsFileId,
            x: pos.x,
            y: pos.y,
            width: 150,
            height: 80,
        };
        setPinBoardState(prev => ({ ...prev, nodes: [...prev.nodes, newDocNode] }));
    }, [getNode]);

    const updateNode = useCallback((id: string, data: Partial<AnyPinBoardNode>) => {
        setPinBoardState(prev => ({
            ...prev,
            // FIX: Add type assertion to maintain the discriminated union type after spreading.
            nodes: prev.nodes.map(n => (n.id === id ? { ...n, ...data } as AnyPinBoardNode : n)),
        }));
    }, []);

    const deleteNode = useCallback((id: string) => {
        setPinBoardState(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== id),
        }));
    }, []);

    const value: PinBoardContextType = {
        pinBoardState,
        addNote,
        addDocument,
        updateNode,
        deleteNode,
    };

    return <PinBoardContext.Provider value={value}>{children}</PinBoardContext.Provider>;
};