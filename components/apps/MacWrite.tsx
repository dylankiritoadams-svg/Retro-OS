import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDocuments } from '../../DocumentContext';
import { useFileSystem } from '../../FileSystemContext';
import type { AppDocument } from '../../types';
import { globalEmitter } from '../../events';

const FONT_MAP: Record<string, string> = {
    'chicago': '"Pixelify Sans", sans-serif',
    'courier': '"Cutive Mono", monospace',
    'helvetica': 'sans-serif',
    'times': 'serif',
};

const SIZE_MAP: Record<string, string> = {
    '9': '1', '10': '2', '12': '3',
    '14': '4', '18': '5', '24': '6',
};

interface MacWriteProps {
    isActive: boolean;
    instanceId: string;
    documentIdToOpen?: string;
}

export const MacWrite: React.FC<MacWriteProps> = ({ isActive, instanceId, documentIdToOpen }) => {
    const { getDocument, createDocument, updateDocument, getDocumentsByApp } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();

    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');

    const editorRef = useRef<HTMLDivElement>(null);
    
    const appDocuments = getDocumentsByApp('macwrite');
    
    // Effect to load a document when passed as a prop (e.g., from Finder)
    useEffect(() => {
        if(documentIdToOpen) {
            const doc = getDocument(documentIdToOpen);
            if(doc) {
                setActiveDocument(doc);
                setIsDirty(false);
            }
        }
    }, [documentIdToOpen, getDocument]);

    // This effect is the source of truth for synchronizing the editor's DOM content
    // with the currently active document state. It runs only when the activeDocument changes.
    useEffect(() => {
        if (editorRef.current) {
            const newContent = activeDocument ? activeDocument.content : '';
            // Only update the DOM if it's different. This prevents wiping user input on other re-renders.
            if (editorRef.current.innerHTML !== newContent) {
                editorRef.current.innerHTML = newContent;
            }
        }
    }, [activeDocument]);


    const executeCommand = useCallback((command: string, value: string | null = null) => {
        (document as any).execCommand(command, false, value);
        editorRef.current?.focus();
        setIsDirty(true);
    }, []);

    const handleNew = useCallback(() => {
        if (isDirty) {
            // In a real app, you'd prompt to save here.
            console.log("Content is dirty, changes will be lost.");
        }
        setActiveDocument(null);
        setIsDirty(false);
    }, [isDirty]);

    const handleSave = useCallback(() => {
        if (!editorRef.current) return;
        const currentContent = editorRef.current.innerHTML;
        
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, currentContent);
            // Update local state immediately to prevent content reversion on re-render.
            setActiveDocument(prevDoc => prevDoc ? { ...prevDoc, content: currentContent } : null);
            setIsDirty(false);
        } else {
            setSaveAsName('Untitled');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, updateDocument]);
    
    const handleSaveAs = useCallback(() => {
        if (!editorRef.current) return;
        setSaveAsName(activeDocument?.name || 'Untitled');
        setIsSaveAsModalOpen(true);
    }, [activeDocument]);

    const confirmSaveAs = useCallback(() => {
        if (!saveAsName.trim() || !editorRef.current) return;
        const newDoc = createDocument(saveAsName, editorRef.current.innerHTML, 'macwrite');
        
        const documentsFolder = findNodeByPath('/Documents');
        if(documentsFolder) {
            createFile(saveAsName, documentsFolder.id, 'document', 'macwrite', newDoc.id);
        }

        setActiveDocument(newDoc);
        setIsDirty(false);
        setIsSaveAsModalOpen(false);
    }, [saveAsName, createDocument, findNodeByPath, createFile]);
    
    const handleOpen = useCallback(() => {
        setIsOpenFileModalOpen(true);
    }, []);
    
    const confirmOpen = (docId: string) => {
        const docToOpen = getDocument(docId);
        if (docToOpen) {
            setActiveDocument(docToOpen);
        }
        setIsOpenFileModalOpen(false);
    };
    
    const onInput = useCallback(() => {
        setIsDirty(true);
    }, []);

    // Global Menu Bar Event Handling
    useEffect(() => {
        if (!isActive) return;

        const eventHandlers: { [key: string]: (data?: any) => void } = {
            'macwrite:file:new': () => handleNew(),
            'macwrite:file:open': () => handleOpen(),
            'macwrite:file:save': () => handleSave(),
            'macwrite:file:saveas': () => handleSaveAs(),
            'macwrite:edit:undo': () => executeCommand('undo'),
            'macwrite:edit:cut': () => executeCommand('cut'),
            'macwrite:edit:copy': () => executeCommand('copy'),
            'macwrite:edit:paste': () => executeCommand('paste'),
            'macwrite:font:chicago': () => executeCommand('fontName', FONT_MAP.chicago),
            'macwrite:font:courier': () => executeCommand('fontName', FONT_MAP.courier),
            'macwrite:font:helvetica': () => executeCommand('fontName', FONT_MAP.helvetica),
            'macwrite:font:times': () => executeCommand('fontName', FONT_MAP.times),
            ...Object.fromEntries(Object.entries(SIZE_MAP).map(([size, value]) => [`macwrite:size:${size}`, () => executeCommand('fontSize', value)])),
            'macwrite:style:bold': () => executeCommand('bold'),
            'macwrite:style:italic': () => executeCommand('italic'),
            'macwrite:style:underline': () => executeCommand('underline'),
            'macwrite:format:left': () => executeCommand('justifyLeft'),
            'macwrite:format:center': () => executeCommand('justifyCenter'),
            'macwrite:format:right': () => executeCommand('justifyRight'),
        };

        const handlerWrapper = (handler: Function) => (data: any) => {
            if (data && data.instanceId === instanceId) {
                handler();
            }
        };

        const subscriptions: { event: string; handler: (data?: any) => void }[] = [];

        Object.entries(eventHandlers).forEach(([event, handler]) => {
            const wrappedHandler = handlerWrapper(handler);
            subscriptions.push({ event, handler: wrappedHandler });
            globalEmitter.subscribe(event, wrappedHandler);
        });

        return () => {
            subscriptions.forEach(({ event, handler }) => {
                globalEmitter.unsubscribe(event, handler);
            });
        };
    }, [isActive, instanceId, handleNew, handleOpen, handleSave, handleSaveAs, executeCommand]);

    return (
        <div className="w-full h-full flex flex-col bg-white text-black macwrite-paper">
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={onInput}
                className="flex-grow p-4 macwrite-editor focus:outline-none"
                style={{ fontFamily: FONT_MAP.chicago }}
            />
            {isSaveAsModalOpen && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow">
                        <h3 className="font-bold mb-2">Save Document As:</h3>
                        <input
                            type="text"
                            value={saveAsName}
                            onChange={e => setSaveAsName(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && confirmSaveAs()}
                            className="w-full p-1 border-2 border-black bg-white focus:outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end mt-4 space-x-2">
                            <button onClick={() => setIsSaveAsModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                            <button onClick={confirmSaveAs} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 font-bold">Save</button>
                        </div>
                    </div>
                </div>
            )}
            {isOpenFileModalOpen && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow w-96">
                        <h3 className="font-bold mb-2">Open Document:</h3>
                        <ul className="h-48 overflow-y-auto border-2 border-black bg-white p-1">
                            {appDocuments.length > 0 ? appDocuments.map(doc => (
                                <li key={doc.id}>
                                    <button onClick={() => confirmOpen(doc.id)} className="w-full text-left p-1 hover:bg-black hover:text-white">
                                        {doc.name}
                                    </button>
                                </li>
                            )) : <li className="p-2 text-center text-gray-500">No documents found.</li>}
                        </ul>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setIsOpenFileModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};