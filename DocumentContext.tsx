import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { AppDocument, DocumentContextType } from './types';

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const useDocuments = (): DocumentContextType => {
    const context = useContext(DocumentContext);
    if (!context) {
        throw new Error('useDocuments must be used within a DocumentProvider');
    }
    return context;
};

interface DocumentProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = 'retro_os_documents';

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
    const [documents, setDocuments] = useState<AppDocument[]>(() => {
        try {
            const storedDocs = localStorage.getItem(STORAGE_KEY);
            return storedDocs ? JSON.parse(storedDocs) : [];
        } catch (error) {
            console.error("Error loading documents from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
        } catch (error) {
            console.error("Error saving documents to localStorage", error);
        }
    }, [documents]);

    const getDocument = useCallback((id: string) => {
        return documents.find(d => d.id === id);
    }, [documents]);

    const getDocumentsByApp = useCallback((appId: string) => {
        return documents.filter(d => d.appId === appId);
    }, [documents]);

    const createDocument = useCallback((name: string, content: any, appId: string): AppDocument => {
        const newDoc: AppDocument = {
            id: `doc-${Date.now()}`,
            name,
            appId,
            content,
        };
        setDocuments(prev => [...prev, newDoc]);
        return newDoc;
    }, []);

    const updateDocument = useCallback((id: string, newName: string, newContent: any) => {
        setDocuments(prev => 
            prev.map(doc => (doc.id === id ? { ...doc, name: newName, content: newContent } : doc))
        );
    }, []);

    const deleteDocument = useCallback((id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
    }, []);

    const value: DocumentContextType = {
        documents,
        getDocument,
        getDocumentsByApp,
        createDocument,
        updateDocument,
        deleteDocument,
    };

    return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
};
